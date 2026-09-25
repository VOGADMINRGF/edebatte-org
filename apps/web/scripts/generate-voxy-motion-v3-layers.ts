import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  VOXY_MOTION_V3_LAYERS,
  VOXY_MOTION_V3_STATIC_MASTER_HEAD,
} from "../src/features/voxyVideo/motionV3";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const outputDirectory = path.join(
  repositoryRoot,
  "apps/web/public/brands/voxy/rig/layers",
);

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function contentFor(layerId: string, region: { x: number; y: number; width: number; height: number }): string {
  if (layerId === "voxy-lapel-pin") {
    return '<image href="../../overlays/voxy-lapel-pin.svg" x="643" y="486" width="49" height="24" transform="rotate(-10 667.5 498) skewX(-3)"/>';
  }
  if (layerId === "edebatte-pocket-mark") {
    return '<image href="../../overlays/edebatte-pocket-mark.svg" x="858" y="574" width="74" height="23" opacity="0.94" transform="rotate(-2.5 895 585.5)"/>';
  }
  if (layerId === "waveform") {
    return '<image href="../../overlays/jarvis-waveform.svg" x="900" y="70" width="470" height="470" opacity="0.82"/>';
  }
  if (layerId.startsWith("mouth-")) {
    const mouth = layerId === "mouth-neutral"
      ? '<path d="M773 329 Q801 336 829 329" fill="none" stroke="#080912" stroke-width="4" stroke-linecap="round"/>'
      : layerId === "mouth-closed"
        ? '<path d="M773 330 Q801 334 829 330" fill="none" stroke="#080912" stroke-width="5" stroke-linecap="round"/>'
        : layerId === "mouth-slight-open"
          ? '<ellipse cx="801" cy="331" rx="27" ry="6" fill="#080912"/><path d="M779 333 Q801 339 823 333" fill="none" stroke="#1476FF" stroke-width="2"/>'
          : '<ellipse cx="801" cy="331" rx="27" ry="10" fill="#080912"/><path d="M779 335 Q801 343 823 335" fill="none" stroke="#1476FF" stroke-width="3"/>';
    return mouth;
  }
  if (layerId === "left-eyelid" || layerId === "right-eyelid") {
    const x = layerId === "left-eyelid" ? 722 : 824;
    return `<ellipse cx="${x + 19.5}" cy="267.5" rx="19.5" ry="28.5" fill="#F4F2EF"/><path d="M${x + 7} 268 Q${x + 19} 272 ${x + 33} 268" fill="none" stroke="#11121B" stroke-width="4"/>`;
  }
  if (layerId === "editorial-overlays") {
    return '<path d="M1416 270H1846V485H1416Z" fill="#020918" fill-opacity="0.82"/><path d="M1416 270V485" stroke="#00D9C0" stroke-width="3"/>';
  }
  const clipId = `clip-${layerId}`;
  return `<defs><clipPath id="${escapeXml(clipId)}"><rect x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}"/></clipPath></defs><image href="../../references/derived/CANON-04-pocket-clean.png" x="0" y="0" width="1920" height="1080" preserveAspectRatio="none" clip-path="url(#${escapeXml(clipId)})"/>`;
}

await mkdir(outputDirectory, { recursive: true });

for (const layer of VOXY_MOTION_V3_LAYERS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" data-layer-id="${escapeXml(layer.id)}" data-layer-kind="${layer.kind}" data-source-static-head="${VOXY_MOTION_V3_STATIC_MASTER_HEAD}" data-no-generative-replacement="true" data-render-mode="${layer.frozen ? "frozen" : "additive-motion-plate"}"><title>${escapeXml(layer.id)}</title>${contentFor(layer.id, layer.region)}</svg>\n`;
  await writeFile(path.join(outputDirectory, `${layer.id}.svg`), svg, "utf8");
}

console.info(`Generated ${VOXY_MOTION_V3_LAYERS.length} Voxy Motion v3 SVG layers in ${outputDirectory}`);
