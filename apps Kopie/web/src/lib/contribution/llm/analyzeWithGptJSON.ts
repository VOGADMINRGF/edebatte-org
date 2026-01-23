// apps/web/src/lib/contribution/llm/analyzeWithGptJSON.ts
import { callOpenAI } from "@features/ai/providers/openai";

export async function analyzeWithGptJSON(text: string) {
  const SYSTEM = `Du bist ein präziser Politik/News-Analyst. Antworte NUR mit JSON:
{"topics":[{"topic":string,"score":number}],
 "theses":[{"text":string,"relevance":number,"domain":string}],
 "statements":[{"text":string}],
 "summary":{"topics":number,"theses":number,"avgRelevance":number}}`;

  const USER = `Text:\n---\n${text}\n---`;
  const prompt = `${SYSTEM}\n\n${USER}`;

  const { text: out } = await callOpenAI({ prompt, asJson: true });
  return JSON.parse(out || "{}");
}
