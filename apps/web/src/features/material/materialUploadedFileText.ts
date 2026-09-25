import {
  detectMaterialDocumentFormat,
  extractMaterialDocumentText,
  type MaterialDocumentFormat,
} from "./materialDocumentTextExtraction";

export type UploadedFileTextExtraction = {
  status: "full" | "none";
  text: string | null;
  extractedBy: "server_file_text" | "pdf-parse@2" | "mammoth@1" | null;
  outcome: "extracted_locally" | "external_conversion_required" | "unsupported" | "failed";
  sourceFormat: MaterialDocumentFormat | "text";
  providerRequired: boolean;
  blocker: "external_conversion_required" | null;
  reason: string | null;
  warnings: string[];
  pageCount: number | null;
};

const DIRECT_TEXT_MAX_BYTES = 5 * 1024 * 1024;

const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".xml",
  ".html",
  ".htm",
] as const;

function normalizedFileName(file: Pick<File, "name">) {
  return String(file.name ?? "").trim().toLowerCase();
}

export function isDirectTextUpload(file: Pick<File, "name" | "type">) {
  const mimeType = String(file.type ?? "").trim().toLowerCase();
  if (mimeType.startsWith("text/")) return true;
  if (
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/xhtml+xml"
  ) {
    return true;
  }
  const name = normalizedFileName(file);
  return TEXT_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function requiresExternalDocumentExtraction(file: Pick<File, "name" | "type">) {
  return detectMaterialDocumentFormat(file).format === "doc";
}

export async function extractUploadedFileText(file: File): Promise<UploadedFileTextExtraction> {
  const documentFormat = detectMaterialDocumentFormat(file);
  if (documentFormat.format !== "other") {
    const extraction = await extractMaterialDocumentText(file);
    if (extraction.outcome === "extracted") {
      return {
        status: "full",
        text: extraction.text,
        extractedBy: extraction.extractedBy,
        outcome: "extracted_locally",
        sourceFormat: extraction.sourceFormat,
        providerRequired: false,
        blocker: null,
        reason: null,
        warnings: extraction.warnings,
        pageCount: extraction.pageCount,
      };
    }
    return {
      status: "none",
      text: null,
      extractedBy: null,
      outcome: extraction.outcome,
      sourceFormat: extraction.sourceFormat,
      providerRequired: extraction.outcome === "external_conversion_required",
      blocker: extraction.outcome === "external_conversion_required" ? "external_conversion_required" : null,
      reason: extraction.reason,
      warnings: extraction.warnings,
      pageCount: extraction.pageCount,
    };
  }

  if (isDirectTextUpload(file)) {
    if (file.size > DIRECT_TEXT_MAX_BYTES) {
      return {
        status: "none",
        text: null,
        extractedBy: null,
        outcome: "failed",
        sourceFormat: "text",
        providerRequired: false,
        blocker: null,
        reason: "file_too_large",
        warnings: [],
        pageCount: null,
      };
    }
    const text = (await file.text()).split("\u0000").join("").trim();
    return {
      status: text ? "full" : "none",
      text: text || null,
      extractedBy: text ? "server_file_text" : null,
      outcome: text ? "extracted_locally" : "failed",
      sourceFormat: "text",
      providerRequired: false,
      blocker: null,
      reason: text ? null : "text_extraction_empty",
      warnings: [],
      pageCount: null,
    };
  }

  return {
    status: "none",
    text: null,
    extractedBy: null,
    outcome: "unsupported",
    sourceFormat: "other",
    providerRequired: false,
    blocker: null,
    reason: "unsupported_document_type",
    warnings: [],
    pageCount: null,
  };
}
