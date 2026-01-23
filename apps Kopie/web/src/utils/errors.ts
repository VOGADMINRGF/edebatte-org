// apps/web/src/utils/errors.ts
export type FormattedError = {
  message: string;
  code?: string;
  cause?: unknown;
  status?: number;
  traceId: string;
  path?: string;
  payload?: unknown;
};

function newTraceId() {
  return (
    "e_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function formatError(input: {
  message: string;
  code?: string;
  cause?: unknown;
  status?: number;
}): FormattedError {
  return {
    message: input.message,
    code: input.code ?? "UNKNOWN",
    cause: input.cause,
    status: input.status ?? 500,
    traceId: newTraceId(),
  };
}

export default formatError;
