// features/analyze/authority-resolver.ts
// Mini-Heuristik für Zuständigkeit (EU/Bund/Land/Kommune) mit Confidence.
// Transparenz: wir liefern hints + confidence zurück.

export type Authority = "EU" | "Bund" | "Land" | "Kommune";

export function resolveAuthority(claimText: string): {
  authority?: Authority;
  confidence: number;
  hints: string[];
} {
  const t = (claimText || "").toLowerCase();
  const hints: string[] = [];

  // ——— Kommunal: Hundesteuer (klassischer Fall, kommunale Aufwandsteuer)
  if (/\bhundesteuer\b/.test(t)) {
    hints.push("hundesteuer");
    return { authority: "Kommune", confidence: 0.95, hints };
  }

  // ——— Bund: Verkehrsrecht (Kennzeichen/StVZO/StVG → BMDV/Federal)
  if (
    /\b(kennzeichen|nummernschild)\b/.test(t) &&
    /\bfahrr(äder|ad)\b/.test(t)
  ) {
    hints.push("fahrrad-kennzeichen");
    return { authority: "Bund", confidence: 0.7, hints };
  }

  // ——— Beispiele, die du nach und nach ergänzen kannst:
  if (/\bschul(gesetz|pflicht)\b/.test(t)) {
    hints.push("schulrecht");
    return { authority: "Land", confidence: 0.7, hints };
  }

  if (/\bco2\s*(preis|steuer|abgabe)\b/.test(t)) {
    hints.push("co2-preis");
    return { authority: "Bund", confidence: 0.65, hints };
  }

  // Fallback: unbekannt
  return { confidence: 0.3, hints };
}
