#!/usr/bin/env node
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const targets = [
  { name: "core", schema: join(root, "prisma/core/schema.prisma") },
  { name: "web",  schema: join(root, "prisma/web/schema.prisma") },
];

for (const t of targets) {
  if (!existsSync(t.schema)) {
    console.log(`ℹ️  Skip ${t.name}: ${t.schema} not found`);
    continue;
  }
  console.log(`🔧 Generating Prisma client for ${t.name}: ${t.schema}`);
  try {
    execSync(`pnpm -w exec prisma generate --schema "${t.schema}"`, { stdio: "inherit" });
  } catch {
    console.warn(`⚠️  pnpm -w exec prisma failed for ${t.name}, falling back to pnpm dlx …`);
    execSync(`pnpm dlx prisma generate --schema "${t.schema}"`, { stdio: "inherit" });
  }
}
