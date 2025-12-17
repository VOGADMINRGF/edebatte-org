import type { Provider } from "./types";
import { callOpenAIJson } from "../askAny";
import callOpenAI from "./openai";
import callAnthropic from "./anthropic";
import callMistral from "./mistral";
import callGemini from "./gemini";

type RunLLMJsonArgs = {
  system?: string;
  user: string;
  model?: string;
  timeoutMs?: number;
};

export async function runLLMJson(
  args: RunLLMJsonArgs,
): Promise<{ raw: string; data: any }> {
  const { system = "", user, model, timeoutMs } = args;

  const { text } = await callOpenAIJson({
    system,
    user,
    max_tokens: 800,
    model,
    timeoutMs,
  });

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  return { raw: text, data };
}

export const providers = {
  openai:    { ask: callOpenAI },
  anthropic: { ask: callAnthropic },
  mistral:   { ask: callMistral },
  gemini:    { ask: callGemini },
} as const satisfies Record<string, Provider>;

export type ProviderName = keyof typeof providers;
export const PROVS = providers;
export const providerEntries = Object.entries(providers) as [ProviderName, Provider][];

export { callOpenAIJson, youcomResearch, youcomSearch, extractNewsFromSearch } from "../askAny";
export * from "./types";
