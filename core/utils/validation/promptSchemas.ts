// core/utils/validation/promptSchemas.ts
// oder: apps/web/src/utils/validation/promptSchemas.ts
import { z } from "zod";
import safeJsonParse from "../jsonRepair";

/**
 * Ziel:
 * - Robuste Schemas für Impact / Alternatives / Factcheck
 * - Akzeptiert mehrere Output-Formate:
 *   a) reines Array von Items
 *   b) Objekt mit { type, summary, items, ... }
 *   c) einzelnes Item (wird zu Array normalisiert)
 * - Liefert stets eine "kanonische" Normalform zurück
 *
 * Kanonische Formen:
 *   Impact:       { type:"impact", items: ImpactItem[], summary?, overallConfidence? }
 *   Alternatives: { type:"alternatives", options: Alternative[], summary?, ranking? }
 *   Factcheck:    { type:"factcheck", items: FactCheckItem[], summary? }
 */

// ---------- Shared atoms ----------
const NonEmpty = z.string().min(1);

const ConfidenceNum = z.number().min(0).max(1).default(0.6);
const ConfidenceEnum = z.enum(["low", "medium", "high"]);
const Confidence = z
  .union([ConfidenceNum, ConfidenceEnum])
  .transform((v) => (typeof v === "number" ? v : v === "low" ? 0.25 : v === "medium" ? 0.6 : 0.85));

const SourceItem = z.object({
  title: NonEmpty,
  url: z.string().url().optional(),
  publisher: z.string().optional(),
  date: z.string().optional(), // ISO empfohlen
});

// ---------- Impact ----------
export const ImpactItem = z.object({
  claim: NonEmpty,
  direction: z.enum(["increase", "decrease", "unclear", "none"]).default("unclear"),
  magnitude: z.number().min(0).max(1).default(0.5),
  timeframe: z.string().optional(),
  affected: z.array(NonEmpty).default([]),
  assumptions: z.array(NonEmpty).default([]),
  caveats: z.array(NonEmpty).default([]),
  confidence: Confidence,
  sources: z.array(SourceItem).default([]),
});

const ImpactArraySchema = z.array(ImpactItem).min(1);
const ImpactObjectSchema = z.object({
  type: z.literal("impact").optional(),
  summary: z.string().optional(),
  items: z.array(ImpactItem).min(1),
  overallConfidence: Confidence.optional(),
});

/** akzeptiert Array ODER Objekt ODER einzelnes Item */
const ImpactFlexibleSchema = z.union([ImpactArraySchema, ImpactObjectSchema, ImpactItem]);

export type CanonicalImpact = {
  type: "impact";
  summary?: string;
  items: z.infer<typeof ImpactItem>[];
  overallConfidence?: number;
};

export function validateImpact(jsonText: string): CanonicalImpact {
  const parsed = safeJsonParse<unknown>(jsonText) as
    | { ok: true; data: unknown }
    | { ok: false; error?: { message?: string } };

  if (!parsed || parsed.ok !== true) {
    const msg = (!parsed || "error" in parsed ? parsed?.error?.message : undefined) ?? "unknown";
    throw new Error(`Impact JSON parse failed: ${msg}`);
  }

  const res = ImpactFlexibleSchema.safeParse(parsed.data);
  if (!res.success) {
    const issues = res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Impact validation error: ${issues}`);
  }

  const data = res.data;
  if (Array.isArray(data)) return { type: "impact", items: data };
  if ("claim" in data) return { type: "impact", items: [data as z.infer<typeof ImpactItem>] };

  return {
    type: "impact",
    items: data.items,
    summary: data.summary,
    overallConfidence: data.overallConfidence,
  };
}
// ---------- Claims (Contribution → atomare Aussagen) ----------

export const Claim = z.object({
  text: z.string().min(8),
  sachverhalt: z.string().min(3),
  zeitraum: z.string().min(1),
  ort: z.string().min(2),
  zustaendigkeit: z.enum(["EU", "Bund", "Land", "Kommune"]),
  betroffene: z.array(z.string()).min(1),
  messgroesse: z.string().min(1),
  unsicherheiten: z.string().optional().default(""),
  sources: z.array(z.string().url()).optional().default([]),
});

export const Claims = z.array(Claim).min(1);

export const AnalyzeRequest = z.object({
  text: z.string().min(10),
  maxClaims: z.number().int().min(1).max(20).default(5),
  locale: z.enum(["de","en"]).default("de"),
});

export type TClaim = z.infer<typeof Claim>;
export type TAnalyzeRequest = z.infer<typeof AnalyzeRequest>;

// ---------- Alternatives ----------
export const Alternative = z.object({
  title: NonEmpty,
  description: NonEmpty,
  pros: z.array(NonEmpty).default([]),
  cons: z.array(NonEmpty).default([]),
  tradeoffs: z.array(NonEmpty).default([]),
  feasibility: z.enum(["low", "medium", "high"]).default("medium"),
  expectedImpact: z.enum(["low", "medium", "high"]).default("medium"),
  confidence: Confidence,
  sources: z.array(SourceItem).default([]),
});

const AlternativesArraySchema = z.array(Alternative).min(1);
const AlternativesObjectSchema = z.object({
  type: z.literal("alternatives").optional(),
  summary: z.string().optional(),
  options: z.array(Alternative).min(1),
  ranking: z.array(z.number()).optional(),
});

const AlternativesFlexibleSchema = z.union([AlternativesArraySchema, AlternativesObjectSchema, Alternative]);

export type CanonicalAlternatives = {
  type: "alternatives";
  summary?: string;
  options: z.infer<typeof Alternative>[];
  ranking?: number[];
};

export function validateAlternatives(jsonText: string): CanonicalAlternatives {
  const parsed = safeJsonParse<unknown>(jsonText) as
    | { ok: true; data: unknown }
    | { ok: false; error?: { message?: string } };

  if (!parsed || parsed.ok !== true) {
    const msg = (!parsed || "error" in parsed ? parsed?.error?.message : undefined) ?? "unknown";
    throw new Error(`Alternatives JSON parse failed: ${msg}`);
  }

  const res = AlternativesFlexibleSchema.safeParse(parsed.data);
  if (!res.success) {
    const issues = res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Alternatives validation error: ${issues}`);
  }

  const data = res.data;
  if (Array.isArray(data)) return { type: "alternatives", options: data };
  if ("title" in data) return { type: "alternatives", options: [data as z.infer<typeof Alternative>] };

  return {
    type: "alternatives",
    options: data.options,
    summary: data.summary,
    ranking: data.ranking,
  };
}

// ---------- Factcheck ----------
export const FactCheckItem = z.object({
  claim: NonEmpty,
  verdict: z.enum(["true", "false", "mixed", "unverified"]),
  rationale: NonEmpty,
  confidence: Confidence,
  sources: z.array(SourceItem).default([]),
});

const FactcheckArraySchema = z.array(FactCheckItem).min(1);
const FactcheckObjectSchema = z.object({
  type: z.literal("factcheck").optional(),
  summary: z.string().optional(),
  items: z.array(FactCheckItem).min(1),
});

const FactcheckFlexibleSchema = z.union([FactcheckArraySchema, FactcheckObjectSchema, FactCheckItem]);

export type CanonicalFactcheck = {
  type: "factcheck";
  summary?: string;
  items: z.infer<typeof FactCheckItem>[];
};

export function validateFactcheck(jsonText: string): CanonicalFactcheck {
  const parsed = safeJsonParse<unknown>(jsonText) as
    | { ok: true; data: unknown }
    | { ok: false; error?: { message?: string } };

  if (!parsed || parsed.ok !== true) {
    const msg = (!parsed || "error" in parsed ? parsed?.error?.message : undefined) ?? "unknown";
    throw new Error(`Factcheck JSON parse failed: ${msg}`);
  }

  const res = FactcheckFlexibleSchema.safeParse(parsed.data);
  if (!res.success) {
    const issues = res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Factcheck validation error: ${issues}`);
  }

  const data = res.data;
  if (Array.isArray(data)) return { type: "factcheck", items: data };
  if ("claim" in data) return { type: "factcheck", items: [data as z.infer<typeof FactCheckItem>] };

  return { type: "factcheck", items: data.items, summary: data.summary };
}

// ---------- Optional: Union-Validator ----------
export type CanonicalAny = CanonicalImpact | CanonicalAlternatives | CanonicalFactcheck;

export function validateAnyAnalysis(jsonText: string): CanonicalAny {
  try {
    return validateFactcheck(jsonText);
  } catch {
    /* next */
  }
  try {
    return validateImpact(jsonText);
  } catch {
    /* next */
  }
  return validateAlternatives(jsonText);
}
