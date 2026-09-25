import type { VoxyFirstExplainerPlan } from "./firstExplainerVideo";
import { findVoxyFirstExplainerSegment } from "./firstExplainerVideo";
import { VOXY_STATIC_CANON_FINAL_CAMERA } from "./staticCanonRecovery";
import { VOXY_JACKET_BRAND_LAYER_GEOMETRY } from "./jacketCanonGate";

export type VoxyFirstExplainerEmbeddedAssets = {
  canonStageDataUrl: string;
  studioLockupDataUrl: string;
  lapelPinDataUrl: string;
  edebattePocketMarkDataUrl: string;
};

export type VoxyFirstExplainerFormat = "16:9" | "9:16" | "1:1";
export const VOXY_FIRST_EXPLAINER_MOTION_QUANTIZATION_STEPS = 8;

const formatGeometry = {
  "16:9": { width: 1920, height: 1080, scale: 1, translateX: 0 },
  "9:16": { width: 720, height: 1280, scale: 1280 / 1080, translateX: -560 },
  "1:1": { width: 1080, height: 1080, scale: 1, translateX: -420 },
} as const;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smootherstep(value: number): number {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function quantizeMotion(value: number): number {
  return (
    Math.round(clamp01(value) * VOXY_FIRST_EXPLAINER_MOTION_QUANTIZATION_STEPS) /
    VOXY_FIRST_EXPLAINER_MOTION_QUANTIZATION_STEPS
  );
}

function blinkAmount(atMs: number): number {
  const windows = [1_650, 5_250, 9_150, 13_100, 16_150];
  return Math.max(
    ...windows.map((center) => {
      const distance = Math.abs(atMs - center);
      return distance >= 140 ? 0 : smootherstep(1 - distance / 140);
    }),
  );
}

function segmentOpacity(atMs: number, startMs: number, endMs: number): number {
  const fadeMs = 320;
  return Math.min(
    smootherstep((atMs - startMs) / fadeMs),
    smootherstep((endMs - atMs) / fadeMs),
  );
}

function gazeCueAmount(atMs: number, startMs: number, endMs: number): number {
  return Math.min(
    smootherstep((atMs - startMs) / 440),
    smootherstep((endMs - atMs) / 620),
  );
}

export function buildVoxyFirstExplainerFrameState(input: {
  plan: VoxyFirstExplainerPlan;
  frameIndex: number;
}): {
  atMs: number;
  segment: ReturnType<typeof findVoxyFirstExplainerSegment>;
  opacity: number;
  blink: number;
  gazeX: number;
  gazeY: number;
  visualStateKey: string;
} {
  const atMs = (input.frameIndex * 1_000) / input.plan.output.fps;
  const segment = findVoxyFirstExplainerSegment(atMs);
  const opacity = quantizeMotion(
    segmentOpacity(atMs, segment.startMs, segment.endMs),
  );
  const blink = quantizeMotion(blinkAmount(atMs));
  const gazeAmount = quantizeMotion(
    gazeCueAmount(atMs, segment.startMs, segment.endMs),
  );
  const gazeX = segment.gazeCueX * gazeAmount;
  const gazeY = segment.gazeCueY * gazeAmount;
  return {
    atMs,
    segment,
    opacity,
    blink,
    gazeX,
    gazeY,
    visualStateKey: `${segment.id}:${opacity.toFixed(9)}:${blink.toFixed(9)}:${gazeX.toFixed(3)}:${gazeY.toFixed(3)}`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderVoxyFirstExplainerFrameHtml(input: {
  plan: VoxyFirstExplainerPlan;
  assets: VoxyFirstExplainerEmbeddedAssets;
  frameIndex: number;
  format?: VoxyFirstExplainerFormat;
}): string {
  const { plan, assets, frameIndex, format = "16:9" } = input;
  const geometry = formatGeometry[format];
  const { atMs, segment, opacity, blink, gazeX, gazeY } =
    buildVoxyFirstExplainerFrameState({ plan, frameIndex });
  const portrait = format !== "16:9";
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voxy · ${escapeHtml(segment.editorialTitle)}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#010511;font-family:Arial,Helvetica,sans-serif;color:#fff}.viewport{position:relative;width:${geometry.width}px;height:${geometry.height}px;overflow:hidden;background:#010511;isolation:isolate}.master{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;transform-origin:0 0;transform:translateX(${geometry.translateX}px) scale(${geometry.scale});background:#010511}.studio-stage{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:translate(${VOXY_STATIC_CANON_FINAL_CAMERA.translateX}px,${VOXY_STATIC_CANON_FINAL_CAMERA.translateY}px) scale(${VOXY_STATIC_CANON_FINAL_CAMERA.scale});transform-origin:${VOXY_STATIC_CANON_FINAL_CAMERA.transformOrigin};filter:saturate(1.08) contrast(1.06) brightness(.92)}.studio-grade{position:absolute;inset:0;background:radial-gradient(circle at 47% 38%,rgba(32,102,255,.05),transparent 29%),linear-gradient(90deg,rgba(1,5,17,.88) 0%,rgba(1,5,17,.38) 29%,transparent 54%,rgba(1,5,17,.76) 88%,#010511 100%)}.brand-reset{position:absolute;left:0;top:0;width:540px;height:480px;background:linear-gradient(90deg,#010511 0 70%,rgba(1,5,17,.8) 86%,transparent)}.right-reset{position:absolute;right:0;top:0;width:520px;height:100%;background:#010511}.bottom-reset{position:absolute;left:0;right:0;bottom:0;height:285px;background:#010511}.frame{position:absolute;inset:18px;border:1px solid rgba(126,164,210,.22);border-radius:24px}.on-air{position:absolute;left:56px;top:46px;display:${portrait ? "none" : "flex"};align-items:center;gap:12px;padding:12px 18px;border:1px solid rgba(210,228,249,.58);border-radius:999px;background:rgba(1,5,17,.62);font-size:14px;font-weight:800;letter-spacing:.14em}.on-air i{width:10px;height:10px;border-radius:50%;background:#00d9c0;box-shadow:0 0 ${14 + opacity * 8}px rgba(0,217,192,.8)}.brand-lockup{position:absolute;left:56px;top:118px;width:330px;height:126px;display:${portrait ? "none" : "block"};opacity:.94}.brand-lockup img{width:100%;height:100%;object-fit:contain;object-position:left center}.reconstructed-character-mark{position:absolute;z-index:3;display:block;object-fit:fill;transform-origin:center;pointer-events:none}.reconstructed-lapel-pin{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.perspectiveTransform};filter:drop-shadow(0 1px 2px rgba(0,0,0,.72))}.reconstructed-pocket-mark{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.perspectiveTransform}}.eye-glint-cover,.eye-glint{position:absolute;z-index:4;border-radius:50%;pointer-events:none}.eye-glint-cover{top:250px;width:13px;height:16px;background:#090b13;transform:rotate(-8deg)}.eye-glint{top:252px;width:9px;height:12px;background:rgba(245,247,251,.92);box-shadow:0 0 3px rgba(255,255,255,.45);transform:translate(${gazeX}px,${gazeY}px) rotate(-8deg)}.eye-glint-cover-left{left:734px}.eye-glint-cover-right{left:837px}.eye-glint-left{left:736px}.eye-glint-right{left:839px}.eyelid{position:absolute;z-index:5;top:239px;width:39px;height:57px;border-radius:50%;opacity:${blink};background:linear-gradient(100deg,#f2f0ed,#fff 50%,#e4e0dc)}.eyelid:after{content:"";position:absolute;left:7px;right:6px;top:29px;height:4px;border-radius:50%;background:#11121b}.eyelid-left{left:722px}.eyelid-right{left:824px}.editorial-cue{position:absolute;z-index:5;right:74px;top:270px;width:430px;padding:25px 28px 24px;border-left:3px solid #00d9c0;background:linear-gradient(90deg,rgba(2,9,24,.82),rgba(2,9,24,.38));box-shadow:-24px 22px 56px rgba(0,0,0,.18)}.cue-copy{opacity:${opacity};transform:translateY(${Math.round((1-opacity)*10)}px)}.cue-kicker{display:block;margin-bottom:12px;color:#53e4e8;font-size:13px;font-weight:800;letter-spacing:.16em}.cue-title{display:block;font-size:34px;line-height:1.04;letter-spacing:-.018em}.cue-role{display:block;margin-top:13px;color:#a9c5e2;font-size:17px;font-weight:700;line-height:1.28}.caption-bar{position:absolute;z-index:6;left:58px;right:58px;bottom:54px;min-height:108px;display:${portrait ? "none" : "flex"};align-items:center;padding:20px 34px 20px 40px;background:rgba(2,9,24,.94);border-left:4px solid #1e6bff;box-shadow:0 20px 60px rgba(0,0,0,.3)}.caption{max-width:1680px;font-size:29px;font-weight:700;line-height:1.22;opacity:${opacity};transform:translateY(${Math.round((1-opacity)*8)}px)}.portrait-mask{display:${portrait ? "block" : "none"};position:absolute;z-index:10;inset:0;background:linear-gradient(180deg,rgba(1,5,17,.16),transparent 28%,transparent 62%,rgba(1,5,17,.96) 90%)}.portrait-title{display:${portrait ? "block" : "none"};position:absolute;z-index:12;left:32px;right:32px;top:38px;padding:18px 21px;border-left:4px solid #00d9c0;background:rgba(2,9,24,.86)}.portrait-title strong{display:block;font-size:36px;line-height:1;letter-spacing:-.02em}.portrait-title small{display:block;margin-top:9px;color:#a7c7e7;font-size:14px;font-weight:800;letter-spacing:.08em}.portrait-caption{display:${portrait ? "flex" : "none"};position:absolute;z-index:12;left:32px;right:32px;bottom:38px;min-height:132px;align-items:center;padding:20px 24px;border-left:4px solid #1e6bff;background:rgba(2,9,24,.97);font-size:24px;font-weight:750;line-height:1.24;opacity:${opacity}}.editorial-cue{display:${portrait ? "none" : "block"}}
</style></head><body><main class="viewport" data-format="${format}" data-frame-index="${frameIndex}" data-at-ms="${atMs.toFixed(3)}" data-motion-state="${segment.motionState}" data-waveform-count="1" data-waveform-placement="behind_voxy" data-character-marks="canon-geometry-reconstructed-vector-wordmarks" data-hand-gesture="none_flattened_master_identity_lock" data-head-motion="unavailable_flattened_master" data-body-motion="unavailable_flattened_master"><section class="master"><img class="studio-stage" src="${assets.canonStageDataUrl}" alt=""><div class="studio-grade"></div><div class="brand-reset"></div><div class="right-reset"></div><div class="bottom-reset"></div><img class="reconstructed-character-mark reconstructed-lapel-pin" src="${assets.lapelPinDataUrl}" alt="VOXY"><img class="reconstructed-character-mark reconstructed-pocket-mark" src="${assets.edebattePocketMarkDataUrl}" alt="eDebatte"><span class="eye-glint-cover eye-glint-cover-left"></span><span class="eye-glint-cover eye-glint-cover-right"></span><span class="eye-glint eye-glint-left"></span><span class="eye-glint eye-glint-right"></span><div class="eyelid eyelid-left"></div><div class="eyelid eyelid-right"></div><div class="frame"></div><div class="on-air"><i></i>ON AIR</div><section class="brand-lockup"><img src="${assets.studioLockupDataUrl}" alt="VoiceOpenGov eDebatte"></section><section class="editorial-cue" aria-label="Redaktioneller Hinweis"><div class="cue-copy"><small class="cue-kicker">${escapeHtml(segment.editorialKicker)}</small><strong class="cue-title">${escapeHtml(segment.editorialTitle)}</strong><span class="cue-role">${escapeHtml(segment.editorialRole)}</span></div></section><section class="caption-bar"><span class="caption">${escapeHtml(segment.caption)}</span></section></section><div class="portrait-title"><strong>${escapeHtml(segment.editorialTitle)}</strong><small>${escapeHtml(segment.editorialKicker)}</small></div><div class="portrait-mask"></div><div class="portrait-caption">${escapeHtml(segment.caption)}</div></main></body></html>`;
}
