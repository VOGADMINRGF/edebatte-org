export type AnalyzeResult = {
  statements: string[];
  language?: string;
  translations?: Record<string, string>;
  meta?: Record<string, any>;
};

export async function analyzeAndTranslate(input: {
  text: string;
  language?: string;
}): Promise<AnalyzeResult> {
  const text = (input?.text ?? "").trim();
  if (!text)
    return {
      statements: [],
      language: input?.language ?? "de",
      translations: {},
    };
  // naive Split in 1–3 "Statements" – reicht fürs Build & Smoke
  const parts = text
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .slice(0, 3);
  return {
    statements: parts.length ? parts : [text],
    language: input?.language ?? "de",
    translations: {},
  };
}
export default analyzeAndTranslate;
