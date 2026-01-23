import { describe, expect, it } from "vitest";
import { parseAnalyzeRequestBody } from "./parseAnalyzeRequest";

describe("parseAnalyzeRequestBody", () => {
  it("accepts legacy {text}", () => {
    const res = parseAnalyzeRequestBody({ text: "Das ist ein Testtext mit mehr als zehn Zeichen." });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.text.length).toBeGreaterThan(10);
  });

  it("accepts new {textOriginal,textPrepared} and prefers prepared", () => {
    const res = parseAnalyzeRequestBody({
      textOriginal: "Original Original Original",
      textPrepared: "Prepared Text der lang genug ist.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.text).toContain("Prepared");
  });

  it("accepts only textOriginal", () => {
    const res = parseAnalyzeRequestBody({ textOriginal: "Das ist ein ausreichend langer Text." });
    expect(res.ok).toBe(true);
  });

  it("rejects empty", () => {
    const res = parseAnalyzeRequestBody({ textOriginal: "   " });
    expect(res.ok).toBe(false);
  });
});
