import crypto from "node:crypto";
import { NextRequest } from "next/server";
import type {
  FeedBatchItem,
  StatementCandidate,
} from "@/features/feeds/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

type FeedBatchBody = {
  items: FeedBatchItem[];
};

function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

function hashForItem(item: FeedBatchItem): string {
  const canonical = [
    item.url?.trim() ?? "",
    item.title?.trim() ?? "",
    item.publishedAt?.trim() ?? "",
  ].join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: FeedBatchBody | null = null;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  if (!body || !Array.isArray(body.items)) {
    return fail("Body muss { items: FeedBatchItem[] } enthalten", 400);
  }

  const seenHashes = new Set<string>();
  const candidates: StatementCandidate[] = [];

  for (const item of body.items) {
    if (!item || typeof item.url !== "string" || !item.url.trim()) {
      continue;
    }
    const canonicalHash = hashForItem(item);
    const deduped = seenHashes.has(canonicalHash);
    if (!deduped) {
      seenHashes.add(canonicalHash);
    }

    candidates.push({
      id: crypto.randomUUID(),
      sourceUrl: item.url.trim(),
      title: item.title?.trim(),
      summary: item.summary?.trim(),
      content: item.content,
      publishedAt: item.publishedAt,
      canonicalHash,
      deduped,
      createdAt: new Date().toISOString(),
      topic: item.topicHint,
    });

    // TODO: analyzeContribution({ text }) aufrufen, sobald wir Claims erzeugen wollen.
  }

  return new Response(
    JSON.stringify({
      ok: true,
      results: candidates,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
}
