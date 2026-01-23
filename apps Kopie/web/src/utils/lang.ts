// apps/web/src/utils/lang.ts
export function normLang(tag?: string | null) {
  if (!tag) return undefined;
  return tag.toLowerCase().replace(/_/g, "-").split(/[;,]/)[0]?.trim();
}
