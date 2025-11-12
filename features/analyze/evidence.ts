import type { EvidenceSlot } from "./types";

function q(text: string) {
  // sehr grob; später gern domänenspezifisch feinjustieren
  const t = text.replace(/\s+/g, " ").trim();
  const head = t.slice(0, 110);
  return {
    amtlich: `${head} site:bund.de OR site:deutschland.de`,
    presse:  `${head} site:zeit.de OR site:spiegel.de`,
    forschung: `${head} site:destatis.de OR site:oecd.org`,
  };
}

export function proposeEvidence(claim: string): EvidenceSlot[] {
  const qs = q(claim);
  return [
    { source_type: "amtlich", suchquery: qs.amtlich },
    { source_type: "presse", suchquery: qs.presse },
    { source_type: "forschung", suchquery: qs.forschung },
  ];
}