import { YoutubeTranscript } from "youtube-transcript";

export type YoutubeTranscriptFailureReason =
  | "rate_limited"
  | "video_unavailable"
  | "disabled"
  | "language_unavailable"
  | "unavailable"
  | "fetch_failed";

function classifyTranscriptFailure(error: unknown): YoutubeTranscriptFailureReason {
  if (!(error instanceof Error)) return "fetch_failed";
  const type = \`\${error.name} \${error.constructor.name}\`;
  if (type.includes("TooManyRequest")) return "rate_limited";
  if (type.includes("VideoUnavailable")) return "video_unavailable";
  if (type.includes("Disabled")) return "disabled";
  if (type.includes("NotAvailableLanguage")) return "language_unavailable";
  if (type.includes("NotAvailable")) return "unavailable";
  return "fetch_failed";
}

export function getYoutubeId(urlOrId: string) {
  const match = urlOrId.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : urlOrId;
}

export async function fetchYoutubeTranscript(
  urlOrId: string,
  langs = ["de", "en"],
) {
  const id = getYoutubeId(urlOrId);
  const failures: YoutubeTranscriptFailureReason[] = [];
  for (const lang of langs) {
    try {
      const parts = await YoutubeTranscript.fetchTranscript(id, { lang });
      const text = parts.map((part) => part.text).join(" ");
      return {
        id,
        lang,
        text,
        segmentCount: parts.length,
        failureReason: null,
      };
    } catch (error) {
      failures.push(classifyTranscriptFailure(error));
    }
  }
  return {
    id,
    lang: null,
    text: "",
    segmentCount: 0,
    failureReason: failures.includes("rate_limited")
      ? "rate_limited" as const
      : failures.at(-1) ?? "fetch_failed" as const,
  };
}

export async function bundleYoutubeSources(urls: string[], maxChars = 12000) {
  const sources = await Promise.all(urls.map((url) => fetchYoutubeTranscript(url)));
  const blocks = sources
    .filter((source) => source.text)
    .map((source) => \`### YouTube \${source.id} (\${source.lang ?? "?"})\n\${source.text}\`);
  const joined = blocks.join("\n\n");
  return joined.length > maxChars ? joined.slice(0, maxChars) + "\n…[clipped]" : joined;
}
