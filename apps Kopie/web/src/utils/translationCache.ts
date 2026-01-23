// apps/web/src/utils/translationCache.ts
// Synchroner In-Memory-Cache (dev/edge-safe). Keine Promises nötig.

type Key = string;

function makeKey(text: string, lang: string): Key {
  // normalize: lower-case, collapse whitespace
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  const l = lang.trim().toLowerCase();
  return `${l}::${t}`;
}

export const translationCache = {
  _m: new Map<Key, string>(),

  get(text: string, lang: string): string | undefined {
    return this._m.get(makeKey(text, lang));
  },

  set(text: string, lang: string, translated: string): void {
    this._m.set(makeKey(text, lang), translated);
  },
};
