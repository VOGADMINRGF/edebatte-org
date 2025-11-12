import { healthScore } from "./health";
const ids = ["openai","anthropic","mistral","gemini"] as const;
console.table(ids.map(id => ({ id, score: healthScore(id) })));
