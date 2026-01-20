// features/ai/prompts/evidence.ts
// Kombinierte BEST-Version: V2 als Standard (Single & Multi), V1 für Legacy weiterhin verfügbar.
// Vorgabe: KEIN Browsing durch das Modell. Ausgabe immer STRICT JSON (ohne Markdown).

// ——— V2 (bevorzugt) ———

// Systemprompt (gilt für beide V2-Varianten)
export const EVIDENCE_SYSTEM = `You propose falsifiable evidence hypotheses. No browsing. Output strict JSON only.`;

// Single-Claim (V2-Feldnamen: source_type, suchquery, erwartete_kennzahl, jahr:number|null)
export const EVIDENCE_USER = ({ claim }: { claim: string }) => `For the claim (German): ${claim}

Return an array (max 4) of objects EXACTLY like:
[
  {
    "source_type": "amtlich" | "presse" | "forschung",
    "suchquery": string,
    "erwartete_kennzahl": string,
    "jahr": number | null
  }
]

Guidelines:
- Use short, precise German queries (2–8 Wörter), avoid stop-words.
- Prefer official/amtlich stats first (z. B. Destatis, Bundes-/Landesbehörden, Eurostat).
- "erwartete_kennzahl" is the specific field expected (e.g., "Anzahl Straftaten je 100.000 Einwohner", "% der Haushalte mit Glasfaser", "Mio. EUR Fördermittel").
- If year is not inferable, set "jahr": null.
- Do NOT add commentary or extra fields. STRICT JSON only.`;

// Multi-Claim (V2). Erwartet vorformatierte ITEMS-Liste, z. B. JSON-Zeilen mit {claim, canonical_id}.
export const EVIDENCE_MULTI_V2 = String.raw`You are eDebatte Evidence Planner (V2). No browsing.
For each item, echo "claim_canonical_id" and propose up to 4 falsifiable evidence hypotheses.

STRICT JSON ONLY:
{
  "evidence": [
    {
      "claim_canonical_id": string,
      "hints": [
        {
          "source_type": "amtlich" | "presse" | "forschung",
          "suchquery": string,
          "erwartete_kennzahl": string,
          "jahr": number | null
        }
      ]
    }
  ]
}

Guidelines:
- Queries in concise German; prefer amtlich first (Destatis, Eurostat, Behördenportale), then presse/forschung.
- Keine erfundenen Zahlen; nur Suchformulierung + erwartete Kennzahl benennen.
- Maximal 4 Hints je Claim. Keine Zusatztexte.

== ITEMS ==
<<<ITEMS>>>`;

// ——— V1 (Legacy) ———

// Multi-Claim (Legacy-Feldschreibweise: "query", "jahr": string|null)
export const EVIDENCE_V1 = String.raw`You are eDebatte Evidence Planner.
For each claim, propose German search queries and expected metrics (no browsing).

STRICT JSON:
{
  "evidence": [
    {
      "claim": string,
      "hints": [
        {
          "source_type": "amtlich" | "presse" | "forschung",
          "query": string,
          "erwartete_kennzahl": string | null,
          "jahr": string | null
        }
      ]
    }
  ]
}

Use precise, short queries (German). Prefer official stats (Destatis, Behörden), then presse/forschung. No commentary.

== CLAIMS ==
<<<CLAIMS>>>`;

// Alternative V1 Simple (Single-Claim, Array flach) – kompatibel zu älteren Pfaden
export const EVIDENCE_SYSTEM_LEGACY = `You propose falsifiable evidence hypotheses. No browsing. Output only the search formulation and expected field.`;
export const EVIDENCE_USER_LEGACY = ({ claim }: { claim: string }) => `For the claim: ${claim}
Return an array (max 4) of objects: {
  "source_type":"amtlich"|"presse"|"forschung",
  "suchquery": string,
  "erwartete_kennzahl": string,
  "jahr": number|null
}`;
