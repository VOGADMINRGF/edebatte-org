import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeExternalFetch: vi.fn(),
  fetchYoutubeTranscript: vi.fn(),
}));

vi.mock("@/lib/net/safeExternalFetch", () => ({
  safeExternalFetch: (...args: unknown[]) => mocks.safeExternalFetch(...args),
}));

vi.mock("@features/ai/sources/youtube", () => ({
  fetchYoutubeTranscript: (...args: unknown[]) => mocks.fetchYoutubeTranscript(...args),
}));

import {
  loadCreateExternalSource,
  validateCreateExternalSourceUrl,
} from "@/features/create/externalSourceIntake";

describe("C8 external source intake security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    "https://user:pass@example.org/source",
    "https://example.org/source?X-Amz-Signature=secret",
    "https://example.org/source?%2558-Amz-Signature=secret",
    "https://example.org/source?sig=secret",
    "https://example.org/source?token=secret",
    "https://example.org/source?sp=r&sig=secret&sv=1",
    "https://example.org/source?bad=%ZZ",
  ])("rejects credentials, signed parameters or ambiguous encoding: %s", (url) => {
    expect(() => validateCreateExternalSourceUrl(url)).toThrow();
    expect(mocks.safeExternalFetch).not.toHaveBeenCalled();
  });

  it("rejects a PDF declaration without a real PDF signature", async () => {
    mocks.safeExternalFetch.mockResolvedValue({
      buffer: Buffer.from("<html>not pdf</html>"),
      contentType: "application/pdf",
      finalUrl: "https://example.org/file.pdf",
      headers: {},
      redirectCount: 0,
      status: 200,
    });
    await expect(
      loadCreateExternalSource("https://example.org/file.pdf"),
    ).rejects.toThrow("external_source_pdf_signature_invalid");
  });

  it("rejects unsupported MIME and binary payloads masquerading as text", async () => {
    mocks.safeExternalFetch.mockResolvedValueOnce({
      buffer: Buffer.from("plain"),
      contentType: "application/zip",
      finalUrl: "https://example.org/file",
      headers: {},
      redirectCount: 0,
      status: 200,
    });
    await expect(
      loadCreateExternalSource("https://example.org/file"),
    ).rejects.toThrow("external_source_content_type_unsupported");

    mocks.safeExternalFetch.mockResolvedValueOnce({
      buffer: Buffer.from([0x61, 0x00, 0x62]),
      contentType: "text/plain",
      finalUrl: "https://example.org/file.txt",
      headers: {},
      redirectCount: 0,
      status: 200,
    });
    await expect(
      loadCreateExternalSource("https://example.org/file.txt"),
    ).rejects.toThrow("external_source_text_binary_invalid");
  });

  it("returns truthful bounded HTML metadata and a content hash", async () => {
    mocks.safeExternalFetch.mockResolvedValue({
      buffer: Buffer.from("<html><title>Source</title><body>Hello world</body></html>"),
      contentType: "text/html; charset=utf-8",
      finalUrl: "https://example.org/final",
      headers: {},
      redirectCount: 1,
      status: 200,
    });
    const source = await loadCreateExternalSource("https://example.org/start");
    expect(source).toMatchObject({
      sourceKind: "html",
      finalUrl: "https://example.org/final",
      documentTitle: "Source",
      httpStatus: 200,
    });
    expect(source.text).toContain("Hello world");
    expect(source.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never treats an unavailable YouTube transcript as loaded source text", async () => {
    mocks.fetchYoutubeTranscript.mockResolvedValue({
      id: "abcdefghijk",
      lang: null,
      text: "",
      segmentCount: 0,
      failureReason: "disabled",
    });
    await expect(
      loadCreateExternalSource("https://www.youtube.com/watch?v=abcdefghijk"),
    ).rejects.toThrow("youtube_transcript_disabled");
    expect(mocks.safeExternalFetch).not.toHaveBeenCalled();
  });
});
