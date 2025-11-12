#!/usr/bin/env node
/* Repo-weiter Auditor/Fixer für ObjectId-Imports.
 *
 * Dry-Run (nur prüfen):
 *   node tools/audit/objectid-import-audit.mjs .
 *
 * Fix ausführen:
 *   node tools/audit/objectid-import-audit.mjs . --write
 *
 * Exit Codes:
 *  - 0: keine Probleme (oder alles gefixt, keine Warnungen)
 *  - 1: Probleme gefunden (im Dry-Run) oder verbleibende Warnungen
 */

import fs from "fs/promises";
import path from "path";
import process from "process";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const ROOTS = process.argv.slice(2).filter(a => !a.startsWith("--"));
const WRITE = process.argv.includes("--write");

if (ROOTS.length === 0) {
  ROOTS.push(path.resolve(__dirname, "..", "..")); // default: repo root
}

const EXTS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", "dist", "build", ".turbo"]);

const results = [];
const warnings = [];

async function* walk(dir) {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of ents) {
    if (ent.name.startsWith(".")) {
      // allow .vscode etc., but skip .git and .next via IGNORE_DIRS
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      yield* walk(full);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name);
      if (EXTS.has(ext)) yield full;
    }
  }
}

function uniq(arr) { return Array.from(new Set(arr)); }

// ---- Regex-Helfer -----------------------------------------------------------
// import { A, B as C } from "mongodb";
const RE_NAMED_FROM_MONGODB =
  /(^|\n)\s*import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]mongodb['"]\s*;?/gms;

// import { A, B } from "@core/triMongo";
const RE_NAMED_FROM_TRIMONGO =
  /(^|\n)\s*import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]@core\/triMongo['"]\s*;?/gms;

// import * as mdb from "mongodb";   oder   import mongodb from "mongodb";
const RE_STAR_OR_DEFAULT_FROM_MONGODB =
  /(^|\n)\s*import\s+(?:\*\s+as\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))\s+from\s+['"]mongodb['"]\s*;?/gms;

// Um einzelne Spezifizierer zu splitten (robust genug für Standardfälle)
function splitSpecifiers(specsRaw) {
  return specsRaw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function parseSpecifier(spec) {
  // "ObjectId as X"  oder  "ObjectId"
  const m = /^ObjectId(\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(spec);
  if (!m) return null;
  const alias = m[2] || "ObjectId";
  return { alias };
}

function addOrExtendTriMongoImport(src, toAdd, asType) {
  // Suche ggf. vorhandenen Import gleicher Art (type vs non-type)
  let changed = false;
  let found = false;

  src = src.replace(RE_NAMED_FROM_TRIMONGO, (full, lead, typeKw, body) => {
    const isType = Boolean(typeKw);
    if (isType !== asType) return full; // anderer Typ-Import: nicht anfassen

    found = true;
    const current = splitSpecifiers(body);
    const currentLower = current.map(s => s.replace(/\s+/g, ""));

    const appends = [];
    for (const alias of toAdd) {
      // Prüfe, ob schon vorhanden (als "ObjectId" oder "ObjectId as Alias")
      const normalizedA = alias === "ObjectId" ? "ObjectId" : `ObjectIdas${alias}`;
      const already = currentLower.some(x => {
        const norm = x.replace(/\s+/g, "");
        return norm === "ObjectId" || norm === `ObjectIdas${alias}`;
      });
      if (!already) {
        appends.push(alias === "ObjectId" ? "ObjectId" : `ObjectId as ${alias}`);
      }
    }
    if (appends.length === 0) return full;
    changed = true;

    const nextBody = (current.join(", ") + ", " + appends.join(", ")).trim();
    return `${lead ?? ""}import ${isType ? "type " : ""}{ ${nextBody} } from "@core/triMongo";`;
  });

  if (!found) {
    // keinen passenden Import gefunden → neu erzeugen (nahe an Datei-Anfang)
    const firstImportIdx = src.indexOf("import");
    const inject =
      `import ${asType ? "type " : ""}{ ${toAdd.map(a => (a === "ObjectId" ? "ObjectId" : `ObjectId as ${a}`)).join(", ")} } from "@core/triMongo";\n`;
    if (firstImportIdx >= 0) {
      src = `${src.slice(0, firstImportIdx)}${inject}${src.slice(firstImportIdx)}`;
    } else {
      src = `${inject}\n${src}`;
    }
    changed = true;
  }

  return { src, changed };
}

function removeObjectIdFromMongoImport(src) {
  // Sammelt zu ersetzende Imports und die Aliase, die wir nach @core/triMongo umziehen
  let changed = false;
  const moveNormal = []; // Aliase für normalen Import
  const moveType = [];   // Aliase für type-Import

  src = src.replace(RE_NAMED_FROM_MONGODB, (full, lead, typeKw, body) => {
    const isType = Boolean(typeKw);
    const specs = splitSpecifiers(body);

    const keep = [];
    for (const spec of specs) {
      const parsed = parseSpecifier(spec);
      if (parsed) {
        // diesen Specifier umziehen
        (isType ? moveType : moveNormal).push(parsed.alias);
      } else {
        keep.push(spec);
      }
    }

    if (keep.length === specs.length) {
      // nichts zu ändern
      return full;
    }
    changed = true;

    if (keep.length === 0) {
      // gesamte Importzeile entfernen
      return (lead ?? "");
    }
    // übrige Spezifizierer drinlassen
    return `${lead ?? ""}import ${isType ? "type " : ""}{ ${keep.join(", ")} } from "mongodb";`;
  });

  moveNormal.sort();
  moveType.sort();

  return { src, changed, moveNormal: uniq(moveNormal), moveType: uniq(moveType) };
}

function detectStarOrDefaultMongoWithObjectId(src, file) {
  // Warnungen, wenn import * as mdb from "mongodb" o. ä. und anschließend mdb.ObjectId
  let m;
  while ((m = RE_STAR_OR_DEFAULT_FROM_MONGODB.exec(src))) {
    const ns = m[2] || m[3]; // Namespace- bzw. Default-Name
    if (!ns) continue;
    const reUse = new RegExp(`\\b${ns}\\.ObjectId\\b`);
    if (reUse.test(src)) {
      warnings.push(`• ${file}\n  - [STAR_OR_DEFAULT] "${ns}.ObjectId" genutzt (Stern/Default-Import aus "mongodb"). Bitte manuell auf "@core/triMongo" umstellen.`);
    }
  }
}

async function processFile(file) {
  let src = await fs.readFile(file, "utf8");
  const before = src;

  // 1) Stern-/Default-Import-Nutzung melden (nur Warnung)
  detectStarOrDefaultMongoWithObjectId(src, file);

  // 2) Named-Import aus "mongodb" bereinigen
  const step1 = removeObjectIdFromMongoImport(src);
  src = step1.src;

  // 3) @core/triMongo-Import hinzufügen/ergänzen (für normale + type Imports)
  if (step1.moveNormal.length) {
    const r = addOrExtendTriMongoImport(src, step1.moveNormal, /*asType*/ false);
    src = r.src; if (r.changed) {}
  }
  if (step1.moveType.length) {
    const r = addOrExtendTriMongoImport(src, step1.moveType, /*asType*/ true);
    src = r.src; if (r.changed) {}
  }

  const changed = src !== before;
  if (changed) {
    results.push(file);
    if (WRITE) await fs.writeFile(file, src, "utf8");
  }
}

(async function main() {
  const files = [];
  for (const root of ROOTS) {
    const abs = path.resolve(root);
    for await (const f of walk(abs)) files.push(f);
  }

  for (const f of files) {
    await processFile(f);
  }

  const changedCount = results.length;
  const warnCount = warnings.length;

  if (!WRITE && (changedCount || warnCount)) {
    console.log("❌ Probleme erkannt (Dry-Run). Mit --write automatisch beheben.\n");
  }

  if (changedCount) {
    console.log(`🔧 ${WRITE ? "Geändert" : "Würde ändern"}: ${changedCount} Datei(en):`);
    results.forEach(f => console.log("  - " + f));
    console.log("");
  } else {
    console.log("✅ Keine Import-Korrekturen nötig.");
  }

  if (warnCount) {
    console.log("\n⚠ Warnungen:");
    warnings.forEach(w => console.log(w));
  }

  if ((!WRITE && (changedCount || warnCount)) || (WRITE && warnCount)) {
    process.exit(1);
  }
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(2);
});
