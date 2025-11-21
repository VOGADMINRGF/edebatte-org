"use server";

import { NextRequest, NextResponse } from "next/server";
import { findEvidenceClaims } from "@core/evidence/query";
import { getRegionName } from "@core/regions/regionTranslations";
import { isStaffRequest } from "../../feeds/utils";

export async function GET(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(params.get("pageSize") ?? 20)));
  const offset = (page - 1) * pageSize;

  const filter = {
    regionCode: params.get("regionCode") || undefined,
    locale: params.get("locale") || undefined,
    topicKey: params.get("topicKey") || undefined,
    pipeline: params.get("pipeline") || undefined,
    sourceType: (params.get("sourceType") as any) || undefined,
    textQuery: params.get("q") || undefined,
    limit: pageSize,
    offset,
  };

  const result = await findEvidenceClaims(filter);
  const items = await Promise.all(
    result.items.map(async (entry) => {
      const regionName = entry.claim.regionCode
        ? await getRegionName(entry.claim.regionCode, entry.claim.locale ?? "de")
        : null;
      const latest = entry.latestDecision ?? null;

      return {
        id: entry.claim._id.toHexString(),
        claimText: entry.claim.text,
        regionCode: entry.claim.regionCode ?? null,
        regionName,
        locale: entry.claim.locale,
        topicKey: entry.claim.topicKey ?? null,
        sourceType: entry.claim.sourceType,
        pipeline: entry.claim.meta?.pipeline ?? null,
        createdAt: entry.claim.createdAt?.toISOString?.() ?? null,
        decisionsSummary: {
          total: entry.decisions?.length ?? 0,
          latestOutcome: latest?.outcome ? `${Math.round(latest.outcome.yesShare * 100)}% Ja` : null,
        },
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    items,
    total: result.total,
    page,
    pageSize,
  });
}
