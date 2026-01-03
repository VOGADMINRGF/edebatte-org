// features/analyze/llmJson.ts
// Helper to robustly extract and parse JSON candidates from LLM output
import type { ZodType } from "zod";

export function extractJsonCandidate(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  let t = text.trim();

  // Remove surrounding backticks if the whole string is enclosed
  if (t.startsWith("`") && t.endsWith("`")) {
    t = t.slice(1, -1).trim();
  }

  // Code fences (prefer ```json ...``` over generic ```)
  const fenceJson = t.match(/```json([\s\S]*?)```/i);
  if (fenceJson && fenceJson[1]) {
    return fenceJson[1].trim();
  }
  const fenceAny = t.match(/```([\s\S]*?)```/);
  if (fenceAny && fenceAny[1]) {
    return fenceAny[1].trim();
  }

  const balanced = extractBalancedJson(t);
  if (balanced) return balanced;

  // Fallback: try to find the widest JSON object/array
  const firstBrace = t.indexOf("{");
  const lastBrace = t.lastIndexOf("}");
  const firstBracket = t.indexOf("[");
  const lastBracket = t.lastIndexOf("]");

  let candidate: string | null = null;
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidate = t.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    candidate = t.slice(firstBracket, lastBracket + 1);
  }

  return candidate?.replace(/^\uFEFF/, "").trim() || null;
}

function extractBalancedJson(text: string): string | null {
  let inString = false;
  let escape = false;

  const scanBalanced = (
    startIndex: number,
    openChar: "{" | "[",
    closeChar: "}" | "]",
  ): string | null => {
    let depth = 0;
    let localInString = inString;
    let localEscape = escape;

    for (let i = startIndex; i < text.length; i += 1) {
      const ch = text[i];
      if (localEscape) {
        localEscape = false;
        continue;
      }
      if (ch === "\\" && localInString) {
        localEscape = true;
        continue;
      }
      if (ch === "\"") {
        localInString = !localInString;
        continue;
      }
      if (localInString) continue;
      if (ch === openChar) depth += 1;
      if (ch === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return text.slice(startIndex, i + 1).trim();
        }
      }
    }
    return null;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") {
      const closeChar = ch === "{" ? "}" : "]";
      const candidate = scanBalanced(i, ch, closeChar);
      if (candidate) return candidate;
    }
  }

  return null;
}

function tryParse(text: string): { ok: true; value: any } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function extractBalancedCandidates(text: string): string[] {
  const out: string[] = [];

  const scanBalanced = (start: number, openChar: "{" | "[", closeChar: "}" | "]") => {
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (inString && ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === openChar) depth += 1;
      if (ch === closeChar) {
        depth -= 1;
        if (depth === 0) {
          out.push(text.slice(start, i + 1).trim());
          return;
        }
      }
    }
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{" || ch === "[") {
      scanBalanced(i, ch, ch === "{" ? "}" : "]");
    }
  }

  return out;
}

export function parseJsonLoose<T>(
  rawText: string,
  schema: ZodType<T>,
): { ok: true; value: T } | { ok: false; error: "BAD_JSON" } {
  const candidates = extractBalancedCandidates(rawText);

  for (const c of candidates) {
    const parsed = tryParse(c);
    if (!parsed.ok) continue;

    const validated = schema.safeParse(parsed.value);
    if (validated.success) return { ok: true, value: validated.data };
  }

  return { ok: false, error: "BAD_JSON" };
}
