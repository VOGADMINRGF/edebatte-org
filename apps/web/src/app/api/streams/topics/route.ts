export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import { TOPIC_CHOICES } from "@features/interests/topics";

type TopicEntry = { key: string; label: string; source: "system" | "workflow" };

function normalizeTopic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export async function GET() {
  const systemTopics: TopicEntry[] = TOPIC_CHOICES.map((topic) => ({
    key: topic.key,
    label: topic.label,
    source: "system",
  }));

  const col = await coreCol("statements");
  const [categoryTopics, topicTopics] = await Promise.all([
    col.distinct("category", { category: { $ne: null } }),
    col.distinct("topic", { topic: { $ne: null } }),
  ]);
  const normalized = [...categoryTopics, ...topicTopics]
    .map(normalizeTopic)
    .filter((t): t is string => Boolean(t));

  const systemKeys = new Set(systemTopics.map((t) => t.key));
  const workflowTopics: TopicEntry[] = normalized
    .filter((key) => !systemKeys.has(key))
    .map((key) => ({ key, label: key, source: "workflow" }));

  return NextResponse.json({
    ok: true,
    topics: [...systemTopics, ...workflowTopics],
  });
}
