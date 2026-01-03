import {
  getCachedTranslationsForItems,
  upsertCachedTranslations,
  type TranslationBatchItem,
} from "@/lib/db/i18nTranslationsRepo";

type BatchItem = TranslationBatchItem;
type TranslateBatchArgs = { srcLang: string; tgtLang: string; items: BatchItem[]; engine?: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function jsonParseSafe(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractTranslations(data: any): Array<{ key: string; text: string }> {
  const jsonCandidate =
    data?.output?.[0]?.content?.find((c: any) => c?.type === "output_json")?.json ??
    data?.output?.[0]?.content?.[0]?.json ??
    jsonParseSafe(data?.output_text ?? data?.output?.[0]?.content?.[0]?.text ?? "");

  const translations = Array.isArray(jsonCandidate?.translations) ? jsonCandidate.translations : [];
  return translations
    .map((t: any) => ({
      key: typeof t?.key === "string" ? t.key.trim() : "",
      text: typeof t?.text === "string" ? t.text.trim() : "",
    }))
    .filter((t) => t.key && t.text);
}

export async function translateBatchOpenAI(args: TranslateBatchArgs): Promise<Record<string, string>> {
  const engine = args.engine ?? process.env.VOG_TRANSLATE_MODEL ?? "gpt-4o-mini";
  const maxChars = clamp(Number(process.env.VOG_TRANSLATE_MAX_CHARS ?? "6000"), 1000, 20000);
  const srcLang = args.srcLang;
  const tgtLang = args.tgtLang;

  const items = (args.items ?? []).filter(
    (item) => item?.key && typeof item.text === "string" && item.text.trim().length > 0,
  );
  if (!items.length) return {};

  const { hits, misses } = await getCachedTranslationsForItems(engine, srcLang, tgtLang, items);
  const out: Record<string, string> = { ...hits };
  if (!misses.length) return out;

  const joined = JSON.stringify(misses.map((m) => ({ key: m.key, text: m.text.slice(0, maxChars) })));
  const prompt = [
    `Translate from ${srcLang} to ${tgtLang}.`,
    "Rules: keep meaning; keep names/URLs unchanged; do not add commentary.",
    'Return STRICT JSON only: {"translations":[{"key":"...","text":"..."}]}.',
    `Input items JSON: ${joined}`,
  ].join("\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    for (const m of misses) out[m.key] = m.text;
    return out;
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: engine,
      input: prompt,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "translations",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              translations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: { key: { type: "string" }, text: { type: "string" } },
                  required: ["key", "text"],
                },
              },
            },
            required: ["translations"],
          },
        },
      },
    }),
  });
  if (!res.ok) {
    for (const m of misses) out[m.key] = m.text;
    return out;
  }

  const data: any = await res.json().catch(() => null);
  const translations = extractTranslations(data);

  const cacheItems: Array<{ text: string; translatedText: string }> = [];
  for (const t of translations) {
    const original = misses.find((m) => m.key === t.key)?.text;
    if (!original) continue;
    out[t.key] = t.text;
    cacheItems.push({ text: original, translatedText: t.text });
  }
  if (cacheItems.length) {
    await upsertCachedTranslations(engine, srcLang, tgtLang, cacheItems);
  }

  for (const m of misses) {
    if (!out[m.key]) out[m.key] = m.text;
  }

  return out;
}
