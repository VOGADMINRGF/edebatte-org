import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CREATE_EXTERNAL_PDF_MAX_PAGES,
  CREATE_EXTERNAL_PDF_MAX_TEXT_LENGTH,
  CREATE_EXTERNAL_PDF_PARSE_TIMEOUT_MS,
  extractCreatePdfText,
} from "@/features/create/externalSourceIntake";
afterEach(() => vi.useRealTimers());
describe("C8 PDF extraction bounds", () => {
  it("caps parser pages and extracted text", async () => {
    const destroy = vi.fn(async () => undefined);
    const getText = vi.fn(async () => ({
      text: "x".repeat(CREATE_EXTERNAL_PDF_MAX_TEXT_LENGTH + 10_000),
      total: 150,
    }));
    const result = await extractCreatePdfText(
      Buffer.from("%PDF-1.7"),
      async () => ({ getText, destroy }),
    );
    expect(getText).toHaveBeenCalledWith({ first: CREATE_EXTERNAL_PDF_MAX_PAGES });
    expect(result).toMatchObject({ pageCount: 150 });
    expect(result.text).toHaveLength(CREATE_EXTERNAL_PDF_MAX_TEXT_LENGTH);
    expect(destroy).toHaveBeenCalledOnce();
  });
  it("fails closed on parser timeout and destroys the parser", async () => {
    vi.useFakeTimers();
    const destroy = vi.fn(async () => undefined);
    const getText = vi.fn(async () => new Promise<{ text: string; total: number }>(() => {}));
    const pending = extractCreatePdfText(
      Buffer.from("%PDF-1.7"),
      async () => ({ getText, destroy }),
    );
    const assertion = expect(pending).rejects.toThrow("external_source_pdf_parse_timeout");
    await vi.advanceTimersByTimeAsync(CREATE_EXTERNAL_PDF_PARSE_TIMEOUT_MS + 1);
    await assertion;
    expect(destroy).toHaveBeenCalledOnce();
  });
});
