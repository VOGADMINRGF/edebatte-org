import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { resolveSeoImageUrl } from "@/lib/seo/publicDiscovery";
import type { ShareObjectType } from "@features/share/socialOutputContract";

type BuildShareMetadataInput = {
  objectType: ShareObjectType;
  pathOrUrl: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  ogType?: "website" | "article" | "video.other";
};

const DESCRIPTION_FALLBACK: Record<ShareObjectType, string> = {
  dossier: "Dossier mit Kontext, Konfliktlinien und nachvollziehbaren Anschlussfragen.",
  factcheck: "Factcheck mit Prüfstatus, Evidenzbezug und transparentem Workflow.",
  companion: "Companion als Kontextdialog mit routegebundenem Bezug.",
  topic_round: "Themenrunde mit offenem Anlasskontext und Anschlussoptionen.",
  stream: "Event-Kontext mit sachlicher Einordnung und transparenten Beteiligungshinweisen.",
  report: "Report mit neutraler Auswertung und nachvollziehbaren Grundlagen.",
  analyze: "Analyse mit strukturierter Einordnung und offenen Fragen.",
};

function toClean(value: unknown, max = 220): string {
  if (typeof value !== "string") return "";
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1");
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function toAbsolute(pathOrUrl: string): string {
  const raw = toClean(pathOrUrl, 600);
  if (!raw) return BRAND.baseUrl;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BRAND.baseUrl}${normalized}`;
}

function toCanonicalPath(pathOrUrl: string): string {
  const raw = toClean(pathOrUrl, 600);
  if (!raw) return "/";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      return `${parsed.pathname || "/"}${parsed.search || ""}${parsed.hash || ""}`;
    } catch {
      return "/";
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function buildShareMetadata(input: BuildShareMetadataInput): Metadata {
  const title = toClean(input.title, 110) || "eDebatte";
  const description =
    toClean(input.description, 220) || DESCRIPTION_FALLBACK[input.objectType];
  const canonicalPath = toCanonicalPath(input.pathOrUrl);
  const absoluteUrl = toAbsolute(input.pathOrUrl);
  const imageUrl = toClean(input.imageUrl, 600) || resolveSeoImageUrl();
  // Stream/event pages may or may not contain playable media. The generic metadata layer
  // cannot prove that capability, so it must not advertise an OpenGraph video type.
  const ogType = input.objectType === "stream" ? "website" : input.ogType ?? "article";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl,
      siteName: BRAND.name,
      type: ogType,
      locale: "de_DE",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
