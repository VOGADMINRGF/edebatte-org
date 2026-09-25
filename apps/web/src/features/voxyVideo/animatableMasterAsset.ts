export const VOXY_CANONICAL_VISUAL_SOURCE = {
  repositoryPath: "apps/web/public/brand/voxy/voxy-podcast-stage.png",
  publicPath: "/brand/voxy/voxy-podcast-stage.png",
  status: "human_approved_reference",
} as const;

export const VOXY_MOTION_PROVIDER_STATUS = "manual_gate" as const;

export const VOXY_MOTION_PREFLIGHT_GATES = [
  "provider_selection",
  "account_credentials",
  "external_data_transfer",
  "privacy_retention",
  "budget_spend",
] as const;

export const VOXY_MOTION_HUMAN_GATES = [
  ...VOXY_MOTION_PREFLIGHT_GATES,
  "visual_acceptance",
] as const;

export type VoxyMotionPreflightGate =
  (typeof VOXY_MOTION_PREFLIGHT_GATES)[number];
export type VoxyMotionHumanGate = (typeof VOXY_MOTION_HUMAN_GATES)[number];

export type VoxyMotionProviderApproval = {
  providerId: string | null;
  providerSelectionApproved: boolean;
  accountApproved: boolean;
  credentialsConfigured: boolean;
  externalDataTransferApproved: boolean;
  privacyRetentionApproved: boolean;
  budgetSpendApproved: boolean;
};

export const EMPTY_VOXY_MOTION_PROVIDER_APPROVAL: VoxyMotionProviderApproval = {
  providerId: null,
  providerSelectionApproved: false,
  accountApproved: false,
  credentialsConfigured: false,
  externalDataTransferApproved: false,
  privacyRetentionApproved: false,
  budgetSpendApproved: false,
};

export function getMissingVoxyMotionPreflightGates(
  approval: VoxyMotionProviderApproval,
): VoxyMotionPreflightGate[] {
  const missing: VoxyMotionPreflightGate[] = [];

  if (!approval.providerId?.trim() || !approval.providerSelectionApproved) {
    missing.push("provider_selection");
  }
  if (!approval.accountApproved || !approval.credentialsConfigured) {
    missing.push("account_credentials");
  }
  if (!approval.externalDataTransferApproved) {
    missing.push("external_data_transfer");
  }
  if (!approval.privacyRetentionApproved) {
    missing.push("privacy_retention");
  }
  if (!approval.budgetSpendApproved) {
    missing.push("budget_spend");
  }

  return missing;
}

export function canInvokeVoxyMotionProvider(
  approval: VoxyMotionProviderApproval,
): boolean {
  return getMissingVoxyMotionPreflightGates(approval).length === 0;
}

export type VoxyMotionArtifactReview = {
  providerId: string;
  exactHeadSha: string;
  canonicalVisualSource: typeof VOXY_CANONICAL_VISUAL_SOURCE.repositoryPath;
  humanVisualAcceptance: "pending" | "approved" | "rejected";
};

export function canPublishVoxyMotionArtifact(input: {
  approval: VoxyMotionProviderApproval;
  review: VoxyMotionArtifactReview;
}): boolean {
  if (!canInvokeVoxyMotionProvider(input.approval)) return false;
  if (!input.approval.providerId) return false;

  return (
    input.review.providerId === input.approval.providerId &&
    input.review.exactHeadSha.trim().length > 0 &&
    input.review.canonicalVisualSource ===
      VOXY_CANONICAL_VISUAL_SOURCE.repositoryPath &&
    input.review.humanVisualAcceptance === "approved"
  );
}

export const VOXY_LOCAL_RIG_VERSION = "voxy-local-2d-rig-v1" as const;

export const VOXY_RIG_MOTION_PROFILE = {
  version: "voxy-motion-polish-v2",
  gazeTransitionMs: 500,
  gestureDelayMs: 120,
  gestureTransitionMs: 720,
  bodyTransitionMs: 780,
  neutralReturnStartFraction: 0.68,
  breathingTranslatePixels: 0.8,
  breathingBodyRotationDeg: 0.08,
  breathingHeadRotationDeg: 0.12,
  blinkWindowsMs: [920, 6_720],
  blinkDurationMs: 160,
} as const;

export const VOXY_RIG_MOTION_STATES = [
  "neutral_idle",
  "listening",
  "explaining",
  "questioning",
  "highlighting_source",
  "showing_contrast",
  "inviting_participation",
] as const;

export type VoxyRigMotionState = (typeof VOXY_RIG_MOTION_STATES)[number];

export type VoxyRigPivot = {
  x: number;
  y: number;
};

export type VoxyRigMotionTarget = {
  bodyRotationDeg: number;
  bodyTranslateY: number;
  headRotationDeg: number;
  headTranslateX: number;
  headTranslateY: number;
  eyeLookX: number;
  eyeLookY: number;
  browRotationDeg: number;
  leftArmRotationDeg: number;
  rightArmRotationDeg: number;
  leftHandRotationDeg: number;
  rightHandRotationDeg: number;
};

export type VoxyRigFrame = VoxyRigMotionTarget & {
  timeMs: number;
  state: VoxyRigMotionState;
  stateProgress: number;
  eyeOpen: number;
  blinkAmount: number;
  leftHandTranslateX: number;
  leftHandTranslateY: number;
  rightHandTranslateX: number;
  rightHandTranslateY: number;
};

export const VOXY_LOCAL_RIG = {
  id: "voxy-stretchy-compatible-svg-rig",
  version: VOXY_LOCAL_RIG_VERSION,
  executionMode: "self_hosted",
  engineCompatibility: "stretchy_studio_compatible",
  implementation: "native_svg_layer_pivot_rig",
  canonicalReferencePath: VOXY_CANONICAL_VISUAL_SOURCE.repositoryPath,
  rigAssetPath:
    "apps/web/public/brands/voxy/characters/voxy-sitting-master.svg",
  publicRigAssetPath: "/brands/voxy/characters/voxy-sitting-master.svg",
  externalNetworkRequired: false,
  externalProviderRequired: false,
  generativeFrameAnatomy: false,
  humanVisualAcceptanceRequired: true,
  autoPublish: false,
  controls: [
    {
      id: "upper-body",
      kind: "bone",
      nodeIds: ["body"],
      pivot: { x: 800, y: 1120 },
    },
    {
      id: "head",
      kind: "bone",
      nodeIds: ["head", "headphones"],
      pivot: { x: 800, y: 680 },
    },
    {
      id: "eyes",
      kind: "expression",
      nodeIds: ["left-eye", "right-eye"],
      pivot: { x: 800, y: 495 },
    },
    {
      id: "blink",
      kind: "expression",
      nodeIds: ["left-eyelid", "right-eyelid"],
      pivot: { x: 800, y: 494 },
    },
    {
      id: "brows",
      kind: "expression",
      nodeIds: ["left-brow", "right-brow"],
      pivot: { x: 800, y: 414 },
    },
    {
      id: "left-arm",
      kind: "bone",
      nodeIds: ["left-arm"],
      pivot: { x: 520, y: 980 },
    },
    {
      id: "right-arm",
      kind: "bone",
      nodeIds: ["right-arm"],
      pivot: { x: 1080, y: 980 },
    },
    {
      id: "left-hand",
      kind: "bone",
      nodeIds: ["left-hand-five-fingers"],
      pivot: { x: 620, y: 1410 },
    },
    {
      id: "right-hand",
      kind: "bone",
      nodeIds: ["right-hand-five-fingers"],
      pivot: { x: 980, y: 1410 },
    },
  ],
  immutableBrandOverlays: ["vog-pin", "edebatte-pocket"],
  hands: {
    left: {
      groupId: "left-hand-five-fingers",
      anchor: { x: 620, y: 1410 },
      shoulderPivot: { x: 520, y: 980 },
      digitIds: [
        "left-thumb",
        "left-index",
        "left-middle",
        "left-ring",
        "left-little",
      ],
    },
    right: {
      groupId: "right-hand-five-fingers",
      anchor: { x: 980, y: 1410 },
      shoulderPivot: { x: 1080, y: 980 },
      digitIds: [
        "right-thumb",
        "right-index",
        "right-middle",
        "right-ring",
        "right-little",
      ],
    },
  },
  handPresentation: {
    left: {
      baseRotationDeg: -58,
      wristInset: { x: -12, y: -5 },
    },
    right: {
      baseRotationDeg: 58,
      wristInset: { x: 12, y: -5 },
    },
    scale: 0.78,
  },
  limits: {
    headRotationDeg: { min: -4, max: 4 },
    bodyRotationDeg: { min: -2, max: 2 },
    armRotationDeg: { min: -18, max: 18 },
    handRotationDeg: { min: -18, max: 18 },
    eyeLookPixels: { min: -9, max: 9 },
  },
} as const;

export const VOXY_RIG_FIXTURE_TIMELINE = [
  { state: "neutral_idle", startMs: 0, endMs: 2_000 },
  { state: "explaining", startMs: 2_000, endMs: 4_000 },
  { state: "showing_contrast", startMs: 4_000, endMs: 6_000 },
  { state: "inviting_participation", startMs: 6_000, endMs: 8_000 },
] as const satisfies ReadonlyArray<{
  state: VoxyRigMotionState;
  startMs: number;
  endMs: number;
}>;

const VOXY_RIG_MOTION_TARGETS: Readonly<
  Record<VoxyRigMotionState, VoxyRigMotionTarget>
> = {
  neutral_idle: {
    bodyRotationDeg: 0,
    bodyTranslateY: 0,
    headRotationDeg: -0.2,
    headTranslateX: 0,
    headTranslateY: 0,
    eyeLookX: 0,
    eyeLookY: 0,
    browRotationDeg: 0,
    leftArmRotationDeg: 0,
    rightArmRotationDeg: 0,
    leftHandRotationDeg: 0,
    rightHandRotationDeg: 0,
  },
  listening: {
    bodyRotationDeg: -0.35,
    bodyTranslateY: 0.5,
    headRotationDeg: -1.6,
    headTranslateX: -1,
    headTranslateY: 0.5,
    eyeLookX: -3.5,
    eyeLookY: 1,
    browRotationDeg: -1,
    leftArmRotationDeg: 1.5,
    rightArmRotationDeg: -1.5,
    leftHandRotationDeg: 1,
    rightHandRotationDeg: -1,
  },
  explaining: {
    bodyRotationDeg: 0.35,
    bodyTranslateY: -0.5,
    headRotationDeg: 0.65,
    headTranslateX: 1,
    headTranslateY: -1,
    eyeLookX: 3,
    eyeLookY: -0.5,
    browRotationDeg: 1,
    leftArmRotationDeg: 0.5,
    rightArmRotationDeg: -9.5,
    leftHandRotationDeg: 0,
    rightHandRotationDeg: -5.5,
  },
  questioning: {
    bodyRotationDeg: -0.35,
    bodyTranslateY: 0,
    headRotationDeg: -2.1,
    headTranslateX: -1,
    headTranslateY: -2,
    eyeLookX: -2.5,
    eyeLookY: -1.5,
    browRotationDeg: -2,
    leftArmRotationDeg: -2,
    rightArmRotationDeg: 2,
    leftHandRotationDeg: -1.5,
    rightHandRotationDeg: 1.5,
  },
  highlighting_source: {
    bodyRotationDeg: 0.3,
    bodyTranslateY: -0.5,
    headRotationDeg: 0.5,
    headTranslateX: 1,
    headTranslateY: -1,
    eyeLookX: 3.5,
    eyeLookY: 0,
    browRotationDeg: 1,
    leftArmRotationDeg: -8.5,
    rightArmRotationDeg: 0.5,
    leftHandRotationDeg: -4.5,
    rightHandRotationDeg: 0,
  },
  showing_contrast: {
    bodyRotationDeg: -0.25,
    bodyTranslateY: 0,
    headRotationDeg: -0.6,
    headTranslateX: -0.5,
    headTranslateY: 0,
    eyeLookX: -2.5,
    eyeLookY: 0,
    browRotationDeg: -1,
    leftArmRotationDeg: -7,
    rightArmRotationDeg: 3,
    leftHandRotationDeg: -4,
    rightHandRotationDeg: 1.5,
  },
  inviting_participation: {
    bodyRotationDeg: 0,
    bodyTranslateY: -1,
    headRotationDeg: 0.15,
    headTranslateX: 0,
    headTranslateY: -1,
    eyeLookX: 0,
    eyeLookY: 0,
    browRotationDeg: 0.75,
    leftArmRotationDeg: -9.5,
    rightArmRotationDeg: 0,
    leftHandRotationDeg: -4.5,
    rightHandRotationDeg: 0,
  },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function easeInOut(value: number): number {
  const clamped = clamp(value, 0, 1);
  return clamped ** 3 * (clamped * (clamped * 6 - 15) + 10);
}

function interpolate(
  from: VoxyRigMotionTarget,
  to: VoxyRigMotionTarget,
  progress: number,
): VoxyRigMotionTarget {
  const output = {} as VoxyRigMotionTarget;
  for (const key of Object.keys(to) as Array<keyof VoxyRigMotionTarget>) {
    output[key] = from[key] + (to[key] - from[key]) * progress;
  }
  return output;
}

function rotateAnchorAroundPivot(input: {
  anchor: VoxyRigPivot;
  pivot: VoxyRigPivot;
  rotationDeg: number;
}): { x: number; y: number } {
  const radians = (input.rotationDeg * Math.PI) / 180;
  const deltaX = input.anchor.x - input.pivot.x;
  const deltaY = input.anchor.y - input.pivot.y;
  return {
    x:
      input.pivot.x +
      deltaX * Math.cos(radians) -
      deltaY * Math.sin(radians),
    y:
      input.pivot.y +
      deltaX * Math.sin(radians) +
      deltaY * Math.cos(radians),
  };
}

function getBlinkAmount(timeMs: number): number {
  for (const startMs of VOXY_RIG_MOTION_PROFILE.blinkWindowsMs) {
    const progress =
      (timeMs - startMs) / VOXY_RIG_MOTION_PROFILE.blinkDurationMs;
    if (progress >= 0 && progress <= 1) {
      return progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
    }
  }
  return 0;
}

export function getVoxyRigMotionTarget(
  state: VoxyRigMotionState,
): VoxyRigMotionTarget {
  return { ...VOXY_RIG_MOTION_TARGETS[state] };
}

export function buildVoxyRigFrame(timeMs: number): VoxyRigFrame {
  const normalizedTimeMs = clamp(timeMs, 0, 7_999);
  const timelineIndex = Math.max(
    0,
    VOXY_RIG_FIXTURE_TIMELINE.findIndex(
      (entry) =>
        normalizedTimeMs >= entry.startMs && normalizedTimeMs < entry.endMs,
    ),
  );
  const entry = VOXY_RIG_FIXTURE_TIMELINE[timelineIndex];
  const previousEntry = VOXY_RIG_FIXTURE_TIMELINE[Math.max(0, timelineIndex - 1)];
  const rawStateProgress =
    (normalizedTimeMs - entry.startMs) / (entry.endMs - entry.startMs);
  const stateElapsedMs = normalizedTimeMs - entry.startMs;
  const gazeTransitionProgress = easeInOut(
    stateElapsedMs / VOXY_RIG_MOTION_PROFILE.gazeTransitionMs,
  );
  const gestureTransitionProgress = easeInOut(
    (stateElapsedMs - VOXY_RIG_MOTION_PROFILE.gestureDelayMs) /
      VOXY_RIG_MOTION_PROFILE.gestureTransitionMs,
  );
  const bodyTransitionProgress = easeInOut(
    stateElapsedMs / VOXY_RIG_MOTION_PROFILE.bodyTransitionMs,
  );
  const gazeTarget = interpolate(
    VOXY_RIG_MOTION_TARGETS[previousEntry.state],
    VOXY_RIG_MOTION_TARGETS[entry.state],
    gazeTransitionProgress,
  );
  const bodyTarget = interpolate(
    VOXY_RIG_MOTION_TARGETS[previousEntry.state],
    VOXY_RIG_MOTION_TARGETS[entry.state],
    bodyTransitionProgress,
  );
  const target = interpolate(
    VOXY_RIG_MOTION_TARGETS[previousEntry.state],
    VOXY_RIG_MOTION_TARGETS[entry.state],
    gestureTransitionProgress,
  );
  Object.assign(target, {
    bodyRotationDeg: bodyTarget.bodyRotationDeg,
    bodyTranslateY: bodyTarget.bodyTranslateY,
    headRotationDeg: gazeTarget.headRotationDeg,
    headTranslateX: gazeTarget.headTranslateX,
    headTranslateY: gazeTarget.headTranslateY,
    eyeLookX: gazeTarget.eyeLookX,
    eyeLookY: gazeTarget.eyeLookY,
    browRotationDeg: gazeTarget.browRotationDeg,
  });
  if (
    entry.state === "inviting_participation" &&
    rawStateProgress > VOXY_RIG_MOTION_PROFILE.neutralReturnStartFraction
  ) {
    const returnProgress = easeInOut(
      (rawStateProgress -
        VOXY_RIG_MOTION_PROFILE.neutralReturnStartFraction) /
        (1 - VOXY_RIG_MOTION_PROFILE.neutralReturnStartFraction),
    );
    Object.assign(
      target,
      interpolate(
        target,
        VOXY_RIG_MOTION_TARGETS.neutral_idle,
        returnProgress,
      ),
    );
  }
  const breathingPhase = (normalizedTimeMs / 4_000) * Math.PI * 2;
  target.bodyTranslateY +=
    Math.sin(breathingPhase) *
    VOXY_RIG_MOTION_PROFILE.breathingTranslatePixels;
  target.bodyRotationDeg +=
    Math.sin(breathingPhase * 0.5) *
    VOXY_RIG_MOTION_PROFILE.breathingBodyRotationDeg;
  target.headRotationDeg +=
    Math.sin(breathingPhase * 0.75) *
    VOXY_RIG_MOTION_PROFILE.breathingHeadRotationDeg;

  const leftHandAnchor = rotateAnchorAroundPivot({
    anchor: VOXY_LOCAL_RIG.hands.left.anchor,
    pivot: VOXY_LOCAL_RIG.hands.left.shoulderPivot,
    rotationDeg: target.leftArmRotationDeg,
  });
  const rightHandAnchor = rotateAnchorAroundPivot({
    anchor: VOXY_LOCAL_RIG.hands.right.anchor,
    pivot: VOXY_LOCAL_RIG.hands.right.shoulderPivot,
    rotationDeg: target.rightArmRotationDeg,
  });
  const blinkAmount = getBlinkAmount(normalizedTimeMs);

  return {
    timeMs: normalizedTimeMs,
    state: entry.state,
    stateProgress: clamp(rawStateProgress, 0, 1),
    ...target,
    eyeOpen: 1 - blinkAmount * 0.92,
    blinkAmount,
    leftHandTranslateX:
      leftHandAnchor.x - VOXY_LOCAL_RIG.hands.left.anchor.x,
    leftHandTranslateY:
      leftHandAnchor.y - VOXY_LOCAL_RIG.hands.left.anchor.y,
    rightHandTranslateX:
      rightHandAnchor.x - VOXY_LOCAL_RIG.hands.right.anchor.x,
    rightHandTranslateY:
      rightHandAnchor.y - VOXY_LOCAL_RIG.hands.right.anchor.y,
  };
}

export function validateVoxyLocalRigFrame(frame: VoxyRigFrame): string[] {
  const errors: string[] = [];
  const limits = VOXY_LOCAL_RIG.limits;
  if (
    frame.headRotationDeg < limits.headRotationDeg.min ||
    frame.headRotationDeg > limits.headRotationDeg.max
  ) {
    errors.push("head_rotation_out_of_bounds");
  }
  if (
    frame.bodyRotationDeg < limits.bodyRotationDeg.min ||
    frame.bodyRotationDeg > limits.bodyRotationDeg.max
  ) {
    errors.push("body_rotation_out_of_bounds");
  }
  for (const rotation of [
    frame.leftArmRotationDeg,
    frame.rightArmRotationDeg,
  ]) {
    if (
      rotation < limits.armRotationDeg.min ||
      rotation > limits.armRotationDeg.max
    ) {
      errors.push("arm_rotation_out_of_bounds");
    }
  }
  for (const rotation of [
    frame.leftHandRotationDeg,
    frame.rightHandRotationDeg,
  ]) {
    if (
      rotation < limits.handRotationDeg.min ||
      rotation > limits.handRotationDeg.max
    ) {
      errors.push("hand_rotation_out_of_bounds");
    }
  }
  if (
    Math.abs(frame.eyeLookX) > limits.eyeLookPixels.max ||
    Math.abs(frame.eyeLookY) > limits.eyeLookPixels.max
  ) {
    errors.push("eye_look_out_of_bounds");
  }
  if (frame.eyeOpen < 0 || frame.eyeOpen > 1) {
    errors.push("eye_open_out_of_bounds");
  }
  return errors;
}
