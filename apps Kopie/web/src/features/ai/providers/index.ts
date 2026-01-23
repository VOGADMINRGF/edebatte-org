import { callOpenAIJson } from "@features/ai";

type RunLLMJsonArgs = {
  system?: string;
  user: string;
  model?: string;
  timeoutMs?: number;
};

export async function runLLMJson(
  args: RunLLMJsonArgs
): Promise<{ raw: string; data: any }> {
  const { system = "", user, model, timeoutMs } = args;

  const { text } = await callOpenAIJson({
    system,
    user,
    max_tokens: 800,
    model,
    timeoutMs,
  } as any);

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  return { raw: text, data };
}
