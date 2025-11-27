#!/usr/bin/env ts-node
import { promises as fs } from "fs";
import path from "path";

type FileEntry = {
  relativePath: string;
  normalizedKey: string;
};

const repoRoot = process.cwd();
const MIGRATION_BASE = path.resolve(repoRoot, "tools/migration/VPM25");
const MIGRATION_DIRS = [
  "01_vpm25_original",
  "02_vpm25_landing_legacy",
  "03_edbtt_baseline_2025-11-19",
];
const CURRENT_SCAN_DIRS = ["apps", "features", "packages", "src"];
const INCLUDE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".css", ".scss", ".html"];

const EXCLUDE_DIRS = new Set(["node_modules", ".next", ".git", ".turbo", ".tmp_orphans", "dist", "build"]);

async function collectFiles(dir: string, base: string): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  async function walk(current: string) {
    const dirents = await fs.readdir(current, { withFileTypes: true });
    for (const dirent of dirents) {
      if (dirent.isDirectory() && EXCLUDE_DIRS.has(dirent.name)) {
        continue;
      }
      const full = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        await walk(full);
      } else if (shouldInclude(dirent.name)) {
        const rel = path.relative(base, full);
        entries.push({ relativePath: rel, normalizedKey: normalizeKey(rel) });
      }
    }
  }
  await walk(dir);
  return entries;
}

function shouldInclude(name: string) {
  const ext = path.extname(name).toLowerCase();
  return INCLUDE_EXTENSIONS.includes(ext);
}

function normalizeKey(relPath: string): string {
  const normalized = relPath.replace(/\\/g, "/");
  const markers = ["apps/web/", "apps/landing/", "features/", "packages/", "src/"];
  for (const marker of markers) {
    const idx = normalized.indexOf(marker);
    if (idx >= 0) {
      return normalized.slice(idx);
    }
  }
  return normalized;
}

function isLegacyPath(relPath: string): boolean {
  return /(_legacy|_disabled|legacy|old)/i.test(relPath);
}

async function buildCurrentFileIndex(): Promise<Set<string>> {
  const set = new Set<string>();
  for (const dir of CURRENT_SCAN_DIRS) {
    const full = path.join(repoRoot, dir);
    try {
      const files = await collectFiles(full, repoRoot);
      for (const file of files) {
        set.add(file.normalizedKey);
      }
    } catch {
      // ignore missing dirs
    }
  }
  return set;
}

function formatList(items: Array<{ relativePath: string; reason?: string }>): string {
  if (!items.length) return "_Keine Einträge gefunden._";
  return items
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .map((item) => {
      const reason = item.reason ? ` – ${item.reason}` : "";
      return `- [ ] ${item.relativePath}${reason}`;
    })
    .join("\n");
}

async function main() {
  const currentIndex = await buildCurrentFileIndex();
  const adopted: Array<{ relativePath: string; reason?: string }> = [];
  const candidates: Array<{ relativePath: string; reason?: string }> = [];
  const legacy: Array<{ relativePath: string; reason?: string }> = [];

  for (const folder of MIGRATION_DIRS) {
    const migrationDir = path.join(MIGRATION_BASE, folder);
    try {
      const files = await collectFiles(migrationDir, MIGRATION_BASE);
      for (const file of files) {
        if (isLegacyPath(file.relativePath)) {
          legacy.push({ relativePath: path.join(folder, file.relativePath) });
          continue;
        }
        if (currentIndex.has(file.normalizedKey)) {
          adopted.push({ relativePath: path.join(folder, file.relativePath) });
        } else {
          candidates.push({ relativePath: path.join(folder, file.relativePath) });
        }
      }
    } catch {
      // ignore missing migration dir
    }
  }

  const report = `# Orphan-Features VPM25 – Übersicht

Generiert am ${new Date().toISOString()} via \`find_orphans.ts\`.

## 1. Vermutlich bereits übernommen

${formatList(adopted)}

## 2. Noch nicht übernommen (Kandidaten)

${formatList(candidates)}

## 3. Bewusst Legacy / _disabled

${formatList(legacy)}
`;

  const outputPath = path.join(MIGRATION_BASE, "ORPHAN_FEATURES_VPM25.md");
  await fs.writeFile(outputPath, report, "utf8");
  console.log(`Orphan-Report geschrieben nach ${path.relative(repoRoot, outputPath)}`);
  console.log(`Übernommen: ${adopted.length}, Kandidaten: ${candidates.length}, Legacy: ${legacy.length}`);
}

main().catch((err) => {
  console.error("find_orphans.ts failed", err);
  process.exit(1);
});
