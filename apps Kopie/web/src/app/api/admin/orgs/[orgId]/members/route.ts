export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { orgMembershipsCol } from "@features/org/db";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import type { OrgMembershipDoc, OrgMemberSummary } from "@features/org/types";

const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await ctx.params;
  const gate = await requireAdminOrOrgRole(req, orgId, ["org_admin"]);
  if (gate instanceof Response) return gate;

  if (!ObjectId.isValid(orgId)) {
    return NextResponse.json({ ok: false, error: "invalid_org" }, { status: 400 });
  }

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? 50)));

  const membershipCol = await orgMembershipsCol();
  const pipeline: Array<Record<string, unknown>> = [
    { $match: { orgId: new ObjectId(orgId) } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ];

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    pipeline.push({
      $match: {
        $or: [
          { "user.email": regex },
          { "user.name": regex },
          { invitedEmail: regex },
        ],
      },
    });
  }

  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $skip: (page - 1) * pageSize });
  pipeline.push({ $limit: pageSize });

  const rows = await membershipCol.aggregate(pipeline).toArray();
  const total = await membershipCol.countDocuments({ orgId: new ObjectId(orgId) });

  const items: OrgMemberSummary[] = rows.map((row: any) => ({
    id: String(row._id),
    orgId: String(row.orgId),
    userId: String(row.userId),
    email: row.user?.email ?? null,
    name: row.user?.name ?? null,
    role: row.role,
    status: row.status,
    invitedEmail: row.invitedEmail ?? null,
    inviteExpiresAt: row.inviteExpiresAt ? new Date(row.inviteExpiresAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
  }));

  return NextResponse.json({ ok: true, items, total, page, pageSize });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
