#!/usr/bin/env node
/**
 * Codex Preflight
 * - Prueft, ob triMongo-Kernelemente existieren (core/votes/pii Setup im Code)
 * - Prueft kritische Pipeline-Routen auf verbotene Imports (Prisma/Mongoose/Legacy Models)
 * - Prueft OpenAI Default Model (haeufigster Grund fuer "Alle Provider failed")
 *
 * Usage:
 *   node scripts/codex-preflight.mjs
 *   node scripts/codex-preflight.mjs --strict
 *   node scripts/codex-preflight.mjs --write codex/preflight-report.json
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const WRITE_IDX = args.findIndex((a) => a === "--write");
const WRITE_PATH = WRITE_IDX !== -1 ? args[WRITE_IDX + 1] : null;

const PIPELINE_DIRS = [
  "apps/web/src/app/api/feeds",
  "apps/web/src/app/api/factcheck",
  "features/analyze",
  "features/feeds",
];

const FORBIDDEN_PATTERNS = [
  { id: "prisma_client", pattern: "@prisma/client" },
  { id: "prisma_lib", pattern: "@/lib/prisma" },
  { id: "mongoose", pattern: "mongoose" },
  { id: "legacy_models", pattern: "@/models" },
  { id: "dbConnect", pattern: "dbConnect(" },
];

const TRI_MONGO_CANDIDATES = [
  "core/db/triMongo.ts",
  "core/triMongo.ts",
  "core/db/db/triMongo.ts",
];

function exists(rel) {
  try {
    fs.accessSync(path.join(ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkFiles(dirRel) {
  const dirAbs = path.join(ROOT, dirRel);
  const out = [];
  if (!fs.existsSync(dirAbs)) return out;
  const stack = [dirAbs];
  while (stack.length) {
    const cur = stack.pop();
    const st = fs.statSync(cur);
    if (st.isDirectory()) {
      const entries = fs.readdirSync(cur);
      for (const e of entries) {
        if (e === "node_modules" || e === ".next" || e === "dist" || e === "build") continue;
        stack.push(path.join(cur, e));
      }
    } else if (st.isFile()) {
      if (cur.endsWith(".ts") || cur.endsWith(".tsx") || cur.endsWith(".js") || cur.endsWith(".mjs")) {
        out.push(cur);
      }
    }
  }
  return out;
}

function relFromAbs(abs) {
  return abs.replace(ROOT + path.sep, "").replaceAll("\\", "/");
}

function scanForbidden() {
  const hits = [];
  for (const dir of PIPELINE_DIRS) {
    const files = walkFiles(dir);
    for (const fAbs of files) {
      const rel = relFromAbs(fAbs);
      const txt = fs.readFileSync(fAbs, "utf8");
      for (const fp of FORBIDDEN_PATTERNS) {
        const idx = txt.indexOf(fp.pattern);
        if (idx !== -1) {
          // attempt to compute line number
          const before = txt.slice(0, idx);
          const line = before.split("\n").length;
          hits.push({ file: rel, patternId: fp.id, pattern: fp.pattern, line });
        }
      }
    }
  }
  return hits;
}

function detectOpenAiDefaultModel() {
  const rel = "features/ai/providers/openai.ts";
  if (!exists(rel)) return { ok: false, reason: "openai_provider_missing" };
  const txt = readText(rel);
  // naive parse: const MODEL = process.env.OPENAI_MODEL || "..."
  const m = txt.match(/const\s+MODEL\s*=\s*process\.env\.OPENAI_MODEL\s*\|\|\s*["']([^"']+)["']/);
  const defaultModel = m?.[1] ?? null;
  const envModel = process.env.OPENAI_MODEL ?? null;
  return { ok: true, defaultModel, envModel };
}

function triMongoPresence() {
  const found = TRI_MONGO_CANDIDATES.filter(exists);
  return { found, ok: found.length > 0 };
}

function summarize(report) {
  const lines = [];
  lines.push("Codex Preflight Report");
  lines.push(`root: ${ROOT}`);
  lines.push("");

  lines.push("triMongo:");
  lines.push(`  ok: ${report.triMongo.ok}`);
  lines.push(`  found: ${report.triMongo.found.length ? report.triMongo.found.join(", ") : "none"}`);
  lines.push("");

  lines.push("pipeline forbidden imports:");
  lines.push(`  hits: ${report.forbiddenHits.length}`);
  for (const h of report.forbiddenHits.slice(0, 50)) {
    lines.push(`  - ${h.file}:${h.line}  ${h.patternId} (${h.pattern})`);
  }
  if (report.forbiddenHits.length > 50) lines.push(`  ... +${report.forbiddenHits.length - 50} more`);
  lines.push("");

  lines.push("openai provider:");
  if (!report.openai.ok) {
    lines.push(`  ok: false (${report.openai.reason})`);
  } else {
    lines.push(`  defaultModel: ${report.openai.defaultModel ?? "unknown"}`);
    lines.push(`  env OPENAI_MODEL: ${report.openai.envModel ?? "(not set)"}`);
    if ((report.openai.envModel ?? "").trim() === "" && report.openai.defaultModel === "gpt-5") {
      lines.push("  warning: defaultModel=gpt-5 and OPENAI_MODEL not set -> high chance of provider access failure");
    }
  }
  lines.push("");

  return lines.join("\n");
}

function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    triMongo: triMongoPresence(),
    forbiddenHits: scanForbidden(),
    openai: detectOpenAiDefaultModel(),
  };

  const text = summarize(report);
  console.log(text);

  if (WRITE_PATH) {
    const outAbs = path.join(ROOT, WRITE_PATH);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify(report, null, 2), "utf8");
    console.log(`wrote: ${WRITE_PATH}`);
  }

  const hardFail =
    !report.triMongo.ok ||
    report.forbiddenHits.length > 0;

  if (STRICT && hardFail) {
    console.error("Preflight FAILED in --strict mode.");
    process.exit(1);
  }
}

main();

