import {
  MATERIAL_ANALYSIS_MAX_CHUNKS,
  MATERIAL_ANALYSIS_UNIT_CHARS,
  generateMaterialStructuredDrafts,
  type MaterialStructuredDraftResult,
} from "./materialStructuredDrafts";
import type { MaterialGraphFirstContext } from "./materialGraphFirstContext";
import { segmentMaterialTextSemantically } from "./materialSemanticSegmentation";

function unique(values: string[], max: number) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    const key = normalized.toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
    if (output.length >= max) break;
  }
  return output;
}

function blockedResult(input: {
  text: string;
  segmentCount: number;
  error: string;
  approved: boolean;
}): MaterialStructuredDraftResult {
  return {
    provider: "none",
    status: "blocked",
    themes: [],
    decisionPoints: [],
    questions: [],
    options: [],
    questionGuardReviews: [],
    claimsOrSourceHints: [],
    uncertainties: [],
    provenance: [],
    analysisUsage: {
      characterCount: input.text.length,
      chunkCount: input.segmentCount,
      unitSizeChars: MATERIAL_ANALYSIS_UNIT_CHARS,
      estimatedAnalysisUnits: input.segmentCount,
      requiresVolumeApproval: input.segmentCount > 1,
      approved: input.approved,
    },
    reviewRequired: true,
    draftOnly: true,
    publicOutputAllowed: false,
    noAutoPublish: true,
    noAutoCreateRound: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    error: input.error,
  };
}

export async function generateSemanticallySegmentedMaterialDrafts(input: {
  text: string | null;
  graph: MaterialGraphFirstContext;
  approveCost?: boolean;
}): Promise<MaterialStructuredDraftResult> {
  const text = String(input.text ?? "").trim();
  if (!text) return generateMaterialStructuredDrafts(input);

  const segments = segmentMaterialTextSemantically(text, MATERIAL_ANALYSIS_UNIT_CHARS);
  if (segments.length <= 1) return generateMaterialStructuredDrafts(input);
  if (segments.length > MATERIAL_ANALYSIS_MAX_CHUNKS) {
    return blockedResult({
      text,
      segmentCount: segments.length,
      error: "material_analysis_volume_too_large",
      approved: input.approveCost === true,
    });
  }
  if (input.approveCost !== true) {
    return blockedResult({
      text,
      segmentCount: segments.length,
      error: "material_analysis_volume_approval_required",
      approved: false,
    });
  }

  const results: MaterialStructuredDraftResult[] = [];
  for (const segment of segments) {
    const result = await generateMaterialStructuredDrafts({
      text: segment.text,
      graph: input.graph,
      approveCost: true,
    });
    if (result.status !== "generated") return result;
    results.push(result);
  }

  const providers = new Set(results.map((result) => result.provider).filter((provider) => provider !== "none"));
  const questions: MaterialStructuredDraftResult["questions"] = [];
  const options: MaterialStructuredDraftResult["options"] = [];

  results.forEach((result, segmentIndex) => {
    const idMap = new Map<string, string>();
    for (const question of result.questions) {
      const id = `q-s${segmentIndex + 1}-${question.id.replace(/^q-(?:c\d+-)?/, "")}`.slice(0, 52);
      idMap.set(question.id, id);
      questions.push({ ...question, id });
    }
    for (const option of result.options) {
      const questionRef = idMap.get(option.questionRef);
      if (questionRef) options.push({ ...option, questionRef });
    }
  });

  return {
    provider:
      providers.size > 1
        ? "mixed"
        : providers.has("mistral")
          ? "mistral"
          : providers.has("anthropic")
            ? "anthropic"
            : "none",
    status: "generated",
    themes: unique(results.flatMap((result) => result.themes), 64),
    decisionPoints: unique(results.flatMap((result) => result.decisionPoints), 120),
    questions: questions.slice(0, 240),
    options: options.slice(0, 720),
    questionGuardReviews: results
      .flatMap((result) => result.questionGuardReviews)
      .slice(0, 240),
    claimsOrSourceHints: results.flatMap((result) => result.claimsOrSourceHints).slice(0, 240),
    uncertainties: unique(results.flatMap((result) => result.uncertainties), 120),
    provenance: unique(
      [
        "semantic_material_segmentation",
        ...results.flatMap((result) => result.provenance),
        ...segments.flatMap((segment) =>
          segment.heading ? [`semantic_heading:${segment.heading.slice(0, 120)}`] : [],
        ),
      ],
      240,
    ),
    analysisUsage: {
      characterCount: text.length,
      chunkCount: segments.length,
      unitSizeChars: MATERIAL_ANALYSIS_UNIT_CHARS,
      estimatedAnalysisUnits: segments.length,
      requiresVolumeApproval: segments.length > 1,
      approved: true,
    },
    reviewRequired: true,
    draftOnly: true,
    publicOutputAllowed: false,
    noAutoPublish: true,
    noAutoCreateRound: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    error: null,
  };
}
