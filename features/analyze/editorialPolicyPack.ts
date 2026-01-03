/**
 * Drift8: PolicyPack - versioned, auditable rules/lexicon (no web content).
 * Goal: euphemism/framing flags become "rule -> finding -> rationale" (reviewable).
 */
import { bilingual, type I18nString } from "@features/i18n/i18nText";

export type PolicySeverity = "low" | "medium" | "high";

export type EuphemismLexiconEntry = {
  term: string;
  severity: PolicySeverity;
  domains?: string[];
  preferredWording?: string;
  rationale?: string;
  preferredWordingI18n?: I18nString;
  rationaleI18n?: I18nString;
};

export type EuphemismPatternRule = {
  id: string;
  regex: RegExp;
  severity: PolicySeverity;
  category: "euphemism" | "agency" | "framing";
  preferredWording?: string;
  rationale?: string;
  preferredWordingI18n?: I18nString;
  rationaleI18n?: I18nString;
};

export type EditorialPolicyPack = {
  id: string;
  version: string;
  updatedAt?: string;
  euphemismLexicon: EuphemismLexiconEntry[];
  euphemismPatterns: EuphemismPatternRule[];
};

export const CURRENT_POLICY_PACK: EditorialPolicyPack = {
  id: "vog_editorial_policy_pack",
  version: "2026-01-02.2",
  updatedAt: "2026-01-02",
  // Conservative: no legal classification, only language risk markers.
  euphemismLexicon: [
    {
      term: "Evakuierung",
      severity: "medium",
      preferredWording: "Vertreibung/zwangsweise Verlegung (falls zutreffend) - pruefen",
      rationale: "Kann beschoenigend wirken; fordert Beweis-/Kontextpruefung.",
      preferredWordingI18n: bilingual(
        "de",
        "Vertreibung/zwangsweise Verlegung (falls zutreffend) - pruefen",
        "Forced displacement/relocation (if applicable) - verify context",
      ),
      rationaleI18n: bilingual(
        "de",
        "Kann beschoenigend wirken; fordert Beweis-/Kontextpruefung.",
        "May sanitize reality; requires evidence/context verification.",
      ),
    },
    {
      term: "Kollateralschaden",
      severity: "high",
      preferredWording: "getoetete/verletzte Zivilpersonen (falls zutreffend) - Belege nennen",
      rationale: "Technischer Euphemismus; verschleiert menschliche Folgen.",
      preferredWordingI18n: bilingual(
        "de",
        "getoetete/verletzte Zivilpersonen (falls zutreffend) - Belege nennen",
        "killed/injured civilians (if applicable) - cite evidence",
      ),
      rationaleI18n: bilingual(
        "de",
        "Technischer Euphemismus; verschleiert menschliche Folgen.",
        "Technical euphemism; obscures human impact.",
      ),
    },
    {
      term: "Zwischen die Fronten geraten",
      severity: "medium",
      preferredWording: "unbeabsichtigt getroffen / gezielt angegriffen (Belege klaeren)",
      rationale: "Kann Agency verschleiern; fordert Klaerung von Taeterschaft/Intention.",
      preferredWordingI18n: bilingual(
        "de",
        "unbeabsichtigt getroffen / gezielt angegriffen (Belege klaeren)",
        "accidentally hit / deliberately targeted (verify evidence)",
      ),
      rationaleI18n: bilingual(
        "de",
        "Kann Agency verschleiern; fordert Klaerung von Taeterschaft/Intention.",
        "May hide agency; requires clarifying actor/intent.",
      ),
    },
  ],
  euphemismPatterns: [
    {
      id: "passive_voice_generic",
      regex: /\b(wurde[n]?|ist)\b\s+\b(getoetet|verletzt|zerstoert|bombardiert|angegriffen)\b/i,
      severity: "medium",
      category: "agency",
      rationale: "Passivkonstruktion kann Agency verschleiern: Wer handelt?",
      rationaleI18n: bilingual(
        "de",
        "Passivkonstruktion kann Agency verschleiern: Wer handelt?",
        "Passive voice can hide agency: who acted?",
      ),
    },
    {
      id: "without_evidence_marker",
      regex: /\b(ohne\s+beweise?|without\s+evidence|unbestaetigt|nicht\s+verifizierbar)\b/i,
      severity: "low",
      category: "framing",
      rationale: "Marker fuer Beweislast - explizit lassen (nicht entfernen).",
      rationaleI18n: bilingual(
        "de",
        "Marker fuer Beweislast - explizit lassen (nicht entfernen).",
        "Burden-of-proof marker - keep explicit (do not remove).",
      ),
    },
  ],
};

export function getPolicyPack() {
  return CURRENT_POLICY_PACK;
}
