import { VOG_SUPPORT_URL } from "@/config/links";
import { BRAND } from "@/lib/brand";

export type EcosystemBrandId = "edebatte" | "voiceopengov" | "vote4gov" | "voxy";

export type AvailableEcosystemTarget =
  | Readonly<{
      status: "available";
      kind: "internal";
      href: `/${string}`;
    }>
  | Readonly<{
      status: "available";
      kind: "external";
      href: `https://${string}`;
    }>;

export type UnavailableEcosystemTarget = Readonly<{
  status: "unavailable";
  kind: "none";
  href: null;
}>;

export type EcosystemTarget = AvailableEcosystemTarget | UnavailableEcosystemTarget;

export type EcosystemBrand = Readonly<{
  id: EcosystemBrandId;
  displayName: string;
  canonicalRole: string;
  description: string;
  relationshipToEDebatte: string;
  target: EcosystemTarget;
}>;

function availableInternalTarget(href: string): AvailableEcosystemTarget {
  if (!href.startsWith("/") || href.startsWith("//")) {
    throw new Error(`Invalid internal ecosystem target: ${href}`);
  }

  return { status: "available", kind: "internal", href: href as `/${string}` };
}

function availableExternalTarget(href: string): AvailableEcosystemTarget {
  const url = new URL(href);
  if (url.protocol !== "https:") {
    throw new Error(`Invalid external ecosystem target: ${href}`);
  }

  return { status: "available", kind: "external", href: href as `https://${string}` };
}

const UNAVAILABLE_TARGET: UnavailableEcosystemTarget = {
  status: "unavailable",
  kind: "none",
  href: null,
};

const eDebatteBaseUrl = new URL(BRAND.baseUrl);

export const ECOSYSTEM_BRANDS = [
  {
    id: "edebatte",
    displayName: BRAND.name,
    canonicalRole: "Unabhängiger Evidenz-, Beteiligungs- und Entscheidungsraum",
    description:
      "Offene Infrastruktur für Quellen, Dossiers, Gegenpositionen, Alternativen, Beteiligung sowie versionierte Mehrheits- und Minderheitenentscheidungen.",
    relationshipToEDebatte:
      "eDebatte bleibt für Bürger, Kommunen, Unternehmen, Vereine, Parteien, Wissenschaft, Medien, NGOs und andere Akteure unabhängig nutzbar.",
    target: availableInternalTarget(eDebatteBaseUrl.pathname),
  },
  {
    id: "voiceopengov",
    displayName: "VoiceOpenGov",
    canonicalRole: "Politische Repräsentations- und Umsetzungsschicht",
    description:
      "VoiceOpenGov organisiert regionale Präsenz und politische Verantwortlichkeit für gültige eDebatte-Mehrheitsmandate.",
    relationshipToEDebatte:
      "VoiceOpenGov besitzt eDebatte nicht, verpflichtet seine politische Repräsentation aber an gültig abgeschlossene eDebatte-Entscheidungen innerhalb ihres definierten Geltungsbereichs. Entwürfe oder laufende Debatten binden nicht.",
    target: availableExternalTarget(VOG_SUPPORT_URL),
  },
  {
    id: "vote4gov",
    displayName: "Vote4Gov",
    canonicalRole: "Persönlicher Denk- und Entwurfsraum",
    description:
      "Ricky Gerd Fleischers persönliche öffentliche Stimme für Thesen, historische Herleitungen, Systemkritik, internationale Vergleiche und einen eigenen überprüfbaren Gegenentwurf.",
    relationshipToEDebatte:
      "Vote4Gov kann Thesen zur offenen Prüfung an eDebatte übergeben. Persönliche Vote4Gov-Positionen sind vor einer gültigen Entscheidung keine Position der eDebatte-Gemeinschaft oder von VoiceOpenGov.",
    target: UNAVAILABLE_TARGET,
  },
  {
    id: "voxy",
    displayName: "Voxy",
    canonicalRole: "Erklär- und Übersetzungsschicht",
    description:
      "Voxy erklärt, strukturiert und übersetzt Inhalte und Unsicherheiten, ohne politische oder organisatorische Entscheidungen zu treffen.",
    relationshipToEDebatte:
      "Voxy begleitet eDebatte und ist weder Eigentümer, Entscheider noch Veröffentlichungsautomatismus.",
    target: UNAVAILABLE_TARGET,
  },
] as const satisfies readonly EcosystemBrand[];

export function getEcosystemBrand(id: EcosystemBrandId): EcosystemBrand {
  const brand = ECOSYSTEM_BRANDS.find((candidate) => candidate.id === id);
  if (!brand) {
    throw new Error(`Unknown ecosystem brand: ${id}`);
  }
  return brand;
}

export function getEcosystemHref(brand: EcosystemBrand): string | null {
  return brand.target.status === "available" ? brand.target.href : null;
}
