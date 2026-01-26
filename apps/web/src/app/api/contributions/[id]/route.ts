import { NextRequest, NextResponse } from "next/server";
import { coreCol, ObjectId } from "@core/db/triMongo";

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

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return undefined;
}

function mapContribution(doc: any) {
  const text = doc.text ?? doc.content ?? "";
  const analysis = doc.analysis ?? {};
  return {
    id: String(doc._id),
    text,
    locale: doc.locale ?? doc.userContext?.locale ?? null,
    status: doc.status ?? null,
    reviewStatus: doc.reviewStatus ?? null,
    source: doc.source ?? null,
    attachments: doc.attachments ?? doc.media ?? [],
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
    analysis: {
      topics: Array.isArray(analysis?.topics) ? analysis.topics : [],
      categories: Array.isArray(analysis?.keyPhrases) ? analysis.keyPhrases : [],
      status: analysis?.status ?? null,
      orchestrator: analysis?.orchestrator ?? null,
      lastRunAt: analysis?.lastRunAt ?? null,
      hasRaw: Boolean(analysis?.raw),
    },
  };
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const id = ctx.params.id;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const topics = normalizeStringArray(body?.topics);
  const categories = normalizeStringArray(body?.categories);

  const patch: Record<string, any> = { updatedAt: new Date() };
  if (body?.status !== undefined) patch.status = body.status;
  if (body?.reviewStatus !== undefined) patch.reviewStatus = body.reviewStatus;
  if (body?.analysisStatus !== undefined) patch["analysis.status"] = body.analysisStatus;
  if (topics !== undefined) patch["analysis.topics"] = topics;
  if (categories !== undefined) patch["analysis.keyPhrases"] = categories;

  const col = await coreCol("contributions");
  const res = await col.findOneAndUpdate({ _id: oid }, { $set: patch }, { returnDocument: "after" });
  const updated = (res as any)?.value ?? res;
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: mapContribution(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const id = ctx.params.id;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await coreCol("contributions");
  const res = await col.deleteOne({ _id: oid });
  if (!res.deletedCount) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
