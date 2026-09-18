import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchTranscript: vi.fn(),
}));

vi.mock("youtube-transcript", () => ({
  YoutubeTranscript: {
    fetchTranscript: (...args: unknown[]) => mocks.fetchTranscript(...args),
  },
}));

import { fetchYoutubeTranscript } from "@features/ai/sources/youtube";

describe("YouTube C8 transcript truth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns language and segment count only for a real transcript", async () => {
    mocks.fetchTranscript.mockResolvedValue([
      { text: "first" },
      { text: "second" },
    ]);
    await expect(
      fetchYoutubeTranscript("https://www.youtube.com/watch?v=abcdefghijk", ["de"]),
    ).resolves.toEqual({
      id: "abcdefghijk",
      lang: "de",
      text: "first second",
      segmentCount: 2,
      failureReason: null,
    });
  });

  it("classifies disabled transcripts without inventing source text", async () => {
    const error = new Error("disabled");
    error.name = "YoutubeTranscriptDisabledError";
    mocks.fetchTranscript.mockRejectedValue(error);

    const result = await fetchYoutubeTranscript(
      "https://www.youtube.com/watch?v=abcdefghijk",
      ["de", "en"],
    );
    expect(result.text).toBe("");
    expect(result.segmentCount).toBe(0);
    expect(result.lang).toBeNull();
    expect(result.failureReason).toBe("disabled");
  });

  it("preserves rate-limit truth across language fallback", async () => {
    const rateLimit = new Error("limited");
    rateLimit.name = "TooManyRequestError";
    mocks.fetchTranscript
      .mockRejectedValueOnce(rateLimit)
      .mockRejectedValueOnce(new Error("other"));

    const result = await fetchYoutubeTranscript("abcdefghijk", ["de", "en"]);
    expect(result.failureReason).toBe("rate_limited");
    expect(result.text).toBe("");
  });
});
