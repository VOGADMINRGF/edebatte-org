import fs from "node:fs";
import path from "node:path";

export function listPressAssets() {
  const base = path.resolve(process.cwd(), "public/press");
  if (!fs.existsSync(base)) return [] as { href: string; label: string }[];
  const files = fs.readdirSync(base);
  return files.map((f) => ({ href: `/press/${f}`, label: f }));
}
