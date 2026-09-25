import {
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
  type VoxyMouthCanonState,
  type VoxyMouthCanonStateId,
  renderVoxyMouthStateSvg,
} from "./mouthRig";

export const VOXY_MOUTH_V41_PROFILE_VERSION = "voxy-mouth-v4-1-v1" as const;

export type VoxyMouthShapeGeometry = Readonly<{
  left: number;
  top: number;
  topControl: number;
  bottom: number;
  bottomControl: number;
  tongueLeft: number;
  tongueRight: number;
  tongueInsetY: number;
  tongueOpacity: number;
}>;

export const VOXY_MOUTH_V4_SHAPE_REFERENCE = {
  neutral: { left: 8, top: 13, topControl: 24, bottom: 47, bottomControl: 42, tongueLeft: 25, tongueRight: 71, tongueInsetY: 8, tongueOpacity: 1 },
  closed: { left: 14, top: 25, topControl: 30, bottom: 31, bottomControl: 30, tongueLeft: 25, tongueRight: 71, tongueInsetY: 8, tongueOpacity: 0 },
  slightOpen: { left: 12, top: 21, topControl: 28, bottom: 39, bottomControl: 36, tongueLeft: 25, tongueRight: 71, tongueInsetY: 8, tongueOpacity: 0.7 },
  speakingOpen: { left: 8, top: 13, topControl: 24, bottom: 47, bottomControl: 42, tongueLeft: 25, tongueRight: 71, tongueInsetY: 8, tongueOpacity: 0.9 },
} as const satisfies Readonly<Record<VoxyMouthCanonStateId, VoxyMouthShapeGeometry>>;

export const VOXY_MOUTH_V41_SHAPES = {
  neutral: VOXY_MOUTH_V4_SHAPE_REFERENCE.neutral,
  closed: VOXY_MOUTH_V4_SHAPE_REFERENCE.closed,
  slightOpen: { left: 17, top: 22, topControl: 28, bottom: 37, bottomControl: 34, tongueLeft: 31, tongueRight: 65, tongueInsetY: 6, tongueOpacity: 0.35 },
  speakingOpen: { left: 18, top: 15, topControl: 24, bottom: 46, bottomControl: 38, tongueLeft: 30, tongueRight: 66, tongueInsetY: 7, tongueOpacity: 0.72 },
} as const satisfies Readonly<Record<VoxyMouthCanonStateId, VoxyMouthShapeGeometry>>;

export const VOXY_MOUTH_V41_WIDTH_LIMIT = {
  neutralWidth: 80,
  speakingOpenMaxRatioToNeutral: 0.76,
  speakingOpenMaxWidth: 60.8,
} as const;

export function voxyMouthShapeWidth(shape: VoxyMouthShapeGeometry): number {
  return 96 - shape.left * 2;
}

export function voxyMouthShapeHeight(shape: VoxyMouthShapeGeometry): number {
  return shape.bottom - shape.top;
}

function interpolate(from: number, to: number, mix: number): number {
  return Number((from + (to - from) * mix).toFixed(3));
}

export function interpolateVoxyMouthV41Shape(
  from: VoxyMouthShapeGeometry,
  to: VoxyMouthShapeGeometry,
  mix: number,
): VoxyMouthShapeGeometry {
  const t = Math.max(0, Math.min(1, mix));
  return {
    left: interpolate(from.left, to.left, t),
    top: interpolate(from.top, to.top, t),
    topControl: interpolate(from.topControl, to.topControl, t),
    bottom: interpolate(from.bottom, to.bottom, t),
    bottomControl: interpolate(from.bottomControl, to.bottomControl, t),
    tongueLeft: interpolate(from.tongueLeft, to.tongueLeft, t),
    tongueRight: interpolate(from.tongueRight, to.tongueRight, t),
    tongueInsetY: interpolate(from.tongueInsetY, to.tongueInsetY, t),
    tongueOpacity: interpolate(from.tongueOpacity, to.tongueOpacity, t),
  };
}

export function buildVoxyMouthShapePath(shape: VoxyMouthShapeGeometry): string {
  const right = 96 - shape.left;
  return `M${shape.left} ${shape.top} C${shape.left + 10} ${shape.topControl} 38 ${shape.topControl} 48 ${shape.topControl} C58 ${shape.topControl} ${right - 10} ${shape.topControl} ${right} ${shape.top} C${right - 2} ${shape.bottomControl} 68 ${shape.bottom} 48 ${shape.bottom} C28 ${shape.bottom} ${shape.left + 2} ${shape.bottomControl} ${shape.left} ${shape.top}Z`;
}

function renderVoxyMouthV41ShapeSvg(input: {
  state: VoxyMouthCanonState;
  shape: VoxyMouthShapeGeometry;
  opacity: number;
  transitionLabel?: string;
  mix?: number;
}): string {
  if (input.state.id === "neutral" && !input.transitionLabel) {
    return renderVoxyMouthStateSvg(input.state, input.opacity).replace(
      '<svg class="mouth-state',
      '<svg data-mouth-profile="v4.1" class="mouth-state',
    );
  }
  const path = buildVoxyMouthShapePath(input.shape);
  const tongueTop = Math.max(
    input.shape.top + 2,
    input.shape.bottom - input.shape.tongueInsetY,
  );
  const tongueBottom = Math.min(input.shape.bottom - 1, tongueTop + 6);
  const tonguePath = `M${input.shape.tongueLeft} ${tongueTop} Q48 ${tongueTop - 4} ${input.shape.tongueRight} ${tongueTop} Q${input.shape.tongueRight - 4} ${tongueBottom} 48 ${tongueBottom} Q${input.shape.tongueLeft + 4} ${tongueBottom} ${input.shape.tongueLeft} ${tongueTop}Z`;
  const label = input.transitionLabel ?? input.state.id;
  const idSuffix = `${label}-${input.mix ?? "state"}`.replaceAll(/[^a-zA-Z0-9-]/g, "-");
  return `<svg class="mouth-state mouth-v4-1" viewBox="0 0 96 54" width="96" height="54" aria-hidden="true" data-mouth-profile="v4.1" data-mouth-state="${label}" data-anchor-x="${input.state.anchorX}" data-anchor-y="${input.state.anchorY}" data-pivot-x="${input.state.pivotX}" data-pivot-y="${input.state.pivotY}"${input.mix === undefined ? "" : ` data-mouth-mix="${input.mix}"`} style="opacity:${input.opacity}"><defs><linearGradient id="face-v4-1-${idSuffix}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ded7d7"/><stop offset="0.5" stop-color="#dcd5d5"/><stop offset="1" stop-color="#dad3d3"/></linearGradient><clipPath id="aperture-v4-1-${idSuffix}"><path d="${path}"/></clipPath></defs><rect width="96" height="54" fill="url(#face-v4-1-${idSuffix})"/><path d="${path}" fill="#080912"/><path d="${tonguePath}" fill="#1264ff" opacity="${input.shape.tongueOpacity}" clip-path="url(#aperture-v4-1-${idSuffix})"/></svg>`;
}

export function renderVoxyMouthV41StateSvg(
  state: VoxyMouthCanonState,
  opacity = 1,
): string {
  return renderVoxyMouthV41ShapeSvg({
    state,
    shape: VOXY_MOUTH_V41_SHAPES[state.id],
    opacity,
  });
}

export function renderVoxyMouthV41TransitionSvg(
  from: VoxyMouthCanonState,
  to: VoxyMouthCanonState,
  mix: number,
  opacity = 1,
): string {
  const t = Math.max(0, Math.min(1, mix));
  if (from.id === "neutral" && t === 0) {
    return renderVoxyMouthV41StateSvg(from, opacity);
  }
  return renderVoxyMouthV41ShapeSvg({
    state: from,
    shape: interpolateVoxyMouthV41Shape(
      VOXY_MOUTH_V41_SHAPES[from.id],
      VOXY_MOUTH_V41_SHAPES[to.id],
      t,
    ),
    opacity,
    transitionLabel: `${from.id}-to-${to.id}`,
    mix: t,
  });
}

export function validateVoxyMouthV41(): string[] {
  const errors: string[] = [];
  const neutral = VOXY_MOUTH_V41_SHAPES.neutral;
  const closed = VOXY_MOUTH_V41_SHAPES.closed;
  const slight = VOXY_MOUTH_V41_SHAPES.slightOpen;
  const speaking = VOXY_MOUTH_V41_SHAPES.speakingOpen;
  if (VOXY_MOUTH_CANON_ANCHOR.x !== 328 || VOXY_MOUTH_CANON_ANCHOR.y !== 280) {
    errors.push("anchor_changed");
  }
  if (VOXY_MOUTH_CANON_ANCHOR.pivotX !== 48 || VOXY_MOUTH_CANON_ANCHOR.pivotY !== 27) {
    errors.push("pivot_changed");
  }
  if (neutral !== VOXY_MOUTH_V4_SHAPE_REFERENCE.neutral) {
    errors.push("neutral_state_changed");
  }
  const neutralWidth = voxyMouthShapeWidth(neutral);
  const speakingWidth = voxyMouthShapeWidth(speaking);
  const closedWidth = voxyMouthShapeWidth(closed);
  const slightWidth = voxyMouthShapeWidth(slight);
  if (speakingWidth / neutralWidth > VOXY_MOUTH_V41_WIDTH_LIMIT.speakingOpenMaxRatioToNeutral) {
    errors.push("speaking_open_too_wide");
  }
  if (!(closedWidth >= slightWidth && slightWidth >= speakingWidth)) {
    errors.push("state_width_relation_invalid");
  }
  if (!(voxyMouthShapeHeight(closed) < voxyMouthShapeHeight(slight) && voxyMouthShapeHeight(slight) < voxyMouthShapeHeight(speaking))) {
    errors.push("state_height_relation_invalid");
  }
  if (VOXY_MOUTH_CANON_STATES.some((state) => state.anchorX !== 328 || state.anchorY !== 280 || state.pivotX !== 48 || state.pivotY !== 27)) {
    errors.push("state_binding_drift");
  }
  return errors;
}
