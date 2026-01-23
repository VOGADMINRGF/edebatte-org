import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { voteDraftsCol, statementCandidatesCol, analyzeResultsCol } from "@features/feeds/db";
import { getRegionName } from "@core/regions/regionTranslations";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { id } = await context.params;
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const drafts = await voteDraftsCol();
  const draft = await drafts.findOne({ _id: objectId });
  if (!draft) {
    return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404 });
  }

  const candidates = await statementCandidatesCol();
  const candidate = await candidates.findOne({ _id: draft.statementCandidateId });
  if (!candidate) {
    return NextResponse.json({ ok: false, error: "candidate_not_found" }, { status: 404 });
  }

  const analyzeCol = await analyzeResultsCol();
  const analyzeResult = await analyzeCol.findOne({ _id: draft.analyzeResultId });
  if (!analyzeResult) {
    return NextResponse.json({ ok: false, error: "analyze_result_not_found" }, { status: 404 });
  }

  const regionCode = draft.regionCode ?? candidate.regionCode ?? null;
  const regionName = await resolveRegionName(regionCode ? String(regionCode) : null);

  return NextResponse.json({
    ok: true,
    draft: serializeDraft(draft, regionName),
    candidate: serializeCandidate(candidate),
    analyzeResult: serializeAnalyze(analyzeResult),
  });
}

function serializeDraft(draft: any, regionName: string) {
  return {
    id: draft._id.toHexString(),
    status: draft.status,
    title: draft.title,
    summary: draft.summary,
    claims: draft.claims ?? [],
    pipeline: draft.pipeline ?? "feeds_to_statementCandidate",
    regionCode: draft.regionCode ?? null,
    regionName,
    sourceUrl: draft.sourceUrl ?? null,
    sourceLocale: draft.sourceLocale ?? null,
    createdAt: draft.createdAt?.toISOString?.() ?? null,
    updatedAt: draft.updatedAt?.toISOString?.() ?? null,
    analyzeCompletedAt: draft.analyzeCompletedAt?.toISOString?.() ?? null,
    publishedAt: draft.publishedAt?.toISOString?.() ?? null,
    reviewNote: draft.reviewNote ?? null,
  };
}

function serializeCandidate(candidate: any) {
  return {
    id: candidate._id.toHexString(),
    sourceUrl: candidate.sourceUrl,
    sourceTitle: candidate.sourceTitle,
    sourceSummary: candidate.sourceSummary,
    sourceContent: candidate.sourceContent,
    sourceLocale: candidate.sourceLocale,
    regionCode: candidate.regionCode ?? null,
    topic: candidate.topic ?? null,
    createdAt: candidate.createdAt?.toISOString?.() ?? candidate.createdAt ?? null,
  };
}

function serializeAnalyze(result: any) {
  return {
    id: result._id.toHexString(),
    mode: result.mode,
    language: result.language,
    claims: result.claims ?? [],
    notes: result.notes ?? [],
    questions: result.questions ?? [],
    knots: result.knots ?? [],
  };
}

async function resolveRegionName(regionCode?: string | null) {
  if (!regionCode) return "Global / Offen";
  try {
    const name = await getRegionName(regionCode, "de");
    return name ?? String(regionCode);
  } catch {
    return String(regionCode);
  }
}
