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
const PRODUCT_CODE_PATTERN = /^(?:apps\/[^/]+\/src\/|features\/|core\/).+\.[cm]?[jt]sx?$/i;
const TOPIC_CANONICAL_SYMBOLS = new Set([
  "CanonicalTopic",
  "JurisdictionContext",
  "DecisionQuestion",
]);
const LEGACY_TOPIC_OWNER_PATH = "apps/web/src/features/create/canonicalTopicResolutionContract";

export const PROTECTED_CANONICAL_OWNERS = new Map([
  ["CanonicalTopic", "features/topic/canonicalTopicResolutionContract.ts"],
  ["JurisdictionContext", "features/topic/canonicalTopicResolutionContract.ts"],
  ["DecisionQuestion", "features/topic/canonicalTopicResolutionContract.ts"],
  ["DurableSourceSnapshot", "features/feeds/sourceSnapshot.ts"],
  ["SourceArtifact", "features/analyze/atomicClaimSourceRelationContract.ts"],
  ["SourceSegment", "features/analyze/atomicClaimSourceRelationContract.ts"],
  ["AtomicClaim", "features/analyze/atomicClaimSourceRelationContract.ts"],
  ["SourceFamily", "features/analyze/atomicClaimSourceRelationContract.ts"],
  ["ClaimSourceRelation", "features/analyze/atomicClaimSourceRelationContract.ts"],
  ["EvidenceAssessment", "features/analyze/atomicClaimSourceRelationContract.ts"],
  ["PublicationClassification", "features/analyze/atomicClaimSourceRelationContract.ts"],
  ["SynthesisReceipt", "features/analyze/atomicClaimSourceRelationContract.ts"],
]);

// Keep exceptions narrow, path-specific, and reviewed in the same change that needs one.
export const DOMAIN_OWNERSHIP_ALLOWLIST = new Set();

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function stripCodeExtension(value) {
  return value.replace(/\.[cm]?[jt]sx?$/i, "");
}

function isProductCodeFile(filePath) {
  return PRODUCT_CODE_PATTERN.test(normalizePath(filePath));
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

export function extractDeclaredIdentifiers(source) {
  const identifiers = [];
  const declarationPattern =
    /\b(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:type|interface|class|enum|function|const|let|var)\s+([A-Za-z_$][\w$]*)/g;

  for (const match of source.matchAll(declarationPattern)) {
    identifiers.push(match[1]);
  }

  return identifiers;
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

export function findCanonicalOwnerCollisions(filePath, source) {
  const normalized = normalizePath(filePath);
  if (!isProductCodeFile(normalized)) return [];

  return extractDeclaredIdentifiers(source)
    .map((symbol) => ({ symbol, owner: PROTECTED_CANONICAL_OWNERS.get(symbol) }))
    .filter(({ owner }) => owner && owner !== normalized);
}

function classifyRuntimeCollision(identifier) {
  const lower = identifier.toLowerCase();

  if (/^t9.*(?:runner|composer|providerrouter)$/.test(lower)) {
    return "T9 orchestration belongs to #629/E150; no separate T9 runner/composer/provider router.";
  }

  if (/^c13.*(?:youtube|media|transcript).*(?:loader|fetcher|client|runtime)$/.test(lower)) {
    return "C13 media acquisition belongs to #644; no second YouTube/media/transcript loader runtime.";
  }

  if (/^g6.*(?:evidence|graph).*(?:store|repository|collection)$/.test(lower)) {
    return "G6 is derived/read-only; no new Evidence/Graph store, repository, or collection.";
  }

  if (/^observation.*(?:store|repository|collection)$/.test(lower)) {
    return "DurableSourceSnapshot.snapshotId is Observation Identity; no parallel Observation store.";
  }

  return null;
}

export function findRuntimeOwnerCollisions(filePath, source) {
  const normalized = normalizePath(filePath);
  if (!isProductCodeFile(normalized)) return [];

  return extractDeclaredIdentifiers(source)
    .map((identifier) => ({ identifier, reason: classifyRuntimeCollision(identifier) }))
    .filter(({ reason }) => reason);
}

function isLegacyTopicOwnerSpecifier(filePath, specifier) {
  const normalizedFile = normalizePath(filePath);
  const normalizedSpecifier = normalizePath(specifier);

  if (normalizedSpecifier.startsWith(".")) {
    const resolved = stripCodeExtension(
      path.posix.normalize(path.posix.join(path.posix.dirname(normalizedFile), normalizedSpecifier)),
    );
    return resolved === LEGACY_TOPIC_OWNER_PATH;
  }

  const stripped = stripCodeExtension(normalizedSpecifier);
  return (
    stripped === LEGACY_TOPIC_OWNER_PATH ||
    stripped.endsWith("/features/create/canonicalTopicResolutionContract")
  );
}

export function findLegacyTopicOwnerImports(filePath, source) {
  const normalized = normalizePath(filePath);
  if (!isProductCodeFile(normalized)) return [];

  const collisions = [];
  const importPattern =
    /import\s+(?:type\s+)?([^;]+?)\s+from\s+["']([^"']+)["']\s*;?/g;

  for (const match of source.matchAll(importPattern)) {
    const [, importedClause, specifier] = match;
    if (!isLegacyTopicOwnerSpecifier(normalized, specifier)) continue;

    const symbols = [...TOPIC_CANONICAL_SYMBOLS].filter((symbol) =>
      new RegExp(`\\b${symbol}\\b`).test(importedClause),
    );
    if (symbols.length > 0) {
      collisions.push({ specifier, symbols });
    }
  }

  return collisions;
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

    if (change.status !== "D" && isProductCodeFile(targetPath)) {
      const headSource = readHead(targetPath);

      for (const collision of findCanonicalOwnerCollisions(targetPath, headSource)) {
        errors.push(
          `${targetPath}: ${collision.symbol} is canonically owned by ${collision.owner}; import/re-export the owner instead of defining a duplicate domain concept.`,
        );
      }

      for (const collision of findRuntimeOwnerCollisions(targetPath, headSource)) {
        errors.push(
          `${targetPath}: ${collision.identifier} creates a runtime/owner collision. ${collision.reason}`,
        );
      }

      for (const collision of findLegacyTopicOwnerImports(targetPath, headSource)) {
        errors.push(
          `${targetPath}: ${collision.symbols.join(", ")} must import directly from @features/topic/canonicalTopicResolutionContract; ${collision.specifier} is compatibility-only.`,
        );
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
