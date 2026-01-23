// apps/web/src/utils/geo/normalize.ts
export function clampBbox(b: number[]): [number, number, number, number] {
  if (!Array.isArray(b) || b.length !== 4) throw new Error("bbox_invalid");
  const [w, s, e, n] = b.map(Number);
  if ([w, s, e, n].some(Number.isNaN)) throw new Error("bbox_nan");
  return [
    Math.max(-180, w),
    Math.max(-90, s),
    Math.min(180, e),
    Math.min(90, n),
  ];
}

export function parseBbox(
  param: string | null,
): [number, number, number, number] | null {
  if (!param) return null;
  const a = param.split(",").map(Number);
  if (a.length !== 4 || a.some(Number.isNaN)) return null;
  return clampBbox(a);
}
