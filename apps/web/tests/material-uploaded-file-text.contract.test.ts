import { describe, expect, it } from "vitest";
import {
  extractUploadedFileText,
  isDirectTextUpload,
  requiresExternalDocumentExtraction,
} from "@/features/material/materialUploadedFileText";

describe("material uploaded file text", () => {
  it("extracts real text uploads server-side", async () => {
    const file = new File([
      "Mieten sollen bezahlbar bleiben. Welche Instrumente sollen priorisiert werden?",
    ], "programm.md", { type: "text/markdown" });

    expect(isDirectTextUpload(file)).toBe(true);
    const result = await extractUploadedFileText(file);

    expect(result.status).toBe("full");
    expect(result.extractedBy).toBe("server_file_text");
    expect(result.text).toContain("Welche Instrumente");
    expect(result.providerRequired).toBe(false);
  });

  it("fails malformed PDF/DOCX bytes and keeps legacy DOC behind conversion", async () => {
    const pdf = new File(["%PDF-1.7 fake binary"], "studie.pdf", {
      type: "application/pdf",
    });
    const docx = new File(["PK fake zip"], "programm.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(requiresExternalDocumentExtraction(pdf)).toBe(false);
    expect(requiresExternalDocumentExtraction(docx)).toBe(false);

    for (const file of [pdf, docx]) {
      const result = await extractUploadedFileText(file);
      expect(result.status).toBe("none");
      expect(result.text).toBeNull();
      expect(result.providerRequired).toBe(false);
      expect(result.outcome).toBe("failed");
    }

    const doc = new File(["legacy binary"], "programm.doc", { type: "application/msword" });
    expect(requiresExternalDocumentExtraction(doc)).toBe(true);
    const legacy = await extractUploadedFileText(doc);
    expect(legacy).toMatchObject({
      outcome: "external_conversion_required",
      blocker: "external_conversion_required",
      providerRequired: true,
      text: null,
    });
  });
});
