import type { EditorialSourceClass } from "./schemas";
import { canonicalizeUrl } from "./urlCanonical";
import { matchPublisher, normalizePublisherString, type PublisherKey } from "./publisherRegistry";

export type AnySource = {
  url?: string;
  link?: string;
  href?: string;
  title?: string;
  snippet?: string;
  publisher?: string;
  source?: string;
  domain?: string;
  siteName?: string;
  name?: string;
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function pickUrl(s: AnySource): string {
  return safeStr(s.url) || safeStr(s.link) || safeStr(s.href);
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getPublisherKey(s: AnySource): PublisherKey {
  const url = pickUrl(s);
  const { host } = canonicalizeUrl(url || "");
  const pub = normalizePublisherString(s.publisher || s.source || s.siteName || s.name || "");
  const hay = normalizePublisherString(`${pub} ${s.title ?? ""} ${s.snippet ?? ""} ${s.domain ?? ""}`);
  const m = matchPublisher({ host, haystack: hay });
  return (m?.key as PublisherKey) ?? "unknown";
}

export function classifySource(s: AnySource): EditorialSourceClass {
  const url = pickUrl(s);
  const { host } = canonicalizeUrl(url || "");
  const pub = normalizePublisherString(s.publisher || s.source || s.siteName || s.name || "");
  const hay = normalizePublisherString(`${pub} ${s.title ?? ""} ${s.snippet ?? ""} ${s.domain ?? ""}`);
  const m = matchPublisher({ host, haystack: hay });
  return (m?.class as EditorialSourceClass) ?? "unknown";
}
