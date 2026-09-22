import "server-only";

import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { VoxyLocalCompositionExecutionResult } from "@/features/voxyVideo/localCompositionRuntime";
import type { VoxyLocalCompositionExecutor } from "@/features/voxyVideo/localCompositionRuntimeService";

export type VoxyLocalCompositionProcessExecutorOptions = {
  webRoot: string;
  outputRoot: string;
  timeoutMs?: number;
};

export function createVoxyLocalCompositionProcessExecutor(
  options: VoxyLocalCompositionProcessExecutorOptions,
): VoxyLocalCompositionExecutor {
  const webRoot = resolve(options.webRoot);
  const outputRoot = resolve(options.outputRoot);
  // The historical 8-second fixture fit inside a five-minute parent timeout.
  // Editorial compositions can be 2–30 minutes and render frame-by-frame, so
  // the parent process must not kill a valid local render merely because it is
  // longform. The worker still owns its own ffmpeg/file-size/integrity gates.
  const timeoutMs = Math.max(
    30_000,
    Math.min(14_400_000, options.timeoutMs ?? 3_600_000),
  );

  return {
    async execute(input) {
      const tempRoot = await mkdtemp(join(tmpdir(), "voxy-local-composition-command-"));
      const manifestPath = join(tempRoot, "worker-input.json");
      try {
        await writeFile(
          manifestPath,
          `${JSON.stringify({
            job: input.job,
            request: input.request,
            audioAsset: input.audioAsset,
          })}\n`,
          "utf8",
        );
        const result = spawnSync(
          "pnpm",
          [
            "exec",
            "tsx",
            "scripts/render-voxy-local-composition.ts",
            `--manifest=${manifestPath}`,
            `--output-root=${outputRoot}`,
          ],
          {
            cwd: webRoot,
            encoding: "utf8",
            shell: false,
            timeout: timeoutMs,
            maxBuffer: 16 * 1024 * 1024,
          },
        );
        if (result.error || result.status !== 0) {
          throw new Error("voxy_local_composition_worker_process_failed");
        }
        const jsonLine = result.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .at(-1);
        if (!jsonLine) throw new Error("voxy_local_composition_worker_result_missing");
        return JSON.parse(jsonLine) as VoxyLocalCompositionExecutionResult;
      } finally {
        await rm(tempRoot, { recursive: true, force: true });
      }
    },
  };
}
