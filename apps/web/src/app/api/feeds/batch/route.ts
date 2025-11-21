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
  findCandidateByHash,
  insertStatementCandidate,
  saveFeedItemRaw,
} from "@features/feeds/storage";
import { normalizeRegionCode } from "@core/regions/types";

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
  const candidates: StatementCandidate[] = [];

  for (const item of body.items) {
    if (!item || typeof item.url !== "string" || !item.url.trim()) continue;

    const normalizedItem = applyFeedDefaults(item);
    const canonicalHash = buildCanonicalHash(normalizedItem);
    if (seenHashes.has(canonicalHash)) continue;
    seenHashes.add(canonicalHash);

    await saveFeedItemRaw({ ...normalizedItem, canonicalHash }).catch(() => {
      /* optional collection – ignore errors */
    });

    const exists = await findCandidateByHash(canonicalHash);
    if (exists) continue;

    const candidate = buildStatementCandidate(normalizedItem, canonicalHash);

    try {
      await insertStatementCandidate(candidate);
      candidates.push(candidate);
    } catch (error: any) {
      if (error?.code === 11000) continue;
      throw error;
    }
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
