import { VOXY_JACKET_BRAND_LAYER_GEOMETRY } from "./jacketCanonGate";
import {
  VOXY_MOTION_V3_BLINK_CENTERS_MS,
  type VoxyMotionV3MouthState,
  type VoxyMotionV3Plan,
  findVoxyMotionV3Segment,
} from "./motionV3";
import { VOXY_STATIC_CANON_FINAL_CAMERA } from "./staticCanonRecovery";

export type VoxyMotionV3EmbeddedAssets = Readonly<{
  canonStageDataUrl: string;
  studioLockupDataUrl: string;
  lapelPinDataUrl: string;
  edebattePocketMarkDataUrl: string;
}>;

export type VoxyMotionV3Format = "16:9" | "9:16" | "1:1";

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

function quantize(value: number, step = 0.125): number {
  return Math.round(value / step) * step;
}

function blinkAmount(atMs: number): number {
  return Math.max(
    ...VOXY_MOTION_V3_BLINK_CENTERS_MS.map((center) => {
      const distance = Math.abs(atMs - center);
      return distance >= 135 ? 0 : smootherstep(1 - distance / 135);
    }),
  );
}

function segmentOpacity(atMs: number, startMs: number, endMs: number): number {
  return Math.min(
    smootherstep((atMs - startMs) / 320),
    smootherstep((endMs - atMs) / 320),
  );
}

function speakingAmount(atMs: number, startMs: number, endMs: number): number {
  const active = Math.min(
    smootherstep((atMs - startMs) / 180),
    smootherstep((endMs - atMs) / 260),
  );
  return active * (0.5 + 0.5 * Math.sin(atMs * 0.026));
}

function mouthStateAt(
  atMs: number,
  startMs: number,
  endMs: number,
): VoxyMotionV3MouthState {
  if (atMs - startMs < 150 || endMs - atMs < 250) return "neutral";
  const amount = speakingAmount(atMs, startMs, endMs);
  if (amount < 0.22) return "closed";
  if (amount < 0.68) return "slight-open";
  return "speaking-open";
}

export function buildVoxyMotionV3FrameState(input: {
  plan: VoxyMotionV3Plan;
  frameIndex: number;
}) {
  const atMs = (input.frameIndex * 1_000) / input.plan.output.fps;
  const segment = findVoxyMotionV3Segment(atMs);
  const opacity = quantize(
    segmentOpacity(atMs, segment.startMs, segment.endMs),
  );
  const blink = quantize(blinkAmount(atMs));
  const phase = atMs / input.plan.output.durationMs;
  const headRotation = quantize(Math.sin(phase * Math.PI * 4.25) * 0.34, 0.085);
  const headY = quantize(Math.sin(phase * Math.PI * 3.5) * 0.5, 0.25);
  const breathY = quantize((Math.sin(atMs / 1_250) + 1) * 0.42, 0.21);
  const gazeX = quantize(Math.sin(atMs / 1_900) * 1.1, 0.275);
  const gazeY = quantize(Math.cos(atMs / 2_300) * 0.65, 0.325);
  const mouthState = mouthStateAt(atMs, segment.startMs, segment.endMs);
  const explainCue = segment.id === "vote4gov" || segment.id === "edebatte";
  const invitationCue = segment.id === "voiceopengov";
  const gestureEnvelope = explainCue || invitationCue
    ? quantize(
        Math.min(
          smootherstep((atMs - segment.startMs) / 650),
          smootherstep((segment.endMs - atMs) / 800),
        ),
      )
    : 0;
  const leftHandX = quantize((explainCue ? -1.3 : invitationCue ? -0.5 : 0) * gestureEnvelope, 0.26);
  const leftHandY = quantize((explainCue ? -1.8 : invitationCue ? -0.8 : 0) * gestureEnvelope, 0.3);
  const rightHandX = quantize((explainCue ? 0.7 : invitationCue ? 1.5 : 0) * gestureEnvelope, 0.3);
  const rightHandY = quantize((explainCue ? -0.9 : invitationCue ? -1.8 : 0) * gestureEnvelope, 0.3);
  const leftHandRotation = quantize((explainCue ? -0.45 : invitationCue ? -0.2 : 0) * gestureEnvelope, 0.15);
  const rightHandRotation = quantize((explainCue ? 0.25 : invitationCue ? 0.5 : 0) * gestureEnvelope, 0.125);

  return {
    atMs,
    segment,
    opacity,
    blink,
    gazeX,
    gazeY,
    headRotation,
    headY,
    breathY,
    mouthState,
    gesture: explainCue ? "explain_micro" : invitationCue ? "invitation_micro" : "neutral_folded",
    leftHandX,
    leftHandY,
    rightHandX,
    rightHandY,
    leftHandRotation,
    rightHandRotation,
    visualStateKey: [
      segment.id,
      opacity,
      blink,
      gazeX,
      gazeY,
      headRotation,
      headY,
      breathY,
      mouthState,
      leftHandX,
      leftHandY,
      rightHandX,
      rightHandY,
      leftHandRotation,
      rightHandRotation,
    ].join(":"),
  } as const;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderVoxyMotionV3FrameHtmlBase(input: {
  plan: VoxyMotionV3Plan;
  assets: VoxyMotionV3EmbeddedAssets;
  frameIndex: number;
  format?: VoxyMotionV3Format;
}): string {
  const { plan, assets, frameIndex, format = "16:9" } = input;
  const geometry = formatGeometry[format];
  const state = buildVoxyMotionV3FrameState({ plan, frameIndex });
  const portrait = format !== "16:9";
  const mouthClass = `mouth-${state.mouthState}`;
  const studioStage = `translate(${VOXY_STATIC_CANON_FINAL_CAMERA.translateX}px,${VOXY_STATIC_CANON_FINAL_CAMERA.translateY}px) scale(${VOXY_STATIC_CANON_FINAL_CAMERA.scale})`;

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voxy Motion v3</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#010511;font-family:Arial,Helvetica,sans-serif;color:#fff}.viewport{position:relative;width:${geometry.width}px;height:${geometry.height}px;overflow:hidden;background:#010511;isolation:isolate}.master{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;transform-origin:0 0;transform:translateX(${geometry.translateX}px) scale(${geometry.scale});background:#010511}.studio-stage,.source-plate{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover;transform:${studioStage};transform-origin:${VOXY_STATIC_CANON_FINAL_CAMERA.transformOrigin};filter:saturate(1.08) contrast(1.06) brightness(.92)}.studio-stage{z-index:0}.studio-grade{position:absolute;z-index:1;inset:0;background:radial-gradient(circle at 47% 38%,rgba(32,102,255,.05),transparent 29%),linear-gradient(90deg,rgba(1,5,17,.88) 0%,rgba(1,5,17,.38) 29%,transparent 54%,rgba(1,5,17,.76) 88%,#010511 100%)}.brand-reset{position:absolute;z-index:2;left:0;top:0;width:540px;height:480px;background:linear-gradient(90deg,#010511 0 70%,rgba(1,5,17,.8) 86%,transparent)}.right-reset{position:absolute;z-index:2;right:0;top:0;width:520px;height:100%;background:#010511}.bottom-reset{position:absolute;z-index:2;left:0;right:0;bottom:0;height:285px;background:#010511}.motion-plate{position:absolute;z-index:3;inset:0;width:1920px;height:1080px;pointer-events:none;transform-origin:center}.motion-plate .source-plate{z-index:auto}.neck-plate{clip-path:ellipse(118px 93px at 765px 460px);transform:translateY(${state.breathY}px)}.head-plate{clip-path:polygon(26% 9%,31% 5%,42% 6%,48% 15%,51% 35%,49% 43%,45% 44%,42% 49%,34% 48%,30% 43%,27% 33%,25% 19%);transform-origin:755px 375px;transform:translateY(${state.headY}px) rotate(${state.headRotation}deg)}.left-hand-plate{clip-path:ellipse(86px 70px at 695px 704px);transform-origin:690px 700px;transform:translate(${state.leftHandX}px,${state.leftHandY}px) rotate(${state.leftHandRotation}deg)}.right-hand-plate{clip-path:ellipse(92px 72px at 840px 704px);transform-origin:845px 700px;transform:translate(${state.rightHandX}px,${state.rightHandY}px) rotate(${state.rightHandRotation}deg)}.character-mark{position:absolute;z-index:5;display:block;object-fit:fill;transform-origin:center;pointer-events:none}.lapel-pin{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.perspectiveTransform};filter:drop-shadow(0 1px 2px rgba(0,0,0,.72))}.pocket-mark{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.perspectiveTransform}}.eye-glint-cover,.eye-glint{position:absolute;z-index:6;border-radius:50%;pointer-events:none}.eye-glint-cover{top:250px;width:13px;height:16px;background:#090b13;transform:rotate(-8deg)}.eye-glint{top:252px;width:9px;height:12px;background:rgba(245,247,251,.92);box-shadow:0 0 3px rgba(255,255,255,.45);transform:translate(${state.gazeX}px,${state.gazeY}px) rotate(-8deg)}.eye-glint-cover-left{left:734px}.eye-glint-cover-right{left:837px}.eye-glint-left{left:736px}.eye-glint-right{left:839px}.eyelid{position:absolute;z-index:7;top:239px;width:39px;height:57px;border-radius:50%;opacity:${state.blink};background:linear-gradient(100deg,#f2f0ed,#fff 50%,#e4e0dc)}.eyelid:after{content:"";position:absolute;left:7px;right:6px;top:29px;height:4px;border-radius:50%;background:#11121b}.eyelid-left{left:722px}.eyelid-right{left:824px}.mouth-patch{position:absolute;z-index:7;left:772px;top:311px;width:58px;height:37px;pointer-events:none;opacity:.98}.mouth-patch:before{content:"";position:absolute;left:4px;right:4px;top:3px;bottom:3px;border-radius:50%;background:linear-gradient(110deg,#f0efed,#fff 50%,#e5e2df)}.mouth-patch:after{content:"";position:absolute;left:13px;right:12px;top:16px;margin:auto;border-radius:50%;background:#080912}.mouth-neutral:after{height:3px;transform:rotate(2deg)}.mouth-closed:after{height:4px}.mouth-slight-open:after{height:9px;border-bottom:2px solid #1476ff}.mouth-speaking-open:after{height:14px;border-bottom:4px solid #1476ff}.frame{position:absolute;z-index:8;inset:18px;border:1px solid rgba(126,164,210,.22);border-radius:24px}.on-air{position:absolute;z-index:9;left:56px;top:46px;display:${portrait ? "none" : "flex"};align-items:center;gap:12px;padding:12px 18px;border:1px solid rgba(210,228,249,.58);border-radius:999px;background:rgba(1,5,17,.62);font-size:14px;font-weight:800;letter-spacing:.14em}.on-air i{width:10px;height:10px;border-radius:50%;background:#00d9c0;box-shadow:0 0 ${14 + state.opacity * 8}px rgba(0,217,192,.8)}.brand-lockup{position:absolute;z-index:9;left:56px;top:118px;width:330px;height:126px;display:${portrait ? "none" : "block"};opacity:.94}.brand-lockup img{width:100%;height:100%;object-fit:contain;object-position:left center}.editorial-cue{position:absolute;z-index:9;right:74px;top:270px;width:430px;padding:25px 28px 24px;border-left:3px solid #00d9c0;background:linear-gradient(90deg,rgba(2,9,24,.82),rgba(2,9,24,.38));box-shadow:-24px 22px 56px rgba(0,0,0,.18);display:${portrait ? "none" : "block"}}.cue-copy{opacity:${state.opacity};transform:translateY(${Math.round((1 - state.opacity) * 10)}px)}.cue-kicker{display:block;margin-bottom:12px;color:#53e4e8;font-size:13px;font-weight:800;letter-spacing:.16em}.cue-title{display:block;font-size:34px;line-height:1.04;letter-spacing:-.018em}.cue-role{display:block;margin-top:13px;color:#a9c5e2;font-size:17px;font-weight:700;line-height:1.28}.caption-bar{position:absolute;z-index:10;left:58px;right:58px;bottom:54px;min-height:108px;display:${portrait ? "none" : "flex"};align-items:center;padding:20px 34px 20px 40px;background:rgba(2,9,24,.94);border-left:4px solid #1e6bff;box-shadow:0 20px 60px rgba(0,0,0,.3)}.caption{max-width:1680px;font-size:29px;font-weight:700;line-height:1.22;opacity:${state.opacity};transform:translateY(${Math.round((1 - state.opacity) * 8)}px)}.portrait-mask{display:${portrait ? "block" : "none"};position:absolute;z-index:10;inset:0;background:linear-gradient(180deg,rgba(1,5,17,.16),transparent 28%,transparent 62%,rgba(1,5,17,.96) 90%)}.portrait-title{display:${portrait ? "block" : "none"};position:absolute;z-index:12;left:32px;right:32px;top:38px;padding:18px 21px;border-left:4px solid #00d9c0;background:rgba(2,9,24,.86)}.portrait-title strong{display:block;font-size:36px;line-height:1;letter-spacing:-.02em}.portrait-title small{display:block;margin-top:9px;color:#a7c7e7;font-size:14px;font-weight:800;letter-spacing:.08em}.portrait-caption{display:${portrait ? "flex" : "none"};position:absolute;z-index:12;left:32px;right:32px;bottom:38px;min-height:132px;align-items:center;padding:20px 24px;border-left:4px solid #1e6bff;background:rgba(2,9,24,.97);font-size:24px;font-weight:750;line-height:1.24;opacity:${state.opacity}}
</style></head><body><main class="viewport" data-format="${format}" data-frame-index="${frameIndex}" data-at-ms="${state.atMs.toFixed(3)}" data-waveform-count="1" data-waveform-placement="behind_voxy" data-mouth-state="${state.mouthState}" data-hand-gesture="${state.gesture}" data-character-lock="accepted_static_master_additive_motion_plates"><section class="master"><img class="studio-stage" src="${assets.canonStageDataUrl}" alt=""><div class="studio-grade"></div><div class="brand-reset"></div><div class="right-reset"></div><div class="bottom-reset"></div><div class="motion-plate neck-plate"><img class="source-plate" src="${assets.canonStageDataUrl}" alt=""></div><div class="motion-plate head-plate"><img class="source-plate" src="${assets.canonStageDataUrl}" alt=""></div><div class="motion-plate left-hand-plate"><img class="source-plate" src="${assets.canonStageDataUrl}" alt=""></div><div class="motion-plate right-hand-plate"><img class="source-plate" src="${assets.canonStageDataUrl}" alt=""></div><img class="character-mark lapel-pin" src="${assets.lapelPinDataUrl}" alt="VOXY"><img class="character-mark pocket-mark" src="${assets.edebattePocketMarkDataUrl}" alt="eDebatte"><span class="eye-glint-cover eye-glint-cover-left"></span><span class="eye-glint-cover eye-glint-cover-right"></span><span class="eye-glint eye-glint-left"></span><span class="eye-glint eye-glint-right"></span><div class="eyelid eyelid-left"></div><div class="eyelid eyelid-right"></div><div class="mouth-patch ${mouthClass}"></div><div class="frame"></div><div class="on-air"><i></i>ON AIR</div><section class="brand-lockup"><img src="${assets.studioLockupDataUrl}" alt="VoiceOpenGov eDebatte"></section><section class="editorial-cue" aria-label="Redaktioneller Hinweis"><div class="cue-copy"><small class="cue-kicker">${escapeHtml(state.segment.kicker)}</small><strong class="cue-title">${escapeHtml(state.segment.title)}</strong><span class="cue-role">${escapeHtml(state.segment.brand)} · kontextueller Hinweis</span></div></section><section class="caption-bar"><span class="caption">${escapeHtml(state.segment.caption)}</span></section></section><div class="portrait-title"><strong>${escapeHtml(state.segment.title)}</strong><small>${escapeHtml(state.segment.kicker)}</small></div><div class="portrait-mask"></div><div class="portrait-caption">${escapeHtml(state.segment.caption)}</div></main></body></html>`;
}

const mouthIntegrationOverride = `.mouth-patch{opacity:1}.mouth-patch:before{display:none}.mouth-patch:after{border:0;transform:none}.mouth-neutral:after{display:none}.mouth-closed:after{display:block;left:14px;right:13px;top:18px;height:3px;background:rgba(3,4,10,.88)}.mouth-slight-open:after{display:block;left:17px;right:15px;top:24px;height:4px;background:rgba(20,118,255,.82)}.mouth-speaking-open:after{display:block;left:15px;right:13px;top:22px;height:7px;background:linear-gradient(#1157c7,#2386ff)}`;

export function renderVoxyMotionV3FrameHtml(
  input: Parameters<typeof renderVoxyMotionV3FrameHtmlBase>[0],
): string {
  return renderVoxyMotionV3FrameHtmlBase(input).replace(
    "</style>",
    `${mouthIntegrationOverride}</style>`,
  );
}
