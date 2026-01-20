#!/usr/bin/env node
/**
 * Replace OLD brand with NEW across TS/TSX/MD/JSON/CSS files.
 * Usage: node scripts/helpers/bulk_rename_brand.js "eDebatte" "e‑Debatte" [rootDir]
 */
const fs = require('fs');
const path = require('path');

const OLD = process.argv[2];
const NEW = process.argv[3];
const ROOT = process.argv[4] || ".";
if (!OLD || !NEW) {
  console.error("Usage: bulk_rename_brand OLD NEW [root]"); process.exit(1);
}

const exts = new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs",".json",".md",".mdx",".css",".scss",".sass",".html",".yml",".yaml"]);
function listFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const abs = path.join(d, f);
      if (f === "node_modules" || f.startsWith(".")) continue;
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (exts.has(path.extname(abs))) out.push(abs);
    }
  })(dir);
  return out;
}

let modified = 0, scanned = 0;
for (const file of listFiles(ROOT)) {
  scanned++;
  const s = fs.readFileSync(file, "utf8");
  if (!s.includes(OLD)) continue;
  // Replace only the full OLD string occurrences.
  const ns = s.split(OLD).join(NEW);
  if (ns !== s) {
    fs.writeFileSync(file, ns, "utf8");
    modified++;
    console.log(`[brand] updated: ${path.relative(ROOT, file)}`);
  }
}
console.log(`[brand] scanned=${scanned} modified=${modified}`);
