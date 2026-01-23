// apps/web/src/lib/validation/contentValidation.ts

// ✅ Prisma-Enums aus @db-web (Runtime-Objekte)
import { ContentKind, RegionMode, Locale, type Prisma } from "@db/web";

// Kleine Helper-Typen, um die Enum-Werte sauber zu referenzieren
type EnumValue<T extends Record<string, string>> = T[keyof T];
type ContentKindValue = EnumValue<typeof ContentKind>;
type RegionModeValue = EnumValue<typeof RegionMode>;
type LocaleValue = EnumValue<typeof Locale>;

// ---- Types ----
export type AnswerOptionInput = {
  id?: string;
  label: string;
  value: string;
  exclusive?: boolean;
  order?: number;
};

export interface ValidationResult {
  ok: boolean;
  errors?: Array<{ field: string; code: string; message: string }>;
  // abgeleitete Felder für Auto-Regionen etc.
  regionAuto?: { country?: string | null; regionCode?: string | null } | null;
}

export interface ItemDraftInput {
  kind: ContentKindValue;
  text: string;
  topicId: string;
  regionMode: RegionModeValue;
  regionManualId?: string | null;
  publishAt?: string | Date | null;
  expireAt?: string | Date | null;
  locale?: LocaleValue | string;
  answerOptions?: AnswerOptionInput[];
}

// ---- Helpers ----
function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}
function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
function isEnumValue<T extends Record<string, string>>(
  e: T,
  v: unknown,
): v is T[keyof T] {
  return Object.values(e as Record<string, string>).includes(
    String(v),
  ) as boolean;
}
function asInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---- Validation ----
export function validateItemDraft(input: ItemDraftInput): ValidationResult {
  const errors: ValidationResult["errors"] = [];

  // kind
  if (!isEnumValue(ContentKind, input.kind)) {
    errors.push({
      field: "kind",
      code: "invalid_kind",
      message: `Ungültiger ContentKind-Wert: ${String(input.kind)}`,
    });
  }

  // text
  if (!isNonEmpty(input.text)) {
    errors.push({
      field: "text",
      code: "required",
      message: "Text darf nicht leer sein.",
    });
  }

  // topicId
  if (!isNonEmpty(input.topicId)) {
    errors.push({
      field: "topicId",
      code: "required",
      message: "topicId ist erforderlich.",
    });
  }

  // regionMode
  if (!isEnumValue(RegionMode, input.regionMode)) {
    errors.push({
      field: "regionMode",
      code: "invalid_region_mode",
      message: `Ungültiger RegionMode-Wert: ${String(input.regionMode)}`,
    });
  }

  // regionManualId (nur prüfen, wenn gesetzt)
  if (input.regionManualId != null && input.regionManualId !== undefined) {
    if (!isNonEmpty(input.regionManualId)) {
      errors.push({
        field: "regionManualId",
        code: "invalid_region_manual",
        message: "regionManualId darf, wenn vorhanden, nicht leer sein.",
      });
    }
  }

  // publish/expire
  const pub = toDate(input.publishAt ?? null);
  const exp = toDate(input.expireAt ?? null);

  if (input.publishAt != null && !pub) {
    errors.push({
      field: "publishAt",
      code: "invalid_date",
      message: "publishAt ist kein gültiges Datum.",
    });
  }
  if (input.expireAt != null && !exp) {
    errors.push({
      field: "expireAt",
      code: "invalid_date",
      message: "expireAt ist kein gültiges Datum.",
    });
  }
  if (pub && exp && exp.getTime() <= pub.getTime()) {
    errors.push({
      field: "expireAt",
      code: "range",
      message: "expireAt muss nach publishAt liegen.",
    });
  }

  // locale (optional: Enum ODER freier String)
  if (input.locale != null) {
    const l = String(input.locale);
    const allowed = Object.values(Locale as Record<string, string>);
    const isAllowed = allowed.includes(l);
    // Kein Fehler, wenn als freier String zugelassen werden soll – dann nur "säubern"
    if (!isAllowed && !isNonEmpty(l)) {
      errors.push({
        field: "locale",
        code: "invalid_locale",
        message: "locale ist leer oder ungültig.",
      });
    }
  }

  // answerOptions (optional, aber wenn vorhanden, validieren)
  if (Array.isArray(input.answerOptions)) {
    const seenValues: string[] = [];
    input.answerOptions.forEach((opt, idx) => {
      const idxLabel = `answerOptions[${idx}]`;

      if (!isNonEmpty(opt.label)) {
        errors.push({
          field: `${idxLabel}.label`,
          code: "required",
          message: "label darf nicht leer sein.",
        });
      }
      if (!isNonEmpty(opt.value)) {
        errors.push({
          field: `${idxLabel}.value`,
          code: "required",
          message: "value darf nicht leer sein.",
        });
      } else {
        const v = String(opt.value);
        if (seenValues.includes(v)) {
          errors.push({
            field: `${idxLabel}.value`,
            code: "duplicate",
            message: `value '${v}' ist nicht einzigartig.`,
          });
        }
        seenValues.push(v);
      }

      if (opt.order != null) {
        const n = asInt(opt.order);
        if (n == null) {
          errors.push({
            field: `${idxLabel}.order`,
            code: "invalid_number",
            message: "order muss eine Zahl sein.",
          });
        }
      }
    });

    // Optional: Reihenfolge-Check auf Eindeutigkeit (nur wenn alle numerisch sind)
    const numericOrders = input.answerOptions
      .map((o) => (o.order == null ? null : asInt(o.order)))
      .filter((v): v is number => v != null);

    if (
      numericOrders.length > 0 &&
      uniq(numericOrders).length !== numericOrders.length
    ) {
      errors.push({
        field: "answerOptions",
        code: "duplicate_order",
        message: "order-Werte der answerOptions müssen eindeutig sein.",
      });
    }
  } else if (input.answerOptions != null) {
    errors.push({
      field: "answerOptions",
      code: "invalid",
      message: "answerOptions muss ein Array sein.",
    });
  }

  return {
    ok: (errors?.length ?? 0) === 0,
    errors: errors.length ? errors : undefined,
    regionAuto: null, // Platzhalter – kann bei Bedarf in der Aufrufer-Logik gesetzt werden
  };
}

// ---- Optionale Re-Exports / Nützliches ----
export const Allowed = {
  ContentKind: Object.values(ContentKind) as ContentKindValue[],
  RegionMode: Object.values(RegionMode) as RegionModeValue[],
  Locale: Object.values(Locale) as LocaleValue[],
};

export type { Prisma };
