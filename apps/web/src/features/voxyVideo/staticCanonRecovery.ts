export const VOXY_STATIC_CANON_FINAL_SCHEMA_VERSION =
  "voxy-static-canon-final-v1" as const;

export const VOXY_REJECTED_MOTION_HEAD =
  "7f0ad050e4079b823c3bb6c7b2ef5fc991b662cb" as const;

export const VOXY_STATIC_RECOVERY_REVIEW_HEAD =
  "0009a32a8c29781c8f1bc149c2f3538febfec755" as const;

export const VOXY_STATIC_CANON_BOARDS = [
  {
    id: "CANON-01",
    repositoryPath:
      "apps/web/public/brands/voxy/references/canon/CANON-01-character-development-board.png",
    sha256: "e58f4f5a6b23d8da6ccd81d979057f1b6f8ce8ae22eeba7032a2fb417a2c8bcc",
    width: 1491,
    height: 1055,
    role: "character_development",
  },
  {
    id: "CANON-02",
    repositoryPath:
      "apps/web/public/brands/voxy/references/canon/CANON-02-character-overview-board.png",
    sha256: "e881e2c0e698f70eeb71ed78a021c5ef6bab8d37d52277e00a08e2f7ed9a8fe7",
    width: 1672,
    height: 941,
    role: "character_overview",
  },
  {
    id: "CANON-03",
    repositoryPath:
      "apps/web/public/brands/voxy/references/canon/CANON-03-broadcast-layout-teal.png",
    sha256: "479caf603da577009318beda49b4e0dc61f79c70e6bdb9fed820d448767aaded",
    width: 1672,
    height: 941,
    role: "broadcast_layout_teal",
  },
  {
    id: "CANON-04",
    repositoryPath:
      "apps/web/public/brands/voxy/references/canon/CANON-04-broadcast-layout-blue.png",
    sha256: "8ec3927f2871b210f46468f56a2845811c89dbb971c11bf086de7446ac0efff8",
    width: 1672,
    height: 941,
    role: "broadcast_layout_blue",
  },
] as const;

export const VOXY_STATIC_CANON_PIXEL_SOURCE = VOXY_STATIC_CANON_BOARDS[3];

export const VOXY_STATIC_CANON_NATIVE_ASSETS = {
  wordmark: "apps/web/public/brands/voxy/overlays/voxy-wordmark.svg",
  lapelPin: "apps/web/public/brands/voxy/overlays/voxy-lapel-pin.svg",
  edebattePocketMark:
    "apps/web/public/brands/voxy/overlays/edebatte-pocket-mark.svg",
} as const;

export const VOXY_STATIC_CANON_FINAL_CAMERA = {
  scale: 1.075,
  translateX: -18,
  translateY: 2,
  transformOrigin: "50% 44%",
} as const;

export const VOXY_STATIC_CANON_WAVEFORM = {
  count: 1,
  placement: "behind_voxy",
  futureAudioReactiveEligible: true,
  currentlyAudioReactive: false,
} as const;

export type VoxyStaticCanonFinalId =
  | "primary-a-final"
  | "editorial-c-final";

export type VoxyStaticCanonFinalVariant = Readonly<{
  id: VoxyStaticCanonFinalId;
  fileName: `${VoxyStaticCanonFinalId}.png`;
  selection: "A" | "C";
  role: "primary_master" | "editorial_variant";
  label: string;
  contentArchitecture: "broadcast_primary" | "editorial_anlass";
  camera: typeof VOXY_STATIC_CANON_FINAL_CAMERA;
  characterPixelSource: typeof VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath;
  waveform: typeof VOXY_STATIC_CANON_WAVEFORM;
  knownDeviations: readonly string[];
}>;

export const VOXY_STATIC_CANON_FINAL_VARIANTS = [
  {
    id: "primary-a-final",
    fileName: "primary-a-final.png",
    selection: "A",
    role: "primary_master",
    label: "PRIMARY A · BROADCAST MASTER",
    contentArchitecture: "broadcast_primary",
    camera: VOXY_STATIC_CANON_FINAL_CAMERA,
    characterPixelSource: VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    waveform: VOXY_STATIC_CANON_WAVEFORM,
    knownDeviations: [
      "flattened_canon_04_source_not_yet_a_layered_character_and_studio_master",
      "native_content_zones_are_review_placeholders_not_final_product_copy",
    ],
  },
  {
    id: "editorial-c-final",
    fileName: "editorial-c-final.png",
    selection: "C",
    role: "editorial_variant",
    label: "EDITORIAL C · ANLASS-VARIANTE",
    contentArchitecture: "editorial_anlass",
    camera: VOXY_STATIC_CANON_FINAL_CAMERA,
    characterPixelSource: VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    waveform: VOXY_STATIC_CANON_WAVEFORM,
    knownDeviations: [
      "flattened_canon_04_source_not_yet_a_layered_character_and_studio_master",
      "editorial_information_zones_require_later_content_specific_review",
    ],
  },
] as const satisfies readonly VoxyStaticCanonFinalVariant[];

export type VoxyStaticCanonFinalPlan = {
  schemaVersion: typeof VOXY_STATIC_CANON_FINAL_SCHEMA_VERSION;
  exactHeadSha: string;
  output: {
    width: 1920;
    height: 1080;
    comparisonWidth: 3200;
    comparisonHeight: 1800;
  };
  outputDirectory: "artifacts/voxy-static-canon-final";
  cleanPrimaryFileName: "primary-a-clean.png";
  comparisonFileName: "canon-comparison-final.png";
  canonBoards: typeof VOXY_STATIC_CANON_BOARDS;
  variants: typeof VOXY_STATIC_CANON_FINAL_VARIANTS;
  primaryMaster: "A";
  editorialVariant: "C";
  rejectedVariant: "B";
  rejectedVariantIncluded: false;
  waveform: typeof VOXY_STATIC_CANON_WAVEFORM;
  productionMethod: "local_playwright_raster_composition_over_canon_board";
  recoveryReview: {
    exactHeadSha: typeof VOXY_STATIC_RECOVERY_REVIEW_HEAD;
    visualDirection: "accepted_for_final_refinement";
  };
  previousMotion: {
    exactHeadSha: typeof VOXY_REJECTED_MOTION_HEAD;
    humanVisualAcceptance: "rejected";
    usedAsVisualSource: false;
  };
  externalProviderUsed: false;
  externalUploadUsed: false;
  generativeRedrawUsed: false;
  audioAnalysisImplemented: false;
  humanVisualAcceptance: "pending";
  animationEligible: false;
  productionEligible: false;
  autoPublish: false;
};

export function buildVoxyStaticCanonFinalPlan(
  exactHeadSha: string,
): VoxyStaticCanonFinalPlan {
  return {
    schemaVersion: VOXY_STATIC_CANON_FINAL_SCHEMA_VERSION,
    exactHeadSha,
    output: {
      width: 1920,
      height: 1080,
      comparisonWidth: 3200,
      comparisonHeight: 1800,
    },
    outputDirectory: "artifacts/voxy-static-canon-final",
    cleanPrimaryFileName: "primary-a-clean.png",
    comparisonFileName: "canon-comparison-final.png",
    canonBoards: VOXY_STATIC_CANON_BOARDS,
    variants: VOXY_STATIC_CANON_FINAL_VARIANTS,
    primaryMaster: "A",
    editorialVariant: "C",
    rejectedVariant: "B",
    rejectedVariantIncluded: false,
    waveform: VOXY_STATIC_CANON_WAVEFORM,
    productionMethod: "local_playwright_raster_composition_over_canon_board",
    recoveryReview: {
      exactHeadSha: VOXY_STATIC_RECOVERY_REVIEW_HEAD,
      visualDirection: "accepted_for_final_refinement",
    },
    previousMotion: {
      exactHeadSha: VOXY_REJECTED_MOTION_HEAD,
      humanVisualAcceptance: "rejected",
      usedAsVisualSource: false,
    },
    externalProviderUsed: false,
    externalUploadUsed: false,
    generativeRedrawUsed: false,
    audioAnalysisImplemented: false,
    humanVisualAcceptance: "pending",
    animationEligible: false,
    productionEligible: false,
    autoPublish: false,
  };
}

export function validateVoxyStaticCanonFinalPlan(
  plan: VoxyStaticCanonFinalPlan,
): string[] {
  const errors: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) {
    errors.push("exact_head_sha_invalid");
  }
  if (plan.canonBoards.length !== 4) {
    errors.push("four_canon_boards_required");
  }
  if (
    plan.variants.map((variant) => variant.fileName).join(",") !==
    "primary-a-final.png,editorial-c-final.png"
  ) {
    errors.push("final_output_contract_invalid");
  }
  if (
    plan.primaryMaster !== "A" ||
    plan.editorialVariant !== "C" ||
    plan.rejectedVariant !== "B" ||
    plan.rejectedVariantIncluded !== false
  ) {
    errors.push("human_selection_contract_invalid");
  }
  if (
    plan.variants.some(
      (variant) =>
        variant.characterPixelSource !==
        VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    )
  ) {
    errors.push("final_character_source_must_be_identical");
  }
  if (
    plan.variants.some(
      (variant) =>
        JSON.stringify(variant.camera) !==
        JSON.stringify(VOXY_STATIC_CANON_FINAL_CAMERA),
    )
  ) {
    errors.push("final_camera_and_studio_must_be_identical");
  }
  if (
    plan.waveform.count !== 1 ||
    plan.waveform.placement !== "behind_voxy" ||
    plan.waveform.futureAudioReactiveEligible !== true ||
    plan.waveform.currentlyAudioReactive !== false ||
    plan.audioAnalysisImplemented !== false
  ) {
    errors.push("single_background_waveform_contract_invalid");
  }
  if (
    plan.previousMotion.humanVisualAcceptance !== "rejected" ||
    plan.previousMotion.usedAsVisualSource !== false
  ) {
    errors.push("rejected_motion_must_not_be_visual_source");
  }
  if (
    plan.externalProviderUsed !== false ||
    plan.externalUploadUsed !== false ||
    plan.generativeRedrawUsed !== false
  ) {
    errors.push("local_non_generative_contract_broken");
  }
  if (
    plan.humanVisualAcceptance !== "pending" ||
    plan.animationEligible !== false ||
    plan.productionEligible !== false ||
    plan.autoPublish !== false
  ) {
    errors.push("human_and_production_gates_must_fail_closed");
  }
  return errors;
}
