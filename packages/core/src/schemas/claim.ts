// packages/core/src/schemas/claim.ts
import { z } from "zod";

/** Zuständigkeit: EU/Bund/Land/Kommune */
export const ZZustaendigkeit = z.enum(["EU", "Bund", "Land", "Kommune"]);

/** Zeitraum: entweder ISO-Range (from/to) oder freies label (mind. eines muss da sein) */
export const ZZeitraum = z.object({
  from: z.string().trim().min(1).optional(), // ISO 8601 empfohlen
  to: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
}).refine(v => !!v.from || !!v.to || !!v.label, {
  message: "Zeitraum: from/to oder label erforderlich",
});

/** Ort: Minimum label; optional Ländercode/Region/Koordinaten */
export const ZOrt = z.object({
  label: z.string().trim().min(1, "Ort.label erforderlich"),
  country: z.string().trim().min(2).max(2).optional(), // ISO-3166-1 ALPHA-2: "DE"
  region: z.string().trim().optional(),                 // z.B. "DE:BE"
  lat: z.number().gte(-90).lte(90).optional(),
  lon: z.number().gte(-180).lte(180).optional(),
}).strict();

/** Betroffene: mind. 1 Eintrag */
export const ZBetroffene = z.array(z.string().trim().min(1)).min(1, "Mindestens eine betroffene Gruppe");

/** Messgröße: strukturierter Slot (Label Pflicht, Rest optional) */
export const ZMessgroesse = z.object({
  label: z.string().trim().min(1),
  value: z.number().optional(),
  unit: z.string().trim().optional(), // "%", "kg", "€", ...
  ref: z.string().url().optional(),
}).strict();

/** Unsicherheiten: kurzer Text + (optional) Level */
export const ZUnsicherheiten = z.object({
  note: z.string().trim().min(1),
  level: z.enum(["low", "medium", "high"]).optional(),
}).strict();

/** Meta: optionale Quellen/Language */
export const ZClaimMeta = z.object({
  sourceUrls: z.array(z.string().url()).default([]).optional(),
  lang: z.enum(["de", "en"]).default("de").optional(),
}).strict().default({});

/** Der Atomic Claim (EIN Satz) mit Pflicht-Slots */
export const ZAtomicClaim = z.object({
  sachverhalt: z.string().trim().min(1, "Sachverhalt erforderlich").max(600, "max 600 Zeichen"),
  zeitraum: ZZeitraum,
  ort: ZOrt,
  zustaendigkeit: ZZustaendigkeit,
  betroffene: ZBetroffene,
  messgroesse: ZMessgroesse,
  unsicherheiten: ZUnsicherheiten,
  meta: ZClaimMeta.optional(),
}).strict();

export type AtomicClaim = z.infer<typeof ZAtomicClaim>;

/** Batches */
export const ZAtomicClaimArray = z.array(ZAtomicClaim).min(1);
export type AtomicClaimArray = z.infer<typeof ZAtomicClaimArray>;

/** Helper: hübsche Fehlermeldung */
export function formatZodError(e: unknown): string {
  if (!(e instanceof z.ZodError)) return String(e);
  return e.errors.map(err => `${err.path.join(".") || "(root)"}: ${err.message}`).join("\n");
}

/** Safe Parser */
export function parseClaim(input: unknown): AtomicClaim {
  return ZAtomicClaim.parse(input);
}
export function safeParseClaim(input: unknown) {
  return ZAtomicClaim.safeParse(input);
}
export function parseClaims(input: unknown): AtomicClaimArray {
  return ZAtomicClaimArray.parse(input);
}

/** Utility: leichte Normalisierung vor Validierung (optional) */
export function normalizeClaimDraft(i: any): any {
  if (i && typeof i === "object") {
    if (typeof i.zustaendigkeit === "string") {
      const map: Record<string, string> = { eu: "EU", bund: "Bund", land: "Land", kommune: "Kommune" };
      const k = i.zustaendigkeit.toLowerCase();
      if (map[k]) i.zustaendigkeit = map[k];
    }
    if (i.ort?.country && typeof i.ort.country === "string") {
      i.ort.country = i.ort.country.trim().toUpperCase();
    }
    if (i.meta && typeof i.meta === "object" && Array.isArray(i.meta.sourceUrls)) {
      i.meta.sourceUrls = i.meta.sourceUrls.filter((u: any) => typeof u === "string" && !!u.trim());
    }
  }
  return i;
}
