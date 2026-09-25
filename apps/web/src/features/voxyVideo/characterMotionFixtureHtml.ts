import {
  type VoxyCharacterMotionFixturePlan,
  validateVoxyCharacterMotionFixturePlan,
} from "./characterMotionFixture";
import {
  buildVoxyRigFrame,
  VOXY_LOCAL_RIG,
  type VoxyRigFrame,
} from "./animatableMasterAsset";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getVoxyRigFrameCssProperties(
  frame: VoxyRigFrame,
): Record<string, string> {
  return {
    "--rig-body-rotation": `${frame.bodyRotationDeg.toFixed(4)}deg`,
    "--rig-body-y": `${frame.bodyTranslateY.toFixed(4)}px`,
    "--rig-head-rotation": `${frame.headRotationDeg.toFixed(4)}deg`,
    "--rig-head-x": `${frame.headTranslateX.toFixed(4)}px`,
    "--rig-head-y": `${frame.headTranslateY.toFixed(4)}px`,
    "--rig-eye-x": `${frame.eyeLookX.toFixed(4)}px`,
    "--rig-eye-y": `${frame.eyeLookY.toFixed(4)}px`,
    "--rig-eye-open": frame.eyeOpen.toFixed(4),
    "--rig-blink": frame.blinkAmount.toFixed(4),
    "--rig-brow-rotation": `${frame.browRotationDeg.toFixed(4)}deg`,
    "--rig-left-arm-rotation": `${frame.leftArmRotationDeg.toFixed(4)}deg`,
    "--rig-right-arm-rotation": `${frame.rightArmRotationDeg.toFixed(4)}deg`,
    "--rig-left-hand-rotation": `${frame.leftHandRotationDeg.toFixed(4)}deg`,
    "--rig-right-hand-rotation": `${frame.rightHandRotationDeg.toFixed(4)}deg`,
    "--rig-left-hand-x": `${frame.leftHandTranslateX.toFixed(4)}px`,
    "--rig-left-hand-y": `${frame.leftHandTranslateY.toFixed(4)}px`,
    "--rig-right-hand-x": `${frame.rightHandTranslateX.toFixed(4)}px`,
    "--rig-right-hand-y": `${frame.rightHandTranslateY.toFixed(4)}px`,
  };
}

function serializeCssProperties(properties: Record<string, string>): string {
  return Object.entries(properties)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}

function prepareEmbeddedRigSvg(svg: string): string {
  const start = svg.indexOf("<svg");
  if (start < 0 || svg.includes("<script") || /<image\b/i.test(svg)) {
    throw new Error("invalid_or_non_local_voxy_rig_svg");
  }
  const requiredNodeIds = [
    ...VOXY_LOCAL_RIG.controls.flatMap((control) => control.nodeIds),
    ...VOXY_LOCAL_RIG.immutableBrandOverlays,
    ...VOXY_LOCAL_RIG.hands.left.digitIds,
    ...VOXY_LOCAL_RIG.hands.right.digitIds,
  ];
  for (const nodeId of requiredNodeIds) {
    if (!svg.includes(`id="${nodeId}"`)) {
      throw new Error(`voxy_rig_node_missing:${nodeId}`);
    }
  }
  return svg
    .slice(start)
    .replace(
      "<svg ",
      `<svg class="rig-character" data-rig-id="${VOXY_LOCAL_RIG.id}" data-rig-version="${VOXY_LOCAL_RIG.version}" `,
    );
}

export function renderVoxyCharacterMotionFixtureHtml(input: {
  plan: VoxyCharacterMotionFixturePlan;
  embeddedStudioAssetUrl?: string;
  embeddedCharacterSvg: string;
  captureTimeMs?: number;
}): string {
  const validation = validateVoxyCharacterMotionFixturePlan(input.plan);
  if (!validation.ok) {
    throw new Error(`invalid_voxy_character_motion_fixture:${validation.errors.join(",")}`);
  }

  const plan = input.plan;
  const captureTimeMs = input.captureTimeMs === undefined
    ? 0
    : Math.max(0, Math.min(plan.durationMs - 1, input.captureTimeMs));
  const captureClass = input.captureTimeMs === undefined ? "" : "capture-mode";
  const studioUrl = input.embeddedStudioAssetUrl ?? plan.studioAssetPath;
  const rigSvg = prepareEmbeddedRigSvg(input.embeddedCharacterSvg);
  const rigFrame = buildVoxyRigFrame(captureTimeMs);
  const rigFrameStyle = serializeCssProperties(
    getVoxyRigFrameCssProperties(rigFrame),
  );

  const sceneCards = plan.scenes.map((scene) => `
    <article class="scene-card scene-${escapeHtml(scene.kind)}" style="--scene-start:${scene.startMs}ms;--scene-duration:${scene.endMs - scene.startMs}ms">
      <p class="scene-kicker">${escapeHtml(scene.kicker)}</p>
      <h2>${escapeHtml(scene.headline)}</h2>
      <p class="scene-detail">${escapeHtml(scene.detail)}</p>
    </article>`).join("\n");

  return `<!doctype html>
<html lang="${escapeHtml(plan.outputLanguage)}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="dark"/><title>${escapeHtml(plan.title)}</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#020718}body{display:grid;place-items:center}
#fixture{--capture-time:${captureTimeMs}ms;position:relative;width:${plan.width}px;height:${plan.height}px;overflow:hidden;isolation:isolate;background:#020718}
.studio-layer{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;animation:studio-push ${plan.durationMs}ms linear calc(0ms - var(--capture-time)) both}
.character-stage{position:absolute;z-index:3;left:22%;top:6%;width:55%;height:83%;filter:drop-shadow(0 22px 26px rgba(0,0,0,.35))}.rig-character{display:block;width:100%;height:100%;overflow:visible}.rig-character #body{transform-box:view-box;transform-origin:800px 1120px;transform:translateY(var(--rig-body-y)) rotate(var(--rig-body-rotation))}.rig-character #head,.rig-character #headphones{transform-box:view-box;transform-origin:800px 680px;transform:translate(var(--rig-head-x),var(--rig-head-y)) rotate(var(--rig-head-rotation))}.rig-character #left-eye{transform-box:view-box;transform-origin:695px 495px;transform:translate(var(--rig-eye-x),var(--rig-eye-y)) scaleY(var(--rig-eye-open))}.rig-character #right-eye{transform-box:view-box;transform-origin:905px 495px;transform:translate(var(--rig-eye-x),var(--rig-eye-y)) scaleY(var(--rig-eye-open))}.rig-character #left-eyelid,.rig-character #right-eyelid{opacity:var(--rig-blink);stroke-width:18px}.rig-character #left-brow{transform-box:view-box;transform-origin:695px 414px;transform:rotate(var(--rig-brow-rotation))}.rig-character #right-brow{transform-box:view-box;transform-origin:905px 414px;transform:rotate(calc(0deg - var(--rig-brow-rotation)))}.rig-character #left-arm{transform-box:view-box;transform-origin:520px 980px;transform:rotate(var(--rig-left-arm-rotation))}.rig-character #right-arm{transform-box:view-box;transform-origin:1080px 980px;transform:rotate(var(--rig-right-arm-rotation))}.rig-character #left-hand-five-fingers{transform-box:view-box;transform-origin:0 0;transform:translate(calc(620px + var(--rig-left-hand-x) + ${VOXY_LOCAL_RIG.handPresentation.left.wristInset.x}px),calc(1410px + var(--rig-left-hand-y) + ${VOXY_LOCAL_RIG.handPresentation.left.wristInset.y}px)) rotate(calc(${VOXY_LOCAL_RIG.handPresentation.left.baseRotationDeg}deg + var(--rig-left-arm-rotation) + var(--rig-left-hand-rotation))) scale(${VOXY_LOCAL_RIG.handPresentation.scale})}.rig-character #right-hand-five-fingers{transform-box:view-box;transform-origin:0 0;transform:translate(calc(980px + var(--rig-right-hand-x) + ${VOXY_LOCAL_RIG.handPresentation.right.wristInset.x}px),calc(1410px + var(--rig-right-hand-y) + ${VOXY_LOCAL_RIG.handPresentation.right.wristInset.y}px)) rotate(calc(${VOXY_LOCAL_RIG.handPresentation.right.baseRotationDeg}deg + var(--rig-right-arm-rotation) + var(--rig-right-hand-rotation))) scale(-${VOXY_LOCAL_RIG.handPresentation.scale},${VOXY_LOCAL_RIG.handPresentation.scale})}
.vignette{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(90deg,rgba(0,3,14,.24),transparent 34%,transparent 70%,rgba(0,3,14,.58)),linear-gradient(0deg,rgba(0,3,14,.58),transparent 38%)}
.on-air{position:absolute;z-index:7;top:4%;left:3%;border:1px solid rgba(0,217,192,.86);background:rgba(3,11,34,.88);border-radius:999px;padding:.62rem 1rem;font-weight:800;font-size:clamp(13px,1.45vw,19px);letter-spacing:.09em;box-shadow:0 0 28px rgba(30,107,255,.28);animation:on-air-in 520ms cubic-bezier(.2,.8,.2,1) calc(0ms - var(--capture-time)) both}
.scene-stack{position:absolute;z-index:8;top:16%;right:3%;width:min(31%,390px);height:58%}.scene-card{position:absolute;inset-inline:0;top:50%;max-width:100%;transform:translate3d(44px,-50%,0) scale(.98);opacity:0;border:1px solid rgba(0,217,192,.74);border-radius:18px;padding:clamp(16px,2.1vw,26px);background:linear-gradient(145deg,rgba(3,11,31,.95),rgba(7,20,54,.9));box-shadow:0 20px 50px rgba(0,0,0,.38),0 0 34px rgba(30,107,255,.16);animation:card-cycle var(--scene-duration) ease-in-out calc(var(--scene-start) - var(--capture-time)) both;overflow:hidden}
.scene-kicker{margin:0 0 .72rem;color:#25e6ff;font-size:clamp(12px,1.35vw,17px);letter-spacing:.1em;font-weight:850}.scene-card h2{margin:0;max-width:100%;font-size:clamp(21px,2.35vw,35px);line-height:1.08;letter-spacing:-.025em;overflow-wrap:anywhere;hyphens:auto}.scene-detail{margin:.9rem 0 0;color:#c9d8f2;font-size:clamp(14px,1.42vw,20px);line-height:1.38;overflow-wrap:anywhere;hyphens:auto}
.scene-opening{left:-210%;width:195%;top:70%}.scene-invitation{text-align:center}
.lower-third{position:absolute;z-index:9;inset-inline:0;bottom:0;min-height:14%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1.5rem;align-items:center;padding:1.05rem 3%;border-top:2px solid transparent;border-image:linear-gradient(90deg,#00d9c0,#1e6bff) 1;background:rgba(2,8,24,.93);box-shadow:0 -16px 42px rgba(0,0,0,.28);animation:lower-third-in 620ms cubic-bezier(.2,.8,.2,1) calc(280ms - var(--capture-time)) both}.lower-third strong{display:block;max-width:100%;font-size:clamp(18px,2.15vw,30px);letter-spacing:-.018em;overflow-wrap:anywhere}.lower-third small{color:#b9cae7;font-size:clamp(11px,1.1vw,15px)}.mode{color:#25e6ff;font-weight:800;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}.transparency{position:absolute;z-index:10;left:3%;bottom:15.4%;max-width:54%;color:rgba(220,231,248,.84);font-size:clamp(10px,1vw,13px)}
.capture-mode .studio-layer,.capture-mode .on-air,.capture-mode .scene-card,.capture-mode .lower-third{animation-play-state:paused!important}
@keyframes studio-push{from{transform:scale(1.005)}to{transform:scale(1.035) translate3d(-.25%,-.15%,0)}}@keyframes on-air-in{from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:none}}@keyframes lower-third-in{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:none}}@keyframes card-cycle{0%,20%{opacity:0;transform:translate3d(34px,-50%,0) scale(.99)}30%,82%{opacity:1;transform:translate3d(0,-50%,0)}100%{opacity:0;transform:translate3d(-14px,-50%,0) scale(.995)}}
@media(max-aspect-ratio:1/1){.character-stage{left:5%;top:13%;width:90%;height:58%}.scene-stack{top:60%;left:5%;right:5%;width:auto;height:23%}.scene-card,.scene-opening,.scene-invitation{left:0;width:100%;top:42%}.scene-card h2{font-size:clamp(22px,4.2vw,38px)}.scene-detail{font-size:clamp(15px,2.8vw,22px)}.lower-third{grid-template-columns:1fr;gap:.3rem;min-height:12%}.mode{white-space:normal}.transparency{bottom:13.5%;max-width:90%}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:1ms!important}.scene-card{display:none}.scene-card:first-child{display:block;opacity:1;transform:translate3d(0,-50%,0)}}
</style></head><body><main id="fixture" class="${captureClass}" data-rig-state="${rigFrame.state}" style="${rigFrameStyle}" aria-label="Voxy Character Motion Fixture"><img class="studio-layer" src="${escapeHtml(studioUrl)}" alt=""/><div class="character-stage" aria-label="Voxy Local 2D Rig">${rigSvg}</div><div class="vignette"></div><div class="on-air">VOXY · ON AIR</div><section class="scene-stack" aria-label="Quellen- und Recherchekarten">${sceneCards}</section><p class="transparency">${escapeHtml(plan.mascotDisclosure)} ${escapeHtml(plan.sourceDisclosure)}</p><footer class="lower-third"><div><strong>${escapeHtml(plan.title)}</strong><small>Lokales Layer-/Pivot-Rig · Review-first · kein Auto-Publish</small></div><span class="mode">Fakten · Evidenz · Updates</span></footer></main></body></html>`;
}
