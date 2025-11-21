// core/regions/regionTranslations.ts
import { coreCol } from "@core/db/triMongo";
import {
  CORE_LOCALES,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@core/locale/locales";
import { buildRegionKey, normalizeRegionCode, type RegionCode } from "./types";

const COLLECTION = "region_translations";

interface RegionTranslationDoc {
  _id?: string;
  regionKey: string;
  locale: SupportedLocale;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function upsertRegionTranslation({
  region,
  locale,
  name,
}: {
  region: RegionCode | string;
  locale: SupportedLocale;
  name: string;
}): Promise<void> {
  const normalized = normalizeRegionCode(region);
  if (!normalized) return;
  const regionKey = buildRegionKey(normalized);
  const col = await coreCol<RegionTranslationDoc>(COLLECTION);

  await col.updateOne(
    { regionKey, locale },
    {
      $set: {
        name,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function getRegionName(
  region: RegionCode | string | null | undefined,
  locale: SupportedLocale,
  fallbackLocale: SupportedLocale = DEFAULT_LOCALE,
): Promise<string | null> {
  const normalized = normalizeRegionCode(region);
  if (!normalized) return null;
  const regionKey = buildRegionKey(normalized);
  if (!regionKey) return null;

  const col = await coreCol<RegionTranslationDoc>(COLLECTION);
  const docs = await col.find({ regionKey }).toArray();
  if (!docs.length) return null;

  const byLocale = new Map<SupportedLocale, string>();
  docs.forEach((doc) => byLocale.set(doc.locale, doc.name));

  const chain = buildLocalePreferenceChain(locale, fallbackLocale);
  for (const candidate of chain) {
    const name = byLocale.get(candidate);
    if (name) return name;
  }

  return null;
}

function buildLocalePreferenceChain(
  requested: SupportedLocale,
  fallback: SupportedLocale,
): SupportedLocale[] {
  const seen = new Set<SupportedLocale>();
  const chain: SupportedLocale[] = [];

  const push = (loc: SupportedLocale) => {
    if (!seen.has(loc)) {
      seen.add(loc);
      chain.push(loc);
    }
  };

  push(requested);
  push(fallback);
  CORE_LOCALES.forEach(push);
  SUPPORTED_LOCALES.forEach(push);

  return chain;
}
