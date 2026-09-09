/**
 * Zentraler Zugriff auf GPT/ARI Provider.
 * Wir nutzen intern die Responses API über den OpenAI-Provider.
 */
import { callOpenAI } from "./providers/openai";

/**
 * Shape, wie `analyzeContribution` aktuell `callOpenAIJson` aufruft:
 *   callOpenAIJson({
 *     system: "...",
 *     user: "...",
 *     model: "gpt-4.1-mini",
 *     temperature: 0.25,
 *     max_tokens: 1800,
 *     response_format: { ...json_schema... }
 *   })
 */
export type JsonCallArgs = {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
  response_format?: any;
  allowJsonFormatFallback?: boolean;
};

export type JsonCallResult = {
  text: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  formatUsed?: "json_schema" | "json_object";
  didFallback?: boolean;
  openaiErrorCode?: string | null;
  openaiErrorMessage?: string | null;
};

function normalizeJsonSchemaConfig(responseFormat: any): { name?: string; schema: any; strict?: boolean } | null {
  if (!responseFormat || typeof responseFormat !== "object") return null;
  if (responseFormat.schema && typeof responseFormat.schema === "object") {
    return {
      name: typeof responseFormat.name === "string" ? responseFormat.name : "response_json",
      schema: responseFormat.schema,
      strict: responseFormat.strict !== false,
    };
  }
  if (
    responseFormat.type === "json_schema" &&
    responseFormat.json_schema &&
    typeof responseFormat.json_schema === "object" &&
    responseFormat.json_schema.schema
  ) {
    return {
      name:
        typeof responseFormat.json_schema.name === "string"
          ? responseFormat.json_schema.name
          : "response_json",
      schema: responseFormat.json_schema.schema,
      strict: responseFormat.json_schema.strict !== false,
    };
  }
  return null;
}

/**
 * Vereinheitlichter JSON-Call:
 *
 * - Variante A (alt): callOpenAIJson("prompt", maxTokens?)
 * - Variante B (E150): callOpenAIJson({ system, user, ... })
 *
 * In beiden Fällen:
 *  -> wir bauen einen Textprompt
 *  -> schicken ihn als JSON-Mode über die Responses API
 *  -> und geben { text } zurück.
 */
export async function callOpenAIJson(
  promptOrArgs: string | JsonCallArgs,
  maxOutputTokens?: number
): Promise<JsonCallResult> {
  // --- Variante A: simpler String-Prompt ---
  if (typeof promptOrArgs === "string") {
    const prompt = promptOrArgs;
    const { text } = await callOpenAI({
      prompt,
      asJson: true,
      maxOutputTokens: maxOutputTokens ?? 1200,
    });
    return { text };
  }

  // --- Variante B: Objekt aus analyzeContribution.ts ---
  const {
    system,
    user,
    model,
    temperature,
    max_tokens,
    timeoutMs,
    response_format,
    allowJsonFormatFallback,
  } = promptOrArgs;
  const parts: string[] = [];

  if (system && system.trim()) {
    parts.push(system.trim());
  }

  if (user && user.trim()) {
    parts.push(
      "",
      "==== Nutzerbeitrag / Aufgabe ====",
      user.trim()
    );
  }

  const combinedPrompt = parts.join("\n");
  const jsonSchema = normalizeJsonSchemaConfig(response_format);
  const forceJsonFormat = Boolean(response_format);

  const result = await callOpenAI({
    prompt: combinedPrompt,
    asJson: true,
    model,
    temperature,
    maxOutputTokens: max_tokens ?? maxOutputTokens ?? 1800,
    timeoutMs,
    forceJsonFormat,
    jsonSchema,
    allowJsonFormatFallback,
  });

  return result;
}

/* ------------------------------------------------------------------ */
/*  ARI / YOU.COM Platzhalter – wie im alten Code                      */
/* ------------------------------------------------------------------ */

export async function youcomResearch(_args: any) {
  throw new Error("ARI not configured (YOUCOM_ARI_API_KEY missing)");
}

export async function youcomSearch(_args: any) {
  throw new Error("ARI search not configured");
}

export function extractNewsFromSearch() {
  return [];
}
