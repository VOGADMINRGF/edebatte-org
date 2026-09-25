import { describe, expect, it } from "vitest";
import {
  MATERIAL_DOCUMENT_MAX_BYTES,
  extractMaterialDocumentText,
} from "@/features/material/materialDocumentTextExtraction";
import { extractUploadedFileText } from "@/features/material/materialUploadedFileText";

const DOCX_FIXTURE_BASE64 =
  "UEsDBAoAAAAIAIVzHF15bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMECgAAAAAAhXMcXQAAAAAAAAAAAAAAAAYAAABfcmVscy9QSwMECgAAAAgAhXMcXZv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBAoAAAAAAIVzHF0AAAAAAAAAAAAAAAAFAAAAd29yZC9QSwMECgAAAAgAhXMcXRZj0zLXAAAAQwEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2PsU7EMAxAfyXKTlMYTqhqewtiQ7qBY08TX2upcSI7pdy/sfFjJMeAhFieY1t5tvvjR1jVO7BgpEHfN61WQC56pHnQ59fnu0etJFvydo0Eg76C6OPY752PbgtAWRUBSbcPesk5dcaIWyBYaWICKr1L5GBzSXk2e2SfODoQKf6wmoe2PZhgkXRVTtFfa0wVXJHHN2BAkgUwKGCCraA3tVPJN6a/n54Q1AvmeUXwwOWgXJdCD6S+PqdSqa/JMmOxX8qAkp7DZLfmX7WAyyc2t8LPjub3/vEbUEsBAhQACgAAAAgAhXMcXXluM9foAAAArQEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAKAAAAAACFcxxdAAAAAAAAAAAAAAAABgAAAAAAAAAAABAAAAAZAQAAX3JlbHMvUEsBAhQACgAAAAgAhXMcXZv9N+qtAAAAKQEAAAsAAAAAAAAAAAAAAAAAPQEAAF9yZWxzLy5yZWxzUEsBAhQACgAAAAAAhXMcXQAAAAAAAAAAAAAAAAUAAAAAAAAAAAAQAAAAEwIAAHdvcmQvUEsBAhQACgAAAAgAhXMcXRZj0zLXAAAAQwEAABEAAAAAAAAAAAAAAAAANgIAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAAFAAUAIAEAADwDAAAAAA==";

function byteLength(value: string) {
  return Buffer.byteLength(value, "binary");
}

function createTextPdf(text: string) {
  const escaped = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const stream = `BT /F1 18 Tf 50 740 Td (${escaped}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function file(bytes: BlobPart, name: string, type: string) {
  return new File([bytes], name, { type });
}

describe("material document text extraction", () => {
  it("extracts embedded PDF text from the uploaded bytes", async () => {
    const result = await extractMaterialDocumentText(
      file(createTextPdf("Vereinsheim gemeinsam erneuern"), "beschluss.pdf", "application/pdf"),
    );

    expect(result.outcome).toBe("extracted");
    if (result.outcome !== "extracted") return;
    expect(result.text).toContain("Vereinsheim gemeinsam erneuern");
    expect(result.extractedBy).toBe("pdf-parse@2");
    expect(result.pageCount).toBe(1);
  });

  it("extracts DOCX text from the uploaded ZIP bytes", async () => {
    const result = await extractMaterialDocumentText(
      file(
        Buffer.from(DOCX_FIXTURE_BASE64, "base64"),
        "mitgliederversammlung.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );

    expect(result.outcome).toBe("extracted");
    if (result.outcome !== "extracted") return;
    expect(result.text).toContain("Vereinsheim erneuern");
    expect(result.text).toContain("barrierefreien Umbau");
    expect(result.extractedBy).toBe("mammoth@1");
  });

  it("does not treat a PDF filename as extracted content", async () => {
    const result = await extractMaterialDocumentText(
      file("not a pdf", "beschluss.pdf", "application/pdf"),
    );

    expect(result).toMatchObject({
      outcome: "failed",
      reason: "invalid_file_signature",
      text: null,
    });
  });

  it("fails an image-only PDF honestly without starting OCR", async () => {
    const result = await extractMaterialDocumentText(
      file(createTextPdf(""), "scan.pdf", "application/pdf"),
    );

    expect(result).toMatchObject({ outcome: "failed", reason: "text_extraction_empty" });
    expect(result.warnings.join(" ")).toContain("OCR wurde nicht gestartet");
  });

  it("requires external conversion for legacy DOC and never pretends to extract it", async () => {
    const result = await extractUploadedFileText(
      file("legacy bytes", "altbestand.doc", "application/msword"),
    );

    expect(result).toMatchObject({
      status: "none",
      outcome: "external_conversion_required",
      blocker: "external_conversion_required",
      reason: "legacy_doc_requires_external_conversion",
      providerRequired: true,
      text: null,
    });
  });

  it("rejects MIME/extension conflicts and oversized files before parsing", async () => {
    const mismatch = await extractMaterialDocumentText(
      file(createTextPdf("Inhalt"), "falsch.docx", "application/pdf"),
    );
    const oversized = await extractMaterialDocumentText(
      file(new Uint8Array(MATERIAL_DOCUMENT_MAX_BYTES + 1), "gross.pdf", "application/pdf"),
    );

    expect(mismatch).toMatchObject({ outcome: "failed", reason: "file_type_mismatch" });
    expect(oversized).toMatchObject({ outcome: "failed", reason: "file_too_large" });
  });

  it("keeps direct text uploads working", async () => {
    const result = await extractUploadedFileText(
      file("Frage aus dem Verein", "frage.txt", "text/plain"),
    );

    expect(result).toMatchObject({
      status: "full",
      outcome: "extracted_locally",
      sourceFormat: "text",
      extractedBy: "server_file_text",
      text: "Frage aus dem Verein",
    });
  });
});
