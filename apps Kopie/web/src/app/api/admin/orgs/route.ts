export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { orgsCol } from "@features/org/db";
import { OrgCreateSchema } from "@features/org/schemas";
import { slugifyOrg } from "@features/org/slug";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import type { OrgDoc } from "@features/org/types";

const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const includeArchived = params.get("archived") === "true";
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? 20)));

  const filter: { $or?: Array<Record<string, unknown>>; $and?: Array<Record<string, unknown>> } = {};
  if (!includeArchived) {
    filter.$or = [{ archivedAt: { $exists: false } }, { archivedAt: null }];
  }
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$and = filter.$and || [];
    filter.$and.push({ $or: [{ name: regex }, { slug: regex }] });
  }

  const col = await orgsCol();
  const total = await col.countDocuments(filter);
  const docs = await col
    .find(filter)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return NextResponse.json({
    ok: true,
    items: docs.map(mapOrg),
    total,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminOrResponse(req);
  if (actor instanceof Response) return actor;

  const parsed = OrgCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const base = slugifyOrg(parsed.data.slug?.trim() || name) || `org-${Date.now()}`;
  const col = await orgsCol();
  const slug = await ensureUniqueSlug(col, base);

  const now = new Date();
  const doc: OrgDoc = {
    slug,
    name,
    members: 0,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };

  const insert = await col.insertOne(doc);
  const id = String(insert.insertedId);

  await recordAuditEvent({
    scope: "org",
    action: "org.create",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "org", id },
    after: { ...doc, _id: id },
  });

  return NextResponse.json({ ok: true, item: { ...mapOrg(doc), id } });
}

function mapOrg(doc: OrgDoc) {
  return {
    id: doc._id ? String(doc._id) : undefined,
    slug: doc.slug,
    name: doc.name,
    archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

async function ensureUniqueSlug(col: Awaited<ReturnType<typeof orgsCol>>, base: string) {
  let slug = base;
  let i = 2;
  while (await col.findOne({ slug })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
