export type Claim = {
    text: string;
    sachverhalt?: string;
    zeitraum?: string;
    ort?: string;
    zustaendigkeit?: string;
    betroffene?: string[];
    messgroesse?: string;
    unsicherheiten?: string;
    sources?: string[];
  };
  
  function normalize(s: string) {
    return String(s || "").trim().replace(/\s+/g, " ");
  }
  
  export function claimToQuestion(claim: Claim, locale: "de" | "en"): string {
    const raw = normalize(claim.text || claim.sachverhalt || "");
    if (!raw) return locale === "de" ? "Sollte das genauer geprüft werden?" : "Should this be examined further?";
  
    if (locale === "de") {
      // sehr konservativ: Macht aus einer Aussage eine „Sollte(n)…?“-Frage
      const base = raw
        .replace(/^\s*(die|der|das)\s+/i, "")
        .replace(/\.$/, "");
      // Pluralheuristik ganz grob:
      const isPlural = / (sollen|Veranstalter|Behörden|Standards|Menschen|Pflegekräfte|Regeln)\b/i.test(base);
      const aux = isPlural ? "Sollen" : "Sollte";
      return `${aux} ${base} ?`.replace(/\s+\?$/, "?");
    }
  
    // EN
    const base = raw.replace(/\.$/, "");
    const isPlural = /\b(standards|people|providers|organizers|rules)\b/i.test(base);
    const aux = isPlural ? "Should" : "Should";
    return `${aux} ${base}?`;
  }
  
  /** Gruppiert sehr simpel: Nimmt n Outline-Einträge und hängt Claims der Reihe nach an. */
  export function buildTopics(
    outline: { id: string; label: string; summary?: string }[] = [],
    claims: Claim[] = [],
    locale: "de" | "en"
  ) {
    const topics = outline.slice(0, Math.max(1, outline.length));
    const out: { id: string; title: string; question: string; statements: string[] }[] = [];
  
    let i = 0;
    for (const seg of topics) {
      const bucket: Claim[] = [];
      // Runde-Verteilung der Claims in Segmente (deterministisch, schema-schonend)
      for (let k = i; k < claims.length; k += topics.length) {
        if (k < claims.length) bucket.push(claims[k]);
      }
      i++;
  
      const first = bucket[0] || claims[0];
      const question = first ? claimToQuestion(first, locale) : (locale === "de" ? "Welche Option ist gesellschaftlich sinnvoll?" : "Which option best serves society?");
      out.push({
        id: seg.id,
        title: seg.label || seg.summary || (locale === "de" ? "Thema" : "Topic"),
        question,
        statements: bucket.map(c => c.text || c.sachverhalt || "").filter(Boolean),
      });
    }
  
    return out;
  }
  