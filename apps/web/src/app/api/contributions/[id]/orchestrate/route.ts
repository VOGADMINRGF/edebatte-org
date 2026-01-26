import { NextRequest, NextResponse } from "next/server";
import { coreCol, ObjectId } from "@core/db/triMongo";
import { analyzeContribution } from "@features/analyze/analyzeContribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRITE_TOKEN = process.env.CONTRIB_WRITE_TOKEN ?? process.env.CONTRIB_READ_TOKEN;

function isAuthorized(req: NextRequest) {
  const token =
    req.headers.get("x-write-token") ||
    req.headers.get("x-read-token") ||
    new URL(req.url).searchParams.get("token");
  if (!WRITE_TOKEN) return true;
  return token === WRITE_TOKEN;
}

function collectTopics(result: any) {
  const topics = new Set<string>();
  const categories = new Set<string>();
  const claims = Array.isArray(result?.claims) ? result.claims : [];
  for (const claim of claims) {
    if (typeof claim?.topic === "string" && claim.topic.trim()) {
      topics.add(claim.topic.trim());
    }
    if (typeof claim?.domain === "string" && claim.domain.trim()) {
      categories.add(claim.domain.trim());
    }
    if (Array.isArray(claim?.domains)) {
      for (const entry of claim.domains) {
        if (typeof entry === "string" && entry.trim()) {
          categories.add(entry.trim());
        }
      }
    }
  }
  return { topics: Array.from(topics), categories: Array.from(categories) };
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(ctx.params.id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const storeFull = Boolean(body?.storeFull);
  const applyTopics = body?.applyTopics !== false;
  const maxClaims = typeof body?.maxClaims === "number" ? Math.max(1, Math.min(body.maxClaims, 20)) : undefined;

  const col = await coreCol("contributions");
  const doc = await col.findOne({ _id: oid });
  if (!doc) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const text = String(doc.text ?? doc.content ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "empty_text" }, { status: 400 });
  }

  const locale = String(doc.locale ?? doc.userContext?.locale ?? "de").toLowerCase();
  const result = await analyzeContribution({
    text,
    locale,
    ...(maxClaims ? { maxClaims } : {}),
    pipeline: "admin_orchestrate",
  });

  const now = new Date();
  const { topics, categories } = collectTopics(result);

  const orchestrator = {
    provider: result?._meta?.provider ?? null,
    model: result?._meta?.model ?? null,
    durationMs: result?._meta?.durationMs ?? null,
    tokensInput: result?._meta?.tokensInput ?? null,
    tokensOutput: result?._meta?.tokensOutput ?? null,
    costEur: result?._meta?.costEur ?? null,
    pipeline: result?._meta?.pipeline ?? "admin_orchestrate",
    claimsCount: Array.isArray(result?.claims) ? result.claims.length : 0,
    notesCount: Array.isArray(result?.notes) ? result.notes.length : 0,
    questionsCount: Array.isArray(result?.questions) ? result.questions.length : 0,
    knotsCount: Array.isArray(result?.knots) ? result.knots.length : 0,
  };

  const analysisPatch: Record<string, any> = {
    "analysis.status": "completed",
    "analysis.lastRunAt": now,
    "analysis.orchestrator": orchestrator,
    updatedAt: now,
  };
  if (storeFull) analysisPatch["analysis.raw"] = result;
  if (applyTopics) {
    analysisPatch["analysis.topics"] = topics;
    analysisPatch["analysis.keyPhrases"] = categories;
  }

  await col.updateOne({ _id: oid }, { $set: analysisPatch });

  return NextResponse.json({
    ok: true,
    topics,
    categories,
    meta: orchestrator,
  });
}
