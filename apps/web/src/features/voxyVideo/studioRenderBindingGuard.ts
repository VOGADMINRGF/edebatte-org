import {
  validateVoxyLocalCompositionOutput,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionOutput,
} from "./localCompositionRuntime";

export function validateVoxyStudioEditorialRenderCandidate(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): string[] {
  const errors: string[] = [];
  if (input.job.renderProfile !== "editorial_v1") {
    errors.push("studio_render_requires_editorial_v1_job");
  }
  if (input.output.renderProfile !== "editorial_v1") {
    errors.push("studio_render_requires_editorial_v1_output");
  }
  for (const error of validateVoxyLocalCompositionOutput(input)) {
    errors.push(`studio_render_output_invalid:${error}`);
  }
  return Array.from(new Set(errors));
}

export function assertVoxyStudioEditorialRenderCandidate(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): void {
  const errors = validateVoxyStudioEditorialRenderCandidate(input);
  if (errors.length) {
    throw new Error(`voxy_studio_editorial_render_candidate_invalid:${errors.join(",")}`);
  }
}
