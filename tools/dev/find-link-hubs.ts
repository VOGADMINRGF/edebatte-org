// tools/dev/find-link-hubs.ts
//
// Sucht im Repo nach TSX/TS-Files mit vielen internen Links (href="/...").
// Ziel: Kandidaten finden, die als Übersicht / Link-Sammlung dienen.
//
// Ausführung (im Repo-Root):
//   pnpm tsx tools/dev/find-link-hubs.ts
// oder
//   npx tsx tools/dev/find-link-hubs.ts

import fs from "node:fs";
import path from "node:path";

const ROOT_DIRS = [
  "apps/web/src/app",
  "apps/web/src/components",
  "apps/web/src/features",
];

const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

type FileResult = {
  file: string;
  linkCount: number;
  uniqueLinks: string[];
};

function walk(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function findInternalLinks(code: string): string[] {
  const links = new Set<string>();

  // href="/foo/bar"
  const hrefRegex = /href\s*=\s*["'](\/[^"']*)["']/g;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(code))) {
    const href = match[1];

    // externe Sachen rausfiltern, nur interne Routen
    if (
      href.startsWith("/") &&
      !href.startsWith("//") &&
      !href.startsWith("/api")
    ) {
      links.add(href);
    }
  }

  return Array.from(links);
}

function scan(): FileResult[] {
  const files: string[] = [];

  for (const root of ROOT_DIRS) {
    const abs = path.resolve(process.cwd(), root);
    walk(abs, files);
  }

  const results: FileResult[] = [];

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    const uniqueLinks = findInternalLinks(code);

    if (uniqueLinks.length >= 4) {
      // nur Files mit „vielen“ Links zeigen, Schwelle kannst du anpassen
      results.push({
        file: path.relative(process.cwd(), file),
        linkCount: uniqueLinks.length,
        uniqueLinks,
      });
    }
  }

  results.sort((a, b) => b.linkCount - a.linkCount);
  return results;
}

function main() {
  const results = scan();

  if (results.length === 0) {
    console.log("Keine Kandidaten mit vielen internen Links gefunden.");
    return;
  }

  console.log("Kandidaten für Seiten mit vielen Page-Links:\n");
  for (const res of results.slice(0, 30)) {
    console.log(`• ${res.file}  (${res.linkCount} Links)`);
    console.log(
      "  Links:",
      res.uniqueLinks
        .slice(0, 10)
        .map((h) => h || "/")
        .join(", "),
    );
    if (res.uniqueLinks.length > 10) {
      console.log(`  … +${res.uniqueLinks.length - 10} weitere\n`);
    } else {
      console.log();
    }
  }
}

main();
