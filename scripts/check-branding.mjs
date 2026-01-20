#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PATTERNS = [/VoiceOpenGov/, /voiceopengov/i];
const ALLOWLIST = [
  /apps[/\\]web[/\\]src[/\\]app[/\\]impressum[/\\]/,
  /scripts[/\\]check-branding\.mjs$/,
];
const CHECK_ROOTS = [
  path.join(ROOT, "apps/web/src"),
  path.join(ROOT, "packages/ui/src"),
];

const IGNORE_DIRS = new Set(["node_modules", ".git", ".next", ".turbo", "dist", "build", "coverage", ".cache"]);

const TEXT_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".sass",
  ".html",
  ".txt",
  ".yml",
  ".yaml",
  ".env",
  "",
]);

const matches = [];

function isIgnoredDir(name) {
  return IGNORE_DIRS.has(name) || name.startsWith(".");
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTS.has(ext)) return true;
  try {
    const buf = fs.readFileSync(filePath);
    return !buf.includes(0);
  } catch {
    return false;
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isIgnoredDir(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const baseName = path.basename(fullPath);
    if (baseName.startsWith(".env") && !baseName.includes("example")) continue;
    if (!isTextFile(fullPath)) continue;
    const relPath = path.relative(ROOT, fullPath);
    if (ALLOWLIST.some((re) => re.test(relPath))) continue;

    let content;
    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      PATTERNS.forEach((pattern) => {
        if (pattern.test(line)) {
          matches.push({
            file: relPath,
            line: idx + 1,
            preview: line.trim(),
          });
        }
      });
    });
  }
}

const roots = CHECK_ROOTS.filter((p) => fs.existsSync(p));
if (!roots.length) {
  console.error("No check roots found, skipping.");
  process.exit(0);
}

roots.forEach((r) => walk(r));

if (matches.length) {
  console.error("Brand terms found outside impressum:");
  for (const m of matches) {
    console.error(`- ${m.file}:${m.line} → ${m.preview}`);
  }
  process.exit(1);
} else {
  console.log("Brand check passed: no forbidden brand references outside impressum.");
}
