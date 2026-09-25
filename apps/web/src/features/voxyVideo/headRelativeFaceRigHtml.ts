import { VOXY_STATIC_CANON_FINAL_CAMERA } from "./staticCanonRecovery";
import {
  VOXY_HEAD_RIG_REFERENCE,
  VOXY_MOUTH_CANON_ANCHOR,
  type VoxyMouthCanonState,
  renderVoxyMouthStateSvg,
  renderVoxyMouthTransitionSvg,
} from "./mouthRig";
import {
  renderVoxyMouthV41StateSvg,
  renderVoxyMouthV41TransitionSvg,
} from "./mouthV41";

export type VoxyHeadRelativeFaceRigFrame = Readonly<{
  headRotationDegrees: number;
  headTranslateY: number;
  blink: number;
  gazeX: number;
  gazeY: number;
  gazeEnabled?: boolean;
  mouthState: VoxyMouthCanonState;
  mouthNextState?: VoxyMouthCanonState;
  mouthMix?: number;
  mouthOpacity?: number;
  mouthProfile?: "v4" | "v4.1";
}>;

const sourceTransformOrigin = {
  x: 960 - VOXY_HEAD_RIG_REFERENCE.x,
  y: 475.2 - VOXY_HEAD_RIG_REFERENCE.y,
} as const;

function buildVoxyHeadRelativeFaceRigCssBase(
  frame: VoxyHeadRelativeFaceRigFrame,
): string {
  return `.head-rig{position:absolute;z-index:3;left:${VOXY_HEAD_RIG_REFERENCE.x}px;top:${VOXY_HEAD_RIG_REFERENCE.y}px;width:${VOXY_HEAD_RIG_REFERENCE.width}px;height:${VOXY_HEAD_RIG_REFERENCE.height}px;transform-origin:${VOXY_HEAD_RIG_REFERENCE.pivotX}px ${VOXY_HEAD_RIG_REFERENCE.pivotY}px;transform:translateY(${frame.headTranslateY}px) rotate(${frame.headRotationDegrees}deg);pointer-events:none}.head-source-clip{position:absolute;inset:0;overflow:hidden;clip-path:polygon(2% 12%,18% 2%,59% 3%,76% 16%,96% 23%,100% 68%,90% 85%,70% 88%,61% 100%,24% 100%,12% 86%,1% 68%)}.head-source{position:absolute;left:${-VOXY_HEAD_RIG_REFERENCE.x}px;top:${-VOXY_HEAD_RIG_REFERENCE.y}px;width:1920px;height:1080px;object-fit:cover;transform:translate(${VOXY_STATIC_CANON_FINAL_CAMERA.translateX}px,${VOXY_STATIC_CANON_FINAL_CAMERA.translateY}px) scale(${VOXY_STATIC_CANON_FINAL_CAMERA.scale});transform-origin:${sourceTransformOrigin.x}px ${sourceTransformOrigin.y}px;filter:saturate(1.08) contrast(1.06) brightness(.92)}.head-eye-glint-cover,.head-eye-glint{position:absolute;z-index:2;top:195px;width:11px;height:14px;border-radius:50%;transform:rotate(-8deg);display:${frame.gazeEnabled ? "block" : "none"}}.head-eye-glint-cover{background:#090b13}.head-eye-glint{top:197px;width:8px;height:10px;background:rgba(245,247,251,.92);transform:translate(${frame.gazeX}px,${frame.gazeY}px) rotate(-8deg)}.head-eye-glint-cover-left{left:276px}.head-eye-glint-cover-right{left:380px}.head-eye-glint-left{left:278px}.head-eye-glint-right{left:382px}.head-eyelid{position:absolute;z-index:3;top:170px;width:39px;height:57px;border-radius:50%;opacity:${frame.blink};background:linear-gradient(100deg,#ded7d7,#e4dddd 50%,#d9d2d2)}.head-eyelid:after{content:"";position:absolute;left:7px;right:6px;top:29px;height:4px;border-radius:50%;background:#11121b}.head-eyelid-left{left:263px}.head-eyelid-right{left:367px}.mouth-rig{position:absolute;z-index:4;left:${VOXY_MOUTH_CANON_ANCHOR.x}px;top:${VOXY_MOUTH_CANON_ANCHOR.y}px;width:${VOXY_MOUTH_CANON_ANCHOR.stateWidth}px;height:${VOXY_MOUTH_CANON_ANCHOR.stateHeight}px;transform:translate(${-VOXY_MOUTH_CANON_ANCHOR.pivotX}px,${-VOXY_MOUTH_CANON_ANCHOR.pivotY}px);transform-origin:${VOXY_MOUTH_CANON_ANCHOR.pivotX}px ${VOXY_MOUTH_CANON_ANCHOR.pivotY}px}.mouth-rig .mouth-state{position:absolute;inset:0;width:100%;height:100%;display:block}`;
}

export function buildVoxyHeadRelativeFaceRigCss(
  frame: VoxyHeadRelativeFaceRigFrame,
): string {
  return buildVoxyHeadRelativeFaceRigCssBase(frame);
}

export function renderVoxyHeadRelativeFaceRig(input: {
  canonStageDataUrl: string;
  frame: VoxyHeadRelativeFaceRigFrame;
}): string {
  const { frame } = input;
  const mix = Math.max(0, Math.min(1, frame.mouthMix ?? 0));
  const renderState =
    frame.mouthProfile === "v4.1"
      ? renderVoxyMouthV41StateSvg
      : renderVoxyMouthStateSvg;
  const renderTransition =
    frame.mouthProfile === "v4.1"
      ? renderVoxyMouthV41TransitionSvg
      : renderVoxyMouthTransitionSvg;
  const mouth = frame.mouthNextState
    ? renderTransition(
        frame.mouthState,
        frame.mouthNextState,
        mix,
        frame.mouthOpacity ?? 1,
      )
    : renderState(frame.mouthState, frame.mouthOpacity ?? 1);
  return `<section class="head-rig" data-head-layer="head-base" data-head-pivot-x="${VOXY_HEAD_RIG_REFERENCE.pivotX}" data-head-pivot-y="${VOXY_HEAD_RIG_REFERENCE.pivotY}"><div class="head-source-clip"><img class="head-source" src="${input.canonStageDataUrl}" alt=""></div><span class="head-eye-glint-cover head-eye-glint-cover-left"></span><span class="head-eye-glint-cover head-eye-glint-cover-right"></span><span class="head-eye-glint head-eye-glint-left" data-head-child="left-eye"></span><span class="head-eye-glint head-eye-glint-right" data-head-child="right-eye"></span><span class="head-eyelid head-eyelid-left" data-head-child="left-eyelid"></span><span class="head-eyelid head-eyelid-right" data-head-child="right-eyelid"></span><span data-head-child="brows" data-binding="inherited_from_head_source"></span><div class="mouth-rig" data-head-child="mouth" data-anchor-type="head_relative" data-anchor-x="${VOXY_MOUTH_CANON_ANCHOR.x}" data-anchor-y="${VOXY_MOUTH_CANON_ANCHOR.y}" data-pivot-x="${VOXY_MOUTH_CANON_ANCHOR.pivotX}" data-pivot-y="${VOXY_MOUTH_CANON_ANCHOR.pivotY}" data-canvas-relative-positioning="false" data-transition-method="single_svg_geometry_interpolation" data-mouth-mix="${mix}">${mouth}</div></section>`;
}
