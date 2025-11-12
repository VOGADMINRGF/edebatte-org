// apps/web/src/pipeline/manifest.ts
import type { StepDefinition } from "./types";
import { preprocess } from "./steps/preprocess";
import { cacheStep } from "./steps/cache";
import { analyzeGpt } from "./steps/analyze_gpt";
import { heuristic } from "./steps/heuristic";
import { confirmStep } from "./steps/confirm";
import { factcheckStub } from "./steps/factcheck_stub";
import { finalizeStep } from "./steps/finalize";

export const allSteps: Record<string, StepDefinition> = {
  preprocess,
  cache: cacheStep,
  gpt: analyzeGpt,
  heuristic,
  confirm: confirmStep,
  factcheck: factcheckStub,
  finalize: finalizeStep,
};

export const defaultOrder = [
  "preprocess",
  "cache",
  "gpt",
  "heuristic",
  "confirm",
  "factcheck",
  "finalize",
];

export const defaultSteps: StepDefinition[] = defaultOrder.map((k) => allSteps[k]);

export function selectStepsFromParam(param?: string | null) {
  if (!param) return defaultSteps;
  const ids = param.split(",").map((s) => s.trim()).filter(Boolean);
  const uniq = Array.from(new Set(ids)).filter((id) => allSteps[id]);
  return uniq.length ? uniq.map((id) => allSteps[id]) : defaultSteps;
}
