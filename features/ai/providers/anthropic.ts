// features/ai/providers/anthropic.ts
import { withMetrics } from "../orchestrator";
import type { AskResult } from "./openai"; // oder eigenes Typenpendant

async function askAnthropic(args: { prompt: string; asJson?: boolean; signal?: AbortSignal }): Promise<AskResult> {
  // ... eure bestehende Implementierung ...
  return { text: "...", raw: {} };
}

function jsonOkFrom(r: AskResult){
  if (!r?.text) return false;
  try { JSON.parse(r.text); return true; } catch { return false; }
}

export const callAnthropic = withMetrics("anthropic", askAnthropic as any, { jsonOk: jsonOkFrom });
export default callAnthropic;
