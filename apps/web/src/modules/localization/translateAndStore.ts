// LEGACY: kept for VPM25 translation experiments; currently not wired into
// active flows but preserved as a reference for future provider rollouts.
import { createHash } from "node:crypto";
import { coreCol } from "@core/db/triMongo";
import { logAiUsage } from "@core/telemetry/aiUsage";
import type { AiErrorKind, AiPipelineName } from "@core/telemetry/aiUsageTypes";
import { callOpenAIJson } from "@features/ai";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
  isCoreLocale,
} from "@/config/locales";

const COLLECTION = "content_translations";
const DEFAULT_PIPELINE: AiPipelineName = "content_translate";

interface TranslationDoc {
  _id?: string;
  key: string;
  sourceLocale: string;
  targetLocale: SupportedLocale;
  sourceHash: string;
  context?: string | null;
  originalText: string;
  translatedText: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TranslationKeyRef =
  | { key: string }
  | { contentType: string; contentId: string | number; field: string };

function resolveTranslationKey(ref: TranslationKeyRef): string {
  if ("key" in ref && ref.key) return ref.key;
  if ("contentType" in ref) {
    const type = ref.contentType?.toString().trim().toLowerCase();
    const id = ref.contentId?.toString();
    const field = ref.field?.toString().trim().toLowerCase();
    return `${type ?? "content"}:${id ?? "unknown"}:${field ?? "body"}`;
  }
  return "content:unknown:body";
}

export type TranslateAndStoreArgs = TranslationKeyRef & {
  text: string;
  sourceLocale?: string | null;
  targetLocale: SupportedLocale;
  context?: string;
  pipeline?: AiPipelineName;
};

export async function getStoredTranslation(
  ref: TranslationKeyRef,
  targetLocale: SupportedLocale,
): Promise<string | null> {
  const key = resolveTranslationKey(ref);
  const col = await coreCol<TranslationDoc>(COLLECTION);
  const doc = await col.findOne({ key, targetLocale });
  return doc?.translatedText ?? null;
}

export async function translateAndStore(args: TranslateAndStoreArgs): Promise<string> {
  const key = resolveTranslationKey(args);
  const {
    text,
    sourceLocale = DEFAULT_LOCALE,
    targetLocale,
    context,
    pipeline = DEFAULT_PIPELINE,
  } = args;

  const preparedText = text?.trim();
  if (!preparedText) return "";
  if (targetLocale === sourceLocale) return preparedText;

  const normalizedSource =
    typeof sourceLocale === "string" && sourceLocale.trim()
      ? sourceLocale.trim().toLowerCase()
      : DEFAULT_LOCALE;

  const col = await coreCol<TranslationDoc>(COLLECTION);
  const sourceHash = hashSource(preparedText, normalizedSource);
  const existing = await col.findOne({ key, targetLocale });

  if (existing && existing.sourceHash === sourceHash) {
    return existing.translatedText;
  }

  const started = Date.now();

  try {
    const { text: raw } = await callOpenAIJson({
      system:
        "You translate civic-tech copy between multiple languages. Preserve intent, avoid hallucinations, and return JSON {\"translation\":\"...\"}.",
      user: [
        `Source locale: ${normalizedSource}`,
        `Target locale: ${targetLocale}`,
        context ? `Context: ${context}` : null,
        "",
        "Text:",
        preparedText,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const translation = extractTranslation(raw?.trim() ?? "") || preparedText;

    await col.updateOne(
      { key, targetLocale },
      {
        $set: {
          sourceLocale: normalizedSource,
          targetLocale,
          sourceHash,
          context: context ?? null,
          originalText: preparedText,
          translatedText: translation,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    await logAiUsage({
      createdAt: new Date(),
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-5",
      pipeline,
      locale: targetLocale,
      tokensInput: 0,
      tokensOutput: 0,
      costEur: 0,
      durationMs: Date.now() - started,
      success: true,
      errorKind: null,
      strictJson: true,
    });

    return translation;
  } catch (error: any) {
    const errorKind: AiErrorKind =
      error?.name === "AbortError"
        ? "TIMEOUT"
        : /json/i.test(String(error?.message ?? "")) ? "BAD_JSON" : "INTERNAL";
    await logAiUsage({
      createdAt: new Date(),
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-5",
      pipeline,
      locale: targetLocale,
      tokensInput: 0,
      tokensOutput: 0,
      costEur: 0,
      durationMs: Date.now() - started,
      success: false,
      errorKind,
      strictJson: true,
    });
    return preparedText;
  }
}

export type TranslateOnDemandArgs = TranslateAndStoreArgs & {
  demand?: {
    localeSelected?: boolean;
    acceptLanguageHeader?: string | null;
    force?: boolean;
  };
};

export async function translateOnDemand(
  args: TranslateOnDemandArgs,
): Promise<string | null> {
  const existing = await getStoredTranslation(args, args.targetLocale);
  if (existing) return existing;

  const demand = args.demand ?? {};
  const acceptMatch = demand.acceptLanguageHeader
    ? matchesAcceptLanguage(args.targetLocale, demand.acceptLanguageHeader)
    : false;
  const targetIsCore = isCoreLocale(args.targetLocale);
  const shouldTranslate =
    demand.force || targetIsCore || demand.localeSelected || acceptMatch;

  if (!shouldTranslate) return null;

  return translateAndStore(args);
}

function matchesAcceptLanguage(target: string, header: string): boolean {
  return header
    .split(",")
    .map((chunk) => chunk.split(";")[0]?.trim().slice(0, 2).toLowerCase())
    .filter(Boolean)
    .some((lang) => lang === target);
}

function hashSource(text: string, locale: string): string {
  return createHash("sha1").update(`${locale}:${text}`).digest("hex");
}

function extractTranslation(payload: string): string | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed.translation === "string") {
      const trimmed = parsed.translation.trim();
      if (trimmed) return trimmed;
    }
  } catch {
    /* ignore */
  }
  return null;
}
