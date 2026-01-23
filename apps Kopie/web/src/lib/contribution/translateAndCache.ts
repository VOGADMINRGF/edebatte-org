// apps/web/src/lib/contribution/translateAndCache.ts
import { fetchGptTranslation } from "@/utils/gptTranslator";
import { translationCache } from "@/utils/translationCache";

/**
 * Übersetzt eine Liste von Texten in mehrere Zielsprachen und cached die Ergebnisse.
 * Rückgabeform: { [text]: { [lang]: translation } }
 */
export async function translateAndCache(
  texts: string[],
  targetLanguages: string[],
): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = {};

  for (const text of texts) {
    result[text] = {};

    for (const lang of targetLanguages) {
      const cached = translationCache.get(text, lang);
      if (cached) {
        result[text][lang] = cached;
        continue;
      }

      // Wichtig: KORREKTER Funktionsname + await → string, kein Promise<string>
      const translation = await fetchGptTranslation(text, lang);
      translationCache.set(text, lang, translation);
      result[text][lang] = translation;
    }
  }

  return result;
}
