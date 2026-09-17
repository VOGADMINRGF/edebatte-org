import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const DEFAULT_OPENGRAPH_IMAGE_PATH = "/opengraph-image";

export const PUBLIC_DISCOVERY_PATHS = [
  "/",
  "/warum-edebatte",
  "/vergleich",
  "/vergleich/consul",
  "/vergleich/decidim",
  "/vergleich/aula",
  "/vergleich/adhocracy-plus",
  "/vergleich/meinberlin",
  "/vergleich/govocal",
  "/vergleich/make-org",
  "/vergleich/polis",
  "/vergleich/your-priorities",
  "/vergleich/crowdinsights",
  "/vergleich/werdenktwas",
  "/en/why-edebatte",
  "/en/civic-tech-landscape",
  "/themen",
  "/runden",
  "/beteiligung",
  "/factcheck",
  "/pricing",
  "/pricing/institutionen",
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
  locale?: "de_DE" | "en_US";
  languageAlternates?: Readonly<Record<string, string>>;
};

type SitemapEntry = {
  url: string;
  changeFrequency: "daily" | "weekly";
  priority: number;
  alternates?: {
    languages: Record<string, string>;
  };
};

const LANGUAGE_PAIRS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "/warum-edebatte": {
    de: "/warum-edebatte",
    en: "/en/why-edebatte",
    "x-default": "/warum-edebatte",
  },
  "/en/why-edebatte": {
    de: "/warum-edebatte",
    en: "/en/why-edebatte",
    "x-default": "/warum-edebatte",
  },
  "/vergleich": {
    de: "/vergleich",
    en: "/en/civic-tech-landscape",
    "x-default": "/vergleich",
  },
  "/en/civic-tech-landscape": {
    de: "/vergleich",
    en: "/en/civic-tech-landscape",
    "x-default": "/vergleich",
  },
};

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function publicPriority(path: string): number {
  if (path === "/") return 1;
  if (path === "/warum-edebatte" || path === "/en/why-edebatte") return 0.95;
  if (path === "/vergleich" || path === "/en/civic-tech-landscape") return 0.9;
  if (path.startsWith("/vergleich/")) return 0.8;
  return 0.7;
}

function absoluteLanguageAlternates(path: string): Record<string, string> | undefined {
  const pair = LANGUAGE_PAIRS[path];
  if (!pair) return undefined;
  return Object.fromEntries(
    Object.entries(pair).map(([language, target]) => [language, new URL(target, BRAND.baseUrl).toString()]),
  );
}

export function resolveSeoImageUrl(path = DEFAULT_OPENGRAPH_IMAGE_PATH): string {
  return new URL(normalizePath(path), BRAND.baseUrl).toString();
}

export function buildPublicPageMetadata(input: BuildPublicPageMetadataInput): Metadata {
  const canonicalPath = normalizePath(input.path);
  const imageUrl = resolveSeoImageUrl();
  const languages = input.languageAlternates ?? LANGUAGE_PAIRS[canonicalPath];

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalPath,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: new URL(canonicalPath, BRAND.baseUrl).toString(),
      siteName: BRAND.name,
      type: input.ogType ?? "website",
      locale: input.locale ?? "de_DE",
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

export function buildPublicDiscoverySitemap(): SitemapEntry[] {
  return PUBLIC_DISCOVERY_PATHS.map((path) => {
    const languages = absoluteLanguageAlternates(path);
    return {
      url: new URL(path, BRAND.baseUrl).toString(),
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: publicPriority(path),
      ...(languages ? { alternates: { languages } } : {}),
    };
  });
}

export function buildHomeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    alternateName: "eDebatte – democratic problem-solving infrastructure",
    url: BRAND.baseUrl,
    inLanguage: "de-DE",
    description: BRAND.tagline_de,
    about: [
      "digitale Bürgerbeteiligung",
      "gesellschaftliche Willensbildung",
      "Agenda-Setting",
      "evidenzbasierte Deliberation",
      "democratic problem-solving",
      "civic collective intelligence",
      "public reasoning",
      "deliberative democracy",
      "citizen participation",
    ],
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.baseUrl,
      email: BRAND.contactEmail,
    },
  };
}
