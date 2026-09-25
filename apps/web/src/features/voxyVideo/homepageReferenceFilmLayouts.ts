export type HomepageFilmLayoutProfile =
  | "landscape_16_9"
  | "square_1_1"
  | "feed_4_5"
  | "vertical_9_16";

export type HomepageFilmRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type HomepageFilmSafeArea = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

export type HomepageFilmEvidenceMemoryBehavior =
  | "full_column"
  | "single_card_and_marker"
  | "active_card_and_compact_marker";

export type HomepageFilmLayoutContract = Readonly<{
  id: HomepageFilmLayoutProfile;
  label: string;
  output: Readonly<{ width: number; height: number; aspectRatio: string }>;
  stageGeometry: Readonly<{
    width: number;
    height: number;
    scale: number;
    translateX: number;
  }>;
  safeArea: HomepageFilmSafeArea;
  regions: Readonly<{
    presenter: HomepageFilmRect;
    microphone: HomepageFilmRect;
    brand: HomepageFilmRect;
    evidence: HomepageFilmRect;
    navigation: HomepageFilmRect;
    caption: HomepageFilmRect;
  }>;
  typography: Readonly<{
    brandPx: number;
    descriptorPx: number;
    statementPx: number;
    captionPx: number;
    navigationPx: number;
  }>;
  maximumSimultaneousObjects: number;
  evidenceMemory: HomepageFilmEvidenceMemoryBehavior;
  conservativePlatformPreset: string;
}>;

export const VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS = [
  "landscape_16_9",
  "square_1_1",
  "feed_4_5",
  "vertical_9_16",
] as const satisfies readonly HomepageFilmLayoutProfile[];

/**
 * Conservative composition presets, not universal platform overlay guarantees.
 * Semantic content stays inside these insets; platform chrome can vary by app,
 * account state, locale and device.
 */
export const VOXY_HOMEPAGE_FILM_LAYOUTS = {
  landscape_16_9: {
    id: "landscape_16_9",
    label: "Homepage / YouTube landscape",
    output: { width: 1920, height: 1080, aspectRatio: "16:9" },
    stageGeometry: { width: 1920, height: 1080, scale: 1, translateX: 0 },
    safeArea: { top: 48, right: 48, bottom: 54, left: 48 },
    regions: {
      presenter: { x: 540, y: 125, width: 490, height: 635 },
      microphone: { x: 900, y: 430, width: 160, height: 390 },
      brand: { x: 56, y: 118, width: 420, height: 180 },
      evidence: { x: 1060, y: 165, width: 320, height: 400 },
      navigation: { x: 1095, y: 600, width: 280, height: 175 },
      caption: { x: 360, y: 876, width: 1090, height: 108 },
    },
    typography: {
      brandPx: 40,
      descriptorPx: 19,
      statementPx: 25,
      captionPx: 21,
      navigationPx: 13,
    },
    maximumSimultaneousObjects: 4,
    evidenceMemory: "full_column",
    conservativePlatformPreset: "broadcast-title-safe",
  },
  square_1_1: {
    id: "square_1_1",
    label: "Facebook / Instagram square feed",
    output: { width: 1080, height: 1080, aspectRatio: "1:1" },
    stageGeometry: { width: 1080, height: 1080, scale: 0.95, translateX: -220 },
    safeArea: { top: 54, right: 72, bottom: 72, left: 54 },
    regions: {
      presenter: { x: 293, y: 119, width: 466, height: 603 },
      microphone: { x: 654, y: 409, width: 152, height: 310 },
      brand: { x: 54, y: 54, width: 560, height: 170 },
      evidence: { x: 54, y: 740, width: 954, height: 140 },
      navigation: { x: 820, y: 260, width: 188, height: 420 },
      caption: { x: 54, y: 900, width: 954, height: 108 },
    },
    typography: {
      brandPx: 46,
      descriptorPx: 23,
      statementPx: 30,
      captionPx: 26,
      navigationPx: 18,
    },
    maximumSimultaneousObjects: 3,
    evidenceMemory: "single_card_and_marker",
    conservativePlatformPreset: "square-feed-central-safe",
  },
  feed_4_5: {
    id: "feed_4_5",
    label: "Social feed portrait",
    output: { width: 1080, height: 1350, aspectRatio: "4:5" },
    stageGeometry: { width: 1080, height: 1350, scale: 1.25, translateX: -416 },
    safeArea: { top: 72, right: 96, bottom: 120, left: 64 },
    regions: {
      presenter: { x: 259, y: 156, width: 612, height: 620 },
      microphone: { x: 734, y: 538, width: 210, height: 260 },
      brand: { x: 64, y: 72, width: 760, height: 170 },
      evidence: { x: 64, y: 810, width: 920, height: 190 },
      navigation: { x: 64, y: 1018, width: 920, height: 84 },
      caption: { x: 64, y: 1120, width: 920, height: 110 },
    },
    typography: {
      brandPx: 48,
      descriptorPx: 23,
      statementPx: 32,
      captionPx: 28,
      navigationPx: 20,
    },
    maximumSimultaneousObjects: 2,
    evidenceMemory: "active_card_and_compact_marker",
    conservativePlatformPreset: "portrait-feed-central-safe",
  },
  vertical_9_16: {
    id: "vertical_9_16",
    label: "TikTok / Reels / YouTube Shorts",
    output: { width: 1080, height: 1920, aspectRatio: "9:16" },
    stageGeometry: { width: 1080, height: 1920, scale: 16 / 9, translateX: -820 },
    safeArea: { top: 120, right: 140, bottom: 230, left: 80 },
    regions: {
      presenter: { x: 140, y: 222, width: 800, height: 850 },
      microphone: { x: 816, y: 760, width: 210, height: 330 },
      brand: { x: 80, y: 120, width: 760, height: 190 },
      evidence: { x: 80, y: 1110, width: 860, height: 225 },
      navigation: { x: 80, y: 1360, width: 860, height: 130 },
      caption: { x: 80, y: 1535, width: 860, height: 155 },
    },
    typography: {
      brandPx: 56,
      descriptorPx: 28,
      statementPx: 38,
      captionPx: 31,
      navigationPx: 22,
    },
    maximumSimultaneousObjects: 2,
    evidenceMemory: "active_card_and_compact_marker",
    conservativePlatformPreset: "vertical-social-controls-safe",
  },
} as const satisfies Record<HomepageFilmLayoutProfile, HomepageFilmLayoutContract>;

export function homepageFilmRectsOverlap(a: HomepageFilmRect, b: HomepageFilmRect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

export function homepageFilmRectInsideSafeArea(
  rect: HomepageFilmRect,
  layout: HomepageFilmLayoutContract,
): boolean {
  return (
    rect.x >= layout.safeArea.left &&
    rect.y >= layout.safeArea.top &&
    rect.x + rect.width <= layout.output.width - layout.safeArea.right &&
    rect.y + rect.height <= layout.output.height - layout.safeArea.bottom
  );
}
