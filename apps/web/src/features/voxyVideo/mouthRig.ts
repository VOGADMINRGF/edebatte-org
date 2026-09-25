export const VOXY_HEAD_RIG_REFERENCE = {
  x: 495,
  y: 55,
  width: 500,
  height: 400,
  pivotX: 260,
  pivotY: 320,
} as const;

export const VOXY_MOUTH_CANON_ANCHOR = {
  anchorType: "head_relative",
  x: 328,
  y: 280,
  pivotX: 48,
  pivotY: 27,
  referenceHeadWidth: VOXY_HEAD_RIG_REFERENCE.width,
  referenceHeadHeight: VOXY_HEAD_RIG_REFERENCE.height,
  stateWidth: 96,
  stateHeight: 54,
  canvasRelativePositioning: false,
} as const;

export type VoxyMouthCanonStateId =
  | "neutral"
  | "closed"
  | "slightOpen"
  | "speakingOpen";

export type VoxyMouthCanonState = Readonly<{
  id: VoxyMouthCanonStateId;
  anchorX: number;
  anchorY: number;
  pivotX: number;
  pivotY: number;
  width: number;
  height: number;
  coverOpacity: number;
  apertureRx: number;
  apertureRy: number;
  tongueOpacity: number;
}>;

const mouthState = (
  id: VoxyMouthCanonStateId,
  geometry: Pick<
    VoxyMouthCanonState,
    "coverOpacity" | "apertureRx" | "apertureRy" | "tongueOpacity"
  >,
): VoxyMouthCanonState => ({
  id,
  anchorX: VOXY_MOUTH_CANON_ANCHOR.x,
  anchorY: VOXY_MOUTH_CANON_ANCHOR.y,
  pivotX: VOXY_MOUTH_CANON_ANCHOR.pivotX,
  pivotY: VOXY_MOUTH_CANON_ANCHOR.pivotY,
  width: VOXY_MOUTH_CANON_ANCHOR.stateWidth,
  height: VOXY_MOUTH_CANON_ANCHOR.stateHeight,
  ...geometry,
});

export const VOXY_MOUTH_CANON_STATES = [
  mouthState("neutral", {
    coverOpacity: 0,
    apertureRx: 39,
    apertureRy: 20,
    tongueOpacity: 1,
  }),
  mouthState("closed", {
    coverOpacity: 1,
    apertureRx: 34,
    apertureRy: 1.8,
    tongueOpacity: 0,
  }),
  mouthState("slightOpen", {
    coverOpacity: 1,
    apertureRx: 35,
    apertureRy: 7,
    tongueOpacity: 0.7,
  }),
  mouthState("speakingOpen", {
    coverOpacity: 1,
    apertureRx: 37,
    apertureRy: 15,
    tongueOpacity: 0.9,
  }),
] as const satisfies readonly VoxyMouthCanonState[];

export const VOXY_MOUTH_CANON_TRANSITION_SEQUENCE = [
  "closed",
  "slightOpen",
  "speakingOpen",
  "slightOpen",
  "closed",
] as const satisfies readonly VoxyMouthCanonStateId[];

export function findVoxyMouthCanonState(
  id: VoxyMouthCanonStateId,
): VoxyMouthCanonState {
  return VOXY_MOUTH_CANON_STATES.find((state) => state.id === id)!;
}

export function validateVoxyMouthCanon(): string[] {
  const errors: string[] = [];
  if (
    VOXY_MOUTH_CANON_ANCHOR.anchorType !== "head_relative" ||
    VOXY_MOUTH_CANON_ANCHOR.canvasRelativePositioning
  ) {
    errors.push("mouth_anchor_must_be_head_relative");
  }
  if (VOXY_MOUTH_CANON_STATES.length < 4) {
    errors.push("mouth_state_completeness_invalid");
  }
  for (const state of VOXY_MOUTH_CANON_STATES) {
    if (
      state.anchorX !== VOXY_MOUTH_CANON_ANCHOR.x ||
      state.anchorY !== VOXY_MOUTH_CANON_ANCHOR.y
    ) {
      errors.push(`mouth_anchor_drift:${state.id}`);
    }
    if (
      state.pivotX !== VOXY_MOUTH_CANON_ANCHOR.pivotX ||
      state.pivotY !== VOXY_MOUTH_CANON_ANCHOR.pivotY
    ) {
      errors.push(`mouth_pivot_drift:${state.id}`);
    }
    if (
      state.width !== VOXY_MOUTH_CANON_ANCHOR.stateWidth ||
      state.height !== VOXY_MOUTH_CANON_ANCHOR.stateHeight
    ) {
      errors.push(`mouth_state_bounds_drift:${state.id}`);
    }
  }
  return errors;
}

function renderVoxyMouthStateSvgBase(
  state: VoxyMouthCanonState,
  opacity = 1,
): string {
  const aperturePath =
    state.id === "closed"
      ? "M14 25 Q48 30 82 25 Q48 34 14 25Z"
      : state.id === "slightOpen"
        ? "M12 21 Q48 28 84 21 Q80 36 48 39 Q16 36 12 21Z"
        : "M8 13 Q48 24 88 13 Q84 42 48 47 Q12 42 8 13Z";
  const tonguePath =
    state.id === "slightOpen"
      ? "M27 34 Q48 29 69 34 Q62 39 48 39 Q34 39 27 34Z"
      : "M25 39 Q48 31 71 39 Q65 47 48 47 Q31 47 25 39Z";
  return `<svg class="mouth-state mouth-state-${state.id}" viewBox="0 0 96 54" width="96" height="54" aria-hidden="true" data-mouth-state="${state.id}" data-anchor-x="${state.anchorX}" data-anchor-y="${state.anchorY}" data-pivot-x="${state.pivotX}" data-pivot-y="${state.pivotY}" style="opacity:${opacity}"><defs><linearGradient id="face-${state.id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ded7d7"/><stop offset="0.5" stop-color="#dcd5d5"/><stop offset="1" stop-color="#dad3d3"/></linearGradient><clipPath id="aperture-${state.id}"><path d="${aperturePath}"/></clipPath></defs><rect width="96" height="54" fill="url(#face-${state.id})" fill-opacity="${state.coverOpacity}"/><path d="${aperturePath}" fill="#080912" opacity="${state.coverOpacity}"/><path d="${tonguePath}" fill="#1264ff" opacity="${state.coverOpacity * state.tongueOpacity}" clip-path="url(#aperture-${state.id})"/></svg>`;
}

export function renderVoxyMouthStateSvg(
  state: VoxyMouthCanonState,
  opacity = 1,
): string {
  return renderVoxyMouthStateSvgBase(state, opacity);
}

type MouthShape = Readonly<{
  left: number;
  top: number;
  topControl: number;
  bottom: number;
  bottomControl: number;
  tongueOpacity: number;
}>;

const TRANSITION_SHAPES: Readonly<Record<VoxyMouthCanonStateId, MouthShape>> = {
  neutral: { left: 8, top: 13, topControl: 24, bottom: 47, bottomControl: 42, tongueOpacity: 1 },
  closed: { left: 14, top: 25, topControl: 30, bottom: 31, bottomControl: 30, tongueOpacity: 0 },
  slightOpen: { left: 12, top: 21, topControl: 28, bottom: 39, bottomControl: 36, tongueOpacity: 0.7 },
  speakingOpen: { left: 8, top: 13, topControl: 24, bottom: 47, bottomControl: 42, tongueOpacity: 0.9 },
};

function interpolate(from: number, to: number, mix: number): number {
  return Number((from + (to - from) * mix).toFixed(3));
}

export function renderVoxyMouthTransitionSvg(
  from: VoxyMouthCanonState,
  to: VoxyMouthCanonState,
  mix: number,
  opacity = 1,
): string {
  const t = Math.max(0, Math.min(1, mix));
  if (from.id === "neutral" && t === 0) {
    return renderVoxyMouthStateSvg(from, opacity);
  }
  const a = TRANSITION_SHAPES[from.id];
  const b = TRANSITION_SHAPES[to.id];
  const left = interpolate(a.left, b.left, t);
  const right = 96 - left;
  const top = interpolate(a.top, b.top, t);
  const topControl = interpolate(a.topControl, b.topControl, t);
  const bottom = interpolate(a.bottom, b.bottom, t);
  const bottomControl = interpolate(a.bottomControl, b.bottomControl, t);
  const tongueOpacity = interpolate(a.tongueOpacity, b.tongueOpacity, t);
  const aperturePath = `M${left} ${top} Q48 ${topControl} ${right} ${top} Q${right - 4} ${bottomControl} 48 ${bottom} Q${left + 4} ${bottomControl} ${left} ${top}Z`;
  const tongueTop = Math.max(top + 2, bottom - 8);
  const tonguePath = `M25 ${tongueTop} Q48 ${tongueTop - 7} 71 ${tongueTop} Q65 ${bottom} 48 ${bottom} Q31 ${bottom} 25 ${tongueTop}Z`;
  return `<svg class="mouth-state mouth-transition" viewBox="0 0 96 54" width="96" height="54" aria-hidden="true" data-mouth-state="${from.id}-to-${to.id}" data-anchor-x="${from.anchorX}" data-anchor-y="${from.anchorY}" data-pivot-x="${from.pivotX}" data-pivot-y="${from.pivotY}" data-mouth-mix="${t}" style="opacity:${opacity}"><defs><linearGradient id="face-transition" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ded7d7"/><stop offset="0.5" stop-color="#dcd5d5"/><stop offset="1" stop-color="#dad3d3"/></linearGradient><clipPath id="aperture-transition"><path d="${aperturePath}"/></clipPath></defs><rect width="96" height="54" fill="url(#face-transition)"/><path d="${aperturePath}" fill="#080912"/><path d="${tonguePath}" fill="#1264ff" opacity="${tongueOpacity}" clip-path="url(#aperture-transition)"/></svg>`;
}
