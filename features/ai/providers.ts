// features/ai/providers.ts
import { ask as askOpenAI } from "./providers/openai";
import { ask as askAnthropic } from "./providers/anthropic";
import { ask as askMistral } from "./providers/mistral";
import { ask as askGemini } from "./providers/gemini";

export const providers = {
  openai:    { ask: askOpenAI },
  anthropic: { ask: askAnthropic },
  mistral:   { ask: askMistral },
  gemini:    { ask: askGemini },
} as const;

export type ProviderName = keyof typeof providers;

// Alias für Alt-Code
export const PROVS = providers;
