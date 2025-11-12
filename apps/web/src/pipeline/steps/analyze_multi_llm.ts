// apps/web/src/app/pipeline/steps/analyze_multi_llm.ts
import { analyzeContribution } from "@core/gpt/analyzeContribution";

type Mode = "impact" | "alternatives" | "factcheck";
type Locale = "de" | "en";

export type StepInput = {
  text: string;
  mode?: Mode;
  locale?: Locale;
};

export type StepOutput =
  | { ok: true; data: Awaited<ReturnType<typeof analyzeContribution>> }
  | { ok: false; error: string };

export default async function runAnalyzeStep(
  input: StepInput
): Promise<StepOutput> {
  try {
    if (!input?.text || typeof input.text !== "string") {
      return { ok: false, error: "bad_request:text" };
    }
    const mode: Mode = input.mode ?? "impact";
    const locale: Locale = input.locale ?? "de";

    const data = await analyzeContribution({
      mode,
      content: input.text,
      locale,
    });

    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}
