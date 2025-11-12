// features/analyze/prompts.ts
export function promptExtract(text: string) {
    return `Du liest einen kurzen Beitrag und extrahierst bis zu 6 atomare Aussagen (ein Satz).
  Gib nur JSON:
  {"items":[{"claim": "..."}]}
  Text:
  ${text}`;
  }
  
  export function promptNormalizeAssign(claims: string[]) {
    return `Du normalisierst folgende Aussagen auf Pflicht-Slots:
  Slots: timeframe, region, level(EU|Bund|Land|Kommune), responsibility, affected[], metric, uncertainties[].
  Lesbarkeitsniveau B1 (kurz, klar).
  
  Input JSON:
  {"items":[${claims.map(c => JSON.stringify({claim:c})).join(",")}]}
  
  Gib nur JSON:
  {"items":[
    {"claim":"...", "timeframe":"...", "region":"...", "level":"Bund","responsibility":"BMI","affected":["..."],"metric":"...","uncertainties":["..."]}
  ]}`;
  }
  
  export function promptEvidence(itemsJson: string) {
    return `Erzeuge Beleg-Hypothesen (keine Links, nur Slots).
  Für jede Aussage 1-2 Vorschläge.
  Gib nur JSON: {"evidence":[{"source_type":"amtlich|presse|forschung","search_query":"...","expected_metric":"...","year":"..."}]}
  
  Items:
  ${itemsJson}`;
  }
  