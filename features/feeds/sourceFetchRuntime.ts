import type { SourceRef } from "./sourceRef";
import {
  buildConditionalSourceHeaders,
  createDurableSourceSnapshot,
  decideSourceFetch,
  type DurableSourceSnapshot,
  type SourceFetchResponse,
} from "./sourceSnapshot";
import {
  getSourceSnapshotRepository,
  type SourceSnapshotRepository,
} from "./sourceSnapshotStore";

export type SourceFetchRuntimeResult =
  | {
      status: "changed";
      httpStatus: number;
      body: string;
      snapshot: DurableSourceSnapshot;
      persistence: "inserted" | "duplicate" | "skipped";
    }
  | {
      status: "not_modified";
      httpStatus: number;
      reason: "http_304" | "same_content_hash";
      body: string | null;
      snapshot: DurableSourceSnapshot | null;
    }
  | {
      status: "failed";
      httpStatus: number | null;
      reason: string;
      retryAfter: string | null;
      snapshot: DurableSourceSnapshot | null;
    };

export type SourceFetchRuntimeInput = {
  source: SourceRef;
  timeoutMs: number;
  persist?: boolean;
  conditional?: boolean;
  userAgent?: string;
  repository?: SourceSnapshotRepository;
  fetchImpl?: typeof fetch;
};

function responseMeta(response: Response, body: string | null): SourceFetchResponse {
  return {
    status: response.status,
    body,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    mime: response.headers.get("content-type"),
  };
}

function clampTimeout(value: number) {
  if (!Number.isFinite(value)) return 12_000;
  return Math.max(1_000, Math.min(60_000, Math.floor(value)));
}

export async function fetchSourceWithSnapshot(
  input: SourceFetchRuntimeInput,
): Promise<SourceFetchRuntimeResult> {
  const repository = input.repository ?? getSourceSnapshotRepository();
  const fetchImpl = input.fetchImpl ?? fetch;
  const previous = await repository.getLatest(input.source.sourceId);
  const headers = new Headers({
    "user-agent": input.userAgent ?? "eDebatte/source-intelligence (+https://edebatte.eu)",
  });
  if (input.conditional !== false) {
    for (const [key, value] of Object.entries(buildConditionalSourceHeaders(previous))) {
      headers.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeoutMs = clampTimeout(input.timeoutMs);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(input.source.href, {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `source_fetch_timeout_${timeoutMs}`
        : "source_fetch_network_error";
    return {
      status: "failed",
      httpStatus: null,
      reason,
      retryAfter: null,
      snapshot: previous,
    };
  } finally {
    clearTimeout(timeout);
  }

  const body = response.status === 304 ? null : await response.text();
  const metadata = responseMeta(response, body);
  const decision = decideSourceFetch({ response: metadata, previous });

  if (decision.kind === "failed") {
    return {
      status: "failed",
      httpStatus: response.status,
      reason: decision.reason,
      retryAfter: response.headers.get("retry-after"),
      snapshot: previous,
    };
  }

  if (decision.kind === "not_modified") {
    return {
      status: "not_modified",
      httpStatus: response.status,
      reason: decision.reason,
      body,
      snapshot: previous,
    };
  }

  if (typeof body !== "string") {
    return {
      status: "failed",
      httpStatus: response.status,
      reason: "source_fetch_body_missing",
      retryAfter: response.headers.get("retry-after"),
      snapshot: previous,
    };
  }

  const snapshot = createDurableSourceSnapshot({
    source: input.source,
    response: metadata,
    retrievedAt: new Date(),
    previous,
  });

  if (input.persist === false) {
    return {
      status: "changed",
      httpStatus: response.status,
      body,
      snapshot,
      persistence: "skipped",
    };
  }

  const persisted = await repository.append(snapshot);
  if (persisted.status === "version_conflict") {
    return {
      status: "failed",
      httpStatus: response.status,
      reason: "source_snapshot_version_conflict",
      retryAfter: null,
      snapshot: persisted.snapshot,
    };
  }

  return {
    status: "changed",
    httpStatus: response.status,
    body,
    snapshot: persisted.snapshot,
    persistence: persisted.status,
  };
}
