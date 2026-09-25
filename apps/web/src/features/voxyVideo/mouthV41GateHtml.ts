import {
  buildVoxyHeadRelativeFaceRigCss,
  renderVoxyHeadRelativeFaceRig,
} from "./headRelativeFaceRigHtml";
import {
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
  findVoxyMouthCanonState,
  renderVoxyMouthStateSvg,
  type VoxyMouthCanonStateId,
} from "./mouthRig";
import {
  VOXY_MOUTH_V41_SHAPES,
  buildVoxyMouthShapePath,
  renderVoxyMouthV41StateSvg,
  renderVoxyMouthV41TransitionSvg,
} from "./mouthV41";
import { VOXY_STATIC_CANON_FINAL_CAMERA } from "./staticCanonRecovery";

export type VoxyMouthV41GateAssets = Readonly<{
  canonStageDataUrl: string;
}>;

export function renderVoxyMouthV41GateFrameHtml(input: {
  assets: VoxyMouthV41GateAssets;
  stateId: VoxyMouthCanonStateId;
}): string {
  const frame = {
    headRotationDegrees: 0,
    headTranslateY: 0,
    blink: 0,
    gazeX: 0,
    gazeY: 0,
    gazeEnabled: false,
    mouthState: findVoxyMouthCanonState(input.stateId),
    mouthProfile: "v4.1" as const,
  };
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#010511}.viewport{position:relative;width:1920px;height:1080px;overflow:hidden;background:#010511}.studio-stage{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover;transform:translate(${VOXY_STATIC_CANON_FINAL_CAMERA.translateX}px,${VOXY_STATIC_CANON_FINAL_CAMERA.translateY}px) scale(${VOXY_STATIC_CANON_FINAL_CAMERA.scale});transform-origin:${VOXY_STATIC_CANON_FINAL_CAMERA.transformOrigin};filter:saturate(1.08) contrast(1.06) brightness(.92)}${buildVoxyHeadRelativeFaceRigCss(frame)}</style></head><body><main class="viewport" data-mouth-profile="v4.1" data-mouth-state="${input.stateId}"><img class="studio-stage" src="${input.assets.canonStageDataUrl}" alt="">${renderVoxyHeadRelativeFaceRig({ canonStageDataUrl: input.assets.canonStageDataUrl, frame })}</main></body></html>`;
}

function faceTile(content: string, label: string): string {
  return `<figure><div class="face"><div class="mouth">${content}</div></div><figcaption>${label}</figcaption></figure>`;
}

function boardCss(columns: number): string {
  return `*{box-sizing:border-box}html,body{margin:0;background:#050a17;color:#fff;font-family:Arial,sans-serif}.board{width:1600px;height:900px;padding:42px 48px}.title{margin-bottom:28px}.title h1{margin:0;font-size:34px}.title p{margin:9px 0 0;color:#a9c5e2;font-size:17px}.grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:22px}figure{margin:0;border:1px solid #294160;background:#071126;padding:14px}.face{position:relative;width:100%;height:260px;background:linear-gradient(#ded7d7,#dad3d3);overflow:hidden}.mouth{position:absolute;left:50%;top:50%;width:288px;height:162px;transform:translate(-50%,-50%)}.mouth svg{width:100%;height:100%;display:block}figcaption{padding:12px 4px 2px;font-size:18px;font-weight:800;color:#c9def1}.old{color:#f4a8a8}.new{color:#6ff0d4}`;
}

export function renderVoxyMouthV41ComparisonHtml(): string {
  const states = ["slightOpen", "speakingOpen"] as const;
  const tiles = states.flatMap((id) => {
    const state = findVoxyMouthCanonState(id);
    return [
      faceTile(renderVoxyMouthStateSvg(state), `<span class="old">v4</span> · ${id}`),
      faceTile(renderVoxyMouthV41StateSvg(state), `<span class="new">v4.1</span> · ${id}`),
    ];
  });
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${boardCss(2)}</style></head><body><main class="board"><header class="title"><h1>Mouth v4 → v4.1 · Shape Polish</h1><p>Identischer Ausschnitt und Maßstab; nur Slight Open und Speaking Open sind poliert.</p></header><section class="grid">${tiles.join("")}</section></main></body></html>`;
}

export function renderVoxyMouthV41OverlayHtml(): string {
  const colors = ["#ffffff", "#ffd166", "#00d9c0", "#1e6bff"];
  const paths = VOXY_MOUTH_CANON_STATES.map((state, index) =>
    `<path d="${buildVoxyMouthShapePath(VOXY_MOUTH_V41_SHAPES[state.id])}" fill="${colors[index]}" fill-opacity="0.28" stroke="${colors[index]}" stroke-width="1.2"/>`,
  ).join("");
  const legend = VOXY_MOUTH_CANON_STATES.map((state, index) =>
    `<span><i style="background:${colors[index]}"></i>${state.id}</span>`,
  ).join("");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${boardCss(1)}.grid{grid-template-columns:900px 1fr}.overlay{height:590px;background:linear-gradient(#ded7d7,#dad3d3);display:grid;place-items:center}.overlay svg{width:768px;height:432px}.legend{padding:30px;font-size:20px}.legend span{display:flex;align-items:center;gap:12px;margin:22px 0}.legend i{width:20px;height:20px;border-radius:4px}.metrics{margin-top:50px;color:#a9c5e2;font-family:monospace;line-height:1.8}</style></head><body><main class="board"><header class="title"><h1>Mouth v4.1 · Shared Anchor/Pivot Overlay</h1><p>Alle Formen sind auf derselben Mitte x=48 und demselben Head-Anchor registriert.</p></header><section class="grid"><div class="overlay"><svg viewBox="0 0 96 54">${paths}</svg></div><aside class="legend">${legend}<div class="metrics">anchor = ${VOXY_MOUTH_CANON_ANCHOR.x}, ${VOXY_MOUTH_CANON_ANCHOR.y}<br>pivot = ${VOXY_MOUTH_CANON_ANCHOR.pivotX}, ${VOXY_MOUTH_CANON_ANCHOR.pivotY}<br>profile = v4.1</div></aside></section></main></body></html>`;
}

export function renderVoxyMouthV41SequenceHtml(): string {
  const closed = findVoxyMouthCanonState("closed");
  const slight = findVoxyMouthCanonState("slightOpen");
  const speaking = findVoxyMouthCanonState("speakingOpen");
  const frames = [
    { label: "closed", svg: renderVoxyMouthV41StateSvg(closed) },
    { label: "→ slight · 50%", svg: renderVoxyMouthV41TransitionSvg(closed, slight, 0.5) },
    { label: "slightOpen", svg: renderVoxyMouthV41StateSvg(slight) },
    { label: "→ speaking · 50%", svg: renderVoxyMouthV41TransitionSvg(slight, speaking, 0.5) },
    { label: "speakingOpen", svg: renderVoxyMouthV41StateSvg(speaking) },
    { label: "→ slight · 50%", svg: renderVoxyMouthV41TransitionSvg(speaking, slight, 0.5) },
    { label: "slightOpen", svg: renderVoxyMouthV41StateSvg(slight) },
    { label: "→ closed · 50%", svg: renderVoxyMouthV41TransitionSvg(slight, closed, 0.5) },
    { label: "closed", svg: renderVoxyMouthV41StateSvg(closed) },
  ];
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${boardCss(3)}.board{height:1000px}.face{height:190px}.mouth{width:230px;height:130px}.grid{gap:12px}figure{padding:9px}figcaption{font-size:15px}</style></head><body><main class="board"><header class="title"><h1>Mouth v4.1 · Speaking Sequence</h1><p>Eine kontinuierlich interpolierte Form; keine zusätzlichen Sticker- oder Zwischenstate-Layer.</p></header><section class="grid">${frames.map((frame) => faceTile(frame.svg, frame.label)).join("")}</section></main></body></html>`;
}
