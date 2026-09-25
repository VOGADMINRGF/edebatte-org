import { describe, expect, it } from "vitest";
import { segmentMaterialTextSemantically } from "@/features/material/materialSemanticSegmentation";

describe("material semantic segmentation", () => {
  it("keeps chapter headings with their following section", () => {
    const text = [
      "KAPITEL 1",
      "Demokratie und Grundwerte",
      "Absatz eins mit Inhalt.",
      "",
      "KAPITEL 2",
      "Europa und Euro",
      "Absatz zwei mit Inhalt.",
    ].join("\n");

    const segments = segmentMaterialTextSemantically(text, 70);
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0]?.text).toContain("KAPITEL 1");
    expect(segments[0]?.text).toContain("Demokratie und Grundwerte");
    expect(segments[1]?.text).toContain("KAPITEL 2");
  });

  it("never silently drops oversized text", () => {
    const text = `KAPITEL 1\n${"A".repeat(260)}`;
    const segments = segmentMaterialTextSemantically(text, 80);
    expect(segments.every((segment) => segment.characterCount <= 80)).toBe(true);
    const reconstructed = segments.map((segment) => segment.text).join("");
    expect(reconstructed.replace(/\s/g, "").length).toBeGreaterThanOrEqual(260);
  });
});
