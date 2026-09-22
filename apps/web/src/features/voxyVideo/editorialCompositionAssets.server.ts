import { access, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "./firstExplainerVideo";
import { VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND } from "./headAlphaSilhouette";
import type { VoxyMotionV4EmbeddedAssets } from "./motionV4Html";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "./pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "./staticCanonRecovery";

function mimeForPath(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  throw new Error(`unsupported_voxy_asset_mime:${extension || "none"}`);
}

async function embeddedDataUrl(path: string): Promise<string> {
  return `data:${mimeForPath(path)};base64,${(await readFile(path)).toString("base64")}`;
}

function canonicalAssetPaths(repositoryRoot: string) {
  return {
    canonStage: resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
    cleanStudio: resolve(repositoryRoot, VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath),
    studioLockup: resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
    lapelPin: resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
    pocketMark: resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark),
  };
}

export async function resolveVoxyEditorialCompositionRepositoryRoot(
  cwd = process.cwd(),
): Promise<string> {
  const candidates = Array.from(
    new Set([resolve(cwd), resolve(cwd, "../.."), resolve(cwd, "../../..")]),
  );
  for (const candidate of candidates) {
    try {
      await access(canonicalAssetPaths(candidate).canonStage);
      return candidate;
    } catch {
      // Try the next deterministic repository-root candidate.
    }
  }
  throw new Error("voxy_editorial_canonical_asset_root_missing");
}

export async function loadVoxyEditorialCompositionEmbeddedAssets(
  repositoryRoot: string,
): Promise<VoxyMotionV4EmbeddedAssets> {
  const paths = canonicalAssetPaths(resolve(repositoryRoot));
  return {
    canonStageDataUrl: await embeddedDataUrl(paths.canonStage),
    canonicalCleanStudioBackgroundDataUrl: await embeddedDataUrl(paths.cleanStudio),
    studioLockupDataUrl: await embeddedDataUrl(paths.studioLockup),
    lapelPinDataUrl: await embeddedDataUrl(paths.lapelPin),
    edebattePocketMarkDataUrl: await embeddedDataUrl(paths.pocketMark),
  };
}
