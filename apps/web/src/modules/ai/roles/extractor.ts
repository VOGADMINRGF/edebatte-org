import { runLLMJson } from "../providers";
import { EXTRACTOR_SYSTEM, EXTRACTOR_USER } from "../prompts/extractor";

export async function extractCandidates(input: string, opts?:{timeoutMs?:number, model?:string}): Promise<string[]>{
  const { data } = await runLLMJson({
    system: EXTRACTOR_SYSTEM,
    user: EXTRACTOR_USER({ input }),
    model: opts?.model ?? "gpt-4o-mini",
    timeoutMs: opts?.timeoutMs ?? 1400,
  });
  return Array.isArray(data) ? (data as string[]).slice(0,8) : [];
}
