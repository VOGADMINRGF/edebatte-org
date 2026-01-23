export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol, evidenceSourcesCol } from "@features/editorial/db";
import { EvidenceSourceCreateSchema } from "@features/editorial/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const itemsCol = await editorialItemsCol();
  const item = await itemsCol.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const sourcesCol = await evidenceSourcesCol();
  const sources = await sourcesCol
    .find({ itemId: new ObjectId(id) })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    ok: true,
    items: sources.map((source) => ({
      id: String(source._id),
      url: source.url,
      title: source.title ?? null,
      publisher: source.publisher ?? null,
      publishedAt: source.publishedAt ? new Date(source.publishedAt).toISOString() : null,
      quote: source.quote ?? null,
      reliability: source.reliability,
      biasTag: source.biasTag ?? null,
      disabledAt: source.disabledAt ? new Date(source.disabledAt).toISOString() : null,
      createdAt: source.createdAt ? new Date(source.createdAt).toISOString() : null,
    })),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = EvidenceSourceCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const itemsCol = await editorialItemsCol();
  const item = await itemsCol.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  const now = new Date();
  const sourcesCol = await evidenceSourcesCol();
  const doc = {
    itemId: new ObjectId(id),
    url: parsed.data.url,
    title: parsed.data.title ?? null,
    publisher: parsed.data.publisher ?? null,
    publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null,
    quote: parsed.data.quote ?? null,
    reliability: parsed.data.reliability ?? "unknown",
    biasTag: parsed.data.biasTag ?? null,
    checkedByUserId: new ObjectId(String(actor._id)),
    createdAt: now,
    updatedAt: now,
    disabledAt: null,
  };

  const insert = await sourcesCol.insertOne(doc as any);

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.source.create",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "evidence_source", id: String(insert.insertedId) },
    after: { ...doc, _id: String(insert.insertedId) },
  });

  return NextResponse.json({ ok: true, sourceId: String(insert.insertedId) });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
