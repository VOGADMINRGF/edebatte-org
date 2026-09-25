import {
  buildVoxyHeadRelativeFaceRigCss,
  renderVoxyHeadRelativeFaceRig,
} from "./headRelativeFaceRigHtml";
import {
  type VoxyMouthCanonStateId,
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
  findVoxyMouthCanonState,
  renderVoxyMouthStateSvg,
} from "./mouthRig";
import { VOXY_STATIC_CANON_FINAL_CAMERA } from "./staticCanonRecovery";

export type VoxyMouthCanonGateEmbeddedAssets = Readonly<{
  canonStageDataUrl: string;
}>;

export function renderVoxyMouthCanonGateFrameHtml(input: {
  assets: VoxyMouthCanonGateEmbeddedAssets;
  stateId: VoxyMouthCanonStateId;
  headRotationDegrees?: number;
  headTranslateY?: number;
}): string {
  const state = findVoxyMouthCanonState(input.stateId);
  const frame = {
    headRotationDegrees: input.headRotationDegrees ?? 0,
    headTranslateY: input.headTranslateY ?? 0,
    blink: 0,
    gazeX: 0,
    gazeY: 0,
    mouthState: state,
  } as const;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#010511}.viewport{position:relative;width:1920px;height:1080px;overflow:hidden;background:#010511}.studio-stage{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover;transform:translate(${VOXY_STATIC_CANON_FINAL_CAMERA.translateX}px,${VOXY_STATIC_CANON_FINAL_CAMERA.translateY}px) scale(${VOXY_STATIC_CANON_FINAL_CAMERA.scale});transform-origin:${VOXY_STATIC_CANON_FINAL_CAMERA.transformOrigin};filter:saturate(1.08) contrast(1.06) brightness(.92)}.studio-grade{position:absolute;z-index:1;inset:0;background:radial-gradient(circle at 47% 38%,rgba(32,102,255,.05),transparent 29%),linear-gradient(90deg,rgba(1,5,17,.35),transparent 31%,transparent 75%,rgba(1,5,17,.45) 100%)}${buildVoxyHeadRelativeFaceRigCss(frame)}</style></head><body><main class="viewport" data-mouth-canon-state="${state.id}" data-mouth-anchor-type="head_relative" data-head-rotation="${frame.headRotationDegrees}"><img class="studio-stage" src="${input.assets.canonStageDataUrl}" alt=""><div class="studio-grade"></div>${renderVoxyHeadRelativeFaceRig({ canonStageDataUrl: input.assets.canonStageDataUrl, frame })}</main></body></html>`;
}

export function renderVoxyMouthOverlayComparisonHtml(): string {
  const colors = ["#ffffff", "#00d9c0", "#1e6bff", "#f061ff"];
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#050a17;color:#fff;font-family:Arial,sans-serif}.board{width:1200px;height:760px;padding:44px 52px;display:grid;grid-template-columns:680px 1fr;gap:42px}.title{grid-column:1/-1}.title h1{margin:0;font-size:34px}.title p{margin:10px 0 0;color:#a9c5e2;font-size:17px}.stage{position:relative;width:680px;height:540px;border:1px solid #294160;background:radial-gradient(ellipse at center,#f7f4f0 0 36%,#ddd8d3 60%,#10182a 61%);overflow:hidden}.anchor{position:absolute;left:50%;top:50%;width:${VOXY_MOUTH_CANON_ANCHOR.stateWidth * 4}px;height:${VOXY_MOUTH_CANON_ANCHOR.stateHeight * 4}px;transform:translate(-50%,-50%)}.anchor:before,.anchor:after{content:"";position:absolute;z-index:20;background:#ffcc00}.anchor:before{left:50%;top:-80px;bottom:-80px;width:2px}.anchor:after{top:50%;left:-100px;right:-100px;height:2px}.anchor svg{position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply}.legend{padding:16px 0}.legend h2{margin:0 0 24px;font-size:24px}.legend-item{display:flex;align-items:center;gap:12px;margin:18px 0;font-size:18px;font-weight:700}.swatch{width:20px;height:20px;border-radius:4px}.metrics{margin-top:34px;padding:20px;border-left:3px solid #00d9c0;background:#071126;color:#c5dbef;font-family:ui-monospace,monospace;font-size:15px;line-height:1.7}</style></head><body><main class="board"><header class="title"><h1>Mouth Canon · Shared Head-Relative Anchor Overlay</h1><p>Alle vier Zustände liegen halbtransparent auf exakt demselben Anchor und Pivot.</p></header><section class="stage"><div class="anchor" data-anchor-type="head_relative" data-shared-anchor="true" data-shared-pivot="true">${VOXY_MOUTH_CANON_STATES.map((state) => renderVoxyMouthStateSvg(state, 0.42)).join("")}</div></section><aside class="legend"><h2>States</h2>${VOXY_MOUTH_CANON_STATES.map((state, index) => `<div class="legend-item"><span class="swatch" style="background:${colors[index]}"></span>${state.id}</div>`).join("")}<div class="metrics">anchor.x = ${VOXY_MOUTH_CANON_ANCHOR.x}<br>anchor.y = ${VOXY_MOUTH_CANON_ANCHOR.y}<br>pivot.x = ${VOXY_MOUTH_CANON_ANCHOR.pivotX}<br>pivot.y = ${VOXY_MOUTH_CANON_ANCHOR.pivotY}<br>head = ${VOXY_MOUTH_CANON_ANCHOR.referenceHeadWidth} × ${VOXY_MOUTH_CANON_ANCHOR.referenceHeadHeight}<br>canvasRelative = false</div></aside></main></body></html>`;
}
