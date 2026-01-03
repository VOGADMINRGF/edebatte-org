/**
 * Drift8: ContextPacks - curated, versioned context artifacts (metadata only).
 */
import { bilingual, type I18nString } from "@features/i18n/i18nText";

export type ContextPackRef = {
  id: string;
  version: string;
  title: string;
  titleI18n?: I18nString;
  scope: { domains: string[]; region?: string; topic?: string };
  summary?: string;
  summaryI18n?: I18nString;
};

const PACKS: ContextPackRef[] = [
  {
    id: "cp_conflict_reporting_basics",
    version: "2026-01-02.2",
    title: "Konfliktberichterstattung - Basiskontext (Begriffe, Akteure, Zeitachsen)",
    titleI18n: bilingual(
      "de",
      "Konfliktberichterstattung - Basiskontext (Begriffe, Akteure, Zeitachsen)",
      "Conflict reporting - baseline context (terms, actors, timelines)",
    ),
    scope: { domains: ["sicherheit", "aussenbeziehungen_eu", "aussenbeziehungen_nachbarlaender"] },
    summary: "Checkliste: Akteure, Zeitachse, Rechtsrahmen, Definitionsklarheit, Beweislast.",
    summaryI18n: bilingual(
      "de",
      "Checkliste: Akteure, Zeitachse, Rechtsrahmen, Definitionsklarheit, Beweislast.",
      "Checklist: actors, timeline, legal frame, term clarity, burden of proof.",
    ),
  },
  {
    id: "cp_human_rights_frame",
    version: "2026-01-02.2",
    title: "Menschenrechte/Wuerde - Prueffragen & Begriffspraezision",
    titleI18n: bilingual(
      "de",
      "Menschenrechte/Wuerde - Prueffragen & Begriffspraezision",
      "Human rights/dignity - checks & term precision",
    ),
    scope: { domains: ["gesellschaft", "sicherheit"] },
    summary: "Prueffragen: Schutzgueter, Betroffene als Expert:innen, Agency/Framing, Evidenz.",
    summaryI18n: bilingual(
      "de",
      "Prueffragen: Schutzgueter, Betroffene als Expert:innen, Agency/Framing, Evidenz.",
      "Checks: protected interests, affected as experts, agency/framing, evidence.",
    ),
  },
];

export function listContextPacks(): ContextPackRef[] {
  return PACKS.slice();
}

export function getContextPacksByIds(ids: string[] | undefined): ContextPackRef[] {
  if (!Array.isArray(ids) || !ids.length) return [];
  const set = new Set(ids);
  return PACKS.filter((p) => set.has(p.id));
}

export function suggestContextPacks(domains: string[] | undefined): ContextPackRef[] {
  const ds = Array.isArray(domains) ? domains : [];
  if (!ds.length) return [];
  return PACKS.filter((p) => p.scope.domains.some((d) => ds.includes(d)));
}
