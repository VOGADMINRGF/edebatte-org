#!/usr/bin/env node
// tools/audit/tri-usage-audit.mjs
// Scannt .ts/.tsx nach TriMongo-/connectDB-Missbrauch und häufigen Fehlern.
// Nur Lesen/Prüfen – nimmt KEINE Änderungen vor.

import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const IGNORED_DIRS = [
  "node_modules", ".next", "dist", "build", "coverage", ".turbo", ".vercel", ".git"
];

const exts = new Set([".ts", ".tsx"]);

// --- CLI ---
const root = process.cwd();
const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : root;

// --- utils ---
function isIgnored(p) {
  const segs = p.split(path.sep);
  return segs.some(s => IGNORED_DIRS.includes(s));
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (isIgnored(full)) continue;
    if (e.isDirectory()) yield* walk(full);
    else if (exts.has(path.extname(e.name))) yield full;
  }
}

function pos(sf, node) {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return { line: line + 1, col: character + 1 };
}

function read(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return null; }
}

// --- Issue reporting ---
/** @typedef {{file:string,line:number,col:number,code:string,message:string,hint?:string}} Issue */
const issues = /** @type {Issue[]} */ ([]);

function addIssue(file, sf, node, code, message, hint) {
  const { line, col } = pos(sf, node);
  issues.push({ file, line, col, code, message, hint });
}

// --- Analysis per file ---
function analyzeFile(file) {
  const src = read(file);
  if (!src) return;

  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);

  /** Track Imports */
  const tri = { defaultName: null, named: new Set() };          // from "@core/triMongo"
  const connect = { defaultNames: new Set(), named: new Set(), hasImport: false }; // from "@/lib/connectDB" | "@lib/connectDB"
  const objectIdImportedFrom = new Set(); // 'mongodb' | '@core/triMongo'

  // 1) gather imports
  sf.forEachChild(node => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const mod = node.moduleSpecifier.text;

      const isTri = mod === "@core/triMongo";
      const isConn = mod === "@/lib/connectDB" || mod === "@lib/connectDB";
      const isMongo = mod === "mongodb";

      if (node.importClause) {
        if (node.importClause.name) {
          const local = node.importClause.name.text;
          if (isTri) tri.defaultName = local;
          if (isConn) connect.defaultNames.add(local);
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const el of node.importClause.namedBindings.elements) {
              const local = (el.name?.text) || null;
              const imp = (el.propertyName?.text) || (el.name?.text) || null;
              if (local) {
                if (isTri) tri.named.add(local);
                if (isConn) connect.named.add(local);
                if ((imp === "ObjectId" || local === "ObjectId") && (isMongo || isTri)) {
                  objectIdImportedFrom.add(mod);
                }
              }
            }
          }
        }
      }

      if (isConn) connect.hasImport = true;
    }
  });

  /** Helpers to know if an identifier is a default import of connectDB */
  const isConnectDbDefault = (name) => connect.defaultNames.has(name);

  /** Quick lookup of whether ObjectId import exists */
  const hasObjectIdImport = objectIdImportedFrom.size > 0;

  // 2) traverse body for calls/objects
  function visit(node) {
    // CallExpression detections
    if (ts.isCallExpression(node)) {
      // triMongo(...) used as callable?
      if (tri.defaultName && ts.isIdentifier(node.expression) && node.expression.text === tri.defaultName) {
        addIssue(file, sf, node, "TRI_CALLABLE",
          `triMongo default import wird als Funktion aufgerufen.`,
          `Nutze: import { getCol } from "@core/triMongo";  ->  await getCol("error_logs")  oder  triMongo.getCol("...")`
        );
      }

      // connectDB() direct call?
      if (ts.isIdentifier(node.expression) && node.expression.text === "connectDB") {
        addIssue(file, sf, node, "CONNECTDB_CALL",
          `connectDB() aufgerufen – nicht mehr verwenden.`,
          `Entfernen und stattdessen Collections via getCol()/getDb() aus "@core/triMongo" nutzen.`
        );
      }

      // db.getDb() / db.getCol() wenn 'db' aus connectDB default kommt?
      if (ts.isPropertyAccessExpression(node.expression)) {
        const obj = node.expression.expression;
        const prop = node.expression.name.text;
        if (ts.isIdentifier(obj) && isConnectDbDefault(obj.text) && (prop === "getDb" || prop === "getCol")) {
          addIssue(file, sf, node, "CONNECTDB_MEMBER",
            `Aufruf ${obj.text}.${prop}() aus connectDB-Default – bitte ablösen.`,
            `Stattdessen: import { getDb, getCol } from "@core/triMongo";`
          );
        }
      }
    }

    // Duplicate "message" in object literals
    if (ts.isObjectLiteralExpression(node)) {
      const seen = new Map();
      for (const p of node.properties) {
        if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
          const key = p.name.text;
          if (!seen.has(key)) seen.set(key, []);
          seen.get(key).push(p);
        }
      }
      if (seen.has("message") && seen.get("message").length > 1) {
        addIssue(file, sf, seen.get("message")[1], "DUPLICATE_MESSAGE",
          `Objekt hat mehrfach den Key "message".`,
          `Entferne doppelte "message" oder merge per Basisobjekt + Spread.`
        );
      }
    }

    // new ObjectId(...) ohne Import?
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "ObjectId") {
      if (!hasObjectIdImport) {
        addIssue(file, sf, node, "OBJECTID_IMPORT_MISSING",
          `new ObjectId(...) verwendet, aber kein Import aus "mongodb" oder "@core/triMongo" gefunden.`,
          `Füge hinzu: import { ObjectId } from "mongodb";  (oder re-export aus "@core/triMongo").`
        );
      }
    }

    ts.forEachChild(node, visit);
  }
  ts.forEachChild(sf, visit);

  // Import aus connectDB überhaupt vorhanden?
  if (connect.hasImport) {
    addIssue(file, sf, sf, "CONNECTDB_IMPORT",
      `Import aus "@/lib/connectDB" oder "@lib/connectDB" gefunden.`,
      `Bitte auf "@core/triMongo" umstellen (getDb/getCol).`
    );
  }
}

// --- Run ---
for (const file of walk(targetDir)) analyzeFile(file);

// --- Output ---
if (issues.length === 0) {
  console.log("✅ Keine TriMongo/connectDB-Unstimmigkeiten gefunden.");
  process.exit(0);
}

function rel(p) { return path.relative(root, p) || p; }

const grouped = issues.reduce((m, it) => {
  const k = rel(it.file);
  (m[k] ||= []).push(it);
  return m;
}, {});

console.log("\n❌ Gefundene Unstimmigkeiten:\n");
for (const [file, list] of Object.entries(grouped)) {
  console.log(`• ${file}`);
  for (const it of list.sort((a,b)=>a.line-b.line || a.col-b.col)) {
    console.log(`  - [${it.code}] ${it.message}  @${it.line}:${it.col}`);
    if (it.hint) console.log(`    hint: ${it.hint}`);
  }
  console.log("");
}

console.log(`Summe: ${issues.length} Probleme in ${Object.keys(grouped).length} Datei(en).`);
process.exitCode = 1;
