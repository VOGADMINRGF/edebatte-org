import crypto from "crypto";

export type AppError = {
  traceId: string;
  message: string;
  code?: string;
  cause?: unknown;
  status?: number;
};

export function formatError(
  err: unknown,
  opts?: { code?: string; status?: number },
): AppError {
  const traceId = crypto.randomBytes(8).toString("hex");
  const base = err instanceof Error ? err.message : String(err);
  return {
    traceId,
    message: base,
    code: opts?.code,
    status: opts?.status ?? 500,
    cause: process.env.NODE_ENV === "production" ? undefined : err,
  };
}
