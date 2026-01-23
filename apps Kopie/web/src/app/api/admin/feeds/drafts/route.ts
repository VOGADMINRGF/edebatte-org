import { NextRequest, NextResponse } from "next/server";
import { voteDraftsCol } from "@features/feeds/db";
import type { VoteDraftDoc } from "@features/feeds/types";
import { getRegionName } from "@core/regions/regionTranslations";
import { formatObjectId } from "../utils";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const params = req.nextUrl.searchParams;
  const status = (params.get("status") || "all").toLowerCase();
  const regionCode = (params.get("regionCode") || "all").toUpperCase();
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(params.get("pageSize") ?? 20)));
  const skip = (page - 1) * pageSize;

  const filter: Record<string, any> = {};
  if (status !== "all") {
    filter.status = status;
  }
  if (regionCode !== "ALL") {
    if (regionCode === "GLOBAL") {
      filter.$or = [
        { regionCode: { $exists: false } },
        { regionCode: null },
        { regionCode: "" },
      ];
    } else {
      filter.regionCode = regionCode;
    }
  }

  const drafts = await voteDraftsCol();
  const [items, total] = await Promise.all([
    drafts.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
    drafts.countDocuments(filter),
  ]);

  const summaries = await Promise.all(
    items.map(async (draft) => ({
      id: formatObjectId(draft._id),
      title: draft.title,
      status: draft.status,
      regionCode: draft.regionCode ?? null,
      regionName: await resolveRegionName(draft.regionCode),
      sourceUrl: draft.sourceUrl ?? null,
      pipeline: draft.pipeline ?? "feeds_to_statementCandidate",
      createdAt: draft.createdAt?.toISOString?.() ?? null,
      analyzeCompletedAt: draft.analyzeCompletedAt?.toISOString?.() ?? null,
    })),
  );

  return NextResponse.json({
    ok: true,
    items: summaries,
    page,
    pageSize,
    total,
  });
}

async function resolveRegionName(regionCode?: VoteDraftDoc["regionCode"]) {
  if (!regionCode) return "Global / Offen";
  try {
    const name = await getRegionName(regionCode, "de");
    return name ?? String(regionCode);
  } catch {
    return String(regionCode);
  }
}
