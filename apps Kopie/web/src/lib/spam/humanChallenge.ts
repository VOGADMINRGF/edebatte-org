export type HumanChallenge = {
  id: string;
  prompt: string;
  answers: string[];
  helper?: string;
};

const HUMAN_CHALLENGES: HumanChallenge[] = [
  {
    id: "farbe",
    prompt: "Schreib bitte das Wort \"blau\" in dieses Feld.",
    answers: ["blau"],
  },
];

const HUMAN_CHALLENGE_MAP = new Map(HUMAN_CHALLENGES.map((entry) => [entry.id, entry]));

export function pickHumanChallenge(): HumanChallenge {
  return HUMAN_CHALLENGES[0];
}

function normalizeAnswer(value: unknown) {
  if (typeof value !== "string") return "";
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function verifyHumanChallenge(input: { id?: string; answer?: string }) {
  const question = HUMAN_CHALLENGE_MAP.get(input.id || "");
  if (!question) return { ok: false as const, code: "unknown_question" as const };

  const normalized = normalizeAnswer(input.answer);
  if (!normalized) return { ok: false as const, code: "missing_answer" as const };

  const matches = question.answers.some((candidate) => normalizeAnswer(candidate) === normalized);
  return matches ? { ok: true as const } : { ok: false as const, code: "wrong_answer" as const };
}
