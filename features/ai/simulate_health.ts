// features/ai/simulate_health.ts
import { beforeCall, afterCall, healthScore } from "./orchestrator";

const ids = ["openai", "anthropic", "mistral", "gemini"] as const;

// 200 synthetische Calls je Provider
for (const id of ids) {
  for (let i = 0; i < 200; i++) {
    beforeCall(id);
    // einfache Charakteristik pro Provider (nur fürs Sichtbarmachen)
    const base = id === "openai" ? 600
              : id === "anthropic" ? 800
              : id === "mistral" ? 900
              : 700;
    const ms = Math.max(80, Math.round(base + (Math.random() - 0.5) * 400));
    const ok = Math.random() < (id === "mistral" ? 0.9 : 0.85);
    const jsonOk = ok && Math.random() < 0.95;
    afterCall(id, ms, ok, jsonOk);
  }
}

console.table(
  ids.map((id) => ({ id, score: Number(healthScore(id).toFixed(3)) }))
);
