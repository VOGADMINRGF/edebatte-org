// features/ai/providers/openai.ts
import { withMetrics } from "../orchestrator";
import { ANALYZE_JSON_SCHEMA } from "@features/analyze/schemas";

// ——— Low-level Responses API ———
const API_BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
  /\/+$/,
  ""
);

// Standard-Modell; kannst du per ENV überschreiben (z.B. gpt-4.1, gpt-4.1-mini, gpt-5 usw.)
const MODEL = process.env.OPENAI_MODEL || "gpt-5";

export type AskArgs = {
  prompt: string;
  asJson?: boolean;
  model?: string;
  maxOutputTokens?: number;
  max_tokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  forceJsonFormat?: boolean;
};

export type AskResult = {
  text: string;
  raw: any;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  formatUsed?: "json_schema" | "json_object";
  didFallback?: boolean;
  openaiErrorCode?: string | null;
  openaiErrorMessage?: string | null;
};

function withJsonInstruction(s: string) {
  return `${s}\n\nReturn ONLY valid JSON (RFC8259). No preamble, no Markdown, no code fences.`;
}

const envTextFormat = (process.env.OPENAI_TEXT_FORMAT ?? "").toLowerCase();
const DEFAULT_TEXT_FORMAT: "json_schema" | "json_object" =
  envTextFormat === "json_object" ? "json_object" : "json_schema";

const fallbackTextFormat = (format: "json_schema" | "json_object") =>
  format === "json_schema" ? "json_object" : "json_schema";

async function post(body: any, signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const bodyText = await res.text();
  const data = (() => {
    try {
      return JSON.parse(bodyText);
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const msg = data?.error?.message || bodyText || `status ${res.status}`;
    const err: any = new Error(`OpenAI error ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = data;
    const meta = data?.error ?? {};
    err.meta = {
      code: meta.code,
      type: meta.type,
      param: meta.param,
      messageShort: typeof meta.message === "string" ? meta.message.slice(0, 200) : undefined,
    };
    throw err;
  }
  return data ?? {};
}

function extractText(data: any): string {
  const outputs = Array.isArray(data?.output) ? data.output : [];

  const pickText = (entry: any): string | null => {
    if (!entry) return null;
    const t = entry?.text;
    if (typeof t === "string") return t;
    if (t && typeof t === "object" && typeof t.value === "string") return t.value;
    return null;
  };

  const safeType = (value: any): string => {
    if (typeof value === "string") return value.slice(0, 40);
    if (value === null || value === undefined) return String(value);
    return typeof value;
  };

  const checkContent = (content: any[]): string | null => {
    const message = content.find(
      (c: any) =>
        (c?.type === "output_text" || c?.type === "text") &&
        pickText(c),
    );
    const normalized = message ? pickText(message) : null;
    if (normalized) return stripFences(String(normalized).trim());

    const textParts = content
      .map((c: any) => pickText(c))
      .filter((t: string | null): t is string => Boolean(t));
    return textParts.length ? stripFences(textParts.join("")) : null;
  };

  const messageItems = outputs.filter((item: any) => item?.type === "message");
  for (const item of messageItems) {
    const content = Array.isArray(item?.content) ? item.content : [];
    const found = checkContent(content);
    if (found) return found;
  }

  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : [];
    const found = checkContent(content);
    if (found) return found;
  }

  const outputItemTypes = outputs.map((o: any) => safeType(o?.type ?? typeof o));
  const contentTypes = outputs.map((o: any) => {
    const content = Array.isArray(o?.content) ? o.content : [];
    return content
      .slice(0, 6)
      .map((c: any) => safeType(c?.type ?? (pickText(c) ? "text" : typeof c)));
  });
  const fingerprint = `types=${outputItemTypes.join("|") || "none"} content=${contentTypes
    .map((c: string[]) => (c.length ? c.join(",") : "none"))
    .slice(0, 5)
    .join(" ; ")}`;

  const err: any = new Error("OPENAI_EMPTY_OUTPUT");
  err.status = 500;
  err.errorKind = "INTERNAL";
  err.meta = { fingerprint, outputItemTypes, contentTypes };
  throw err;
}

function stripFences(text: string): string {
  let cleaned = text?.trim?.() ?? "";
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) cleaned = cleaned.slice(firstNewline + 1);
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence !== -1) cleaned = cleaned.slice(0, lastFence);
    cleaned = cleaned.trim();
  }
  return cleaned;
}

async function askOpenAI({
  prompt,
  asJson = false,
  model,
  maxOutputTokens = 1400,
  max_tokens,
  timeoutMs,
  signal,
  forceJsonFormat = false,
}: AskArgs): Promise<AskResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY fehlt");

  const resolvedModel = model ?? MODEL;
  const resolvedMaxTokens = max_tokens ?? maxOutputTokens;
  const timeoutController = timeoutMs ? new AbortController() : null;
  const onAbort = () => timeoutController?.abort();
  if (timeoutController) {
    if (signal?.aborted) {
      timeoutController.abort();
    } else if (signal) {
      signal.addEventListener("abort", onAbort);
    }
  }
  const timeout = timeoutController
    ? setTimeout(() => timeoutController.abort(), timeoutMs)
    : null;
  const requestSignal = timeoutController ? timeoutController.signal : signal;

  const safePrompt = prompt ?? "";
  const systemText = "";
  const userText = asJson ? withJsonInstruction(safePrompt) : safePrompt;
  const mergedInput = [
    { role: "system", content: systemText },
    { role: "user", content: userText },
  ];

  const buildBody = (format: "json_schema" | "json_object") => ({
    model: resolvedModel,
    input: mergedInput,
    max_output_tokens: resolvedMaxTokens,
    text:
      asJson || forceJsonFormat
        ? {
            format:
              format === "json_schema"
                ? {
                    type: "json_schema",
                    name: "contribution_analyze",
                    schema: ANALYZE_JSON_SCHEMA.schema,
                    strict: true,
                  }
                : { type: "json_object" },
          }
        : undefined,
  });

  try {
    if (!asJson && !forceJsonFormat) {
      const data = await post(buildBody("json_object"), requestSignal);
      return {
        text: extractText(data),
        raw: data,
        model: data?.model ?? resolvedModel,
        tokensIn: data?.usage?.input_tokens,
        tokensOut: data?.usage?.output_tokens,
      };
    }

    const execute = async (format: "json_schema" | "json_object") => {
      const data = await post(buildBody(format), requestSignal);
      const text = extractText(data);
      return { data, text };
    };

    let attemptFormat: "json_schema" | "json_object" = DEFAULT_TEXT_FORMAT;
    let didFallback = false;
    let fallbackMeta: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { data, text } = await execute(attemptFormat);
        return {
          text,
          raw: data,
          model: data?.model ?? resolvedModel,
          tokensIn: data?.usage?.input_tokens,
          tokensOut: data?.usage?.output_tokens,
          formatUsed: attemptFormat,
          didFallback,
          openaiErrorCode: fallbackMeta?.code ?? null,
          openaiErrorMessage: fallbackMeta?.message ?? null,
        };
      } catch (err: any) {
        const isSchemaIssue =
          err?.status === 400 &&
          ((typeof err?.meta?.param === "string" && err.meta.param.includes("text.format")) ||
            /text\.format|json_schema|response_format|json_object not supported|input/i.test(
              String(err?.message ?? ""),
            )) ||
          err?.status === 422;
        const needsFallback =
          !didFallback &&
          attemptFormat === "json_schema" &&
          (isSchemaIssue || err?.message === "OPENAI_EMPTY_OUTPUT");
        if (needsFallback) {
          didFallback = true;
          fallbackMeta = {
            code: err?.meta?.code ?? null,
            message: err?.meta?.messageShort ?? String(err?.message ?? ""),
          };
          attemptFormat = fallbackTextFormat(attemptFormat);
          continue;
        }
        throw err;
      }
    }

    throw new Error("OpenAI call konnte nicht abgeschlossen werden");
  } finally {
    if (timeout) clearTimeout(timeout);
    if (timeoutController && signal) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}

// ——— Instrumentierte Exporte ———

// JSON-OK-Heuristik: wenn asJson angefragt war, muss parsebar sein; sonst akzeptieren wir Text
function jsonOkFrom(result: AskResult) {
  const t = result?.text ?? "";
  if (!t) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

export const callOpenAI = withMetrics<
  Parameters<typeof askOpenAI>,
  AskResult
>(
  "openai",
  askOpenAI as any,
  {
    jsonOk: (r) => jsonOkFrom(r),
  }
);

export async function callOpenAIJson(prompt: string) {
  const { text } = await callOpenAI({ prompt, asJson: true });
  return { text };
}

export default callOpenAI;
