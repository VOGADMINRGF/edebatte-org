// features/ai/prompts/editor_rater.ts
// Kombinierte BEST-Version: V2 als Standard (Single & Multi), V1 für Legacy weiterhin verfügbar.
// Ausgabe immer STRICT JSON (kein Markdown, keine Erklärtexte).

// ——— V2 (bevorzugt) ———

// Systemprompt
export const RATER_SYSTEM = `Rate the draft on 5 criteria (0–1) and give one short reason each. German (B1/B2). Output STRICT JSON only.`;

// Single-Claim (V2-Felder: präzision, prüfbarkeit, relevanz, lesbarkeit, ausgewogenheit, begründung{...})
export const RATER_USER = ({ claim }: { claim: string }) => `Text (German): ${claim}

Return STRICT JSON exactly:
{
  "präzision": number,
  "prüfbarkeit": number,
  "relevanz": number,
  "lesbarkeit": number,
  "ausgewogenheit": number,
  "begründung": {
    "präzision": string,
    "prüfbarkeit": string,
    "relevanz": string,
    "lesbarkeit": string,
    "ausgewogenheit": string
  }
}

Rules:
- Each score ∈ [0,1], with one concise reason (6–140 chars) per criterion.
- Be neutral, specific, policy-relevant. No extra fields, no commentary.`;

// Multi-Claim (V2) — erwartet ITEMS-Liste mit {claim_canonical_id, claim}
export const RATER_MULTI_V2 = String.raw`You are eDebatte Editorial Rater (V2). German (B1/B2). Output STRICT JSON only.
For each item, rate on the five criteria and provide one short reason per criterion.

Return exactly:
{
  "ratings": [
    {
      "claim_canonical_id": string,
      "präzision": number,
      "prüfbarkeit": number,
      "relevanz": number,
      "lesbarkeit": number,
      "ausgewogenheit": number,
      "begründung": {
        "präzision": string,
        "prüfbarkeit": string,
        "relevanz": string,
        "lesbarkeit": string,
        "ausgewogenheit": string
      }
    }
  ]
}

Constraints:
- Scores in [0,1]. Reasons concise (6–140 chars), no duplication, no sources, no markdown.
- No extra properties beyond the specified schema.

== ITEMS ==
<<<ITEMS>>>`;

// ——— V1 (Legacy) ———

export const EDITOR_RATER_V1 = String.raw`You are eDebatte Editorial Rater.
Score each claim on: praezision, pruefbarkeit, relevanz, lesbarkeit, ausgewogenheit (0..1) with short "gruende".

STRICT JSON:
{ "ratings":[
 { "claim": string,
   "praezision": number, "pruefbarkeit": number, "relevanz": number,
   "lesbarkeit": number, "ausgewogenheit": number,
   "gruende": string[]
 }
]}

Language: German.

== CLAIMS ==
<<<CLAIMS>>>`;
