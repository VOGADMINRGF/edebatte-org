import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  assertVoxyFinalCanonBinding,
  finalVoxyCanonBinding,
} from "../src/features/voxyVideo/finalCanon";

// Fail closed before the canonical renderer is evaluated or any render work starts.
assertVoxyFinalCanonBinding(finalVoxyCanonBinding());

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const headResult = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
if (headResult.error || headResult.status !== 0) {
  throw new Error("voxy_final_canon_current_head_unavailable");
}

const currentHeadSha = headResult.stdout.trim();
if (!/^[0-9a-f]{40}$/.test(currentHeadSha)) {
  throw new Error("voxy_final_canon_current_head_invalid");
}

const explicitHeadSha = process.env.VOXY_HOMEPAGE_REFERENCE_FILMS_COMMIT_SHA?.trim();
if (explicitHeadSha && explicitHeadSha !== currentHeadSha) {
  throw new Error("voxy_final_canon_explicit_head_mismatch");
}

// The guarded entrypoint owns the exact-head binding so operators do not have to
// manually copy the current Git SHA into an environment variable. The canonical
// renderer still verifies the value against HEAD before touching render inputs.
process.env.VOXY_HOMEPAGE_REFERENCE_FILMS_COMMIT_SHA = currentHeadSha;

await import("./render-voxy-homepage-reference-films");
