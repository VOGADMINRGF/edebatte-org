export const VOXY_CANONICAL_HEAD_ALPHA_SCHEMA_VERSION =
  "voxy-canonical-head-alpha-v1" as const;

export const VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND = {
  repositoryPath:
    "apps/web/public/brands/voxy/studio/voxy-studio-background-16x9.svg",
  sha256:
    "e2036cf20bb5621666fee9a52200531d80448095fd9f53e4287de71d4e1bb480",
} as const;

export const VOXY_CANONICAL_HEAD_ALPHA = {
  source: {
    repositoryPath:
      "apps/web/public/brands/voxy/references/derived/CANON-04-pocket-clean.png",
    sha256:
      "5176f19d3de18a34c32c908d93a3277a2715959d491620d21c7129f9d305f5ca",
    nativeWidth: 1672,
    nativeHeight: 941,
    alphaMinimum: 255,
    alphaMaximum: 255,
    containsTransparency: false,
  },
  rigBounds: { x: 495, y: 55, width: 500, height: 400 },
  canonicalBodySourceInMaster: {
    x: -90,
    y: -33.64,
    width: 2064,
    height: 1161,
  },
  acceptedMotionSourceInRig: {
    // Preserve the human-accepted Motion-v4 head/face registration exactly.
    // Structural alpha separation, not a face-position change, fixes the body leak.
    x: -547.875,
    y: -84.515,
    width: 2064,
    height: 1161,
  },
  canonicalStageDelta: { x: 37.125, y: 4.125 },
  faceRigOffset: { x: 0, y: 0 },
  contributionBounds: { x: 44, y: 15, width: 456, height: 374 },
  maskUnits: "userSpaceOnUse",
  maskType: "alpha",
  outsideSilhouetteContribution: 0,
  includes: [
    "speech-bubble-head",
    "speech-bubble-tail",
    "left-headphone",
    "right-headphone",
    "headphone-band",
  ],
  excludes: [
    "background",
    "neck",
    "left-shoulder",
    "right-shoulder",
    "left-lapel",
    "right-lapel",
    "torso",
    "vog-pin",
    "microphone",
  ],
} as const;

export function renderVoxyCanonicalHeadAlphaShape(color: string): string {
  return `<path d="M157 23C140 22 129 29 124 45C120 61 119 83 119 111V276C119 301 130 314 154 317L194 319V373C194 386 204 389 214 379L266 328L439 337C466 338 482 326 487 301C493 266 494 188 489 153C486 130 474 110 455 95C450 91 445 89 438 89L343 82C335 81 330 77 325 70L302 35C298 29 291 28 282 28Z" fill="${color}"/>
    <path d="M282 28C348 30 424 35 453 48C476 59 490 86 497 122L489 158C484 133 473 111 455 95C450 91 445 89 438 89L343 82C335 81 330 77 325 70L302 35C298 29 291 28 282 28Z" fill="${color}"/>
    <path d="M157 23C129 24 100 48 87 80C79 99 76 120 77 141" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"/>
    <path d="M80 113C64 110 54 123 50 145C44 178 46 236 54 263C60 283 73 292 88 286C102 281 111 266 113 244L114 155C112 131 99 116 80 113Z" fill="${color}"/>
    <path d="M486 119C496 118 500 122 500 128V285C499 290 495 293 488 292Z" fill="${color}"/>`;
}

export function renderVoxyCanonicalBodyMasterLayer(input: {
  canonStageDataUrl: string;
  cleanStudioBackgroundDataUrl?: string;
  className: "studio-stage" | "source-plate";
  maskId: string;
}): string {
  const bodySource = VOXY_CANONICAL_HEAD_ALPHA.canonicalBodySourceInMaster;
  const rig = VOXY_CANONICAL_HEAD_ALPHA.rigBounds;
  const delta = VOXY_CANONICAL_HEAD_ALPHA.canonicalStageDelta;
  const cleanBackground = input.cleanStudioBackgroundDataUrl
    ? `<image data-body-under-head="canonical-clean-studio" href="${input.cleanStudioBackgroundDataUrl}" x="0" y="0" width="1920" height="1080" preserveAspectRatio="none"/>`
    : "";
  return `<svg class="${input.className} canonical-body-master" viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true" data-body-layer="canonical-master-with-static-head-removed" data-body-head-pixel-contribution="0">${cleanBackground}<defs><linearGradient id="${input.maskId}-turtleneck" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#03050a"/><stop offset=".48" stop-color="#090b10"/><stop offset="1" stop-color="#03050a"/></linearGradient><mask id="${input.maskId}" x="0" y="0" width="1920" height="1080" maskUnits="userSpaceOnUse" mask-type="luminance"><rect x="0" y="0" width="1920" height="1080" fill="#fff"/><g transform="translate(${rig.x - delta.x} ${rig.y - delta.y})">${renderVoxyCanonicalHeadAlphaShape("#000")}</g></mask></defs><path data-body-under-head="canonical-turtleneck-continuation" d="M620 340C680 315 810 315 855 340C875 395 888 470 900 560H580C590 470 600 395 620 340Z" fill="url(#${input.maskId}-turtleneck)"/><g mask="url(#${input.maskId})"><image href="${input.canonStageDataUrl}" x="${bodySource.x}" y="${bodySource.y}" width="${bodySource.width}" height="${bodySource.height}" preserveAspectRatio="none"/></g></svg>`;
}

export function validateVoxyCanonicalHeadAlpha(): string[] {
  const errors: string[] = [];
  if (
    VOXY_CANONICAL_HEAD_ALPHA.source.containsTransparency !== false ||
    VOXY_CANONICAL_HEAD_ALPHA.source.alphaMinimum !== 255 ||
    VOXY_CANONICAL_HEAD_ALPHA.source.alphaMaximum !== 255
  ) {
    errors.push("flattened_source_alpha_audit_invalid");
  }
  if (
    VOXY_CANONICAL_HEAD_ALPHA.outsideSilhouetteContribution !== 0 ||
    VOXY_CANONICAL_HEAD_ALPHA.maskUnits !== "userSpaceOnUse" ||
    VOXY_CANONICAL_HEAD_ALPHA.maskType !== "alpha"
  ) {
    errors.push("head_alpha_contract_invalid");
  }
  if (
    VOXY_CANONICAL_HEAD_ALPHA.acceptedMotionSourceInRig.x !== -547.875 ||
    VOXY_CANONICAL_HEAD_ALPHA.acceptedMotionSourceInRig.y !== -84.515 ||
    VOXY_CANONICAL_HEAD_ALPHA.canonicalBodySourceInMaster.x !== -90 ||
    VOXY_CANONICAL_HEAD_ALPHA.canonicalBodySourceInMaster.y !== -33.64 ||
    VOXY_CANONICAL_HEAD_ALPHA.faceRigOffset.x !== 0 ||
    VOXY_CANONICAL_HEAD_ALPHA.faceRigOffset.y !== 0
  ) {
    errors.push("head_source_registration_invalid");
  }
  for (const forbidden of [
    "left-shoulder",
    "right-shoulder",
    "left-lapel",
    "right-lapel",
    "neck",
    "torso",
    "vog-pin",
    "microphone",
  ] as const) {
    if (!VOXY_CANONICAL_HEAD_ALPHA.excludes.includes(forbidden)) {
      errors.push(`head_alpha_exclusion_missing:${forbidden}`);
    }
  }
  return errors;
}
