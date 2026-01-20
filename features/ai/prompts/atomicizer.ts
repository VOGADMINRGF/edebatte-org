// features/ai/prompts/atomicizer.ts
// Kombinierte BEST-Version: V2 als Standard (Single & Multi), V1 für Legacy weiterhin verfügbar.
// Output immer: reines JSON (kein Markdown, keine Erklärtexte).

// ——— V2 (bevorzugt) ———

// Systemprompt (Single-Claim)
export const ATOMICIZER_SYSTEM = `You are a rigorous editor. Task: rewrite ONE-sentence claim in B1/B2 German and fill ALL required slots. If a slot is impossible to infer, return a needs-info note (e.g., "needs-info: zeitraum"). Output strict JSON only.`;

// Userprompt (Single-Claim)
export const ATOMICIZER_USER = ({ input }: { input: string }) => `INPUT:
${input}

Return JSON exactly of shape:
{
  "text": string (one sentence, B1/B2),
  "sachverhalt": string,
  "zeitraum": {"from": string, "to": string} | null,
  "ort": string,
  "zuständigkeit": "EU"|"Bund"|"Land"|"Kommune"|"Unklar",
  "zuständigkeitsorgan": string|null,
  "betroffene": string[],
  "messgröße": string,
  "unsicherheiten": string[]
}
If any required value is missing, set a single string field "needs_info" with the missing key name.`;

// Multi-Claim (V2-Felder, max 8 Claims)
export const ATOMICIZER_MULTICLAIM_V2 = String.raw`You are eDebatte Atomicizer (V2).
Task: Extract atomic political claims (German, B1/B2), one sentence each. Split multiple ideas (max 8); keep content; normalize tone; no censorship.

Return STRICT JSON only:
{
  "claims": [
    {
      "text": string,
      "sachverhalt": string|null,
      "zeitraum": {"from": string, "to": string} | null,
      "ort": string|null,
      "zuständigkeit": "EU"|"Bund"|"Land"|"Kommune"|"Unklar",
      "zuständigkeitsorgan": string|null,
      "betroffene": string[],
      "messgröße": string,
      "unsicherheiten": string[],
      "needs_info": string|undefined
    }
  ]
}

Rules:
- Each claim ONE sentence (B1/B2).
- If a required slot cannot be inferred, set "needs_info" to that key (e.g., "zeitraum").
- Unknown → use null (for nullable), DO NOT invent facts.
- Keep original meaning; avoid rhetorical style; be precise and neutral.

== TEXT ==
<<<TEXT>>>`;

// ——— V1 (Legacy) ———

// Multi-Claim (Legacy-Feldschreibweise; kompatibel zu Altpfaden)
export const ATOMICIZER_V1 = String.raw`You are eDebatte Atomicizer.
Task: Extract atomic political claims (German, B1/B2), one sentence each. Fill slots.

STRICT JSON:
{ "claims":[
 { "text": string, "sachverhalt": string|null, "zeitraum": string|null, "ort": string|null,
   "ebene": "EU"|"Bund"|"Land"|"Kommune"|null, "betroffene": string[], "messgroesse": string|null,
   "unsicherheiten": string[] }
]}

Rules: split multiple ideas (max 8), keep content, normalize tone, no censorship, unknown→null.
== TEXT ==
<<<TEXT>>>`;

// Single-Claim (Legacy-Form, identisch zum früheren Ein-Satz-Format)
export const ATOMICIZER_SYSTEM_LEGACY = `You are a rigorous editor. Task: rewrite ONE-sentence claim in B1/B2 German and fill ALL required slots. If a slot is impossible to infer, return a needs-info note (e.g., "needs-info: zeitraum"). Output strict JSON only.`;

export const ATOMICIZER_USER_LEGACY = ({ input }: { input: string }) => `INPUT:
${input}

Return JSON exactly of shape:
{
  "text": string,
  "sachverhalt": string,
  "zeitraum": {"from": string, "to": string} | null,
  "ort": string,
  "zuständigkeit": "EU"|"Bund"|"Land"|"Kommune"|"Unklar",
  "zuständigkeitsorgan": string|null,
  "betroffene": string[],
  "messgröße": string,
  "unsicherheiten": string[]
}
If any required value is missing, set a single string field "needs_info" with the missing key name.`;
