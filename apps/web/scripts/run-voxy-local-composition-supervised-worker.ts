import { spawn } from "node:child_process";
import { resolve } from "node:path";

import {
  VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
} from "../src/features/voxyVideo/localCompositionRuntimeService";
import { writeVoxyWorkerHeartbeat } from "../src/features/voxyVideo/localCompositionOperations";

const HEARTBEAT_REFRESH_MS = 60_000;
const MAX_CAPTURE_BYTES = 1024 * 1024;

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

function safeLog(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...data }));
}

function appendBounded(current: string, chunk: Buffer | string) {
  const next = current + chunk.toString();
  return next.length <= MAX_CAPTURE_BYTES ? next : next.slice(-MAX_CAPTURE_BYTES);
}

async function main() {
  const webRoot = resolve(import.meta.dirname, "..");
  const workerId = process.env.VOXY_LOCAL_COMPOSITION_WORKER_ID?.trim() || "voxy-local-composition-worker";
  const cycleStartedAt = new Date().toISOString();
  const recoveryOrphanAfterMs = positiveInteger(
    argument("recovery-orphan-after-ms"),
    VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
    24 * 60 * 60 * 1_000,
  );

  await writeVoxyWorkerHeartbeat({
    workerId,
    state: "running",
    cycleStartedAt,
    now: cycleStartedAt,
    recoveryOrphanAfterMs,
  });
  safeLog("voxy_worker_cycle_started", {
    workerId,
    cycleStartedAt,
    recoveryOrphanAfterMs,
    autoRepair: false,
    autoDeploy: false,
    autoPublish: false,
  });

  const forwarded = process.argv.slice(2);
  const child = spawn(
    "pnpm",
    ["exec", "tsx", "scripts/run-voxy-local-composition-worker.ts", ...forwarded],
    {
      cwd: webRoot,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let childError: Error | null = null;
  child.stdout.on("data", (chunk) => {
    stdout = appendBounded(stdout, chunk);
  });
  // stderr is deliberately not copied to the supervisor log because it may
  // contain implementation details. The underlying worker already emits only
  // safe error messages at its own boundary.
  child.stderr.on("data", () => undefined);
  child.on("error", (error) => {
    childError = error;
  });

  let heartbeatWriteInFlight = false;
  const timer = setInterval(() => {
    if (heartbeatWriteInFlight) return;
    heartbeatWriteInFlight = true;
    void writeVoxyWorkerHeartbeat({
      workerId,
      state: "running",
      cycleStartedAt,
      now: new Date().toISOString(),
      recoveryOrphanAfterMs,
    })
      .catch(() => {
        safeLog("voxy_worker_heartbeat_refresh_failed", {
          safeErrorCode: "heartbeat_persistence_failed",
        });
      })
      .finally(() => {
        heartbeatWriteInFlight = false;
      });
  }, HEARTBEAT_REFRESH_MS);

  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.on("close", (code) => resolveExit(code));
  });
  clearInterval(timer);

  const cycleCompletedAt = new Date().toISOString();
  let processedCount = 0;
  if (!childError && exitCode === 0) {
    const lastLine = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);
    if (lastLine) {
      try {
        const parsed = JSON.parse(lastLine) as { processed?: unknown };
        if (Number.isInteger(parsed.processed) && Number(parsed.processed) >= 0) {
          processedCount = Number(parsed.processed);
        }
      } catch {
        processedCount = 0;
      }
    }
    await writeVoxyWorkerHeartbeat({
      workerId,
      state: "healthy",
      cycleStartedAt,
      now: cycleCompletedAt,
      cycleCompletedAt,
      processedCount,
      recoveryOrphanAfterMs,
    });
    safeLog("voxy_worker_cycle_completed", {
      workerId,
      cycleStartedAt,
      cycleCompletedAt,
      processedCount,
      status: "healthy",
    });
    return;
  }

  const failureCode = childError ? "worker_spawn_failed" : "worker_process_exit_nonzero";
  await writeVoxyWorkerHeartbeat({
    workerId,
    state: "failed",
    cycleStartedAt,
    now: cycleCompletedAt,
    cycleCompletedAt,
    processedCount,
    recoveryOrphanAfterMs,
    lastSafeErrorCode: failureCode,
  });
  safeLog("voxy_worker_cycle_failed", {
    workerId,
    cycleStartedAt,
    cycleCompletedAt,
    status: "failed",
    safeErrorCode: failureCode,
    exitCode,
  });
  process.exitCode = exitCode && exitCode > 0 ? exitCode : 1;
}

main().catch(async (error: unknown) => {
  const now = new Date().toISOString();
  const safeErrorCode = error instanceof Error && error.message.includes("persistent")
    ? "worker_persistence_precondition_failed"
    : "worker_supervisor_exception";
  try {
    await writeVoxyWorkerHeartbeat({
      state: "failed",
      cycleStartedAt: now,
      now,
      cycleCompletedAt: now,
      lastSafeErrorCode: safeErrorCode,
    });
  } catch {
    // Fail closed even if telemetry persistence is unavailable.
  }
  safeLog("voxy_worker_supervisor_failed", { safeErrorCode });
  process.exitCode = 1;
});
