// features/evidence/summariseForEvidence.ts

/**
 * Strips HTML/whitespace and truncates to maxChars characters.
 * Returns a Promise to allow future async/GPT plug-ins without changing call sites.
 */
export async function summariseForEvidence(
  raw: string | null | undefined,
  maxChars = 600,
): Promise<string> {
  if (!raw) return "";
  const stripped = raw
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return "";
  if (stripped.length <= maxChars) return stripped;
  return `${stripped.slice(0, maxChars - 1).trimEnd()}…`;
}
