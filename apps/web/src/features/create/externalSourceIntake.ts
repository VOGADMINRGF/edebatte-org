// @repository-integrity-classification: runtime-bridge
import crypto from "node:crypto";
import {
  fetchYoutubeTranscript,
  type YoutubeTranscriptFailureReason,
} from "@features/ai/sources/youtube";
import type { DocumentAnalysisSummary } from "@/features/create/intelligentFollowupContract";
import { isCreateSourceUrlSensitiveOrMalformed } from "@/features/create/safety/createGuestClaimSafety";
import { safeExternalFetch } from "@/lib/net/safeExternalFetch";

export const CREATE_EXTERNAL_HTML_MAX_BYTES = 2 * 1024 * 1024;
export const CREATE_EXTERNAL_PDF_MAX_BYTES = 10 * 1024 * 1024;
export const CREATE_EXTERNAL_PDF_MAX_PAGES = 80;
export const CREATE_EXTERNAL_PDF_MAX_TEXT_LENGTH = 120_000;
export const CREATE_EXTERNAL_PDF_PARSE_TIMEOUT_MS = 8_000;
export const CREATE_EXTERNAL_FETCH_TIMEOUT_MS = 12_000;

export type CreateExternalSourceKind = "html" | "pdf" | "youtube_transcript";

export type CreateExternalSource = {
  sourceKind: CreateExternalSourceKind;
  text: string;
  pageCount: number | null;
  contentType: string;
  documentType: DocumentAnalysisSummary["documentType"];
  documentTitle: string | null;
  httpStatus: number;
  finalUrl: string;
  contentHash: string;
  sourceLocale: string;
  transcriptSegmentCount: number | null;
};

export class CreateYoutubeTranscriptError extends Error {
  constructor(public readonly failureReason: YoutubeTranscriptFailureReason) {
    super(`youtube_transcript_${failureReason}`);
    this.name = "CreateYoutubeTranscriptError";
  }
}

type PdfTextResult = {
  text: string;
  pageCount: number | null;
};

type PdfParserLike = {
  getText(input: { first: number }): Promise<{ text: string; total: number }>;
  destroy(): Promise<void>;
};

type PdfParserFactory = (buffer: Buffer) => Promise<PdfParserLike>;

async function defaultPdfParserFactory(buffer: Buffer): Promise<PdfParserLike> {
  const { PDFParse } = await import("pdf-parse");
  return new PDFParse({
    data: Uint8Array.from(buffer),
    isEvalSupported: false,
    maxImageSize: 4_000_000,
    stopAtErrors: true,
    useWasm: false,
  }) as PdfParserLike;
}

export async function extractCreatePdfText(
  buffer: Buffer,
  parserFactory: PdfParserFactory = defaultPdfParserFactory,
): Promise<PdfTextResult> {
  const parser = await parserFactory(buffer);
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      parser.getText({ first: CREATE_EXTERNAL_PDF_MAX_PAGES }),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("external_source_pdf_parse_timeout")),
          CREATE_EXTERNAL_PDF_PARSE_TIMEOUT_MS,
        );
      }),
    ]);
    return {
      text: result.text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, CREATE_EXTERNAL_PDF_MAX_TEXT_LENGTH),
      pageCount: result.total > 0 ? result.total : null,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    await parser.destroy().catch(() => undefined);
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 1_024).indexOf(Buffer.from("%PDF-")) >= 0;
}

function maxSourceBytes(input: { contentType: string; finalUrl: string }): number {
  return input.contentType.includes("pdf") || /\.pdf(?:$|[?#])/i.test(input.finalUrl)
    ? CREATE_EXTERNAL_PDF_MAX_BYTES
    : CREATE_EXTERNAL_HTML_MAX_BYTES;
}

function isSupportedTextContentType(contentType: string): boolean {
  return (
    contentType.includes("text/html") ||
    contentType.includes("text/plain") ||
    contentType.includes("application/xhtml+xml")
  );
}

function isSupportedPdfContentType(contentType: string): boolean {
  return (
    !contentType ||
    contentType.includes("application/pdf") ||
    contentType.includes("application/octet-stream")
  );
}

function decodeUtf8Text(buffer: Buffer): string {
  if (buffer.includes(0)) throw new Error("external_source_text_binary_invalid");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("external_source_text_binary_invalid");
  }
  let controls = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) controls += 1;
  }
  if (controls > Math.max(2, Math.floor(text.length * 0.005))) {
    throw new Error("external_source_text_binary_invalid");
  }
  return text;
}

function inferDocumentType(
  url: string,
  contentType: string,
): DocumentAnalysisSummary["documentType"] {
  const haystack = `${url} ${contentType}`.toLowerCase();
  if (/programm|manifest|grundsatz/.test(haystack)) return "party_program";
  if (/gesetz|law|bill|verordnung/.test(haystack)) return "law";
  if (/studie|study/.test(haystack)) return "study";
  if (/bericht|report|pdf/.test(haystack)) return "report";
  if (/html|article|news|blog/.test(haystack)) return "article";
  return "unknown";
}

function inferDocumentTitle(url: string, html?: string): string | null {
  const titleMatch = html?.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  if (titleMatch) return decodeHtmlEntities(titleMatch);
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return slug ? decodeURIComponent(slug).replace(/[-_]+/g, " ") : null;
  } catch {
    return null;
  }
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function validateCreateExternalSourceUrl(rawUrl: string): void {
  if (isCreateSourceUrlSensitiveOrMalformed(rawUrl)) {
    throw new Error("external_source_sensitive_url_blocked");
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("external_source_url_invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("external_source_protocol_blocked");
  }
  if (parsed.username || parsed.password) {
    throw new Error("external_source_credentials_blocked");
  }
}

export function isCreateYoutubeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

export async function loadCreateExternalSource(url: string): Promise<CreateExternalSource> {
  validateCreateExternalSourceUrl(url);

  if (isCreateYoutubeUrl(url)) {
    const transcript = await fetchYoutubeTranscript(url);
    const text = transcript.text.replace(/\s+/g, " ").trim();
    if (!text) {
      throw new CreateYoutubeTranscriptError(
        transcript.failureReason ?? "unavailable",
      );
    }
    return {
      sourceKind: "youtube_transcript",
      text,
      pageCount: null,
      contentType: "text/plain; source=youtube-transcript",
      documentType: "unknown",
      documentTitle: `YouTube ${transcript.id}`,
      httpStatus: 200,
      finalUrl: new URL(url).href,
      contentHash: sha256(text),
      sourceLocale: transcript.lang ?? "und",
      transcriptSegmentCount: transcript.segmentCount,
    };
  }

  const response = await safeExternalFetch(url, {
    accept: "text/html,application/pdf,text/plain;q=0.9,application/xhtml+xml;q=0.8",
    maxBytes: maxSourceBytes,
    timeoutMs: CREATE_EXTERNAL_FETCH_TIMEOUT_MS,
    userAgent: "eDebatte Create Link Analysis",
    validateUrl: validateCreateExternalSourceUrl,
  });
  const { buffer, contentType } = response;
  const declaredPdf =
    contentType.includes("pdf") ||
    /\.pdf(?:$|[?#])/i.test(url) ||
    /\.pdf(?:$|[?#])/i.test(response.finalUrl);
  const actualPdf = hasPdfSignature(buffer);

  if (declaredPdf && !actualPdf) {
    throw new Error("external_source_pdf_signature_invalid");
  }

  if (actualPdf) {
    if (!isSupportedPdfContentType(contentType)) {
      throw new Error("external_source_content_type_unsupported");
    }
    const extracted = await extractCreatePdfText(buffer);
    return {
      sourceKind: "pdf",
      text: extracted.text,
      pageCount: extracted.pageCount,
      contentType,
      documentType: inferDocumentType(
        `${url} ${response.finalUrl}`,
        contentType,
      ),
      documentTitle: inferDocumentTitle(response.finalUrl),
      httpStatus: response.status,
      finalUrl: response.finalUrl,
      contentHash: sha256(buffer),
      sourceLocale: "und",
      transcriptSegmentCount: null,
    };
  }

  if (!contentType || !isSupportedTextContentType(contentType)) {
    throw new Error("external_source_content_type_unsupported");
  }

  const html = decodeUtf8Text(buffer);
  return {
    sourceKind: "html",
    text: stripHtmlToText(html),
    pageCount: null,
    contentType,
    documentType: inferDocumentType(
      `${url} ${response.finalUrl}`,
      contentType,
    ),
    documentTitle: inferDocumentTitle(response.finalUrl, html),
    httpStatus: response.status,
    finalUrl: response.finalUrl,
    contentHash: sha256(buffer),
    sourceLocale: "und",
    transcriptSegmentCount: null,
  };
}
