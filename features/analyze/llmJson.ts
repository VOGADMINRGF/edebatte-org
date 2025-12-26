// features/analyze/llmJson.ts
// Helper to robustly extract and parse JSON candidates from LLM output

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

export function parseJsonLoose(
  text: string,
): { ok: true; value: unknown; candidate: string } | { ok: false; error: string; candidate?: string } {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return { ok: false, error: "no_candidate" };
  try {
    const value = JSON.parse(candidate);
    return { ok: true, value, candidate };
  } catch (err: any) {
    return { ok: false, error: err?.message || "parse_error", candidate };
  }
}
