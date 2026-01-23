export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { FeedItemInput, StatementCandidate } from "@features/feeds/types";
import {
  buildCanonicalHash,
  buildStatementCandidate,
  normalizeLocale,
} from "@features/feeds/utils";
import {
  findCandidateHashes,
  saveFeedItemsRaw,
  upsertStatementCandidates,
} from "@features/feeds/storage";
import { normalizeRegionCode } from "@core/regions/types";
import { requireAdminOrEditor } from "../_auth";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

type FeedBatchBody = {
  items: FeedItemInput[];
};

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: JSON_HEADERS });
}

export async function POST(req: NextRequest): Promise<Response> {
  const gate = await requireAdminOrEditor(req);
  if (gate) return gate;

  let body: FeedBatchBody | null = null;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  if (!body || !Array.isArray(body.items)) {
    return fail("Body muss { items: FeedItemInput[] } enthalten", 400);
  }

  const seenHashes = new Set<string>();
  const normalized: Array<FeedItemInput & { canonicalHash: string }> = [];

  for (const item of body.items) {
    if (!item || typeof item.url !== "string" || !item.url.trim()) continue;

    const normalizedItem = applyFeedDefaults(item);
    const canonicalHash = buildCanonicalHash(normalizedItem);
    if (seenHashes.has(canonicalHash)) continue;
    seenHashes.add(canonicalHash);

    normalized.push({ ...normalizedItem, canonicalHash });
  }

  const existingHashes = await findCandidateHashes(normalized.map((i) => i.canonicalHash));
  const newItems = normalized.filter((i) => !existingHashes.has(i.canonicalHash));
  const candidates: StatementCandidate[] = newItems.map((item) =>
    buildStatementCandidate(item, item.canonicalHash),
  );

  if (newItems.length) {
    await saveFeedItemsRaw(newItems).catch(() => {
      /* optional collection - ignore errors */
    });
    await upsertStatementCandidates(candidates);
  }

  return NextResponse.json({ ok: true, results: candidates }, { headers: JSON_HEADERS });
}

function applyFeedDefaults(item: FeedItemInput & { locale?: string | null }): FeedItemInput {
  const sourceLocale = normalizeLocale(item.sourceLocale ?? item.locale ?? null);
  const regionCode = normalizeRegionCode(item.regionCode ?? item.region ?? null);
  return {
    ...item,
    sourceLocale,
    regionCode,
  };
}
