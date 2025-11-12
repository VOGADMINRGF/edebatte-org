// features/analyze/roles.ts
import { z } from "zod";
import { callOpenAIJson } from "@features/ai/askAny";
import { AtomicOutputZ } from "./schemas";

export async function roleAtomicizer(text: string) {
  const prompt = `
Du extrahierst aus einem Eingangstext atomare Aussagen (1 Satz) und füllst Pflicht-Metadaten.
Schema:
{
  "items":[
    {
      "claim": "...",
      "sachverhalt":"...",
      "zeitraum":"...",
      "ort":"...",
      "zustaendigkeit":"EU|Bund|Land|Kommune",
      "betroffene": ["..."],
      "messgroesse":"...",
      "unsicherheiten":"...",
      "evidence":[
        {"source_type":"amtlich|presse|forschung","search_query":"...","expected_metric":"...","year":"YYYY"}
      ]
    }
  ],
  "needs":["zeitraum","ort","zustaendigkeit"] // falls Felder fehlen, minimal halten
}

Vorgaben:
- Max 8 items.
- Immer gültiges JSON (RFC8259). Keine Erklärtexte.
- Wenn Informationen fehlen, setze sie NICHT frei, sondern trage sie in "needs" ein.
`;

  try {
    const { text: raw } = await callOpenAIJson(`${prompt}\n\nTEXT:\n${text}`);
    const parsed = JSON.parse(raw);
    return AtomicOutputZ.parse(parsed);
  } catch {
    // Fallback: trivialer 1-Claim-Output
    return AtomicOutputZ.parse({
      items: [{ claim: text.trim(), betroffene: [], evidence: [] }],
      needs: ["zustaendigkeit"],
    });
  }
}
