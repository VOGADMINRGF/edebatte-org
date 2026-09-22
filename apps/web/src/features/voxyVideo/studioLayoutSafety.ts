import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  homepageFilmRectInsideSafeArea,
  type HomepageFilmLayoutContract,
  type HomepageFilmLayoutProfile,
  type HomepageFilmRect,
} from "./homepageReferenceFilmLayouts";
import type { VoxyVideoFormat } from "./modernCharacterContracts";
import type { VoxyStudioDraft, VoxyStudioSafeZoneProfile } from "./studioDraft";

const FORMAT_LAYOUT: Readonly<Record<VoxyVideoFormat, HomepageFilmLayoutProfile>> = {
  "16:9": "landscape_16_9",
  "9:16": "vertical_9_16",
  "1:1": "square_1_1",
};

export type VoxyStudioLayoutSafetyIssue = {
  severity: "warning" | "blocker";
  code: string;
  format: VoxyVideoFormat;
  chapterId: string | null;
  region: "brand" | "evidence" | "caption" | "navigation";
  message: string;
};

export type VoxyStudioLayoutSafetyResult = {
  format: VoxyVideoFormat;
  layoutProfile: HomepageFilmLayoutProfile;
  safeZoneProfile: VoxyStudioSafeZoneProfile;
  conservativePlatformPreset: string;
  output: { width: number; height: number };
  safeArea: { top: number; right: number; bottom: number; left: number };
  semanticRegionsInsideSafeArea: boolean;
  warnings: VoxyStudioLayoutSafetyIssue[];
  blockers: VoxyStudioLayoutSafetyIssue[];
  approvalEligible: boolean;
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function layoutFor(format: VoxyVideoFormat): HomepageFilmLayoutContract {
  return VOXY_HOMEPAGE_FILM_LAYOUTS[FORMAT_LAYOUT[format]];
}

function textCapacity(input: {
  rect: HomepageFilmRect;
  fontPx: number;
  lines: number;
  widthFactor?: number;
}) {
  const widthFactor = input.widthFactor ?? 0.56;
  const charsPerLine = Math.max(
    8,
    Math.floor(input.rect.width / Math.max(1, input.fontPx * widthFactor)),
  );
  return Math.max(16, charsPerLine * input.lines);
}

function evaluateCopy(input: {
  value: string;
  warningAt: number;
  blockerAt: number;
  format: VoxyVideoFormat;
  chapterId: string | null;
  region: VoxyStudioLayoutSafetyIssue["region"];
  code: string;
  label: string;
}): VoxyStudioLayoutSafetyIssue | null {
  const value = normalized(input.value);
  if (!value) return null;
  if (value.length > input.blockerAt) {
    return {
      severity: "blocker",
      code: `${input.code}_overflow_risk`,
      format: input.format,
      chapterId: input.chapterId,
      region: input.region,
      message: `${input.label} ist für die kanonische ${input.format}-Region zu lang (${value.length}/${input.blockerAt} Zeichen konservatives Budget). Inhalt bleibt erhalten; vor Renderfreigabe kürzen oder aufteilen.`,
    };
  }
  if (value.length > input.warningAt) {
    return {
      severity: "warning",
      code: `${input.code}_dense`,
      format: input.format,
      chapterId: input.chapterId,
      region: input.region,
      message: `${input.label} liegt nahe am konservativen ${input.format}-Textbudget (${value.length}/${input.blockerAt}). Im Preview besonders auf Umbruch und Lesedauer prüfen.`,
    };
  }
  return null;
}

function structuralIssue(input: {
  layout: HomepageFilmLayoutContract;
  format: VoxyVideoFormat;
  region: VoxyStudioLayoutSafetyIssue["region"];
  rect: HomepageFilmRect;
}): VoxyStudioLayoutSafetyIssue | null {
  if (homepageFilmRectInsideSafeArea(input.rect, input.layout)) return null;
  return {
    severity: "blocker",
    code: `semantic_region_outside_safe_area:${input.region}`,
    format: input.format,
    chapterId: null,
    region: input.region,
    message: `Die kanonische ${input.region}-Region liegt in ${input.format} außerhalb der definierten Safe Area. Renderfreigabe bleibt fail-closed.`,
  };
}

export function evaluateVoxyStudioLayoutSafety(input: {
  draft: Pick<VoxyStudioDraft, "storyPlan" | "safeZoneProfile">;
  format: VoxyVideoFormat;
}): VoxyStudioLayoutSafetyResult {
  const layout = layoutFor(input.format);
  const issues: VoxyStudioLayoutSafetyIssue[] = [];

  for (const [region, rect] of [
    ["brand", layout.regions.brand],
    ["evidence", layout.regions.evidence],
    ["navigation", layout.regions.navigation],
    ["caption", layout.regions.caption],
  ] as const) {
    const issue = structuralIssue({ layout, format: input.format, region, rect });
    if (issue) issues.push(issue);
  }

  const titleBudget = textCapacity({
    rect: layout.regions.brand,
    fontPx: layout.typography.descriptorPx,
    lines: 2,
  });
  const titleIssue = evaluateCopy({
    value: input.draft.storyPlan.title,
    warningAt: Math.floor(titleBudget * 0.78),
    blockerAt: titleBudget,
    format: input.format,
    chapterId: null,
    region: "brand",
    code: "story_title",
    label: "Story-Titel",
  });
  if (titleIssue) issues.push(titleIssue);

  const headlineBudget = textCapacity({
    rect: layout.regions.brand,
    fontPx: layout.typography.brandPx,
    lines: 2,
  });
  const captionBudget = textCapacity({
    rect: layout.regions.caption,
    fontPx: layout.typography.captionPx,
    lines: 3,
  });
  for (const chapter of input.draft.storyPlan.chapters) {
    const headlineIssue = evaluateCopy({
      value: chapter.headline,
      warningAt: Math.floor(headlineBudget * 0.78),
      blockerAt: headlineBudget,
      format: input.format,
      chapterId: chapter.chapterId,
      region: "brand",
      code: "chapter_headline",
      label: `Headline „${chapter.headline.slice(0, 48)}${chapter.headline.length > 48 ? "…" : ""}“`,
    });
    if (headlineIssue) issues.push(headlineIssue);

    const narrationIssue = evaluateCopy({
      value: chapter.narration,
      warningAt: Math.floor(captionBudget * 0.78),
      blockerAt: captionBudget,
      format: input.format,
      chapterId: chapter.chapterId,
      region: "caption",
      code: "chapter_narration",
      label: `Narration in Kapitel ${chapter.chapterId}`,
    });
    if (narrationIssue) issues.push(narrationIssue);
  }

  const warnings = issues.filter((issue) => issue.severity === "warning");
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  return {
    format: input.format,
    layoutProfile: FORMAT_LAYOUT[input.format],
    safeZoneProfile: input.draft.safeZoneProfile,
    conservativePlatformPreset: layout.conservativePlatformPreset,
    output: { width: layout.output.width, height: layout.output.height },
    safeArea: { ...layout.safeArea },
    semanticRegionsInsideSafeArea: !blockers.some((issue) =>
      issue.code.startsWith("semantic_region_outside_safe_area:"),
    ),
    warnings,
    blockers,
    approvalEligible: blockers.length === 0,
  };
}

export function evaluateVoxyStudioAllFormatLayoutSafety(
  draft: Pick<VoxyStudioDraft, "storyPlan" | "safeZoneProfile">,
): Record<VoxyVideoFormat, VoxyStudioLayoutSafetyResult> {
  return {
    "16:9": evaluateVoxyStudioLayoutSafety({ draft, format: "16:9" }),
    "9:16": evaluateVoxyStudioLayoutSafety({ draft, format: "9:16" }),
    "1:1": evaluateVoxyStudioLayoutSafety({ draft, format: "1:1" }),
  };
}

export function assertVoxyStudioSelectedFormatLayoutSafety(
  draft: Pick<VoxyStudioDraft, "storyPlan" | "safeZoneProfile" | "selectedFormat">,
): VoxyStudioLayoutSafetyResult {
  const result = evaluateVoxyStudioLayoutSafety({ draft, format: draft.selectedFormat });
  if (!result.approvalEligible) {
    throw new Error(
      `voxy_studio_layout_approval_blocked:${result.blockers.map((item) => item.code).join(",")}`,
    );
  }
  return result;
}
