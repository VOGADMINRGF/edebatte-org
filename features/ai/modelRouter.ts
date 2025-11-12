// features/ai/modelRouter.ts
export type TaskKind = "atomicize" | "frame" | "clarify" | "rewrite" | "batch";

const env = (k: string, d = "") => (process.env[k]?.trim() || d);

export const MODELS = {
  FAST:   env("FAST_MODEL", "gpt-4o-mini"),   // billig + robustes JSON
  REASON: env("REASON_MODEL", "gpt-5-thinking"), // hochwertiges Umformulieren/Begründen
  BULK:   env("BULK_MODEL", env("FAST_MODEL", "gpt-4o-mini")), // Batch/Feeds
};

export function chooseModel(task: TaskKind): string {
  switch (task) {
    case "atomicize":
    case "frame":
      return MODELS.FAST;
    case "clarify":
    case "rewrite":
      return MODELS.REASON;
    case "batch":
      return MODELS.BULK;
    default:
      return MODELS.FAST;
  }
}
