import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { getSessionUser } from "./sessionUser";
import { sessionHasPassedTwoFactor, userRequiresTwoFactor } from "./twoFactor";
import { userIsAdminDashboard } from "./roles";
import { orgMembershipsCol } from "@features/org/db";
import type { OrgRole } from "@features/org/types";

export type OrgContext = {
  orgIds: string[];
  memberships: Array<{ orgId: string; role: OrgRole }>;
};

export async function getOrgContext(userId: string): Promise<OrgContext | null> {
  if (!ObjectId.isValid(userId)) return null;
  const membershipsCol = await orgMembershipsCol();
  const rows = await membershipsCol
    .find({ userId: new ObjectId(userId), status: "active" })
    .toArray();
  return {
    orgIds: rows.map((row) => String(row.orgId)),
    memberships: rows.map((row) => ({ orgId: String(row.orgId), role: row.role })),
  };
}

export async function requireAdminOrOrgRole(
  req: NextRequest,
  orgId: string | null,
  rolesAllowed: OrgRole[] = [],
) {
  const user = await getSessionUser(req);
  const requiresTwoFactor = userRequiresTwoFactor(user);
  const hasTwoFactor = sessionHasPassedTwoFactor(user);
  const sessionValid = user?.sessionValid ?? false;

  if (!user || !sessionValid) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (requiresTwoFactor && !hasTwoFactor) {
    return NextResponse.json({ ok: false, error: "two_factor_required" }, { status: 403 });
  }

  if (userIsAdminDashboard(user)) {
    return { user, isAdmin: true } as const;
  }

  if (!orgId || !ObjectId.isValid(orgId)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const membershipsCol = await orgMembershipsCol();
  const membership = await membershipsCol.findOne({
    orgId: new ObjectId(orgId),
    userId: new ObjectId(String(user._id)),
    status: "active",
  });

  if (!membership) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (rolesAllowed.length && !rolesAllowed.includes(membership.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  return { user, isAdmin: false, membership } as const;
}
