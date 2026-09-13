import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  VOXY_FINAL_CANON,
  assertVoxyFinalCanonBinding,
  finalVoxyCanonBinding,
  validateVoxyFinalCanonBinding,
} from "../src/features/voxyVideo/finalCanon";

describe("VOXY final canon lock — V3.10.5 / PR #624", () => {
  it("01 pins the exact human-accepted final canon and reference-film hashes", () => {
    expect(VOXY_FINAL_CANON).toMatchObject({
      schemaVersion: "voxy-final-canon-v3.10.5",
      canonId: "VOXY-V3.10.5-HUMAN-FINAL",
      sourcePullRequest: 624,
      referenceRenderHeadSha: "00ff10e80dc8985da1df64de8e9a6df23b9d13e5",
      humanAcceptanceManifestHeadSha: "c94edbcf5135ee717ac64d9da5db05c09e076c22",
      humanAcceptance: {
        homepageFilm: "accepted",
        news5Visual: "accepted",
        voxyVoice: "accepted",
      },
      policy: {
        failClosedOnMissingBinding: true,
        allowSilentFallback: false,
        allowCharacterSubstitution: false,
        allowLegacyVisualReferenceAsCurrentCanon: false,
      },
    });

    expect(VOXY_FINAL_CANON.referenceFilms.edebatte.sha256).toBe(
      "a5f8875a49249210474f7c1bc5ea31d97fe15816abfb0509cb28f6496eb0120c",
    );
    expect(VOXY_FINAL_CANON.referenceFilms.voiceopengov.sha256).toBe(
      "ccffe3b04b8369fe7e05398934533d0d2bbf5f88b4bb801ffac0e222c188cbf8",
    );
  });

  it("02 accepts only the V3.10.5 / PR #624 reference binding", () => {
    const binding = finalVoxyCanonBinding();

    expect(validateVoxyFinalCanonBinding(binding)).toEqual([]);
    expect(() => assertVoxyFinalCanonBinding(binding)).not.toThrow();
  });

  it("03 fails closed for the superseded PR #589 character reference", () => {
    const errors = validateVoxyFinalCanonBinding({
      canonId: "VOXY-ANIMATABLE-MASTER-ASSET-01",
      sourcePullRequest: 589,
      referenceRenderHeadSha: "02f7b0cb0dc9188ad3a56c55cf381122dd07fcb2",
    });

    expect(errors).toContain("voxy_final_canon_id_mismatch");
    expect(errors).toContain("voxy_final_canon_pr_mismatch");
    expect(errors).toContain("voxy_final_canon_reference_head_mismatch");
    expect(errors).toContain("voxy_legacy_character_reference_forbidden");
  });

  it("04 keeps superseded pre-V3.10.5 visual render workflows retired", () => {
    const workflowRoot = path.resolve(import.meta.dirname, "../../../.github/workflows");
    for (const fileName of [
      "voxy-first-explainer-video.yml",
      "voxy-animatable-rig-evidence.yml",
      "voxy-character-motion-fixture.yml",
    ]) {
      expect(existsSync(path.resolve(workflowRoot, fileName))).toBe(false);
    }
  });

  it("05 routes the official homepage render command through a fail-closed canon guard", () => {
    const packageJson = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.["render:voxy-homepage-reference-films"]).toBe(
      "pnpm exec tsx scripts/render-voxy-final-canon.ts",
    );

    const guardedEntrypoint = readFileSync(
      path.resolve(import.meta.dirname, "../scripts/render-voxy-final-canon.ts"),
      "utf8",
    );
    expect(guardedEntrypoint).toContain("assertVoxyFinalCanonBinding(finalVoxyCanonBinding())");
    expect(guardedEntrypoint).toContain('await import("./render-voxy-homepage-reference-films")');
  });
});
