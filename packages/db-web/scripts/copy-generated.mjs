import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("src/generated");
const dest = resolve("dist/generated");

if (!existsSync(src)) {
  console.warn(`[db-web] skip copy-generated – missing ${src}`);
  process.exit(0);
}

cpSync(src, dest, { recursive: true, force: true });
console.info(`[db-web] copied Prisma client from ${src} to ${dest}`);
