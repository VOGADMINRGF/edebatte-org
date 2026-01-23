import { z } from "zod";

export const EvidenceSchema = z.object({
  url: z.string().url(),
  title: z.string().min(2),
  source: z.string().min(2).optional(),
  snippet: z.string().optional(),
});

export const StatementSchema = z.object({
  id: z.string().min(6),
  headline: z.string().min(3),            // Original-Titel/Anstoß
  prompt: z.string().min(3),              // „Worum geht’s als Frage?“
  claim: z.string().min(6).max(400),      // 1 Satz (atomisiert)
  region: z.string().nullable().optional(),
  authority: z.string().nullable().optional(),
  categoryMain: z.string().nullable().optional(),
  categorySubs: z.array(z.string()).max(8).default([]),
  timeSpan: z.string().nullable().optional(),
  affected: z.array(z.string()).max(8).default([]),
  metrics: z.object({
    trust: z.number().min(0).max(1).default(0.5),
    factcheckStatus: z.enum(["unknown","in_progress","verified","disputed"]).default("unknown"),
    votesYes: z.number().int().nonnegative().default(0),
    votesNo: z.number().int().nonnegative().default(0),
    votesNeutral: z.number().int().nonnegative().default(0),
  }).default({ trust:0.5, factcheckStatus:"unknown", votesYes:0, votesNo:0, votesNeutral:0 }),
  evidence: z.array(EvidenceSchema).default([]),
  source: z.object({
    url: z.string().url(),
    outlet: z.string().optional(),
    publishedAt: z.string().optional(),
  }),
});

export type StatementDTO = z.infer<typeof StatementSchema>;
