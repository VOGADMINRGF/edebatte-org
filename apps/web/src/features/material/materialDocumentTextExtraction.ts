import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MATERIAL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const MATERIAL_DOCUMENT_MAX_TEXT_CHARS = 250_000;
export const MATERIAL_PDF_MAX_PAGES = 80;

const EXTRACTION_TIMEOUT_MS = 8_000;

export type MaterialDocumentFormat = "pdf" | "docx" | "doc" | "other";

export type MaterialDocumentExtractionFailureReason =
  | "legacy_doc_requires_external_conversion"
  | "unsupported_document_type"
  | "empty_file"
  | "file_too_large"
  | "file_type_mismatch"
  | "invalid_file_signature"
  | "document_parse_failed"
  | "text_extraction_empty"
  | "extraction_timeout";

export type MaterialDocumentExtraction =
  | {
      outcome: "extracted";
      sourceFormat: "pdf" | "docx";
      text: string;
      extractedBy: "pdf-parse@2" | "mammoth@1";
      warnings: string[];
      pageCount: number | null;
    }
  | {
      outcome: "external_conversion_required" | "unsupported" | "failed";
      sourceFormat: MaterialDocumentFormat;
      text: null;
      extractedBy: null;
      warnings: string[];
      pageCount: number | null;
      reason: MaterialDocumentExtractionFailureReason;
    };

function normalizedFileName(file: Pick<File, "name">) {
  return String(file.name ?? "").trim().toLowerCase();
}

function normalizedMimeType(file: Pick<File, "type">) {
  return String(file.type ?? "").split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function extensionFormat(file: Pick<File, "name">): MaterialDocumentFormat {
  const name = normalizedFileName(file);
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".doc")) return "doc";
  return "other";
}

function mimeFormat(file: Pick<File, "type">): MaterialDocumentFormat {
  switch (normalizedMimeType(file)) {
    case "application/pdf":
      return "pdf";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/msword":
      return "doc";
    default:
      return "other";
  }
}

export function detectMaterialDocumentFormat(
  file: Pick<File, "name" | "type">,
): { format: MaterialDocumentFormat; mismatch: boolean } {
  const fromExtension = extensionFormat(file);
  const fromMime = mimeFormat(file);
  const mismatch =
    fromExtension !== "other" && fromMime !== "other" && fromExtension !== fromMime;
  return {
    format: fromMime !== "other" ? fromMime : fromExtension,
    mismatch,
  };
}

function failure(
  sourceFormat: MaterialDocumentFormat,
  reason: MaterialDocumentExtractionFailureReason,
  warnings: string[] = [],
): MaterialDocumentExtraction {
  return {
    outcome: "failed",
    sourceFormat,
    text: null,
    extractedBy: null,
    warnings,
    pageCount: null,
    reason,
  };
}

function normalizeExtractedText(value: unknown) {
  return String(value ?? "")
    .replaceAll("\u0000", "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, MATERIAL_DOCUMENT_MAX_TEXT_CHARS);
}

function hasPdfSignature(bytes: Uint8Array) {
  const header = bytes.subarray(0, Math.min(bytes.length, 1024));
  return Buffer.from(header).indexOf("%PDF-") >= 0;
}

function hasZipSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08))
  );
}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("MATERIAL_EXTRACTION_TIMEOUT")), EXTRACTION_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, guard]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function extractPdf(bytes: Uint8Array): Promise<MaterialDocumentExtraction> {
  if (!hasPdfSignature(bytes)) return failure("pdf", "invalid_file_signature");

  const parser = new PDFParse({
    data: Uint8Array.from(bytes),
    isEvalSupported: false,
    maxImageSize: 4_000_000,
    stopAtErrors: true,
    useWasm: false,
  });
  try {
    const result = await withTimeout(parser.getText({ first: MATERIAL_PDF_MAX_PAGES }));
    const text = normalizeExtractedText(result.pages.map((page) => page.text).join("\n\n"));
    if (!text) {
      return failure("pdf", "text_extraction_empty", [
        "Kein eingebetteter Text gefunden. Das PDF ist möglicherweise ein Scan; OCR wurde nicht gestartet.",
      ]);
    }
    const warnings =
      result.total > MATERIAL_PDF_MAX_PAGES
        ? [`Nur die ersten ${MATERIAL_PDF_MAX_PAGES} Seiten wurden extrahiert.`]
        : [];
    return {
      outcome: "extracted",
      sourceFormat: "pdf",
      text,
      extractedBy: "pdf-parse@2",
      warnings,
      pageCount: result.total,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "MATERIAL_EXTRACTION_TIMEOUT";
    return failure("pdf", timedOut ? "extraction_timeout" : "document_parse_failed");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocx(bytes: Uint8Array): Promise<MaterialDocumentExtraction> {
  if (!hasZipSignature(bytes)) return failure("docx", "invalid_file_signature");
  try {
    const result = await withTimeout(mammoth.extractRawText({ buffer: Buffer.from(bytes) }));
    const text = normalizeExtractedText(result.value);
    const warnings = result.messages.slice(0, 10).map((message) =>
      message.type === "warning" ? "Das DOCX enthält nicht vollständig unterstützte Inhalte." : "DOCX-Inhalt konnte nur teilweise gelesen werden.",
    );
    if (!text) return failure("docx", "text_extraction_empty", warnings);
    return {
      outcome: "extracted",
      sourceFormat: "docx",
      text,
      extractedBy: "mammoth@1",
      warnings: Array.from(new Set(warnings)),
      pageCount: null,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "MATERIAL_EXTRACTION_TIMEOUT";
    return failure("docx", timedOut ? "extraction_timeout" : "document_parse_failed");
  }
}

export async function extractMaterialDocumentText(file: File): Promise<MaterialDocumentExtraction> {
  const detected = detectMaterialDocumentFormat(file);
  if (detected.mismatch) return failure(detected.format, "file_type_mismatch");
  if (detected.format === "doc") {
    return {
      outcome: "external_conversion_required",
      sourceFormat: "doc",
      text: null,
      extractedBy: null,
      warnings: [],
      pageCount: null,
      reason: "legacy_doc_requires_external_conversion",
    };
  }
  if (detected.format === "other") {
    return {
      outcome: "unsupported",
      sourceFormat: "other",
      text: null,
      extractedBy: null,
      warnings: [],
      pageCount: null,
      reason: "unsupported_document_type",
    };
  }
  if (file.size === 0) return failure(detected.format, "empty_file");
  if (file.size > MATERIAL_DOCUMENT_MAX_BYTES) return failure(detected.format, "file_too_large");

  const bytes = new Uint8Array(await file.arrayBuffer());
  return detected.format === "pdf" ? extractPdf(bytes) : extractDocx(bytes);
}
