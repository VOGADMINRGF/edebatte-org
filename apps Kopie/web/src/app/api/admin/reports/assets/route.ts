export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { reportAssetsCol } from "@features/reportsAssets/db";
import { ReportAssetCreateSchema } from "@features/reportsAssets/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";
import type { ReportAssetDoc } from "@features/reportsAssets/types";

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
  const kind = params.get("kind")?.trim();
  const q = params.get("q")?.trim();
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? 20)));

  const filter: Record<string, unknown> = {};
  if (orgId && ObjectId.isValid(orgId)) {
    filter.orgId = new ObjectId(orgId);
  }
  if (status && status !== "all") {
    filter.status = status;
  }
  if (kind && kind !== "all") {
    filter.kind = kind;
  }
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { "key.topicKey": regex },
      { "key.regionCode": regex },
      { "key.slug": regex },
    ];
  }

  const col = await reportAssetsCol();
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
    kind: item.kind,
    status: item.status,
    key: item.key,
    currentRev: item.currentRev,
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
  }));

  return NextResponse.json({ ok: true, items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ReportAssetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const orgId = parsed.data.orgId ?? null;
  const gate = orgId
    ? await requireAdminOrOrgRole(req, orgId, [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  if (orgId && !ObjectId.isValid(orgId)) {
    return NextResponse.json({ ok: false, error: "invalid_org" }, { status: 400 });
  }

  const now = new Date();
  const doc: ReportAssetDoc = {
    orgId: orgId ? new ObjectId(orgId) : null,
    kind: parsed.data.kind,
    key: {
      topicKey: parsed.data.key.topicKey ?? null,
      regionCode: parsed.data.key.regionCode ?? null,
      slug: parsed.data.key.slug ?? null,
    },
    status: "draft",
    currentRev: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    publishedByUserId: null,
  };

  const col = await reportAssetsCol();
  const insert = await col.insertOne(doc);
  const id = String(insert.insertedId);

  await recordAuditEvent({
    scope: "report",
    action: "report.asset.create",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "report_asset", id },
    after: { ...doc, _id: id },
  });

  return NextResponse.json({ ok: true, assetId: id });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
