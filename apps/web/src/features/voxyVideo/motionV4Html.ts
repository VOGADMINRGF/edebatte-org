import { VOXY_JACKET_BRAND_LAYER_GEOMETRY } from "./jacketCanonGate";
import {
  VOXY_MOTION_V4_BLINK_CENTERS_MS,
  type VoxyMotionV4Plan,
  findVoxyMotionV4Segment,
} from "./motionV4";
import {
  buildVoxyHeadRelativeFaceRigCss,
  renderVoxyHeadRelativeFaceRig,
} from "./headRelativeFaceRigHtml";
import {
  buildVoxyCanonicalAlphaHeadRelativeFaceRigCss,
  renderVoxyCanonicalAlphaHeadRelativeFaceRig,
} from "./canonicalAlphaHeadRelativeFaceRigHtml";
import { renderVoxyCanonicalBodyMasterLayer } from "./headAlphaSilhouette";
import {
  findVoxyMouthCanonState,
  type VoxyMouthCanonStateId,
} from "./mouthRig";
import { VOXY_STATIC_CANON_FINAL_CAMERA } from "./staticCanonRecovery";

export type VoxyMotionV4EmbeddedAssets = Readonly<{
  canonStageDataUrl: string;
  canonicalCleanStudioBackgroundDataUrl?: string;
  studioLockupDataUrl: string;
  lapelPinDataUrl: string;
  edebattePocketMarkDataUrl: string;
}>;

export type VoxyMotionV4Format = "16:9" | "9:16" | "1:1";

export type VoxyMotionV4ViewportGeometry = Readonly<{
  width: number;
  height: number;
  scale: number;
  translateX: number;
}>;

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
    ...VOXY_MOTION_V4_BLINK_CENTERS_MS.map((center) => {
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

function mouthBlendAt(
  atMs: number,
  startMs: number,
  endMs: number,
): Readonly<{ from: VoxyMouthCanonStateId; to: VoxyMouthCanonStateId; mix: number }> {
  const edge = Math.min(
    smootherstep((atMs - startMs) / 180),
    smootherstep((endMs - atMs) / 260),
  );
  if (edge < 0.98) {
    return { from: "neutral", to: "closed", mix: quantize(edge, 0.125) };
  }
  const amount = speakingAmount(atMs, startMs, endMs);
  if (amount < 0.42) {
    return { from: "closed", to: "slightOpen", mix: quantize(amount / 0.42, 0.125) };
  }
  return { from: "slightOpen", to: "speakingOpen", mix: quantize((amount - 0.42) / 0.58, 0.125) };
}

export function buildVoxyMotionV4FrameState(input: {
  plan: VoxyMotionV4Plan;
  frameIndex: number;
}) {
  const atMs = (input.frameIndex * 1_000) / input.plan.output.fps;
  const segment = findVoxyMotionV4Segment(atMs);
  const opacity = quantize(
    segmentOpacity(atMs, segment.startMs, segment.endMs),
  );
  const blink = quantize(blinkAmount(atMs));
  const phase = atMs / input.plan.output.durationMs;
  const headRotation = quantize(Math.sin(phase * Math.PI * 4.1) * 0.595, 0.085);
  const headY = quantize(Math.sin(phase * Math.PI * 3.4) * 0.75, 0.25);
  const breathY = quantize((Math.sin(atMs / 1_280) + 1) * 0.48, 0.24);
  const gazeX = quantize(Math.sin(atMs / 2_050) * 0.65, 0.13);
  const gazeY = quantize(Math.cos(atMs / 2_450) * 0.39, 0.13);
  const mouthBlend = mouthBlendAt(atMs, segment.startMs, segment.endMs);
  const explainCue = segment.id === "vote4gov";
  const gestureEnvelope = explainCue
    ? quantize(
        Math.min(
          smootherstep((atMs - segment.startMs) / 650),
          smootherstep((segment.endMs - atMs) / 800),
        ),
      )
    : 0;
  const leftHandX = quantize(-1.3 * gestureEnvelope, 0.26);
  const leftHandY = quantize(-1.8 * gestureEnvelope, 0.3);
  const rightHandX = quantize(0.7 * gestureEnvelope, 0.3);
  const rightHandY = quantize(-0.9 * gestureEnvelope, 0.3);
  const leftHandRotation = quantize(-0.45 * gestureEnvelope, 0.15);
  const rightHandRotation = quantize(0.25 * gestureEnvelope, 0.125);

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
    mouthState: mouthBlend.from,
    mouthNextState: mouthBlend.to,
    mouthMix: mouthBlend.mix,
    gesture: explainCue ? "explain_micro" : "neutral_folded",
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
      mouthBlend.from,
      mouthBlend.to,
      mouthBlend.mix,
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

function renderVoxyMotionV4FrameHtmlBase(input: {
  plan: VoxyMotionV4Plan;
  assets: VoxyMotionV4EmbeddedAssets;
  frameIndex: number;
  format?: VoxyMotionV4Format;
  viewportGeometry?: VoxyMotionV4ViewportGeometry;
  mouthProfile?: "v4" | "v4.1";
  displayFrameIndex?: number;
  mouthOverride?: Readonly<{
    mouthState: VoxyMouthCanonStateId;
    mouthNextState: VoxyMouthCanonStateId;
    mouthMix: number;
  }>;
  waveformAmplitude?: number;
  editorialOverride?: Readonly<{
    kicker: string;
    title: string;
    brand: string;
    caption: string;
  }>;
}): string {
  const { plan, assets, frameIndex, format = "16:9", mouthProfile = "v4" } = input;
  const geometry = input.viewportGeometry ?? formatGeometry[format];
  const state = {
    ...buildVoxyMotionV4FrameState({ plan, frameIndex }),
    ...input.mouthOverride,
  };
  const editorial = input.editorialOverride ?? state.segment;
  const waveformAmplitude = clamp01(input.waveformAmplitude ?? 0);
  const waveformScale = 1 + waveformAmplitude * 0.024;
  const portrait = geometry.height > geometry.width;
  const canonicalAlphaCompositing =
    assets.canonicalCleanStudioBackgroundDataUrl !== undefined;
  const studioStage = `translate(${VOXY_STATIC_CANON_FINAL_CAMERA.translateX}px,${VOXY_STATIC_CANON_FINAL_CAMERA.translateY}px) scale(${VOXY_STATIC_CANON_FINAL_CAMERA.scale})`;
  const canonicalBodyLayer = (className: "studio-stage" | "source-plate", id: string) =>
    renderVoxyCanonicalBodyMasterLayer({
      canonStageDataUrl: assets.canonStageDataUrl,
      cleanStudioBackgroundDataUrl:
        assets.canonicalCleanStudioBackgroundDataUrl,
      className,
      maskId: `voxy-canonical-body-${id}`,
    });
  const headFrame = {
    headRotationDegrees: state.headRotation,
    headTranslateY: state.headY,
    blink: state.blink,
    gazeX: state.gazeX,
    gazeY: state.gazeY,
    gazeEnabled: true,
    mouthState: findVoxyMouthCanonState(state.mouthState),
    mouthNextState: findVoxyMouthCanonState(state.mouthNextState),
    mouthMix: state.mouthMix,
    mouthProfile,
  } as const;
  const stageLayer = canonicalAlphaCompositing
    ? canonicalBodyLayer("studio-stage", "stage")
    : `<img class="studio-stage" src="${assets.canonStageDataUrl}" alt="">`;
  const waveformLayer = canonicalAlphaCompositing
    ? canonicalBodyLayer("source-plate", "waveform")
    : `<img class="source-plate" src="${assets.canonStageDataUrl}" alt="">`;
  const headLayer = canonicalAlphaCompositing
    ? renderVoxyCanonicalAlphaHeadRelativeFaceRig({
        canonStageDataUrl: assets.canonStageDataUrl,
        frame: headFrame,
      })
    : renderVoxyHeadRelativeFaceRig({
        canonStageDataUrl: assets.canonStageDataUrl,
        frame: headFrame,
      });
  const handSource = (id: "left-hand" | "right-hand") =>
    canonicalAlphaCompositing
      ? canonicalBodyLayer("source-plate", id)
      : `<img class="source-plate" src="${assets.canonStageDataUrl}" alt="">`;
  const neckLayer = canonicalAlphaCompositing
    ? ""
    : `<div class="motion-plate neck-plate"><img class="source-plate" src="${assets.canonStageDataUrl}" alt=""></div>`;
  const neckCss = canonicalAlphaCompositing
    ? ""
    : `.neck-plate{clip-path:ellipse(118px 93px at 765px 460px);transform:translateY(${state.breathY}px)}`;
  const headCss = canonicalAlphaCompositing
    ? buildVoxyCanonicalAlphaHeadRelativeFaceRigCss(headFrame)
    : buildVoxyHeadRelativeFaceRigCss(headFrame);
  const characterLock = canonicalAlphaCompositing
    ? "accepted_static_master_structurally_separated_head_body"
    : "accepted_static_master_additive_motion_plates";

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voxy Motion ${mouthProfile}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#010511;font-family:Arial,Helvetica,sans-serif;color:#fff}.viewport{position:relative;width:${geometry.width}px;height:${geometry.height}px;overflow:hidden;background:#010511;isolation:isolate}.master{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;transform-origin:0 0;transform:translateX(${geometry.translateX}px) scale(${geometry.scale});background:#010511}.studio-stage,.source-plate{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover;transform:${studioStage};transform-origin:${VOXY_STATIC_CANON_FINAL_CAMERA.transformOrigin};filter:saturate(1.08) contrast(1.06) brightness(.92)}.canonical-body-master{transform:none!important;transform-origin:0 0!important}.studio-stage{z-index:0}.studio-grade{position:absolute;z-index:1;inset:0;background:radial-gradient(circle at 47% 38%,rgba(32,102,255,.05),transparent 29%),linear-gradient(90deg,rgba(1,5,17,.88) 0%,rgba(1,5,17,.38) 29%,transparent 54%,rgba(1,5,17,.76) 88%,#010511 100%)}.audio-waveform-reactive{position:absolute;z-index:2;inset:0;pointer-events:none;clip-path:ellipse(285px 230px at 1120px 298px);opacity:${(waveformAmplitude * 0.2).toFixed(4)};transform:scaleY(${waveformScale.toFixed(5)});transform-origin:1120px 298px}.audio-waveform-reactive .source-plate{filter:saturate(1.12) contrast(1.08) brightness(1.08)}.brand-reset{position:absolute;z-index:2;left:0;top:0;width:540px;height:480px;background:linear-gradient(90deg,#010511 0 70%,rgba(1,5,17,.8) 86%,transparent)}.right-reset{position:absolute;z-index:2;right:0;top:0;width:520px;height:100%;background:#010511}.bottom-reset{position:absolute;z-index:2;left:0;right:0;bottom:0;height:285px;background:#010511}.motion-plate{position:absolute;z-index:3;inset:0;width:1920px;height:1080px;pointer-events:none;transform-origin:center}.motion-plate .source-plate{z-index:auto}${neckCss}.left-hand-plate{clip-path:ellipse(86px 70px at 695px 704px);transform-origin:690px 700px;transform:translate(${state.leftHandX}px,${state.leftHandY}px) rotate(${state.leftHandRotation}deg)}.right-hand-plate{clip-path:ellipse(92px 72px at 840px 704px);transform-origin:845px 700px;transform:translate(${state.rightHandX}px,${state.rightHandY}px) rotate(${state.rightHandRotation}deg)}.character-mark{position:absolute;z-index:5;display:block;object-fit:fill;transform-origin:center;pointer-events:none}.lapel-pin{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.perspectiveTransform};filter:drop-shadow(0 1px 2px rgba(0,0,0,.72))}.pocket-mark{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.perspectiveTransform}}.frame{position:absolute;z-index:8;inset:18px;border:1px solid rgba(126,164,210,.22);border-radius:24px}.on-air{position:absolute;z-index:9;left:56px;top:46px;display:${portrait ? "none" : "flex"};align-items:center;gap:12px;padding:12px 18px;border:1px solid rgba(210,228,249,.58);border-radius:999px;background:rgba(1,5,17,.62);font-size:14px;font-weight:800;letter-spacing:.14em}.on-air i{width:10px;height:10px;border-radius:50%;background:#00d9c0;box-shadow:0 0 ${14 + state.opacity * 8}px rgba(0,217,192,.8)}.brand-lockup{position:absolute;z-index:9;left:56px;top:118px;width:330px;height:126px;display:${portrait ? "none" : "block"};opacity:.94}.brand-lockup img{width:100%;height:100%;object-fit:contain;object-position:left center}.editorial-cue{position:absolute;z-index:9;right:74px;top:270px;width:430px;padding:25px 28px 24px;border-left:3px solid #00d9c0;background:linear-gradient(90deg,rgba(2,9,24,.82),rgba(2,9,24,.38));box-shadow:-24px 22px 56px rgba(0,0,0,.18);display:${portrait ? "none" : "block"}}.cue-copy{opacity:${state.opacity};transform:translateY(${Math.round((1 - state.opacity) * 10)}px)}.cue-kicker{display:block;margin-bottom:12px;color:#53e4e8;font-size:13px;font-weight:800;letter-spacing:.16em}.cue-title{display:block;font-size:34px;line-height:1.04;letter-spacing:-.018em}.cue-role{display:block;margin-top:13px;color:#a9c5e2;font-size:17px;font-weight:700;line-height:1.28}.caption-bar{position:absolute;z-index:10;left:58px;right:58px;bottom:54px;min-height:108px;display:${portrait ? "none" : "flex"};align-items:center;padding:20px 34px 20px 40px;background:rgba(2,9,24,.94);border-left:4px solid #1e6bff;box-shadow:0 20px 60px rgba(0,0,0,.3)}.caption{max-width:1680px;font-size:29px;font-weight:700;line-height:1.22;opacity:${state.opacity};transform:translateY(${Math.round((1 - state.opacity) * 8)}px)}.portrait-mask{display:${portrait ? "block" : "none"};position:absolute;z-index:10;inset:0;background:linear-gradient(180deg,rgba(1,5,17,.16),transparent 28%,transparent 62%,rgba(1,5,17,.96) 90%)}.portrait-title{display:${portrait ? "block" : "none"};position:absolute;z-index:12;left:32px;right:32px;top:38px;padding:18px 21px;border-left:4px solid #00d9c0;background:rgba(2,9,24,.86)}.portrait-title strong{display:block;font-size:36px;line-height:1;letter-spacing:-.02em}.portrait-title small{display:block;margin-top:9px;color:#a7c7e7;font-size:14px;font-weight:800;letter-spacing:.08em}.portrait-caption{display:${portrait ? "flex" : "none"};position:absolute;z-index:12;left:32px;right:32px;bottom:38px;min-height:132px;align-items:center;padding:20px 24px;border-left:4px solid #1e6bff;background:rgba(2,9,24,.97);font-size:24px;font-weight:750;line-height:1.24;opacity:${state.opacity}}
${headCss}</style></head><body><main class="viewport" data-format="${format}" data-frame-index="${input.displayFrameIndex ?? frameIndex}" data-source-frame-index="${frameIndex}" data-at-ms="${state.atMs.toFixed(3)}" data-waveform-count="1" data-waveform-placement="behind_voxy" data-waveform-audio-reactive="${input.waveformAmplitude !== undefined}" data-waveform-amplitude="${waveformAmplitude.toFixed(4)}" data-mouth-state="${state.mouthState}" data-mouth-next-state="${state.mouthNextState}" data-mouth-mix="${state.mouthMix}" data-hand-gesture="${state.gesture}" data-character-lock="${characterLock}"><section class="master">${stageLayer}<div class="studio-grade"></div>${input.waveformAmplitude === undefined ? "" : `<div class="audio-waveform-reactive">${waveformLayer}</div>`}<div class="brand-reset"></div><div class="right-reset"></div><div class="bottom-reset"></div>${neckLayer}${headLayer}<div class="motion-plate left-hand-plate">${handSource("left-hand")}</div><div class="motion-plate right-hand-plate">${handSource("right-hand")}</div><img class="character-mark lapel-pin" src="${assets.lapelPinDataUrl}" alt="VOXY"><img class="character-mark pocket-mark" src="${assets.edebattePocketMarkDataUrl}" alt="eDebatte"><div class="frame"></div><div class="on-air"><i></i>ON AIR</div><section class="brand-lockup"><img src="${assets.studioLockupDataUrl}" alt="VoiceOpenGov eDebatte"></section><section class="editorial-cue" aria-label="Redaktioneller Hinweis"><div class="cue-copy"><small class="cue-kicker">${escapeHtml(editorial.kicker)}</small><strong class="cue-title">${escapeHtml(editorial.title)}</strong><span class="cue-role">${escapeHtml(editorial.brand)} · kontextueller Hinweis</span></div></section><section class="caption-bar"><span class="caption">${escapeHtml(editorial.caption)}</span></section></section><div class="portrait-title"><strong>${escapeHtml(editorial.title)}</strong><small>${escapeHtml(editorial.kicker)}</small></div><div class="portrait-mask"></div><div class="portrait-caption">${escapeHtml(editorial.caption)}</div></main></body></html>`;
}

export function renderVoxyMotionV4FrameHtml(
  input: Parameters<typeof renderVoxyMotionV4FrameHtmlBase>[0],
): string {
  return renderVoxyMotionV4FrameHtmlBase(input);
}
