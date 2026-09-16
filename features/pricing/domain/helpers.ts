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
      fuerWen: "Für alle, die Themen verstehen, Anliegen einbringen, lesen, swipen und mitwirken möchten.",
      wofuerGedacht:
        "Beteiligung und Basiswissen bleiben frei: Anliegen und Beiträge, Dossiers und Evidenz, Grundstrukturierung und Basisfilter.",
      beschreibungKurz:
        "Offener Zugang zu Beteiligung, Evidenz und Grundverständnis – ohne sichtbare Beitrags- oder Anlassraumquoten als Tariflogik.",
      leistungen: [
        "Anliegen und Beiträge einbringen – ohne sichtbares Beitragskontingent als Tariflogik",
        "Dossiers, Evidenz und Quellenstand lesen",
        "Lesen, swipen und grundlegende Filter nutzen",
        "Grundstrukturierung und Einordnung durch eDebatte",
        "Demokratische Rechte und Faktenzugang bleiben unabhängig vom Paket gleich",
      ],
      unterschiedZurNaechstenStufe:
        "Plus macht eDebatte persönlicher und komfortabler – mit Verlauf, Watchlists, Filtern, Updates und Briefings.",
      ctaText: "Kostenlos starten",
      ctaHref: "/register",
      sekundarCtaText: "VoiceOpenGov kennenlernen",
      sekundarCtaHref: "https://voiceopengov.org/mitglied-werden",
      hervorgehoben: false,
    },
    en: {
      titel: "eDebatte Free",
      preisMonat: 0,
      preisLabel: "€0 / month",
      fuerWen: "For everyone who wants to understand topics, submit concerns, read, swipe and participate.",
      wofuerGedacht:
        "Participation and core knowledge stay free: concerns and contributions, dossiers and evidence, basic structuring and filters.",
      beschreibungKurz:
        "Open access to participation, evidence and core understanding — without visible contribution or issue-room quotas as plan logic.",
      leistungen: [
        "Submit concerns and contributions without a visible contribution quota as plan logic",
        "Read dossiers, evidence and source status",
        "Read, swipe and use basic filters",
        "Core structuring and contextualization by eDebatte",
        "Democratic rights and access to facts stay independent of the package",
      ],
      unterschiedZurNaechstenStufe:
        "Plus makes eDebatte more personal and convenient with history, watchlists, filters, updates and briefings.",
      ctaText: "Start free",
      ctaHref: "/register",
      sekundarCtaText: "Discover VoiceOpenGov",
      sekundarCtaHref: "https://voiceopengov.org/mitglied-werden",
      hervorgehoben: false,
    },
  },
  start: {
    de: {
      titel: "eDebatte Plus",
      preisMonat: 7.99,
      preisLabel: "7,99 € / Monat",
      fuerWen:
        "Für Menschen, die eDebatte regelmäßig nutzen und Veränderungen nicht jedes Mal neu zusammensuchen wollen.",
      wofuerGedacht:
        "Persönlicher Arbeits- und Überblicksmodus: speichern, verfolgen, filtern, benachrichtigen und geräteübergreifend fortsetzen.",
      beschreibungKurz:
        "Mehr Komfort im Alltag: persönlicher Verlauf, gespeicherte Themen, Watchlists, Updates, Zusammenfassungen und Voice-Briefings.",
      leistungen: [
        "Persönlicher Verlauf und geräteübergreifende Synchronisierung",
        "Gespeicherte Themen, Watchlists und erweiterte Filter",
        "Persönlicher Update-Feed mit „Was hat sich geändert?“",
        "Personalisierte Zusammenfassungen und Voice-Briefings",
        "Beobachtungen, Benachrichtigungen und übersichtliche Arbeitsansichten",
        "Kern-Evidenz und Beteiligung bleiben auch in Free zugänglich",
      ],
      unterschiedZurNaechstenStufe:
        "Pro ergänzt vertiefte Intelligence, Vergleiche, Monitoring, Arbeitsmappen, Exporte und intensivere KI-Unterstützung.",
      ctaText: "Plus wählen",
      ctaHref: "/pricing?checkout=start",
      sekundarCtaText: "VoiceOpenGov unterstützen",
      sekundarCtaHref: "https://voiceopengov.org/unterstuetzen",
      hervorgehoben: true,
    },
    en: {
      titel: "eDebatte Plus",
      preisMonat: 7.99,
      preisLabel: "€7.99 / month",
      fuerWen:
        "For people who use eDebatte regularly and do not want to reconstruct every change from scratch.",
      wofuerGedacht:
        "A personal work and overview mode: save, follow, filter, get notified and continue across devices.",
      beschreibungKurz:
        "More everyday convenience: personal history, saved topics, watchlists, updates, summaries and voice briefings.",
      leistungen: [
        "Personal history and cross-device synchronization",
        "Saved topics, watchlists and advanced filters",
        "Personal update feed with ‘What changed?’",
        "Personalized summaries and voice briefings",
        "Observations, notifications and clearer work views",
        "Core evidence and participation remain accessible in Free",
      ],
      unterschiedZurNaechstenStufe:
        "Pro adds deeper intelligence, comparisons, monitoring, workbooks, exports and more intensive AI assistance.",
      ctaText: "Choose Plus",
      ctaHref: "/pricing?checkout=start",
      sekundarCtaText: "Support VoiceOpenGov",
      sekundarCtaHref: "https://voiceopengov.org/unterstuetzen",
      hervorgehoben: true,
    },
  },
  pro: {
    de: {
      titel: "eDebatte Pro",
      preisMonat: 19.99,
      preisLabel: "19,99 € / Monat",
      fuerWen:
        "Für Menschen, die komplexe Themen fortlaufend beobachten, vergleichen und belastbar weiterbearbeiten wollen.",
      wofuerGedacht:
        "Tiefe Analyse statt Mengenpaket: Veränderungen, Vergleiche, Monitoring, Arbeitsmappen, beleggebundene Dossiers und Exporte.",
      beschreibungKurz:
        "Vertiefte Intelligence und Ausarbeitung für komplexe Themen – mit Monitoring, Vergleichen, Arbeitsmappen, Dossier- und Exportfunktionen.",
      leistungen: [
        "Alles aus Plus",
        "Vertiefte Vergleiche und Änderungsübersichten",
        "Monitoring, Briefings und fortlaufende Themenbeobachtung",
        "Arbeitsmappen und beleggebundene Dossier-Ausarbeitung",
        "Exporte, Analyse und Visualisierung für die eigene Weiterarbeit",
        "Erweiterte, fair-use-begrenzte KI-Unterstützung für Analyse und Verdichtung",
      ],
      unterschiedZurNaechstenStufe:
        "Höchste B2C-Komfort- und Intelligence-Stufe; politische Rechte und Faktenzugang bleiben unverändert.",
      ctaText: "Pro wählen",
      ctaHref: "/pricing?checkout=pro",
      sekundarCtaText: "VoiceOpenGov fördern",
      sekundarCtaHref: "https://voiceopengov.org/unterstuetzen",
      hervorgehoben: false,
    },
    en: {
      titel: "eDebatte Pro",
      preisMonat: 19.99,
      preisLabel: "€19.99 / month",
      fuerWen:
        "For people who want to continuously monitor, compare and work through complex topics in depth.",
      wofuerGedacht:
        "Deep analysis instead of quantity bundles: changes, comparisons, monitoring, workbooks, evidence-bound dossiers and exports.",
      beschreibungKurz:
        "Deeper intelligence and elaboration for complex topics with monitoring, comparisons, workbooks, dossier and export features.",
      leistungen: [
        "Everything in Plus",
        "Deeper comparisons and change overviews",
        "Monitoring, briefings and continuous topic observation",
        "Workbooks and evidence-bound dossier work",
        "Exports, analysis and visualization for your own workflow",
        "Expanded, fair-use-bounded AI assistance for analysis and synthesis",
      ],
      unterschiedZurNaechstenStufe:
        "Highest B2C convenience and intelligence tier; political rights and access to facts remain unchanged.",
      ctaText: "Choose Pro",
      ctaHref: "/pricing?checkout=pro",
      sekundarCtaText: "Support VoiceOpenGov",
      sekundarCtaHref: "https://voiceopengov.org/unterstuetzen",
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
