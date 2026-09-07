import {
  parseCreateProgressEvent,
  type CreateProgressEvent,
} from "@/features/create/createProgressEventContract";

export class CreateProgressStreamError extends Error {
  readonly errorCode: string;

  constructor(errorCode: string, message: string) {
    super(message);
    this.name = "CreateProgressStreamError";
    this.errorCode = errorCode;
  }
}

type StreamFrame = {
  event: string;
  data: unknown;
};

function parseSseFrame(frame: string): StreamFrame | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

export async function consumeCreateProgressResponse<T>(
  response: Response,
  input: {
    onProgress: (event: CreateProgressEvent) => void;
    signal?: AbortSignal;
  },
): Promise<T> {
  if (!response.ok) {
    throw new CreateProgressStreamError(
      "CREATE_PROGRESS_HTTP_FAILED",
      "create_progress_http_failed",
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/event-stream")) {
    return (await response.json()) as T;
  }
  if (!response.body) {
    throw new CreateProgressStreamError(
      "CREATE_PROGRESS_STREAM_MISSING",
      "create_progress_stream_missing",
    );
  }

  const reader = response.body.getReader();
  const decoder = new globalThis.TextDecoder();
  let buffer = "";
  let result: T | null = null;
  const abortError = () =>
    new globalThis.DOMException("The operation was aborted.", "AbortError");
  const cancelOnAbort = () => {
    void reader.cancel(abortError()).catch(() => undefined);
  };
  input.signal?.addEventListener("abort", cancelOnAbort, { once: true });

  const handleFrame = (rawFrame: string) => {
    const frame = parseSseFrame(rawFrame);
    if (!frame) return;
    if (frame.event === "progress") {
      const event = parseCreateProgressEvent(
        (frame.data as { event?: unknown } | null)?.event,
      );
      if (event) input.onProgress(event);
      return;
    }
    if (frame.event === "result") {
      result = frame.data as T;
      return;
    }
    if (frame.event === "error") {
      const errorData = frame.data as {
        errorCode?: unknown;
        message?: unknown;
      } | null;
      throw new CreateProgressStreamError(
        typeof errorData?.errorCode === "string"
          ? errorData.errorCode
          : "CREATE_PROGRESS_STREAM_FAILED",
        typeof errorData?.message === "string"
          ? errorData.message
          : "create_progress_stream_failed",
      );
    }
  };

  try {
    if (input.signal?.aborted) throw abortError();
    while (true) {
      const { done, value } = await reader.read();
      if (input.signal?.aborted) throw abortError();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) handleFrame(frame);
      if (done) break;
    }
    if (buffer.trim()) handleFrame(buffer);
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    input.signal?.removeEventListener("abort", cancelOnAbort);
    reader.releaseLock();
  }

  if (result === null) {
    throw new CreateProgressStreamError(
      "CREATE_PROGRESS_RESULT_MISSING",
      "create_progress_result_missing",
    );
  }
  return result;
}
