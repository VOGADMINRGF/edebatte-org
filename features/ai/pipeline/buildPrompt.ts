// features/ai/pipeline/buildPrompt.ts
export function buildExtractPrompt(text: string, locale: "de"|"en", maxClaims: number) {
    return `
  Extrahiere bis zu ${maxClaims} **atomare Aussagen** (genau 1 Satz je Aussage) aus dem INPUT.
  Gib ausschließlich **valide JSON** (RFC8259) zurück: ein Array aus Objekten mit Feldern:
  
  {
    "text": string,
    "sachverhalt": string,
    "zeitraum": string,
    "ort": string,
    "zustaendigkeit": "EU"|"Bund"|"Land"|"Kommune",
    "betroffene": string[],
    "messgroesse": string,
    "unsicherheiten": string,
    "sources": string[]
  }
  
  Regeln:
  - **Genau 1 Satz** pro Eintrag, klare, neutrale Formulierung (B1/B2).
  - Sehr ähnliche Aussagen **kondensieren** (keine Duplikate).
  - Unbekanntes als "-" (oder [] bei Arrays) eintragen – **nichts freierfinden**.
  - "zustaendigkeit" nur aus EU/Bund/Land/Kommune (plausibel).
  - "sources" nur echte URLs, sonst [].
  - Sprache der Ausgabe: ${locale}.
  - **Nur JSON**, keine Erklärungen/Markdown/Codefences.
  
  INPUT:
  ${text}
  `.trim();
  }
  
  export function buildRefinePrompt(claimsJson: string, locale: "de"|"en") {
    return `
  Du bekommst Claims (JSON-Array). Aufgabe:
  1) **Normalisieren & verschönern** (B1/B2, 1-Satz-Zwang, aktive Stimme).
  2) Pflichtfelder plausibel auffüllen/vereinheitlichen, aber **nichts halluzinieren**:
     Unbekanntes bleibt "-" bzw. [].
  3) **Duplikate** (gleiche Kernaussage/Ort/Zeitraum) **mergen**.
  4) Konsistente Zuständigkeit (EU|Bund|Land|Kommune).
  5) Lesbare "messgroesse" (z. B. "CO₂-Reduktion").
  6) **Nur JSON** (gleiches Format wie beim Extract), Sprache: ${locale}.
  
  Claims:
  ${claimsJson}
  `.trim();
  }
  