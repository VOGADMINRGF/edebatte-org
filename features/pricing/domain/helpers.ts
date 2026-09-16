import { EDEBATTE_PACKAGES_DE, EDEBATTE_PACKAGE_IDS } from "./plans.de";
import { EDEBATTE_PACKAGES_EN } from "./plans.en";
import { normalizePricingLocale, type PricingLocale } from "./i18n";
import type { EDebattePackageDefinition, EDebattePackageId } from "./types";

const PACKAGE_ID_SET = new Set<EDebattePackageId>(EDEBATTE_PACKAGE_IDS);
const LEGACY_PACKAGE_ALIASES: Record<string, EDebattePackageId> = {
  "pilot-b2g": "b2g_basis",
  "pilot-b2b": "b2b_basis",
};

const CURRENT_PRIVATE_PRICING: Record<
  "basis" | "start" | "pro",
  Record<PricingLocale, Partial<EDebattePackageDefinition>>
> = {
  basis: {
    de: {
      titel: "eDebatte Free",
      preisMonat: 0,
      preisLabel: "0 € / Monat",
      beschreibungKurz: "Kostenfreier Einstieg für gesellschaftliche Beteiligung und das Einbringen eigener Anliegen.",
      unterschiedZurNaechstenStufe: "Plus ergänzt erweiterte Prüf-, Analyse- und Arbeitsfunktionen.",
      ctaText: "Kostenlos starten",
      ctaHref: "/register",
      hervorgehoben: false,
    },
    en: {
      titel: "eDebatte Free",
      preisMonat: 0,
      preisLabel: "€0 / month",
      beschreibungKurz: "Free entry for civic participation and submitting your own concerns.",
      unterschiedZurNaechstenStufe: "Plus adds extended review, analysis and working features.",
      ctaText: "Start free",
      ctaHref: "/register",
      hervorgehoben: false,
    },
  },
  start: {
    de: {
      titel: "eDebatte Plus",
      preisMonat: 7.99,
      preisLabel: "7,99 € / Monat",
      beschreibungKurz: "Erweiterter Arbeits- und Prüfmodus mit zusätzlichen Beitrags-, Analyse- und Recherchefunktionen.",
      unterschiedZurNaechstenStufe: "Pro ergänzt die vertiefte Ausarbeitung und das größere Arbeitskontingent.",
      ctaText: "Plus wählen",
      ctaHref: "/pricing?checkout=start",
      hervorgehoben: true,
    },
    en: {
      titel: "eDebatte Plus",
      preisMonat: 7.99,
      preisLabel: "€7.99 / month",
      beschreibungKurz: "Extended work and review mode with additional contribution, analysis and research features.",
      unterschiedZurNaechstenStufe: "Pro adds deeper elaboration and a larger working allowance.",
      ctaText: "Choose Plus",
      ctaHref: "/pricing?checkout=start",
      hervorgehoben: true,
    },
  },
  pro: {
    de: {
      titel: "eDebatte Pro",
      preisMonat: 19.99,
      preisLabel: "19,99 € / Monat",
      beschreibungKurz: "Vertiefter Arbeitsmodus mit erweiterten Analyse-, Recherche- und Ausarbeitungsfunktionen.",
      unterschiedZurNaechstenStufe: "Höchste öffentliche B2C-Stufe im aktuellen Modell.",
      ctaText: "Pro wählen",
      ctaHref: "/pricing?checkout=pro",
      hervorgehoben: false,
    },
    en: {
      titel: "eDebatte Pro",
      preisMonat: 19.99,
      preisLabel: "€19.99 / month",
      beschreibungKurz: "Deeper working mode with extended analysis, research and elaboration features.",
      unterschiedZurNaechstenStufe: "Highest public B2C tier in the current model.",
      ctaText: "Choose Pro",
      ctaHref: "/pricing?checkout=pro",
      hervorgehoben: false,
    },
  },
};

function applyCurrentPrivatePricing(pkg: EDebattePackageDefinition, locale: PricingLocale) {
  if (pkg.id !== "basis" && pkg.id !== "start" && pkg.id !== "pro") return pkg;
  return { ...pkg, ...CURRENT_PRIVATE_PRICING[pkg.id][locale] } as EDebattePackageDefinition;
}

export function normalizePackageId(value?: string | null): EDebattePackageId | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/^edb-/, "");
  if (LEGACY_PACKAGE_ALIASES[normalized]) {
    return LEGACY_PACKAGE_ALIASES[normalized];
  }
  if (PACKAGE_ID_SET.has(normalized as EDebattePackageId)) {
    return normalized as EDebattePackageId;
  }
  return null;
}

export function getPackagesForLocale(locale: PricingLocale = "de") {
  const packages = locale === "en" ? EDEBATTE_PACKAGES_EN : EDEBATTE_PACKAGES_DE;
  return packages.map((pkg) => applyCurrentPrivatePricing(pkg, locale));
}

export function getEdebatePackageById(id: string, locale: PricingLocale = "de") {
  return getPackagesForLocale(locale).find((pkg) => pkg.id === id) ?? null;
}

export const PRIVATE_PACKAGE_IDS = ["basis", "start", "pro"] as const;
export const JOURNALIST_PACKAGE_IDS = ["journal_basis", "journal_pro"] as const;
export const B2B_PACKAGE_IDS = ["b2b_basis", "b2b_pro"] as const;
export const B2G_PACKAGE_IDS = ["b2g_basis", "b2g_pro"] as const;

export function getPackagesByIds(ids: readonly EDebattePackageId[], locale: PricingLocale = "de") {
  const wanted = new Set(ids);
  return getPackagesForLocale(locale).filter((pkg) => wanted.has(pkg.id));
}

export function resolvePricingLocaleFromLangParam(value?: string | null): PricingLocale {
  return normalizePricingLocale(value ?? null);
}

export function toEdebatePlanId(id: EDebattePackageId) {
  return `edb-${id}` as const;
}
