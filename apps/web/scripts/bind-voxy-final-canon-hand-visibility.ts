import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  resolveVoxyFinalCanonHandVisibility,
  VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
} from "../src/features/voxyVideo/finalCanonHandVisibility";
import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  type HomepageFilmLayoutProfile,
  type HomepageFilmRect,
} from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import { buildVoxyMotionV4Plan } from "../src/features/voxyVideo/motionV4";
import {
  validateVoxyVisualQaCheckpoint,
  type VoxyVisualQaCheckpoint,
} from "../src/features/voxyVideo/visualQaCheckpoint";

type JsonRecord = Record<string, any>;

type ReviewSurface = JsonRecord & {
  filmId: "edebatte" | "voiceopengov";
  format: "16:9" | "9:16" | "1:1";
  layoutProfile: HomepageFilmLayoutProfile;
  regions: Record<string, HomepageFilmRect>;
};

function arg(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function validClaspedHandQa(value: JsonRecord | undefined): boolean {
  return Boolean(
    value &&
      value.pose === "clasped_hands_not_open_palm" &&
      value.detector588Applicable === false &&
      value.detector588Status === "not_run_not_applicable" &&
      value.expectedFingerCountPerHand === 5 &&
      value.thresholdChanged === false &&
      value.generativeReconstructionUsed === false,
  );
}

function classifySurface(surface: ReviewSurface) {
  const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[surface.layoutProfile];
  if (!layout) throw new Error(`voxy_hand_visibility_layout_missing:${surface.layoutProfile}`);
  const leftHandRegion = surface.regions.left_hand;
  const rightHandRegion = surface.regions.right_hand;
  if (!leftHandRegion || !rightHandRegion) {
    throw new Error(`voxy_hand_visibility_region_missing:${surface.filmId}:${surface.format}`);
  }
  const visibility = resolveVoxyFinalCanonHandVisibility({
    layoutProfile: surface.layoutProfile,
    evidenceRegion: layout.regions.evidence,
    leftHandRegion,
    rightHandRegion,
  });
  surface.handVisibility = visibility;
  return visibility;
}

function noteHandRegion(snapshot: JsonRecord, region: "left_hand" | "right_hand", note: string) {
  const result = snapshot.regions?.find((entry: JsonRecord) => entry.region === region);
  if (!result) throw new Error(`voxy_hand_visibility_snapshot_region_missing:${snapshot.format}:${region}`);
  const existing = Array.isArray(result.notes) ? result.notes.filter((entry: unknown) => typeof entry === "string" && !String(entry).startsWith("hand_visibility:")) : [];
  result.notes = [...existing, `hand_visibility:${note}`];
}

async function main(): Promise<void> {
  const outputRoot = path.resolve(
    process.cwd(),
    arg("output") ?? "artifacts/voxy-200pct-visual-qa",
  );
  const evidencePath = path.resolve(outputRoot, "evidence-manifest.json");
  const reviewPath = path.resolve(outputRoot, "final-canon-review-manifest.json");
  const manifest = JSON.parse(await readFile(evidencePath, "utf8")) as JsonRecord & {
    commitSha: string;
    checkpoint: VoxyVisualQaCheckpoint;
  };
  const review = JSON.parse(await readFile(reviewPath, "utf8")) as JsonRecord & {
    exactHeadSha: string;
    surfaces: ReviewSurface[];
  };

  if (!/^[0-9a-f]{40}$/.test(manifest.commitSha) || review.exactHeadSha !== manifest.commitSha) {
    throw new Error("voxy_hand_visibility_revision_mismatch");
  }
  const handQa = buildVoxyMotionV4Plan(manifest.commitSha).handQa;
  if (!validClaspedHandQa(handQa)) throw new Error("voxy_hand_visibility_clasped_hand_qa_invalid");

  if (!Array.isArray(review.surfaces) || review.surfaces.length !== 6) {
    throw new Error("voxy_hand_visibility_review_surfaces_incomplete");
  }
  const reviewVisibility = review.surfaces.map((surface) => ({
    filmId: surface.filmId,
    format: surface.format,
    ...classifySurface(surface),
  }));
  review.handVisibility = {
    schemaVersion: VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
    exactHeadSha: manifest.commitSha,
    handQa,
    surfaces: reviewVisibility,
  };

  const canonicalSurfaces = manifest.canonicalSurfaceBinding?.surfaces as ReviewSurface[] | undefined;
  if (!Array.isArray(canonicalSurfaces) || canonicalSurfaces.length !== 3) {
    throw new Error("voxy_hand_visibility_canonical_surfaces_incomplete");
  }
  const byFormat = new Map<string, ReturnType<typeof classifySurface>>();
  for (const surface of canonicalSurfaces) {
    byFormat.set(surface.format, classifySurface(surface));
  }

  const bindings = manifest.semanticRegionBinding?.bindings as JsonRecord[] | undefined;
  if (!Array.isArray(bindings)) throw new Error("voxy_hand_visibility_semantic_bindings_missing");
  for (const format of ["16:9", "9:16", "1:1"] as const) {
    const visibility = byFormat.get(format);
    if (!visibility) throw new Error(`voxy_hand_visibility_format_missing:${format}`);
    for (const region of ["left_hand", "right_hand"] as const) {
      const binding = bindings.find((entry) => entry.format === format && entry.region === region);
      if (!binding) throw new Error(`voxy_hand_visibility_binding_missing:${format}:${region}`);
      binding.source = visibility.reason === "occluded_by_social_evidence_region"
        ? "motion_v4_clasped_hand_location_layout_occluded"
        : "motion_v4_clasped_hand_master_geometry_unclamped";
      binding.visibility = region === "left_hand" ? visibility.leftVisible : visibility.rightVisible;
      binding.visibilityReason = visibility.reason;
    }
  }
  manifest.semanticRegionBinding.handVisibility = Object.fromEntries(
    [...byFormat.entries()].map(([format, visibility]) => [format, visibility]),
  );
  manifest.semanticRegionBinding.handQa = handQa;
  manifest.canonicalSurfaceBinding.handVisibility = Object.fromEntries(
    [...byFormat.entries()].map(([format, visibility]) => [format, visibility]),
  );
  manifest.canonicalSurfaceBinding.handQa = handQa;
  manifest.handVisibility = {
    schemaVersion: VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
    commitSha: manifest.commitSha,
    handQa,
    formats: Object.fromEntries([...byFormat.entries()]),
  };

  for (const snapshot of manifest.checkpoint.snapshots as JsonRecord[]) {
    const visibility = byFormat.get(snapshot.format);
    if (!visibility) throw new Error(`voxy_hand_visibility_snapshot_format_missing:${snapshot.format}`);
    const pose = snapshot.poses?.[0] as JsonRecord | undefined;
    if (!pose || pose.poseId !== "v3_10_5_canonical_alpha_host") {
      throw new Error(`voxy_hand_visibility_pose_missing:${snapshot.format}`);
    }
    pose.leftFingerCount = null;
    pose.rightFingerCount = null;
    pose.leftHandDetection = null;
    pose.rightHandDetection = null;

    if (visibility.reason === "occluded_by_social_evidence_region") {
      pose.leftHandVisible = false;
      pose.rightHandVisible = false;
      delete pose.handCheckMode;
      delete pose.canonicalClaspedHandContract;
      noteHandRegion(snapshot, "left_hand", "layout_occluded_by_social_evidence_region_not_anatomy_crop");
      noteHandRegion(snapshot, "right_hand", "layout_occluded_by_social_evidence_region_not_anatomy_crop");
    } else {
      if (
        pose.handCheckMode !== "canonical_clasped_occlusion" ||
        !validClaspedHandQa(pose.canonicalClaspedHandContract)
      ) {
        throw new Error(`voxy_hand_visibility_visible_clasped_contract_missing:${snapshot.format}`);
      }
      pose.leftHandVisible = true;
      pose.rightHandVisible = true;
      noteHandRegion(snapshot, "left_hand", "visible_final_surface_canonical_clasped_pose");
      noteHandRegion(snapshot, "right_hand", "visible_final_surface_canonical_clasped_pose");
    }
  }

  manifest.validation = validateVoxyVisualQaCheckpoint(manifest.checkpoint);
  manifest.humanReview = manifest.checkpoint.humanReview;
  if (manifest.validation.automatedPassed !== true) {
    throw new Error(`voxy_hand_visibility_checkpoint_invalid:${manifest.validation.errors.join(",")}`);
  }
  if (manifest.validation.productionEligible !== false) {
    throw new Error("voxy_hand_visibility_must_not_self_approve");
  }
  if (manifest.humanReview.status !== "pending") {
    throw new Error("voxy_hand_visibility_human_review_must_remain_pending");
  }

  await writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  await writeFile(evidencePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.info(
    JSON.stringify(
      {
        status: "voxy_final_canon_hand_visibility_bound",
        exactHeadSha: manifest.commitSha,
        schemaVersion: VOXY_FINAL_CANON_HAND_VISIBILITY_VERSION,
        formats: Object.fromEntries(
          [...byFormat.entries()].map(([format, visibility]) => [
            format,
            {
              leftVisible: visibility.leftVisible,
              rightVisible: visibility.rightVisible,
              reason: visibility.reason,
            },
          ]),
        ),
        humanReview: manifest.humanReview.status,
        productionEligible: manifest.validation.productionEligible,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    `VOXY_FINAL_CANON_HAND_VISIBILITY_FAILED: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
