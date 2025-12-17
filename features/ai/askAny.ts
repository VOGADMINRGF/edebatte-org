import callOpenAI from "./providers/openai";

type CallOpenAIJsonArgs =
  | string
  | {
      system?: string;
      user: string;
      model?: string;
      timeoutMs?: number;
      max_tokens?: number;
    };

export async function callOpenAIJson(args: CallOpenAIJsonArgs) {
  let prompt = "";
  let model: string | undefined;
  let timeoutMs: number | undefined;
  let max_tokens: number | undefined;

  if (typeof args === "string") {
    prompt = args;
  } else {
    model = args.model;
    timeoutMs = args.timeoutMs;
    max_tokens = args.max_tokens;
    const parts: string[] = [];
    if (args.system?.trim()) parts.push(args.system.trim());
    if (args.user?.trim()) {
      if (parts.length) parts.push("");
      parts.push(args.user.trim());
    }
    prompt = parts.join("\n");
  }

  const full = `${prompt}\n\nGib NUR gültiges JSON (RFC8259) zurück.`;
  const { text } = await callOpenAI({ prompt: full, asJson: true, model, timeoutMs, max_tokens });
  return { text };
}

// Platzhalter – ARI/YOUCOM
export async function youcomResearch(_args: any) {
  throw new Error("ARI not configured (YOUCOM_ARI_API_KEY missing)");
}
export async function youcomSearch(_args: any) {
  throw new Error("ARI search not configured");
}
export function extractNewsFromSearch(){ return []; }
