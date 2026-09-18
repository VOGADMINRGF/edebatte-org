import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchTranscript: vi.fn() }));
vi.mock("youtube-transcript", () => ({
  YoutubeTranscript: {
    fetchTranscript: (...args: unknown[]) => mocks.fetchTranscript(...args),
  },
}));
import { fetchYoutubeTranscript } from "@features/ai/sources/youtube";

describe("YouTube C8 transcript truth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns language and segment count only for a real transcript", async () => {
    mocks.fetchTranscript.mockResolvedValue([{ text: "first" }, { text: "second" }]);
    await expect(fetchYoutubeTranscript("https://youtu.be/abcdefghijk", ["de"])).resolves.toEqual({
      id: "abcdefghijk",
      lang: "de",
      text: "first second",
      segmentCount: 2,
      failureReason: null,
    });
  });

  it.each([
    ["YoutubeTranscriptDisabledError", "disabled"],
    ["VideoUnavailableError", "video_unavailable"],
  ])("keeps %s failure truthful", async (name, failureReason) => {
    const error = new Error("upstream");
    error.name = name;
    mocks.fetchTranscript.mockRejectedValue(error);
    const result = await fetchYoutubeTranscript("abcdefghijk", ["de"]);
    expect(result).toMatchObject({ text: "", segmentCount: 0, lang: null, failureReason });
  });

  it("preserves rate-limit truth across language fallback", async () => {
    const error = new Error("limited");
    error.name = "TooManyRequestError";
    mocks.fetchTranscript
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(new Error("other"));
    await expect(fetchYoutubeTranscript("abcdefghijk", ["de", "en"])).resolves.toMatchObject({
      text: "",
      failureReason: "rate_limited",
    });
  });
});
