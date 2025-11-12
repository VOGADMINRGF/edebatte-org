import type { Provider } from "./types";
import { ask as askOpenAI } from "./openai";
import { ask as askAnthropic } from "./anthropic";
import { ask as askMistral } from "./mistral";
import { ask as askGemini } from "./gemini";

export const providers = {
  openai:    { ask: askOpenAI },
  anthropic: { ask: askAnthropic },
  mistral:   { ask: askMistral },
  gemini:    { ask: askGemini },
} as const satisfies Record<string, Provider>;

export type ProviderName = keyof typeof providers;
export const PROVS = providers;
export const providerEntries = Object.entries(providers) as [ProviderName, Provider][];

export { callOpenAIJson, youcomResearch, youcomSearch, extractNewsFromSearch } from "../askAny";
export * from "./types";
