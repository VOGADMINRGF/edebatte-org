#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function resolveRoot() {
  const scriptRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const candidates = [
    (() => {
      try {
        return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
      } catch {
        return null;
      }
    })(),
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    scriptRoot,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "apps/web/src/app"))) {
      return candidate;
    }
  }

  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    return scriptRoot;
  }
}

const ROOT = resolveRoot();
const APP_DIR = path.join(ROOT, "apps/web/src/app");
const H1_ALLOWLIST_PATH = path.join(ROOT, "config/page-contracts/missing-h1.allowlist.txt");
const COMPARISON_PAGE_COMPONENT_PATH = path.join(
  ROOT,
  "apps/web/src/features/comparison/ComparisonPage.tsx",
);
const DELEGATED_H1_MARKER = /page-contract:\s*delegated-h1\b/;
const COMPARISON_PAGE_USAGE = /<ComparisonPage\b/;

const BUTTON_PATTERNS = [
  { id: "legacy-black-button", regex: /bg-black text-white rounded px-4 py-2/ },
  { id: "legacy-btn-accent", regex: /\bbtn-accent\b/ },
];

function walkPageFiles(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPageFiles(abs, acc);
      continue;
    }
    if (entry.isFile() && entry.name === "page.tsx") {
      acc.push(abs);
    }
  }
  return acc;
}

function readAllowlist(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  return new Set(
    lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#")),
  );
}

function toRel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, "/");
}

function countH1(content) {
  return content.match(/<h1[\s>]/g)?.length ?? 0;
}

const comparisonPageComponent = fs.existsSync(COMPARISON_PAGE_COMPONENT_PATH)
  ? fs.readFileSync(COMPARISON_PAGE_COMPONENT_PATH, "utf8")
  : "";
const comparisonPageH1Count = countH1(comparisonPageComponent);

function hasPageH1Contract(content) {
  if (/<h1[\s>]/.test(content) || DELEGATED_H1_MARKER.test(content)) return true;
  if (COMPARISON_PAGE_USAGE.test(content)) {
    return comparisonPageH1Count === 1;
  }
  return false;
}

const pages = walkPageFiles(APP_DIR).sort();
const allowMissingH1 = readAllowlist(H1_ALLOWLIST_PATH);

const missingH1 = [];
const buttonViolations = [];

for (const filePath of pages) {
  const rel = toRel(filePath);
  const content = fs.readFileSync(filePath, "utf8");

  if (!hasPageH1Contract(content)) {
    missingH1.push(rel);
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of BUTTON_PATTERNS) {
      if (pattern.regex.test(line)) {
        buttonViolations.push({
          file: rel,
          line: i + 1,
          id: pattern.id,
          preview: line.trim(),
        });
      }
    }
  }
}

const unexpectedMissingH1 = missingH1.filter((file) => !allowMissingH1.has(file));
const staleAllowlist = [...allowMissingH1].filter((file) => !missingH1.includes(file));

console.log(`[page-check] scanned ${pages.length} page.tsx files`);
console.log(`[page-check] missing <h1>: ${missingH1.length} (allowlisted: ${allowMissingH1.size})`);
console.log(`[page-check] comparison delegated <h1>: ${comparisonPageH1Count}`);
console.log(`[page-check] button violations: ${buttonViolations.length}`);

if (staleAllowlist.length > 0) {
  console.log("[page-check] stale allowlist entries (cleanup recommended):");
  for (const file of staleAllowlist) {
    console.log(`  - ${file}`);
  }
}

let hasErrors = false;

if (comparisonPageComponent && comparisonPageH1Count !== 1) {
  hasErrors = true;
  console.error(
    `[page-check] ERROR ComparisonPage must render exactly one <h1>, found ${comparisonPageH1Count}`,
  );
}

if (unexpectedMissingH1.length > 0) {
  hasErrors = true;
  console.error("[page-check] ERROR unexpected pages without <h1>:");
  for (const file of unexpectedMissingH1) {
    console.error(`  - ${file}`);
  }
}

if (buttonViolations.length > 0) {
  hasErrors = true;
  console.error("[page-check] ERROR legacy button classes found:");
  for (const issue of buttonViolations) {
    console.error(`  - ${issue.file}:${issue.line} [${issue.id}] ${issue.preview}`);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log("[page-check] PASS");
