import { YoutubeTranscript } from "youtube-transcript";
import {
  buildYoutubeMediaSourceArtifact,
  type MediaSourceArtifact,
} from "@features/ai/sources/mediaSourceArtifact";

export type YoutubeTranscriptFailureReason =
  | "rate_limited"
  | "video_unavailable"
  | "disabled"
  | "language_unavailable"
  | "unavailable"
  | "runtime_incompatible"
  | "fetch_failed";

type YoutubeRuntimeTrace = {
  innerTubeLoginRequired: boolean;
  watchBlocked: boolean;
  watchHasCaptions: boolean;
  captionEndpointRequested: boolean;
};

function newYoutubeRuntimeTrace(): YoutubeRuntimeTrace {
  return {
    innerTubeLoginRequired: false,
    watchBlocked: false,
    watchHasCaptions: false,
    captionEndpointRequested: false,
  };
}

function classifyTranscriptFailure(error: unknown): YoutubeTranscriptFailureReason {
  if (!(error instanceof Error)) return "fetch_failed";
  const type = `${error.name} ${error.constructor.name}`;
  if (type.includes("TooManyRequest")) return "rate_limited";
  if (type.includes("VideoUnavailable")) return "video_unavailable";
  if (type.includes("Disabled")) return "disabled";
  if (type.includes("NotAvailableLanguage")) return "language_unavailable";
  if (type.includes("NotAvailable")) return "unavailable";
  return "fetch_failed";
}

function sourceUrlForYoutube(urlOrId: string, id: string): string {
  try {
    const parsed = new URL(urlOrId);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    // Bare video IDs intentionally fall through to the canonical URL.
  }
  return `https://www.youtube.com/watch?v=${id}`;
}

function buildTracedYoutubeFetch(trace: YoutubeRuntimeTrace): typeof fetch {
  const tracedFetch: typeof fetch = async (input, init) => {
    let pathname = "";
    try {
      const rawUrl =
        typeof input === "string" || input instanceof URL ? input.toString() : input.url;
      pathname = new URL(rawUrl).pathname;
    } catch {
      // Unknown URL shapes remain unclassified; the real fetch still decides transport success.
    }

    if (pathname.includes("/api/timedtext")) trace.captionEndpointRequested = true;

    const response = await fetch(input, init);
    if (response.status === 200 && pathname.startsWith("/youtubei/v1/player")) {
      try {
        const data = (await response.clone().json()) as {
          playabilityStatus?: { status?: unknown };
        };
        trace.innerTubeLoginRequired =
          String(data.playabilityStatus?.status ?? "").toUpperCase() === "LOGIN_REQUIRED";
      } catch {
        // Payload classification is diagnostic only and never replaces the adapter result.
      }
    }

    if (response.status === 200 && pathname === "/watch") {
      try {
        const html = await response.clone().text();
        trace.watchHasCaptions = html.includes('"captionTracks":');
        trace.watchBlocked =
          /recaptcha|confirm you are not a bot|unusual traffic|automated quer(?:y|ies)|botguard|consent\.youtube\.com|consent\.google\.com/i.test(
            html,
          );
      } catch {
        // Payload classification is diagnostic only and never replaces the adapter result.
      }
    }

    return response;
  };
  return tracedFetch;
}

function runtimeTraceIsIncompatible(trace: YoutubeRuntimeTrace): boolean {
  return (
    trace.innerTubeLoginRequired &&
    !trace.captionEndpointRequested &&
    (trace.watchBlocked || !trace.watchHasCaptions)
  );
}

export function getYoutubeId(urlOrId: string) {
  const match = urlOrId.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : urlOrId;
}

export type YoutubeTranscriptResult = {
  id: string;
  lang: string | null;
  text: string;
  segmentCount: number;
  failureReason: YoutubeTranscriptFailureReason | null;
  mediaArtifact: MediaSourceArtifact | null;
};

export async function fetchYoutubeTranscript(
  urlOrId: string,
  langs = ["de", "en"],
): Promise<YoutubeTranscriptResult> {
  const id = getYoutubeId(urlOrId);
  const sourceUrl = sourceUrlForYoutube(urlOrId, id);
  const failures: YoutubeTranscriptFailureReason[] = [];
  const runtimeTrace = newYoutubeRuntimeTrace();

  for (const lang of langs) {
    try {
      const parts = await YoutubeTranscript.fetchTranscript(id, {
        lang,
        fetch: buildTracedYoutubeFetch(runtimeTrace),
      });
      const mediaArtifact = buildYoutubeMediaSourceArtifact({
        sourceUrl,
        mediaId: id,
        sourceLocale: lang,
        segments: parts,
      });
      return {
        id,
        lang,
        text: mediaArtifact.text,
        segmentCount: mediaArtifact.coverage.segmentCount,
        failureReason: null,
        mediaArtifact,
      };
    } catch (error) {
      failures.push(classifyTranscriptFailure(error));
    }
  }

  const failureReason = runtimeTraceIsIncompatible(runtimeTrace)
    ? "runtime_incompatible" as const
    : failures.includes("rate_limited")
      ? "rate_limited" as const
      : failures.at(-1) ?? "fetch_failed" as const;

  return {
    id,
    lang: null,
    text: "",
    segmentCount: 0,
    failureReason,
    mediaArtifact: null,
  };
}

export async function bundleYoutubeSources(urls: string[], maxChars = 12000) {
  const sources = await Promise.all(urls.map((url) => fetchYoutubeTranscript(url)));
  const blocks = sources
    .filter((source) => source.text)
    .map((source) => `### YouTube ${source.id} (${source.lang ?? "?"})\n${source.text}`);
  const joined = blocks.join("\n\n");
  return joined.length > maxChars ? joined.slice(0, maxChars) + "\n…[clipped]" : joined;
}
