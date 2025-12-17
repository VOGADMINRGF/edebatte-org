import { z } from "zod";

// —— Atomic Claim (Pflichtfelder) ——
export const AtomicClaimSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(6).max(300),
  sachverhalt: z.string().min(3).max(200),
  zeitraum: z.object({ from: z.string().min(4), to: z.string().min(4) }).optional().nullable(),
  ort: z.string().min(2).max(120),
  zuständigkeit: z.enum(["EU","Bund","Land","Kommune","Unklar"]),
  zuständigkeitsorgan: z.string().min(2).max(140).optional().nullable(),
  betroffene: z.array(z.string().min(2).max(80)).max(6).default([]),
  messgröße: z.string().min(1).max(80),
  unsicherheiten: z.array(z.string().min(2).max(160)).max(4).default([]),
  language: z.string().min(2).max(5).default("de"),
  readability: z.enum(["A2","B1","B2"]).default("B1"),
  canonical_id: z.string().min(4).max(64),
});
export type AtomicClaim = z.infer<typeof AtomicClaimSchema>;

// —— Evidence hypotheses ——
export const EvidenceHypothesisSchema = z.object({
  claim_canonical_id: z.string().optional().default(""),
  source_type: z.enum(["amtlich","presse","forschung"]),
  suchquery: z.string().min(4),
  erwartete_kennzahl: z.string().min(2).max(120),
  jahr: z.number().int().min(1900).max(2100).nullable(),
});
export type EvidenceHypothesis = z.infer<typeof EvidenceHypothesisSchema>;

// —— Perspectives ——
export const PerspectivesSchema = z.object({
  pro: z.array(z.string().min(6).max(160)).max(3).default([]),
  kontra: z.array(z.string().min(6).max(160)).max(3).default([]),
  alternative: z.string().min(10).max(220).default(""),
});
export type Perspectives = z.infer<typeof PerspectivesSchema>;

// —— Redaktions-Score ——
export const ScoreSchema = z.object({
  präzision: z.number().min(0).max(1),
  prüfbarkeit: z.number().min(0).max(1),
  relevanz: z.number().min(0).max(1),
  lesbarkeit: z.number().min(0).max(1),
  ausgewogenheit: z.number().min(0).max(1),
  begründung: z.object({
    präzision: z.string().min(4).max(140),
    prüfbarkeit: z.string().min(4).max(140),
    relevanz: z.string().min(4).max(140),
    lesbarkeit: z.string().min(4).max(140),
    ausgewogenheit: z.string().min(4).max(140),
  })
});
export type ScoreSet = z.infer<typeof ScoreSchema>;

// —— Quality Gates ——
export const QualityGateSchema = z.object({
  json_valid: z.boolean(),
  atomization_complete: z.boolean(),
  readability_b1_b2: z.boolean(),
  jurisdiction_present: z.boolean(),
  evidence_present: z.boolean(),
});
export type QualityGate = z.infer<typeof QualityGateSchema>;

export const OrchestrationResultSchema = z.object({
  claim: AtomicClaimSchema,
  evidence: z.array(EvidenceHypothesisSchema),
  perspectives: PerspectivesSchema,
  score: ScoreSchema,
  quality: QualityGateSchema,
});
export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>;

// —— Canonical ID util —— (NFKC+lower+strip diacritics → cheap hash)
export function canonicalIdFrom(text: string){
  const norm = text.normalize("NFKC").toLowerCase().replace(/\p{Diacritic}/gu, "");
  let h = 2166136261 >>> 0;
  for (let i=0;i<norm.length;i++){ h ^= norm.charCodeAt(i); h = (h + (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24))>>>0; }
  return h.toString(16);
}
