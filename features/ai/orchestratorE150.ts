"use strict";

import { callOpenAIJson } from "@features/ai";

export type E150OrchestratorInput = {
  systemPrompt: string;
  userPrompt: string;
  locale?: string;
  maxClaims?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type E150OrchestratorResult = {
  provider: "openai";
  rawText: string;
  meta: {
    provider: "openai";
    locale: string;
    maxClaims: number;
  };
};

/**
 * Single-provider Orchestrator (OpenAI). Dieser Layer kapselt,
 * wo später weitere Provider (Anthropic/Gemini/…) parallel gewichtet
 * werden können. AnalyzeContribution bekommt ausschließlich raw JSON zurück.
 */
export async function callE150Orchestrator(
  input: E150OrchestratorInput
): Promise<E150OrchestratorResult> {
  const { systemPrompt, userPrompt, locale = "de", maxClaims = 20 } = input;
  const maxTokens = input.maxTokens ?? 1800;

  const { text } = await callOpenAIJson({
    system: systemPrompt,
    user: userPrompt,
    max_tokens: maxTokens,
  });

  return {
    provider: "openai",
    rawText: text,
    meta: {
      provider: "openai",
      locale,
      maxClaims,
    },
  };
}
