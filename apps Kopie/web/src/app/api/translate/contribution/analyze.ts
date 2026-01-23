// apps/web/src/app/api/translate/contribution/analyze.ts

export type ContributionAnalyzeInput = {
  text: string;
  userProfile?: {
    region?: string;
    interests?: string[];
    roles?: string[];
  };
  context?: {
    region?: string;
    topics?: string[];
  };
  statements?: string[];
  suggestions?: string[];
  isNewContext?: boolean;
};

export type ContributionAnalyzeResult = {
  language: string;
  detectedTopics: string[];
  keyPhrases: string[];
  summary?: string;
};

export async function analyzeContribution(
  input: ContributionAnalyzeInput,
): Promise<ContributionAnalyzeResult> {
  // TODO: echte Analyse-Logik integrieren (LLM, NER, Topic-Model, etc.)
  const fallbackLang = "de";
  return {
    language: fallbackLang,
    detectedTopics: input.context?.topics ?? [],
    keyPhrases: (input.text || "").split(/\s+/).slice(0, 5),
    summary: input.text?.slice(0, 160),
  };
}
