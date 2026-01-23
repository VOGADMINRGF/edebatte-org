export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol } from "@features/editorial/db";
import { EditorialItemCreateSchema } from "@features/editorial/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";
import type { EditorialItemDoc } from "@features/editorial/types";

const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const orgId = params.get("orgId");

  if (orgId) {
    const gate = await requireAdminOrOrgRole(req, orgId, [...ORG_ROLES]);
    if (gate instanceof Response) return gate;
  } else {
    const gate = await requireAdminOrResponse(req);
    if (gate instanceof Response) return gate;
  }

  const status = params.get("status")?.trim();
  const owner = params.get("owner")?.trim();
  const q = params.get("q")?.trim();
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? 20)));

  const filter: Record<string, unknown> = {};
  if (orgId && ObjectId.isValid(orgId)) {
    filter.orgId = new ObjectId(orgId);
  }
  if (status && status !== "all") {
    filter.status = status;
  }
  if (owner) {
    if (owner === "unassigned") {
      filter["assignment.ownerUserId"] = { $in: [null, undefined] };
    } else if (ObjectId.isValid(owner)) {
      filter["assignment.ownerUserId"] = new ObjectId(owner);
    }
  }
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    filter.createdAt = range;
  }
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { "intake.title": regex },
      { "intake.summary": regex },
      { "intake.rawText": regex },
    ];
  }

  const col = await editorialItemsCol();
  const total = await col.countDocuments(filter);
  const rows = await col
    .find(filter)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const items = rows.map((item) => ({
    id: String(item._id),
    orgId: item.orgId ? String(item.orgId) : null,
    status: item.status,
    title: item.intake.title ?? null,
    summary: item.intake.summary ?? null,
    topicKey: item.intake.topicKey ?? null,
    regionCode: item.intake.regionCode ?? null,
    ownerUserId: item.assignment.ownerUserId ? String(item.assignment.ownerUserId) : null,
    dueAt: item.assignment.dueAt ? new Date(item.assignment.dueAt).toISOString() : null,
    createdAt: item.createdAt ? item.createdAt.toISOString() : null,
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
  }));

  return NextResponse.json({ ok: true, items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = EditorialItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const orgId = parsed.data.orgId ?? null;
  const gate = orgId
    ? await requireAdminOrOrgRole(req, orgId, [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  if (orgId && !ObjectId.isValid(orgId)) {
    return NextResponse.json({ ok: false, error: "invalid_org" }, { status: 400 });
  }

  const actor = "user" in gate ? gate.user : gate;

  const now = new Date();
  const doc: EditorialItemDoc = {
    orgId: orgId ? new ObjectId(orgId) : null,
    intake: {
      kind: "manual",
      title: parsed.data.title.trim(),
      summary: parsed.data.summary?.trim() ?? null,
      rawText: parsed.data.rawText?.trim() ?? null,
      topicKey: parsed.data.topicKey?.trim() ?? null,
      regionCode: parsed.data.regionCode?.trim() ?? null,
      language: parsed.data.language?.trim() ?? null,
      receivedAt: now,
    },
    status: "triage",
    assignment: {},
    flags: {},
    createdBy: {
      type: "human",
      userId: new ObjectId(String(actor._id)),
    },
    published: {},
    createdAt: now,
    updatedAt: now,
  };

  const col = await editorialItemsCol();
  const insert = await col.insertOne(doc);
  const id = String(insert.insertedId);

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.create",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "editorial_item", id },
    after: { ...doc, _id: id },
  });

  return NextResponse.json({ ok: true, item: { id, ...doc } });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
