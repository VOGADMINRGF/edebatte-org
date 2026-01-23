const isDev = process.env.NODE_ENV !== "production";
/**
 * Web-Client-Helfer für den Faktencheck-Workflow (API calls).
 * Diese Datei existiert, weil irgendwo `lib/worker` importiert wird.
 * NICHT der BullMQ-Worker!
 */

type EnqueuePayload = {
  contributionId?: string;
  text?: string;
  language?: string;
  topic?: string;
  priority?: number;
};

type EnqueueResponse =
  | { ok: true; jobId: string; message?: string }
  | { ok: false; reason?: string; code?: string; message?: string };

type StatusResponse =
  | {
      ok: true;
      job: {
        id: string;
        jobId: string;
        status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
        tokensUsed: number;
        durationMs: number;
      };
      claims: any[];
    }
  | { ok: false; reason?: string; code?: string; message?: string };

const isServer = typeof window === "undefined";

function baseUrl() {
  return isServer
    ? (process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000")
    : "";
}
function roleHeaders(role?: string) {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (role) h["x-role"] = role;
  return h;
}

export async function enqueueFactcheck(
  payload: EnqueuePayload,
  role = "editor",
): Promise<EnqueueResponse> {
  const res = await fetch(`${baseUrl()}/api/factcheck/enqueue`, {
    method: "POST",
    headers: roleHeaders(role),
    body: JSON.stringify(payload),
  });
  try {
    return await res.json();
  } catch {
    return { ok: false, message: "enqueue failed" };
  }
}

export async function getFactcheckStatus(
  jobId: string,
  role = "editor",
): Promise<StatusResponse> {
  const base = `${baseUrl()}/api/factcheck/status/${encodeURIComponent(jobId)}`;
  const url =
    !isServer && isDev ? `${base}?role=${encodeURIComponent(role)}` : base;
  const res = await fetch(url, {
    headers: isServer ? roleHeaders(role) : undefined,
    cache: "no-store",
  });
  try {
    return await res.json();
  } catch {
    return { ok: false, message: "status failed" };
  }
}

export default { enqueueFactcheck, getFactcheckStatus };
