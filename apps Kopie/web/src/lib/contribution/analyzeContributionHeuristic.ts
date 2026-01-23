// apps/web/src/lib/contribution/analyzeContributionHeuristic.ts
import type { ContributionAnalysisRequest } from "@/types/contribution";
import type { TopicScore, AnalyzedStatement } from "@/types/contribution";

function scoreTopics(text: string): TopicScore[] {
  const scores: TopicScore[] = [];
  for (const [name, regs] of Object.entries(TOPIC_KEYWORDS)) {
    let hits = 0;
    for (const r of regs) if ((r as RegExp)?.test?.(text)) hits++;
    if (hits > 0)
      scores.push({ name, confidence: Math.min(1, 0.4 + hits * 0.2) });
  }
  return scores.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
function guessType(s: string): "ja/nein" | "skala" | "frei" {
  if (/soll(te|ten)?|muss|dürfen|verboten|erlaubt/i.test(s)) return "ja/nein";
  if (/\d+\s*\/\s*\d+|skala|bewerte|1-10/i.test(s)) return "skala";
  return "frei";
}
function pickPolarity(s: string): "niedrig" | "mittel" | "hoch" {
  if (/(dringend|sofort|unbedingt|katastrophe)/i.test(s)) return "hoch";
  if (/(sollte|könnte|wünschenswert)/i.test(s)) return "mittel";
  return "niedrig";
}

export async function analyzeContributionHeuristic(
  req: ContributionAnalysisRequest,
) {
  const text = req.text.trim();
  const topics = scoreTopics(text);
  const statements: AnalyzedStatement[] = [
    { text, type: guessType(text), polarity: pickPolarity(text) },
  ];
  const suggestions: string[] = [];
  if (statements[0].type === "ja/nein")
    suggestions.push("Du könntest daraus eine Swipe-Frage machen.");
  if (topics.some((t) => /Infrastruktur/i.test(t.name)))
    suggestions.push(
      "Das Thema könnte mit bestehenden Berichten zu Mobilität verknüpft werden.",
    );
  const region = req.region ?? req.userProfile?.region ?? null;
  const isNewContext = true;
  return { region, topics, statements, suggestions, isNewContext };
}
