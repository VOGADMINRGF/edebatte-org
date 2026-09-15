#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLASSIFICATION_PATTERN =
  /@repository-integrity-classification:\s*(ui|adapter|runtime-bridge|readmodel)\b/i;
const REWRITE_METADATA = [
  "DOCUMENT_REWRITE_AUTHORIZED=true",
  "DOCUMENT_REWRITE_RATIONALE=",
  "DOCUMENT_REWRITE_SUPERSESSION=",
];

// Keep exceptions narrow, path-specific, and reviewed in the same change that needs one.
export const DOMAIN_OWNERSHIP_ALLOWLIST = new Set();

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

export function isProtectedDocument(filePath) {
  const normalized = normalizePath(filePath);
  const lower = normalized.toLowerCase();
  const basename = path.posix.basename(lower);

  return (
    /_preflight_.*\.md$/i.test(basename) ||
    /_audit_.*\.md$/i.test(basename) ||
    /_closure_.*\.md$/i.test(basename) ||
    lower.startsWith("docs/foundation/") && lower.endsWith(".md") ||
    lower.includes("runbook") && lower.endsWith(".md") ||
    lower.startsWith("docs/architecture/") && lower.endsWith(".md") ||
    (lower.startsWith("docs/") && /(?:architecture|security)/i.test(basename) && lower.endsWith(".md"))
  );
}

export function extractHeadings(source) {
  return source
    .split("\n")
    .map((line) => line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/))
    .filter(Boolean)
    .map((match) => `${match[1].length}:${match[2].trim().toLowerCase()}`);
}

function hasRequiredRewriteMetadata(source) {
  return REWRITE_METADATA.every((marker) => {
    const line = source.split("\n").find((candidate) => candidate.startsWith(marker));
    if (!line) return false;
    return marker === "DOCUMENT_REWRITE_AUTHORIZED=true"
      ? line.trim() === marker
      : line.slice(marker.length).trim().length > 0;
  });
}

export function findDeletedStructuralEvidence(baseSource, headSource) {
  const baseHeadings = extractHeadings(baseSource);
  const headHeadings = new Set(extractHeadings(headSource));
  return [...new Set(baseHeadings.filter((heading) => !headHeadings.has(heading)))];
}

export function classifyWebFeatureFile(source) {
  return source.match(CLASSIFICATION_PATTERN)?.[1].toLowerCase() ?? null;
}

export function evaluateRepositoryIntegrity({ changes, exists, readBase, readHead }) {
  const errors = [];

  for (const change of changes) {
    const targetPath = normalizePath(change.path);
    const basePath = normalizePath(change.previousPath ?? change.path);

    if (change.status === "A" || change.status === "R") {
      const match = targetPath.match(/^apps\/web\/src\/features\/([^/]+)\//);
      if (match && exists(`features/${match[1]}`) && !DOMAIN_OWNERSHIP_ALLOWLIST.has(targetPath)) {
        const classification = classifyWebFeatureFile(readHead(targetPath));
        if (!classification) {
          errors.push(
            `${targetPath}: root features/${match[1]} owns this domain; new web feature files require @repository-integrity-classification: ui|adapter|runtime-bridge|readmodel, or a reviewed path allowlist entry.`,
          );
        }
      }
    }

    if (!isProtectedDocument(targetPath) && !isProtectedDocument(basePath)) continue;
    if (change.status === "A") continue;

    const baseSource = readBase(basePath);
    const headSource = change.status === "D" ? "" : readHead(targetPath);
    const removed = findDeletedStructuralEvidence(baseSource, headSource);

    if (removed.length > 0 && !hasRequiredRewriteMetadata(headSource)) {
      errors.push(
        `${targetPath}: protected-document structural evidence was removed (${removed.join(", ")}). Add DOCUMENT_REWRITE_AUTHORIZED=true, DOCUMENT_REWRITE_RATIONALE=<why>, and DOCUMENT_REWRITE_SUPERSESSION=<replacement reference>, or preserve the sections. SUMMARY != REPLACEMENT.`,
      );
    }
  }

  return errors;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function resolveBaseSha() {
  const argumentIndex = process.argv.indexOf("--base");
  const requested = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined;
  const candidate = requested || process.env.INTEGRITY_GUARD_BASE_SHA || "origin/main";
  return git(["merge-base", candidate, "HEAD"]);
}

function changedFiles(baseSha) {
  const output = git(["diff", "--name-status", "--find-renames", `${baseSha}...HEAD`]);
  if (!output) return [];

  return output.split("\n").map((line) => {
    const [status, firstPath, secondPath] = line.split("\t");
    if (status.startsWith("R")) return { status: "R", previousPath: firstPath, path: secondPath };
    return { status: status[0], path: firstPath };
  });
}

function readGitObject(revision, filePath) {
  try {
    return execFileSync("git", ["show", `${revision}:${filePath}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

export function runIntegrityGuard() {
  const baseSha = resolveBaseSha();
  const errors = evaluateRepositoryIntegrity({
    changes: changedFiles(baseSha),
    exists: (relativePath) => fs.existsSync(path.join(ROOT, relativePath)),
    readBase: (relativePath) => readGitObject(baseSha, relativePath),
    readHead: (relativePath) => readGitObject("HEAD", relativePath),
  });

  if (errors.length > 0) {
    console.error("[repository-integrity-guards] FAIL");
    errors.forEach((error) => console.error(`- ${error}`));
    return 1;
  }

  console.log(`[repository-integrity-guards] PASS (base ${baseSha})`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runIntegrityGuard();
}
