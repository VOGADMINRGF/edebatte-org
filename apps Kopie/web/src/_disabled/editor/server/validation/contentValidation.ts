// apps/web/src/server/validation/contentValidation.ts
export const runtime = "nodejs";

import { prisma, ContentKind, RegionMode } from "@db/web";
// Falls du sanitize-html brauchst und keine Typen hast, lieber VM/Guards verwenden oder eine ambient d.ts anlegen (siehe unten).

type AnswerOpt = {
  id?: string;
  label: string;
  value: string;
  exclusive?: boolean;
  order?: number;
};

export type ValidationResult = {
  errors: string[];
  warnings: string[];
  checks: Record<string, boolean>;
  regionAuto?: {
    candidates: Array<{ regionId: string; score: number }>;
    decidedRegionId?: string;
  };
};

// ---------- kleine, lokale Helper ----------
function isEnumValue<E extends Record<string, string | number>>(
  e: E,
  v: unknown,
): v is E[keyof E] {
  return Object.values(e).includes(v as any);
}

function toIntOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toDate(v: unknown): Date | null {
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
// ------------------------------------------

export async function validateItemDraft(input: {
  kind: ContentKind;
  text: string;
  locale?: string | null;
  regionMode?: RegionMode | null;
  regionManualId?: string | null;
  answerOptions?: AnswerOpt[];
  publishAt?: string | Date | null;
  expireAt?: string | Date | null;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: Record<string, boolean> = {};

  // kind
  if (!isEnumValue(ContentKind, input.kind)) {
    errors.push("Invalid ContentKind");
  }

  // text
  if (!input.text || !input.text.trim()) {
    errors.push("Text is required");
  }

  // region mode
  const regionMode = input.regionMode ?? RegionMode.auto;
  if (!isEnumValue(RegionMode, regionMode)) {
    errors.push("Invalid RegionMode");
  }

  // dates
  const publishAt = input.publishAt ? toDate(input.publishAt) : null;
  const expireAt = input.expireAt ? toDate(input.expireAt) : null;
  if (publishAt && expireAt && publishAt > expireAt) {
    errors.push("publishAt must be <= expireAt");
  }

  // answer options (optional simple checks)
  const opts = input.answerOptions ?? [];
  const seenOrders = new Set<number>();
  for (const o of opts) {
    if (!o.label?.trim()) warnings.push("Answer option without label");
    if (!o.value?.trim()) warnings.push("Answer option without value");
    if (o.order != null) {
      const ord = toIntOr(o.order, -1);
      if (ord < 0) warnings.push("Answer option order should be >= 0");
      if (seenOrders.has(ord)) warnings.push("Duplicate answer option order");
      seenOrders.add(ord);
    }
  }

  // region auto suggest (simple heuristic)
  const regionAuto: ValidationResult["regionAuto"] = { candidates: [] };
  if (regionMode === RegionMode.auto) {
    const code = guessRegionCode(input.text);
    if (code) {
      const regionId = await regionIdByCode(code);
      regionAuto.candidates.push({ regionId, score: 0.9 });
      regionAuto.decidedRegionId = regionId;
    }
  }

  checks.valid =
    errors.length === 0 &&
    isEnumValue(ContentKind, input.kind) &&
    isEnumValue(RegionMode, regionMode);

  return { errors, warnings, checks, regionAuto } as ValidationResult;

  // ----- helpers -----
  function guessRegionCode(text: string): string | null {
    const t = text.toUpperCase();
    if (/\bEU\b/.test(t)) return "EU";
    if (/\bDE\b/.test(t)) return "DE";
    if (/\bWORLD\b/.test(t)) return "WORLD";
    return null;
  }

  async function regionIdByCode(code: string) {
    const known = await prisma.region.findFirst({ where: { code } });
    if (known) return known.id;
    const level =
      code === "WORLD"
        ? 0
        : code === "EU"
          ? 1
          : code.startsWith("DE-")
            ? 3
            : code === "DE"
              ? 2
              : 0;
    const created = await prisma.region.create({
      data: { code, name: code, level },
    });
    return created.id;
  }
}
