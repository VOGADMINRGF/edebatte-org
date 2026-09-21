export const VOXY_FINAL_CANON = {
  schemaVersion: "voxy-final-canon-v3.10.5",
  canonId: "VOXY-V3.10.5-HUMAN-FINAL",
  sourcePullRequest: 624,
  referenceRenderHeadSha: "00ff10e80dc8985da1df64de8e9a6df23b9d13e5",
  humanAcceptanceManifestHeadSha: "c94edbcf5135ee717ac64d9da5db05c09e076c22",
  mainSyncClosingHeadSha: "81162e1971b3028f0dd5de01f1d16e53e4254270",
  governanceDocument:
    "docs/E150/VOXY-HOMEPAGE-REFERENCE-FILMS-01_ROOT-CAUSE-COMPOSITING-V3-10-5_2026-08-24.md",
  humanAcceptance: {
    homepageFilm: "accepted",
    news5Visual: "accepted",
    voxyVoice: "accepted",
  },
  referenceFilms: {
    edebatte: {
      fileName: "voxy-edebatte-homepage-reference-v1.mp4",
      sha256: "a5f8875a49249210474f7c1bc5ea31d97fe15816abfb0509cb28f6496eb0120c",
      width: 1080,
      height: 1920,
      fps: 24,
      durationSeconds: 69.31,
    },
    voiceopengov: {
      fileName: "voxy-voiceopengov-homepage-reference-v1.mp4",
      sha256: "ccffe3b04b8369fe7e05398934533d0d2bbf5f88b4bb801ffac0e222c188cbf8",
      width: 1080,
      height: 1920,
      fps: 24,
      durationSeconds: 66.9,
    },
  },
  policy: {
    failClosedOnMissingBinding: true,
    allowSilentFallback: false,
    allowCharacterSubstitution: false,
    allowLegacyVisualReferenceAsCurrentCanon: false,
    supersededCharacterReferencePullRequests: [589],
  },
} as const;

export type VoxyFinalCanonBinding = Readonly<{
  canonId: string;
  sourcePullRequest: number;
  referenceRenderHeadSha: string;
}>;

export function finalVoxyCanonBinding(): VoxyFinalCanonBinding {
  return {
    canonId: VOXY_FINAL_CANON.canonId,
    sourcePullRequest: VOXY_FINAL_CANON.sourcePullRequest,
    referenceRenderHeadSha: VOXY_FINAL_CANON.referenceRenderHeadSha,
  };
}

export function validateVoxyFinalCanonBinding(
  binding: VoxyFinalCanonBinding | null | undefined,
): readonly string[] {
  if (!binding) return ["voxy_final_canon_binding_missing"];

  const errors: string[] = [];
  if (binding.canonId !== VOXY_FINAL_CANON.canonId) {
    errors.push("voxy_final_canon_id_mismatch");
  }
  if (binding.sourcePullRequest !== VOXY_FINAL_CANON.sourcePullRequest) {
    errors.push("voxy_final_canon_pr_mismatch");
  }
  if (binding.referenceRenderHeadSha !== VOXY_FINAL_CANON.referenceRenderHeadSha) {
    errors.push("voxy_final_canon_reference_head_mismatch");
  }
  if (
    VOXY_FINAL_CANON.policy.supersededCharacterReferencePullRequests.some(
      (pr) => pr === binding.sourcePullRequest,
    )
  ) {
    errors.push("voxy_legacy_character_reference_forbidden");
  }
  return errors;
}

export function assertVoxyFinalCanonBinding(
  binding: VoxyFinalCanonBinding | null | undefined,
): void {
  const errors = validateVoxyFinalCanonBinding(binding);
  if (errors.length > 0) {
    throw new Error(`voxy_final_canon_gate_failed:${errors.join(",")}`);
  }
}
