// apps/web/src/lib/contribution/llm/analyzeWithGPT.ts
import { callOpenAI } from "@features/ai/providers/openai";
import { LLMAnalysisZ, type LLMAnalysis } from "@/lib/contribution/schema";

const TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 18000);

function withTimeout<T>(p: Promise<T>, ms: number) {
  let t: NodeJS.Timeout;
  const killer = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  return Promise.race([p, killer]).finally(() => clearTimeout(t!));
}

export async function analyzeWithGPT(input: {
  text: string;
  userRegion?: string;
  userInterests?: string[];
  userRoles?: string[];
}): Promise<LLMAnalysis> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

  // Kurze Instruktion + Schema (DE-Schlüssel)
  const systemHint =
    "Du bist ein präziser Civic-Tech-Analyzer. Antworte NUR mit gültigem JSON (RFC8259) mit deutschen Schlüsseln. " +
    "Schema: { region?: string|null, topics:[{name:string, confidence:number}], " +
    "statements:[{text:string, type:'ja/nein'|'skala'|'frei', polarity:'niedrig'|'mittel'|'hoch'}], " +
    "suggestions:string[], isNewContext:boolean }. " +
    "confidence in 0..1. Keine Erklärungen.";

  const payload = {
    text: input.text,
    userProfile: {
      region: input.userRegion ?? null,
      interests: input.userInterests ?? [],
      roles: input.userRoles ?? [],
    },
  };

  // Responses-API: ein Prompt-String
  const prompt = `${systemHint}\n\nINPUT:\n${JSON.stringify(payload)}`;

  const { text } = await withTimeout(
    callOpenAI({ prompt, asJson: true }),
    TIMEOUT_MS,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text || "{}");
  } catch {
    throw new Error("OpenAI lieferte kein valides JSON.");
  }
  return LLMAnalysisZ.parse(parsed);
}
