import { bilingual, type I18nString } from "@features/i18n/i18nText";

export type ContextGapKey =
  | "timeframe"
  | "location"
  | "actors"
  | "agency"
  | "evidence"
  | "legal_frame"
  | "numbers"
  | "definitions";

export type ContextGap = {
  key: ContextGapKey;
  severity: "low" | "medium" | "high";
  rationale?: string;
  rationaleI18n?: I18nString;
};

function normalizeAscii(text: string): string {
  return text
    .replace(/[\u00e4\u00c4]/g, "ae")
    .replace(/[\u00f6\u00d6]/g, "oe")
    .replace(/[\u00fc\u00dc]/g, "ue")
    .replace(/\u00df/g, "ss");
}

function hasDateLike(s: string) {
  return /\b(\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2}|heute|gestern|morgen|januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/i.test(
    s,
  );
}
function hasLocationLike(s: string) {
  return /\b(in|bei|nahe|zwischen)\s+[a-z]{3,}/i.test(s);
}
function hasActorLike(s: string) {
  return /\b(regierung|ministerium|polizei|militaer|armee|un|eu|bundeswehr|idf|hamas|nato|gericht|staatsanwaltschaft)\b/i.test(
    s,
  );
}
function hasNumbersLike(s: string) {
  return /\b\d{1,3}(\.\d{3})*\b/.test(s);
}
function mentionsEvidence(s: string) {
  return /\b(beleg|quelle|dokument|video|foto|satellit|osint|bericht|studie|daten)\b/i.test(s);
}
function mentionsLegalFrame(s: string) {
  return /\b(voelkerrecht|menschenrecht|menschenwuerde|genfer|un-charta|icc|kriegsverbrechen|humanitarian law)\b/i.test(
    s,
  );
}
function mentionsDefinitions(s: string) {
  return /\b(definiert|definition|meint|bedeutet|im sinne von)\b/i.test(s);
}

export function computeContextGaps(inputText: string, hasAnySources: boolean): ContextGap[] {
  const raw = (inputText || "").trim();
  const s = normalizeAscii(raw).toLowerCase();
  const gaps: ContextGap[] = [];

  if (!hasDateLike(s))
    gaps.push({
      key: "timeframe",
      severity: "medium",
      rationale: "Zeitraum/Datum nicht erkennbar.",
      rationaleI18n: bilingual("de", "Zeitraum/Datum nicht erkennbar.", "Timeframe/date not detected."),
    });
  if (!hasLocationLike(s))
    gaps.push({
      key: "location",
      severity: "low",
      rationale: "Ort/Region nicht klar.",
      rationaleI18n: bilingual("de", "Ort/Region nicht klar.", "Location/region unclear."),
    });
  if (!hasActorLike(s))
    gaps.push({
      key: "actors",
      severity: "medium",
      rationale: "Akteure/Institutionen unklar.",
      rationaleI18n: bilingual("de", "Akteure/Institutionen unklar.", "Actors/institutions unclear."),
    });
  if (!mentionsEvidence(s) && !hasAnySources)
    gaps.push({
      key: "evidence",
      severity: "high",
      rationale: "Keine Evidenzhinweise/Quellen vorhanden.",
      rationaleI18n: bilingual("de", "Keine Evidenzhinweise/Quellen vorhanden.", "No evidence hints/sources provided."),
    });
  if (!mentionsLegalFrame(s))
    gaps.push({
      key: "legal_frame",
      severity: "low",
      rationale: "Rechts-/Normrahmen nicht benannt (optional).",
      rationaleI18n: bilingual(
        "de",
        "Rechts-/Normrahmen nicht benannt (optional).",
        "Legal/normative frame not stated (optional).",
      ),
    });
  if (!hasNumbersLike(s))
    gaps.push({
      key: "numbers",
      severity: "low",
      rationale: "Keine Zahlen/Groessenordnungen (optional).",
      rationaleI18n: bilingual(
        "de",
        "Keine Zahlen/Groessenordnungen (optional).",
        "No numbers/magnitude given (optional).",
      ),
    });
  if (!mentionsDefinitions(s))
    gaps.push({
      key: "definitions",
      severity: "low",
      rationale: "Begriffe nicht geklaert (optional).",
      rationaleI18n: bilingual("de", "Begriffe nicht geklaert (optional).", "Key terms not defined (optional)."),
    });
  gaps.push({
    key: "agency",
    severity: "low",
    rationale: "Agency/Passiv wird zusaetzlich separat geprueft (Audit).",
    rationaleI18n: bilingual(
      "de",
      "Agency/Passiv wird zusaetzlich separat geprueft (Audit).",
      "Agency/passive voice is additionally checked separately (audit).",
    ),
  });

  const seen = new Set<string>();
  return gaps.filter((g) => (seen.has(g.key) ? false : (seen.add(g.key), true)));
}
