#!/usr/bin/env tsx

const BASE =
  process.env.SMOKE_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  "http://localhost:3000";

const samples = [
  "Tempo 30 vor Schulen, mehr Zebrastreifen und sichere Radwege im Bezirk.",
  "Soll die Stadtverwaltung mehr Geld für Photovoltaik auf öffentlichen Gebäuden bereitstellen?",
  "Wie gehen wir mit einer befristeten Bürger:innenkarte für den Nahverkehr um?",
];

const forbidden = [/VoiceOpenGov/i, /vote\s+(yes|no)/i, /du solltest/i, /stimme\s+(dafür|dagegen)/i];

type AnalyzeResponse = {
  ok: boolean;
  result?: {
    claims?: Array<{ text?: string }>;
    questions?: Array<{ text?: string; dimension?: string }>;
    notes?: Array<{ text?: string }>;
  };
  errorCode?: string;
  message?: string;
};

async function run() {
  let failures = 0;
  for (const text of samples) {
    const res = await fetch(`${BASE}/api/contributions/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data: AnalyzeResponse = await res.json();
    if (!res.ok || !data.ok || !data.result) {
      console.error(`[smoke] analyze failed for sample "${text.slice(0, 32)}..."`, data);
      failures++;
      continue;
    }
    const resultText = JSON.stringify(data.result);
    if (forbidden.some((re) => re.test(resultText))) {
      console.error("[smoke] forbidden brand or vote language detected", { text });
      failures++;
    }
    const claimsOk = Array.isArray(data.result.claims) && data.result.claims.length >= 1;
    const questionsOk =
      Array.isArray(data.result.questions) &&
      data.result.questions.some((q) => q && q.text && q.dimension);
    if (!claimsOk || !questionsOk) {
      console.error("[smoke] structure check failed", {
        text,
        claims: data.result.claims?.length,
        questions: data.result.questions,
      });
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`[smoke] assistant checks failed: ${failures} issue(s)`);
    process.exit(1);
  }

  console.log("[smoke] assistant checks passed");
}

run().catch((err) => {
  console.error("[smoke] unexpected error", err);
  process.exit(1);
});
