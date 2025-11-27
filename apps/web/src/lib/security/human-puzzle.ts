// E200: Deterministic lightweight math puzzle for HumanCheck.
const DEFAULT_SEED = "vog-human-check";

function deriveHash(seed: string) {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash;
}

export function derivePuzzle(seed: string = DEFAULT_SEED) {
  const hash = deriveHash(seed);
  const first = (hash % 6) + 3; // 3-8
  const second = ((hash >> 3) % 6) + 2; // 2-7
  const expected = first + second;
  return { seed, first, second, expected };
}

export function validatePuzzleAnswer(seed: string, answer: number) {
  const { expected } = derivePuzzle(seed);
  return Number(answer) === expected;
}
