import {
  VOXY_HEAD_RIG_REFERENCE,
  VOXY_MOUTH_CANON_ANCHOR,
  renderVoxyMouthStateSvg,
  renderVoxyMouthTransitionSvg,
} from "./mouthRig";
import {
  renderVoxyMouthV41StateSvg,
  renderVoxyMouthV41TransitionSvg,
} from "./mouthV41";
import {
  VOXY_CANONICAL_HEAD_ALPHA,
  VOXY_CANONICAL_HEAD_ALPHA_SCHEMA_VERSION,
  renderVoxyCanonicalHeadAlphaShape,
} from "./headAlphaSilhouette";
import type { VoxyHeadRelativeFaceRigFrame } from "./headRelativeFaceRigHtml";

export function buildVoxyCanonicalAlphaHeadRelativeFaceRigCss(
  frame: VoxyHeadRelativeFaceRigFrame,
): string {
  return `.head-rig{position:absolute;z-index:3;left:${VOXY_HEAD_RIG_REFERENCE.x}px;top:${VOXY_HEAD_RIG_REFERENCE.y}px;width:${VOXY_HEAD_RIG_REFERENCE.width}px;height:${VOXY_HEAD_RIG_REFERENCE.height}px;transform-origin:${VOXY_HEAD_RIG_REFERENCE.pivotX}px ${VOXY_HEAD_RIG_REFERENCE.pivotY}px;transform:translateY(${frame.headTranslateY}px) rotate(${frame.headRotationDegrees}deg);pointer-events:none}.head-alpha-source{position:absolute;inset:0;width:${VOXY_HEAD_RIG_REFERENCE.width}px;height:${VOXY_HEAD_RIG_REFERENCE.height}px;overflow:visible}.head-alpha-canon-source{filter:saturate(1.08) contrast(1.06) brightness(.92)}.head-alpha-debug-shape{display:none}.head-eye-glint-cover,.head-eye-glint{position:absolute;z-index:2;top:195px;width:11px;height:14px;border-radius:50%;transform:rotate(-8deg);display:${frame.gazeEnabled ? "block" : "none"}}.head-eye-glint-cover{background:#090b13}.head-eye-glint{top:197px;width:8px;height:10px;background:rgba(245,247,251,.92);transform:translate(${frame.gazeX}px,${frame.gazeY}px) rotate(-8deg)}.head-eye-glint-cover-left{left:276px}.head-eye-glint-cover-right{left:380px}.head-eye-glint-left{left:278px}.head-eye-glint-right{left:382px}.head-eyelid{position:absolute;z-index:3;top:170px;width:39px;height:57px;border-radius:50%;opacity:${frame.blink};background:linear-gradient(100deg,#ded7d7,#e4dddd 50%,#d9d2d2)}.head-eyelid:after{content:"";position:absolute;left:7px;right:6px;top:29px;height:4px;border-radius:50%;background:#11121b}.head-eyelid-left{left:263px}.head-eyelid-right{left:367px}.mouth-rig{position:absolute;z-index:4;left:${VOXY_MOUTH_CANON_ANCHOR.x}px;top:${VOXY_MOUTH_CANON_ANCHOR.y}px;width:${VOXY_MOUTH_CANON_ANCHOR.stateWidth}px;height:${VOXY_MOUTH_CANON_ANCHOR.stateHeight}px;transform:translate(${-VOXY_MOUTH_CANON_ANCHOR.pivotX}px,${-VOXY_MOUTH_CANON_ANCHOR.pivotY}px);transform-origin:${VOXY_MOUTH_CANON_ANCHOR.pivotX}px ${VOXY_MOUTH_CANON_ANCHOR.pivotY}px}.mouth-rig .mouth-state{position:absolute;inset:0;width:100%;height:100%;display:block}`;
}

export function renderVoxyCanonicalAlphaHeadRelativeFaceRig(input: {
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
  const maskId = "voxy-canonical-head-alpha";
  const source = VOXY_CANONICAL_HEAD_ALPHA.acceptedMotionSourceInRig;
  const faceRigOffset = VOXY_CANONICAL_HEAD_ALPHA.faceRigOffset;
  return `<section class="head-rig" data-head-layer="canonical-alpha-head" data-head-alpha-schema="${VOXY_CANONICAL_HEAD_ALPHA_SCHEMA_VERSION}" data-head-source-native-bounds="${VOXY_CANONICAL_HEAD_ALPHA.source.nativeWidth}x${VOXY_CANONICAL_HEAD_ALPHA.source.nativeHeight}" data-head-source-has-alpha="false" data-head-source-bounds-in-rig="x${source.x}:y${source.y}:w${source.width}:h${source.height}" data-head-source-registration-policy="accepted-motion-v4" data-head-face-rig-offset="x${faceRigOffset.x}:y${faceRigOffset.y}" data-head-alpha-outside-contribution="0" data-head-alpha-contribution-bounds="x${VOXY_CANONICAL_HEAD_ALPHA.contributionBounds.x}:y${VOXY_CANONICAL_HEAD_ALPHA.contributionBounds.y}:w${VOXY_CANONICAL_HEAD_ALPHA.contributionBounds.width}:h${VOXY_CANONICAL_HEAD_ALPHA.contributionBounds.height}" data-head-pivot-x="${VOXY_HEAD_RIG_REFERENCE.pivotX}" data-head-pivot-y="${VOXY_HEAD_RIG_REFERENCE.pivotY}"><svg class="head-alpha-source" viewBox="0 0 ${VOXY_HEAD_RIG_REFERENCE.width} ${VOXY_HEAD_RIG_REFERENCE.height}" width="${VOXY_HEAD_RIG_REFERENCE.width}" height="${VOXY_HEAD_RIG_REFERENCE.height}" aria-hidden="true"><defs><mask id="${maskId}" x="0" y="0" width="${VOXY_HEAD_RIG_REFERENCE.width}" height="${VOXY_HEAD_RIG_REFERENCE.height}" maskUnits="userSpaceOnUse" mask-type="alpha">${renderVoxyCanonicalHeadAlphaShape("#fff")}</mask></defs><g mask="url(#${maskId})"><image class="head-alpha-canon-source" href="${input.canonStageDataUrl}" x="${source.x}" y="${source.y}" width="${source.width}" height="${source.height}" preserveAspectRatio="none"/></g><g class="head-alpha-debug-shape">${renderVoxyCanonicalHeadAlphaShape("#ff2fb3")}</g></svg><span class="head-eye-glint-cover head-eye-glint-cover-left"></span><span class="head-eye-glint-cover head-eye-glint-cover-right"></span><span class="head-eye-glint head-eye-glint-left" data-head-child="left-eye"></span><span class="head-eye-glint head-eye-glint-right" data-head-child="right-eye"></span><span class="head-eyelid head-eyelid-left" data-head-child="left-eyelid"></span><span class="head-eyelid head-eyelid-right" data-head-child="right-eyelid"></span><span data-head-child="brows" data-binding="inherited_from_head_source"></span><div class="mouth-rig" data-head-child="mouth" data-anchor-type="head_relative" data-anchor-x="${VOXY_MOUTH_CANON_ANCHOR.x}" data-anchor-y="${VOXY_MOUTH_CANON_ANCHOR.y}" data-source-registration-offset-x="${faceRigOffset.x}" data-source-registration-offset-y="${faceRigOffset.y}" data-pivot-x="${VOXY_MOUTH_CANON_ANCHOR.pivotX}" data-pivot-y="${VOXY_MOUTH_CANON_ANCHOR.pivotY}" data-canvas-relative-positioning="false" data-transition-method="single_svg_geometry_interpolation" data-mouth-mix="${mix}">${mouth}</div></section>`;
}
