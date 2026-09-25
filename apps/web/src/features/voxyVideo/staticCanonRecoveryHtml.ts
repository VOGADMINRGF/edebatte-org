import type {
  VoxyStaticCanonFinalPlan,
  VoxyStaticCanonFinalVariant,
} from "./staticCanonRecovery";
import { VOXY_JACKET_BRAND_LAYER_GEOMETRY } from "./jacketCanonGate";

export type VoxyStaticCanonEmbeddedAssets = {
  canonStageDataUrl: string;
  wordmarkDataUrl: string;
  lapelPinDataUrl: string;
  edebattePocketMarkDataUrl: string;
};

function primaryRailMarkup(): string {
  return `
    <section class="content-rail primary-rail" aria-label="Broadcast-Inhaltszonen">
      <header class="rail-head">
        <small>THEMA · DATUM</small>
        <strong>MODERATION IM KONTEXT</strong>
        <span></span>
      </header>
      <div class="signal-row"><em>01</em><div><small>EVIDENZ</small><b>QUELLEN</b><i></i></div></div>
      <div class="signal-row"><em>02</em><div><small>PERSPEKTIVE</small><b>GEGENPOSITION</b><i></i></div></div>
      <div class="signal-row"><em>03</em><div><small>BETEILIGUNG</small><b>OFFENE FRAGE</b><i></i></div></div>
    </section>
  `;
}

function editorialRailMarkup(): string {
  return `
    <section class="content-rail editorial-rail" aria-label="Editorial- und Anlass-Inhaltszonen">
      <header class="rail-head">
        <small>ANLASS · THEMA · DATUM</small>
        <strong>EDITORIAL / ANLASS</strong>
        <span></span>
      </header>
      <div class="editorial-topic"><small>KONTEXT</small><b>ANLASS UND KERNFRAGE</b><i></i><i></i></div>
      <div class="position-pair">
        <div><small>POSITION A</small><i></i><i></i></div>
        <div><small>POSITION B</small><i></i><i></i></div>
      </div>
      <div class="editorial-meta"><span>QUELLEN</span><span>DOSSIER</span><span>FAKTEN</span></div>
      <div class="participation-line"><small>BETEILIGUNGSFRAGE</small><i></i></div>
    </section>
  `;
}

function lowerThirdMarkup(): string {
  return `
    <section class="lower-third" aria-label="Lower-Third-Beispielzone">
      <div class="lower-copy"><small>HEUTE IM FOKUS</small><strong>Headline und Kernaussage</strong><span>Kurze Einordnung mit Quellen- und Kontextbezug.</span></div>
      <div class="lower-meta"><small>MODERATION</small><b>QUELLEN · KONTEXT<br>BETEILIGUNG</b></div>
    </section>
    <div class="caption-safe"><span>UNTERTITEL-SAFE-ZONE</span></div>
  `;
}

export function renderVoxyStaticCanonFinalHtml(input: {
  plan: VoxyStaticCanonFinalPlan;
  variant: VoxyStaticCanonFinalVariant;
  assets: VoxyStaticCanonEmbeddedAssets;
  clean?: boolean;
}): string {
  const { variant, assets, clean = false } = input;
  const editorial = variant.contentArchitecture === "editorial_anlass";
  const railMaskLeft = editorial ? 1160 : 1305;
  const railLeft = editorial ? 1218 : 1362;
  const railWidth = editorial ? 650 : 510;
  const lowerRight = 50;
  const contentMarkup = clean
    ? ""
    : `${editorial ? editorialRailMarkup() : primaryRailMarkup()}${lowerThirdMarkup()}`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${clean ? "PRIMARY A · CLEAN" : variant.label}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#010511;font-family:Arial,Helvetica,sans-serif;color:#fff}
.master{--rail-mask-left:${railMaskLeft}px;--rail-left:${railLeft}px;--rail-width:${railWidth}px;--lower-right:${lowerRight}px;position:relative;width:1920px;height:1080px;overflow:hidden;isolation:isolate;background:#010511}
.studio-stage{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:translate(${variant.camera.translateX}px,${variant.camera.translateY}px) scale(${variant.camera.scale});transform-origin:${variant.camera.transformOrigin};filter:saturate(1.055) contrast(1.035) brightness(1.015)}
.studio-grade{position:absolute;inset:0;background:radial-gradient(circle at 48% 36%,rgba(45,106,255,.04),transparent 30%),linear-gradient(90deg,rgba(0,213,203,.035),transparent 34%,rgba(1,5,18,.08) 60%,rgba(1,5,18,.56) 100%);pointer-events:none}
.brand-reset{position:absolute;left:0;top:0;width:520px;height:515px;border-bottom-right-radius:120px;background:linear-gradient(90deg,#010511 0 74%,rgba(1,5,17,.99) 82%,rgba(1,5,17,.7) 91%,transparent),repeating-linear-gradient(90deg,transparent 0 22px,rgba(35,77,136,.12) 23px 25px);filter:drop-shadow(24px 18px 32px rgba(1,5,17,.32));pointer-events:none}
.right-reset{position:absolute;left:var(--rail-mask-left);right:0;top:0;height:776px;background:linear-gradient(90deg,rgba(1,5,17,.12),rgba(1,5,17,.96) 12%,#010511 30%);box-shadow:-42px 0 70px rgba(1,5,17,.58)}
.bottom-reset{position:absolute;left:0;right:0;top:760px;bottom:0;background:linear-gradient(180deg,#020817,#01040e 58%,#01030a);border-top:1px solid rgba(74,125,195,.28)}
.bottom-reset:before{content:"";position:absolute;left:0;right:0;top:-88px;height:88px;background:linear-gradient(transparent,rgba(1,5,17,.94));pointer-events:none}
.frame{position:absolute;inset:14px;border:1px solid rgba(140,175,218,.38);border-radius:20px;box-shadow:inset 0 0 80px rgba(0,34,94,.15);pointer-events:none}
.on-air{position:absolute;left:42px;top:34px;height:55px;padding:0 18px;display:flex;align-items:center;gap:12px;border:1px solid rgba(216,231,249,.76);border-radius:8px;background:rgba(1,5,16,.74);font-size:21px;font-weight:800;letter-spacing:.1em;box-shadow:0 12px 34px rgba(0,0,0,.28)}
.on-air i{width:13px;height:13px;border-radius:50%;background:#00d9c0;box-shadow:0 0 18px rgba(0,217,192,.8)}
.brand-lockup{position:absolute;left:56px;top:154px;width:350px;height:190px;padding:12px 10px;border-left:3px solid #00d9c0;background:linear-gradient(90deg,rgba(3,13,32,.78),rgba(3,13,32,.16));filter:drop-shadow(0 15px 32px rgba(0,0,0,.25))}
.brand-lockup:after{content:"DIGITALER MODERATOR";position:absolute;left:22px;bottom:-31px;color:#76a9dd;font-size:13px;letter-spacing:.16em}
.brand-lockup img{width:100%;height:100%;object-fit:contain}
.reconstructed-character-mark{position:absolute;z-index:2;display:block;object-fit:fill;transform-origin:center;pointer-events:none}
.reconstructed-lapel-pin{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.perspectiveTransform};filter:drop-shadow(0 1px 2px rgba(0,0,0,.72))}
.reconstructed-pocket-mark{left:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.left}px;top:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.top}px;width:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.width}px;height:${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.height}px;transform:rotate(${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.rotationDegrees}deg) ${VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.perspectiveTransform}}
.content-rail{position:absolute;left:var(--rail-left);top:54px;width:var(--rail-width);height:650px;padding:27px 29px;background:linear-gradient(145deg,rgba(2,10,27,.97),rgba(1,5,17,.92));border-left:1px solid rgba(73,167,255,.58);border-block:1px solid rgba(107,150,205,.34);box-shadow:-24px 0 55px rgba(0,0,0,.3),inset 20px 0 35px rgba(30,107,255,.04)}
.rail-head{height:125px}.rail-head small{display:block;color:#3ddde4;font-size:14px;letter-spacing:.15em;margin-bottom:12px}.rail-head strong{display:block;font-size:27px;letter-spacing:.045em}.rail-head span{display:block;width:72%;height:3px;margin-top:21px;background:linear-gradient(90deg,#00d9c0,#1e6bff);border-radius:3px}
.signal-row{height:142px;display:grid;grid-template-columns:70px 1fr;align-items:center;border-top:1px solid rgba(126,163,210,.26)}.signal-row em{width:43px;height:43px;display:grid;place-items:center;border:1px solid rgba(58,199,236,.58);border-radius:50%;color:#65e4ec;font-size:15px;font-style:normal;font-weight:800}.signal-row small{display:block;color:#7798bf;font-size:12px;letter-spacing:.16em;margin-bottom:7px}.signal-row b{display:block;font-size:21px;letter-spacing:.07em}.signal-row i{display:block;width:78%;height:4px;margin-top:13px;background:rgba(179,207,239,.22);border-radius:4px}
.editorial-rail{height:664px}.editorial-topic{height:125px;padding-top:18px;border-top:1px solid rgba(126,163,210,.26)}.editorial-topic small,.position-pair small,.participation-line small{display:block;color:#7c9dc3;font-size:12px;letter-spacing:.14em;margin-bottom:10px}.editorial-topic b{font-size:20px;letter-spacing:.07em}.editorial-topic i,.position-pair i,.participation-line i{display:block;height:4px;margin-top:10px;background:rgba(179,207,239,.23);border-radius:3px}.editorial-topic i:last-child{width:66%}
.position-pair{display:grid;grid-template-columns:1fr 1fr;height:125px;border-block:1px solid rgba(126,163,210,.26)}.position-pair div{padding:21px 22px 14px 0}.position-pair div+div{padding-left:22px;border-left:1px solid rgba(126,163,210,.26)}.position-pair i:last-child{width:72%}
.editorial-meta{height:85px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(126,163,210,.26)}.editorial-meta span{color:#dbeaff;font-size:13px;font-weight:700;letter-spacing:.14em}.editorial-meta span+span:before{content:"";display:inline-block;width:4px;height:4px;margin:0 20px 3px 0;border-radius:50%;background:#1e6bff}
.participation-line{padding-top:21px}.participation-line i{width:82%}
.lower-third{position:absolute;left:50px;right:var(--lower-right);top:798px;height:154px;display:grid;grid-template-columns:1fr 255px;align-items:center;padding:20px 31px 20px 44px;background:linear-gradient(90deg,rgba(2,12,31,.98),rgba(2,10,25,.9) 76%,rgba(2,10,25,.78));border-block:1px solid rgba(104,155,215,.5);box-shadow:0 20px 60px rgba(0,0,0,.25)}
.lower-third:before{content:"";position:absolute;left:15px;top:21px;bottom:21px;width:5px;border-radius:4px;background:linear-gradient(#00d9c0,#1e6bff);box-shadow:0 0 18px rgba(0,217,192,.35)}
.lower-copy small,.lower-meta small{display:block;color:#45dfe6;font-size:13px;letter-spacing:.14em}.lower-copy strong{display:block;margin:8px 0 5px;font-size:32px;letter-spacing:.02em}.lower-copy span{color:#9aafca;font-size:17px}.lower-meta{height:80px;padding:12px 0 0 28px;border-left:1px solid rgba(111,151,202,.35)}.lower-meta b{display:block;margin-top:8px;color:#91a9c8;font-size:13px;line-height:1.55;letter-spacing:.08em}
.caption-safe{position:absolute;left:50px;right:50px;top:971px;height:54px;border:1px dashed rgba(109,146,193,.38);display:flex;align-items:center;justify-content:center;color:#597596;font-size:12px;letter-spacing:.15em}.caption-safe span{padding:0 15px;background:#01040e}
.footer{position:absolute;left:50px;right:50px;bottom:25px;display:flex;justify-content:space-between;align-items:center;color:#6997cb;font-size:13px;letter-spacing:.14em}.footer b{color:#3bdde5;font-weight:700}
.clean .right-reset{left:1200px;background:linear-gradient(90deg,transparent,#010511 32%)}.clean .bottom-reset{top:750px}.clean .bottom-reset:before{top:-105px;height:105px}.clean .footer b{color:#7b94b3}
</style>
</head>
<body><main class="master ${variant.id}${clean ? " clean" : ""}" data-variant-id="${variant.id}" data-selection="${variant.selection}" data-character-source="CANON-04" data-character-marks="canon-geometry-reconstructed-vector-wordmarks" data-waveform-count="1" data-waveform-placement="behind_voxy" data-future-audio-reactive-eligible="true" data-currently-audio-reactive="false">
  <img class="studio-stage" src="${assets.canonStageDataUrl}" alt="">
  <img class="reconstructed-character-mark reconstructed-lapel-pin" src="${assets.lapelPinDataUrl}" alt="VOXY">
  <img class="reconstructed-character-mark reconstructed-pocket-mark" src="${assets.edebattePocketMarkDataUrl}" alt="eDebatte">
  <div class="studio-grade"></div><div class="brand-reset"></div><div class="right-reset"></div><div class="bottom-reset"></div>
  <div class="frame"></div><div class="on-air"><i></i>ON AIR</div>
  <section class="brand-lockup"><img src="${assets.wordmarkDataUrl}" alt="Voxy eDebatte"></section>
  ${contentMarkup}
  <footer class="footer"><span>VOXY · DIGITALER MODERATOR · eDEBATTE</span><b>${clean ? "CLEAN MASTER BASE · HUMAN REVIEW" : `${variant.label} · HUMAN REVIEW`}</b></footer>
</main></body></html>`;
}

export function renderVoxyStaticCanonFinalComparisonHtml(input: {
  finalDataUrls: Readonly<Record<"primary-a-final" | "editorial-c-final", string>>;
  canonBoards: readonly Readonly<{ id: string; dataUrl: string }>[];
}): string {
  const variants = [
    ["primary-a-final", "PRIMARY A · BROADCAST MASTER"],
    ["editorial-c-final", "EDITORIAL C · ANLASS-VARIANTE"],
  ] as const;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#01040d;color:#fff;font-family:Arial,Helvetica,sans-serif}.sheet{width:3200px;height:1800px;padding:48px 58px;background:radial-gradient(circle at 50% 0,#071a40,#01040d 58%)}
h1{margin:0;font-size:40px;letter-spacing:.08em}p{margin:10px 0 26px;color:#8ea9cc;font-size:20px}.variant-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.variant,.canon{border:1px solid rgba(94,151,224,.48);overflow:hidden;background:#020718;box-shadow:0 20px 55px rgba(0,0,0,.38)}.variant img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.label{height:58px;display:flex;align-items:center;padding:0 22px;color:#dfeeff;font-size:20px;font-weight:700;letter-spacing:.08em;border-top:1px solid rgba(94,151,224,.32)}
h2{font-size:24px;letter-spacing:.1em;margin:30px 0 15px;color:#55dce9}.canon-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.canon img{display:block;width:100%;height:435px;object-fit:contain;background:#01030a}.canon .label{height:50px;font-size:16px}.notice{display:flex;justify-content:space-between;margin-top:24px;color:#718aad;font-size:17px;letter-spacing:.055em}.notice b{color:#49dbe7}
</style></head><body><main class="sheet"><h1>VOXY · FINALER STATISCHER MASTER-REVIEW</h1><p>A = Primary Broadcast Master · C = Editorial-/Anlass-Variante · B = rejected · keine automatische Qualitätsaussage</p><section class="variant-grid">${variants.map(([id, label]) => `<article class="variant"><img src="${input.finalDataUrls[id]}" alt=""><div class="label">${label}</div></article>`).join("")}</section><h2>VERBINDLICHE CANON-REFERENZEN</h2><section class="canon-grid">${input.canonBoards.map((board) => `<article class="canon"><img src="${board.dataUrl}" alt=""><div class="label">${board.id}</div></article>`).join("")}</section><div class="notice"><span>Identischer Character, Studio, Kamera, Licht und eine Hintergrund-Waveform in A/C · nur die Content-Zonen unterscheiden sich</span><b>HUMAN VISUAL ACCEPTANCE: PENDING</b></div></main></body></html>`;
}
