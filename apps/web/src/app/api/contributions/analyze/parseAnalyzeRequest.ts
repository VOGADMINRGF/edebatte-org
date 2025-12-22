import { z } from "zod";

/**
 * Backwards-compatible request parser for /api/contributions/analyze.
 *
 * Supports:
 * - legacy: { text, locale }
 * - newer clients: { textOriginal, textPrepared, locale, maxClaims, detailPreset, evidenceItems }
 */
export const AnalyzeRequestSchemaV2 = z
  .object({
    // legacy
    text: z.string().optional(),

    // newer clients
    textOriginal: z.string().optional(),
    textPrepared: z.string().optional(),

    locale: z.string().min(2).max(8).optional(),
    maxClaims: z.number().int().min(1).max(30).optional(),
    detailPreset: z.number().int().min(1).max(4).optional(),
    evidenceItems: z.array(z.any()).optional(),
    stream: z.boolean().optional(),
    live: z.boolean().optional(),

    // existing compatibility hooks
    test: z.string().optional(),
    contributionId: z.string().min(3).max(100).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.test === "ping") return;
    const candidate = (val.textPrepared ?? val.text ?? val.textOriginal ?? "").trim();
    if (!candidate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Feld 'text' ist erforderlich.",
        path: ["text"],
      });
      return;
    }
    if (candidate.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 10,
        inclusive: true,
        type: "string",
        origin: "string",
        message: "Text ist zu kurz (min. 10 Zeichen).",
        path: ["text"],
      });
    }
  })
  .transform((val) => {
    const effectiveText = (val.textPrepared ?? val.text ?? val.textOriginal ?? "").trim();
    return {
      ...val,
      text: effectiveText,
    };
  });

export type AnalyzeRequestParsed = z.infer<typeof AnalyzeRequestSchemaV2>;

export function parseAnalyzeRequestBody(
  raw: unknown,
):
  | { ok: true; value: AnalyzeRequestParsed }
  | { ok: false; error: { message: string; issues?: unknown } } {
  const parsed = AnalyzeRequestSchemaV2.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: parsed.error?.issues?.[0]?.message ?? "Ungültige Eingabe für die Analyse.",
        issues: parsed.error.issues,
      },
    };
  }
  return { ok: true, value: parsed.data };
}
