import { describe, expect, it } from "vitest";
import {
  resolveVoxyFinalCanonHandVisibility,
  VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
} from "@/features/voxyVideo/finalCanonHandVisibility";
import { VOXY_HOMEPAGE_FILM_LAYOUTS } from "@/features/voxyVideo/homepageReferenceFilmLayouts";

const OBSERVED_FINAL_CANON_HAND_REGIONS = {
  "16:9": {
    layoutProfile: "landscape_16_9",
    left: { x: 600, y: 620, width: 195, height: 165 },
    right: { x: 735, y: 618, width: 210, height: 170 },
  },
  "9:16": {
    layoutProfile: "vertical_9_16",
    left: { x: 246, y: 1102, width: 347, height: 294 },
    right: { x: 486, y: 1098, width: 374, height: 303 },
  },
  "1:1": {
    layoutProfile: "square_1_1",
    left: { x: 350, y: 589, width: 186, height: 157 },
    right: { x: 478, y: 587, width: 200, height: 162 },
  },
} as const;

describe("Voxy V3.10.5 final-canon hand visibility", () => {
  it("keeps 16:9 and 1:1 clasped hands visible on the final surface", () => {
    for (const format of ["16:9", "1:1"] as const) {
      const observed = OBSERVED_FINAL_CANON_HAND_REGIONS[format];
      const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[observed.layoutProfile];
      const visibility = resolveVoxyFinalCanonHandVisibility({
        layoutProfile: observed.layoutProfile,
        evidenceRegion: layout.regions.evidence,
        leftHandRegion: observed.left,
        rightHandRegion: observed.right,
      });
      expect(visibility).toMatchObject({
        version: VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
        leftVisible: true,
        rightVisible: true,
        reason: "visible_on_final_surface",
      });
    }
  });

  it("marks 9:16 clasped hands as layout-occluded because both hand centers are under the evidence region", () => {
    const observed = OBSERVED_FINAL_CANON_HAND_REGIONS["9:16"];
    const layout = VOXY_HOMEPAGE_FILM_LAYOUTS.vertical_9_16;
    const visibility = resolveVoxyFinalCanonHandVisibility({
      layoutProfile: observed.layoutProfile,
      evidenceRegion: layout.regions.evidence,
      leftHandRegion: observed.left,
      rightHandRegion: observed.right,
    });
    expect(visibility).toMatchObject({
      version: VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
      layoutProfile: "vertical_9_16",
      leftVisible: false,
      rightVisible: false,
      reason: "occluded_by_social_evidence_region",
    });
  });

  it("fails closed if vertical layout geometry moves the canonical hands out of the expected evidence occlusion", () => {
    const layout = VOXY_HOMEPAGE_FILM_LAYOUTS.vertical_9_16;
    expect(() =>
      resolveVoxyFinalCanonHandVisibility({
        layoutProfile: "vertical_9_16",
        evidenceRegion: layout.regions.evidence,
        leftHandRegion: { x: 246, y: 720, width: 347, height: 294 },
        rightHandRegion: { x: 486, y: 720, width: 374, height: 303 },
      }),
    ).toThrow("voxy_vertical_clasped_hand_occlusion_geometry_drift");
  });

  it("fails closed if a nonvertical hand center becomes covered by the evidence region", () => {
    const layout = VOXY_HOMEPAGE_FILM_LAYOUTS.square_1_1;
    expect(() =>
      resolveVoxyFinalCanonHandVisibility({
        layoutProfile: "square_1_1",
        evidenceRegion: layout.regions.evidence,
        leftHandRegion: { x: 350, y: 760, width: 186, height: 100 },
        rightHandRegion: { x: 478, y: 760, width: 200, height: 100 },
      }),
    ).toThrow("voxy_nonvertical_clasped_hand_unexpected_occlusion:square_1_1");
  });
});
