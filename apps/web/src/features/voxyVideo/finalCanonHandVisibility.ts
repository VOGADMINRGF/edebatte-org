import type {
  HomepageFilmLayoutProfile,
  HomepageFilmRect,
} from "./homepageReferenceFilmLayouts";

export const VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION =
  "voxy-final-canon-hand-visibility-v1" as const;

export type VoxyFinalCanonHandVisibilityReason =
  | "visible_on_final_surface"
  | "occluded_by_social_evidence_region";

export type VoxyFinalCanonHandVisibility = Readonly<{
  version: typeof VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION;
  layoutProfile: HomepageFilmLayoutProfile;
  leftVisible: boolean;
  rightVisible: boolean;
  reason: VoxyFinalCanonHandVisibilityReason;
  evidenceRegion: HomepageFilmRect;
  leftHandRegion: HomepageFilmRect;
  rightHandRegion: HomepageFilmRect;
}>;

function rectCenterInsideRect(
  candidate: HomepageFilmRect,
  container: HomepageFilmRect,
): boolean {
  const centerX = candidate.x + candidate.width / 2;
  const centerY = candidate.y + candidate.height / 2;
  return (
    centerX >= container.x &&
    centerX <= container.x + container.width &&
    centerY >= container.y &&
    centerY <= container.y + container.height
  );
}

export function resolveVoxyFinalCanonHandVisibility(input: {
  layoutProfile: HomepageFilmLayoutProfile;
  evidenceRegion: HomepageFilmRect;
  leftHandRegion: HomepageFilmRect;
  rightHandRegion: HomepageFilmRect;
}): VoxyFinalCanonHandVisibility {
  const leftCenterCovered = rectCenterInsideRect(
    input.leftHandRegion,
    input.evidenceRegion,
  );
  const rightCenterCovered = rectCenterInsideRect(
    input.rightHandRegion,
    input.evidenceRegion,
  );

  if (input.layoutProfile === "vertical_9_16") {
    if (!leftCenterCovered || !rightCenterCovered) {
      throw new Error("voxy_vertical_clasped_hand_occlusion_geometry_drift");
    }
    return {
      version: VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
      layoutProfile: input.layoutProfile,
      leftVisible: false,
      rightVisible: false,
      reason: "occluded_by_social_evidence_region",
      evidenceRegion: input.evidenceRegion,
      leftHandRegion: input.leftHandRegion,
      rightHandRegion: input.rightHandRegion,
    };
  }

  if (leftCenterCovered || rightCenterCovered) {
    throw new Error(
      `voxy_nonvertical_clasped_hand_unexpected_occlusion:${input.layoutProfile}`,
    );
  }

  return {
    version: VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
    layoutProfile: input.layoutProfile,
    leftVisible: true,
    rightVisible: true,
    reason: "visible_on_final_surface",
    evidenceRegion: input.evidenceRegion,
    leftHandRegion: input.leftHandRegion,
    rightHandRegion: input.rightHandRegion,
  };
}
