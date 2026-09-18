import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const DEFAULT_OPENGRAPH_IMAGE_PATH = "/opengraph-image";

export const PUBLIC_DISCOVERY_PATHS = [
  "/",
  "/themen",
  "/runden",
  "/beteiligung",
  "/factcheck",
  "/pricing",
  "/pricing/institutionen",
  "/pricing/institutionen/decision-intelligence",
] as const;

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} as const;

type BuildPublicPageMetadataInput = {
  path: string;
  title: string;
  description: string;
  ogType?: "website" | "article";
};

export type PublicSitemapEntry = {
  url: string;
};

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function resolveSeoImageUrl(path = DEFAULT_OPENGRAPH_IMAGE_PATH): string {
  return new URL(normalizePath(path), BRAND.baseUrl).toString();
}

export function buildPublicPageMetadata(input: BuildPublicPageMetadataInput): Metadata {
  const canonicalPath = normalizePath(input.path);
  const imageUrl = resolveSeoImageUrl();

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: new URL(canonicalPath, BRAND.baseUrl).toString(),
      siteName: BRAND.name,
      type: input.ogType ?? "website",
      locale: "de_DE",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [imageUrl],
    },
  };
}

export function buildStaticPublicDiscoverySitemap(): PublicSitemapEntry[] {
  return PUBLIC_DISCOVERY_PATHS.map((path) => ({
    url: new URL(path, BRAND.baseUrl).toString(),
  }));
}

export function buildHomeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BRAND.baseUrl}/#website`,
    name: BRAND.name,
    url: BRAND.baseUrl,
    inLanguage: "de-DE",
    description: BRAND.tagline_de,
    publisher: {
      "@type": "Organization",
      "@id": `${BRAND.baseUrl}/#organization`,
      name: BRAND.name,
      url: BRAND.baseUrl,
      email: BRAND.contactEmail,
    },
  };
}
