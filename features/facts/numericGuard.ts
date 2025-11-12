// features/facts/numericGuard.ts
export type NumericClaim = {
    text: string;
    entity?: "Berlin" | string;
    quantity?: number;
    unit?: "Einwohner" | "Wahlberechtigte" | "Prozent" | string;
  };
  
  export type NumericCorrection = {
    ok: boolean;                         // stimmt / stimmt nicht
    detected: NumericClaim;              // was behauptet wurde
    corrected?: { quantity: number; unit: string; source: string; asOf: string };
    hint?: string;                       // warum falsch (Einwohner vs. Wahlberechtigte etc.)
  };
  
  export async function guardNumericFacts(sentence: string): Promise<NumericCorrection | null> {
    // 1) primitive Extraktion (kann später vom LLM verbessert werden)
    const num = sentence.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)\s*(Mio|Millionen|Tsd|tausend|%|Prozent)?/i);
    if (!num) return null;
  
    const quantityRaw = num[1].replace(/\./g, "").replace(",", ".");
    let quantity = Number(quantityRaw);
    const unitWord = (num[2] || "").toLowerCase();
    if (/mio|million/.test(unitWord)) quantity *= 1_000_000;
    if (/tsd|tausend/.test(unitWord)) quantity *= 1_000;
  
    // 2) Entity-Heuristik
    const entity = /berlin/i.test(sentence) ? "Berlin" : undefined;
  
    // 3) Unit-Heuristik
    const unit = /wähl|stimmberechtig/i.test(sentence) ? "Wahlberechtigte"
                : /einwohner|bevölker/i.test(sentence) ? "Einwohner"
                : undefined;
  
    // 4) Offizielle Referenz (Stub – hier später echte Connectoren)
    if (entity === "Berlin" && unit === "Einwohner") {
      const ref = { quantity: 3_850_000, unit: "Einwohner", source: "Amt für Statistik Berlin-Brandenburg", asOf: "2024-12" };
      return {
        ok: Math.abs(quantity - ref.quantity) / ref.quantity < 0.02,
        detected: { text: sentence, entity, quantity, unit },
        corrected: ref,
        hint: "Einwohner statt Wahlberechtigte prüfen.",
      };
    }
    if (entity === "Berlin" && unit === "Wahlberechtigte") {
      const ref = { quantity: 2_500_000, unit: "Wahlberechtigte", source: "Landeswahlleiter Berlin", asOf: "2024-06" };
      return {
        ok: Math.abs(quantity - ref.quantity) / ref.quantity < 0.05,
        detected: { text: sentence, entity, quantity, unit },
        corrected: ref,
        hint: "Wahlberechtigte ≠ Einwohner.",
      };
    }
    return { ok: false, detected: { text: sentence, entity, quantity, unit }, hint: "Unklare Einheit/Quelle." };
  }
  