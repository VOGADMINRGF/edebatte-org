import type { EditorialSourceClass } from "./schemas";

export type PublisherKey =
  | "reuters"
  | "ap"
  | "afp"
  | "dpa"
  | "bloomberg"
  | "un"
  | "who"
  | "osce"
  | "oecd"
  | "europa"
  | "bund"
  | "bundesregierung"
  | "auswaertiges_amt"
  | "tagesschau"
  | "spiegel"
  | "zeit"
  | "bbc"
  | "cnn"
  | "nytimes"
  | "washingtonpost"
  | "guardian"
  | "amnesty"
  | "hrw"
  | "icrc"
  | "msf"
  | "greenpeace"
  | "unknown";

export type PublisherRule = {
  key: PublisherKey;
  class: EditorialSourceClass;
  host?: RegExp;
  haystack?: RegExp;
  label?: string;
};

export const PUBLISHER_RULES: PublisherRule[] = [
  { key: "reuters", class: "wire_service", host: /(^|\.)reuters\.com$/i, haystack: /\breuters\b/i, label: "Reuters" },
  { key: "ap", class: "wire_service", host: /(^|\.)apnews\.com$/i, haystack: /\b(associated press|apnews)\b/i, label: "AP" },
  { key: "afp", class: "wire_service", host: /(^|\.)afp\.com$/i, haystack: /\bafp\b/i, label: "AFP" },
  { key: "dpa", class: "wire_service", host: /(^|\.)dpa\.com$/i, haystack: /\bdpa\b/i, label: "dpa" },
  { key: "bloomberg", class: "wire_service", host: /(^|\.)bloomberg\.com$/i, haystack: /\bbloomberg\b/i, label: "Bloomberg" },

  { key: "un", class: "igo_un", host: /(^|\.)un\.org$/i, haystack: /\bun\.org\b/i, label: "UN" },
  { key: "who", class: "igo_un", host: /(^|\.)who\.int$/i, haystack: /\bwho\.int\b/i, label: "WHO" },
  { key: "osce", class: "igo_un", host: /(^|\.)osce\.org$/i, haystack: /\bosce\b/i, label: "OSCE" },
  { key: "oecd", class: "igo_un", host: /(^|\.)oecd\.org$/i, haystack: /\boecd\b/i, label: "OECD" },
  { key: "europa", class: "igo_un", host: /(^|\.)europa\.eu$/i, haystack: /\beuropa\.eu\b/i, label: "EU" },

  { key: "bund", class: "gov", host: /(^|\.)bund\.de$/i, haystack: /\bbund\.de\b/i, label: "Bund" },
  { key: "bundesregierung", class: "gov", host: /(^|\.)bundesregierung\.de$/i, haystack: /\bbundesregierung\b/i, label: "Bundesregierung" },
  { key: "auswaertiges_amt", class: "gov", host: /(^|\.)auswaertiges-amt\.de$/i, haystack: /\bauswaertiges amt\b/i, label: "AA" },

  { key: "tagesschau", class: "independent_media", host: /(^|\.)tagesschau\.de$/i, haystack: /\btagesschau\b/i, label: "tagesschau" },
  { key: "spiegel", class: "independent_media", host: /(^|\.)spiegel\.de$/i, haystack: /\bspiegel\b/i, label: "Der Spiegel" },
  { key: "zeit", class: "independent_media", host: /(^|\.)zeit\.de$/i, haystack: /\bzeit\b/i, label: "Die Zeit" },
  { key: "bbc", class: "independent_media", host: /(^|\.)bbc\.co\.uk$/i, haystack: /\bbbc\b/i, label: "BBC" },
  { key: "cnn", class: "independent_media", host: /(^|\.)cnn\.com$/i, haystack: /\bcnn\b/i, label: "CNN" },
  { key: "nytimes", class: "independent_media", host: /(^|\.)nytimes\.com$/i, haystack: /\bnytimes\b|\bnew york times\b/i, label: "NYT" },
  { key: "washingtonpost", class: "independent_media", host: /(^|\.)washingtonpost\.com$/i, haystack: /\bwashington post\b|\bwapo\b/i, label: "Washington Post" },
  { key: "guardian", class: "independent_media", host: /(^|\.)theguardian\.com$/i, haystack: /\bguardian\b/i, label: "The Guardian" },

  { key: "amnesty", class: "ngo", haystack: /\bamnesty\b/i, label: "Amnesty" },
  { key: "hrw", class: "ngo", haystack: /\b(human rights watch|hrw)\b/i, label: "HRW" },
  { key: "icrc", class: "ngo", haystack: /\b(icrc|international committee of the red cross|rotes kreuz)\b/i, label: "ICRC" },
  { key: "msf", class: "ngo", haystack: /\b(msf|medecins sans frontieres|aerzte ohne grenzen)\b/i, label: "MSF" },
  { key: "greenpeace", class: "ngo", haystack: /\bgreenpeace\b/i, label: "Greenpeace" },
];

export function normalizePublisherString(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s.-]/g, "")
    .trim();
}

export function matchPublisher(args: { host: string; haystack: string }): PublisherRule | null {
  const host = args.host || "";
  const hay = args.haystack || "";
  for (const r of PUBLISHER_RULES) if (r.host && host && r.host.test(host)) return r;
  for (const r of PUBLISHER_RULES) if (r.haystack && r.haystack.test(hay)) return r;
  return null;
}
