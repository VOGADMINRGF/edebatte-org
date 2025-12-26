import type { StatementRecord } from "./schemas";
import { DOMAIN_KEYS } from "./schemas";

export type DomainKey = (typeof DOMAIN_KEYS)[number];

const BASE_DE_LABELS: Record<string, string> = {
  gesellschaft: "Gesellschaft",
  nachbarschaft: "Nachbarschaft",
  aussenbeziehungen_nachbarlaender: "Beziehungen zu Nachbarstaaten",
  aussenbeziehungen_eu: "EU / Europa",
  aussenbeziehungen_schengen: "Schengen / Freizügigkeit",
  aussenbeziehungen_g7: "G7",
  aussenbeziehungen_g20: "G20",
  aussenbeziehungen_un: "UN / UNO",
  aussenbeziehungen_nato: "NATO",
  aussenbeziehungen_oecd: "OECD",
  aussenbeziehungen_global: "International / Global",
  innenpolitik: "Innenpolitik",
  wirtschaft: "Wirtschaft",
  bildung: "Bildung",
  gesundheit: "Gesundheit",
  sicherheit: "Sicherheit",
  klima_umwelt: "Klima & Umwelt",
  digitales: "Digitales",
  infrastruktur: "Infrastruktur",
  justiz: "Justiz",
  kultur_medien: "Kultur & Medien",
  sonstiges: "Sonstiges",
};

const BASE_EN_LABELS: Record<string, string> = {
  gesellschaft: "Society",
  nachbarschaft: "Neighbourhood",
  aussenbeziehungen_nachbarlaender: "Relations with neighbouring countries",
  aussenbeziehungen_eu: "EU / Europe",
  aussenbeziehungen_schengen: "Schengen / free movement",
  aussenbeziehungen_g7: "G7",
  aussenbeziehungen_g20: "G20",
  aussenbeziehungen_un: "UN / United Nations",
  aussenbeziehungen_nato: "NATO",
  aussenbeziehungen_oecd: "OECD",
  aussenbeziehungen_global: "International / Global",
  innenpolitik: "Domestic policy",
  wirtschaft: "Economy",
  bildung: "Education",
  gesundheit: "Health",
  sicherheit: "Security",
  klima_umwelt: "Climate & Environment",
  digitales: "Digital",
  infrastruktur: "Infrastructure",
  justiz: "Justice",
  kultur_medien: "Culture & Media",
  sonstiges: "Other",
};

export function labelDomain(key?: string | null, locale?: string): string {
  if (!key) return "";
  const map = (locale ?? "de").toLowerCase().startsWith("en") ? BASE_EN_LABELS : BASE_DE_LABELS;
  return map[key] ?? key;
}

export function statementDomainKeys(s: Pick<StatementRecord, "domains" | "domain">): string[] {
  const arr =
    (Array.isArray(s.domains) && s.domains.length ? s.domains : null) ??
    (typeof s.domain === "string" && s.domain.trim() ? [s.domain.trim()] : null) ??
    [];
  return arr
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function statementDomainLabels(
  s: Pick<StatementRecord, "domains" | "domain">,
  locale?: string,
): string[] {
  return statementDomainKeys(s).map((k) => labelDomain(k, locale));
}

export const EDITORIAL_DOMAIN_GUIDE = `
Redaktionelle Zuordnung (domain/domains):
- Bevorzugte Keys (klein, underscore):
  gesellschaft | nachbarschaft |
  aussenbeziehungen_nachbarlaender | aussenbeziehungen_eu | aussenbeziehungen_schengen |
  aussenbeziehungen_g7 | aussenbeziehungen_g20 | aussenbeziehungen_un | aussenbeziehungen_nato |
  aussenbeziehungen_oecd | aussenbeziehungen_global |
  innenpolitik | wirtschaft | bildung | gesundheit | sicherheit | klima_umwelt | digitales |
  infrastruktur | justiz | kultur_medien | sonstiges

Definitionen:
- gesellschaft: gesellschaftlicher Zusammenhalt, Teilhabe, Soziales, Gleichstellung, Integration, Kultur des Miteinanders.
- nachbarschaft: unmittelbares Umfeld/Quartier, lokale Gemeinschaft, Wohnumfeld, direkte lokale Interaktion.
- aussenbeziehungen_nachbarlaender: Beziehungen/Abkommen/Konflikte/Kooperationen mit konkreten Nachbarstaaten.
- aussenbeziehungen_eu: EU-Institutionen, EU-Recht, EU-Programme, EU-Verordnungen (auch aus Drittstaaten-Perspektive).
- aussenbeziehungen_schengen: Schengen-Raum, Freizügigkeit, Grenzregime.
- aussenbeziehungen_g7/g20/un/nato/oecd/global: internationale Ebene, spez. Bündnisse/Foren.

Mehrere passend?
- domains als Array setzen (z.B. ["gesellschaft","aussenbeziehungen_nachbarlaender"]).
- domain als primäre (domains[0]) belassen.
`.trim();
