import { createHash } from "crypto";
import { coreCol } from "@core/db/triMongo";

export type TranslationBatchItem = { key: string; text: string };
export type TranslationCacheItem = { text: string; translatedText: string };

export type I18nTranslationDoc = {
  _id: string;
  engine: string;
  srcLang: string;
  tgtLang: string;
  srcHash: string;
  translatedText: string;
  createdAtDate: Date;
};

const COLLECTION = "i18n_translations";
let ensureIndexesOnce: Promise<void> | null = null;

async function ensureIndexes() {
  if (!ensureIndexesOnce) {
    ensureIndexesOnce = (async () => {
      const col = await coreCol<I18nTranslationDoc>(COLLECTION);
      await col
        .createIndex({ engine: 1, srcLang: 1, tgtLang: 1, srcHash: 1 }, { name: "idx_engine_src_tgt_hash" })
        .catch(() => {});
      await col.createIndex({ createdAtDate: -1 }, { name: "idx_created_desc" }).catch(() => {});
    })();
  }
  await ensureIndexesOnce;
}

async function translationsCol() {
  await ensureIndexes();
  return coreCol<I18nTranslationDoc>(COLLECTION);
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function makeTranslationId(
  engine: string,
  srcLang: string,
  tgtLang: string,
  text: string,
): { id: string; srcHash: string } {
  const srcHash = sha256(text);
  const id = sha256(`${engine}|${srcLang}|${tgtLang}|${srcHash}`);
  return { id, srcHash };
}

export async function getCachedTranslation(
  engine: string,
  srcLang: string,
  tgtLang: string,
  text: string,
): Promise<string | null> {
  const { id } = makeTranslationId(engine, srcLang, tgtLang, text);
  const col = await translationsCol();
  const doc = await col.findOne({ _id: id });
  return doc?.translatedText ?? null;
}

export async function getCachedTranslationsForItems(
  engine: string,
  srcLang: string,
  tgtLang: string,
  items: TranslationBatchItem[],
): Promise<{ hits: Record<string, string>; misses: TranslationBatchItem[] }> {
  const unique = new Map<string, string>();
  for (const item of items) {
    if (!item?.key || typeof item.text !== "string") continue;
    if (!unique.has(item.key)) unique.set(item.key, item.text);
  }
  if (!unique.size) return { hits: {}, misses: [] };

  const idByKey = new Map<string, string>();
  const ids: string[] = [];
  for (const [key, text] of unique.entries()) {
    const { id } = makeTranslationId(engine, srcLang, tgtLang, text);
    idByKey.set(key, id);
    ids.push(id);
  }

  const col = await translationsCol();
  const docs = await col.find({ _id: { $in: ids } }).toArray();
  const byId = new Map<string, string>();
  for (const doc of docs) {
    if (doc?._id && typeof doc.translatedText === "string") {
      byId.set(doc._id, doc.translatedText);
    }
  }

  const hits: Record<string, string> = {};
  const misses: TranslationBatchItem[] = [];
  for (const [key, text] of unique.entries()) {
    const id = idByKey.get(key);
    const cached = id ? byId.get(id) : undefined;
    if (cached) hits[key] = cached;
    else misses.push({ key, text });
  }
  return { hits, misses };
}

export async function upsertCachedTranslation(
  engine: string,
  srcLang: string,
  tgtLang: string,
  text: string,
  translatedText: string,
) {
  const { id, srcHash } = makeTranslationId(engine, srcLang, tgtLang, text);
  const col = await translationsCol();
  const now = new Date();
  await col.updateOne(
    { _id: id },
    {
      $set: { engine, srcLang, tgtLang, srcHash, translatedText, createdAtDate: now },
      $setOnInsert: { createdAtDate: now },
    },
    { upsert: true },
  );
}

export async function upsertCachedTranslations(
  engine: string,
  srcLang: string,
  tgtLang: string,
  items: TranslationCacheItem[],
) {
  const filtered = items.filter(
    (item) => typeof item.text === "string" && item.text.trim() && typeof item.translatedText === "string",
  );
  if (!filtered.length) return;
  const col = await translationsCol();
  const now = new Date();
  const ops = filtered.map((item) => {
    const { id, srcHash } = makeTranslationId(engine, srcLang, tgtLang, item.text);
    return {
      updateOne: {
        filter: { _id: id },
        update: {
          $set: { engine, srcLang, tgtLang, srcHash, translatedText: item.translatedText, createdAtDate: now },
          $setOnInsert: { createdAtDate: now },
        },
        upsert: true,
      },
    };
  });
  if (!ops.length) return;
  await col.bulkWrite(ops, { ordered: false }).catch(() => {});
}
