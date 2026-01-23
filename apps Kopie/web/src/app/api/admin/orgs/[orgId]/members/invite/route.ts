export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId, getCol } from "@core/db/triMongo";
import { OrgInviteSchema } from "@features/org/schemas";
import { orgMembershipsCol, orgsCol } from "@features/org/db";
import { createInviteToken } from "@features/org/invite";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { createToken } from "@/utils/tokens";
import { resetEmailLink } from "@/utils/email";
import { buildOrgInviteMail, buildOrgAccessMail } from "@/utils/emailTemplates";
import { sendMail } from "@/utils/mailer";
import { DEFAULT_LOCALE } from "@core/locale/locales";
import type { UserRole } from "@/types/user";
import type { OrgMembershipDoc } from "@features/org/types";

const INVITE_TTL_DAYS = 7;

export async function POST(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await ctx.params;
  const gate = await requireAdminOrOrgRole(req, orgId, ["org_admin"]);
  if (gate instanceof Response) return gate;

  if (!ObjectId.isValid(orgId)) {
    return NextResponse.json({ ok: false, error: "invalid_org" }, { status: 400 });
  }

  const parsed = OrgInviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const email_lc = email;
  const role = parsed.data.role;
  const usersCol = await getCol("users");
  const orgs = await orgsCol();
  const org = await orgs.findOne({ _id: new ObjectId(orgId) });
  if (!org) return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });

  const existing = await usersCol.findOne({ $or: [{ email }, { email_lc }] });
  const now = new Date();
  let userId: ObjectId;

  if (!existing) {
    const newUser = {
      email,
      email_lc,
      name: email.split("@")[0],
      role: "user" as UserRole,
      roles: ["user"] as UserRole[],
      verifiedEmail: false,
      emailVerified: false,
      accessTier: "citizenBasic",
      b2cPlanId: "citizenBasic",
      tier: "citizenBasic",
      profile: {
        displayName: email.split("@")[0],
        locale: DEFAULT_LOCALE,
      },
      settings: {
        preferredLocale: DEFAULT_LOCALE,
        newsletterOptIn: false,
      },
      verification: {
        level: "none",
        methods: [],
        lastVerifiedAt: null,
        preferredRegionCode: null,
      },
      createdAt: now,
      updatedAt: now,
    };
    const insert = await usersCol.insertOne(newUser);
    userId = insert.insertedId;
  } else {
    userId = existing._id as ObjectId;
  }

  const memberships = await orgMembershipsCol();
  const existingMembership = await memberships.findOne({
    orgId: new ObjectId(orgId),
    userId,
  });

  if (existingMembership?.status === "active") {
    return NextResponse.json({ ok: false, error: "already_member" }, { status: 409 });
  }

  const invite = createInviteToken();
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const status = existing ? "active" : "invited";
  const update: Partial<OrgMembershipDoc> = {
    role,
    status,
    invitedEmail: email,
    invitedByUserId: new ObjectId(String(gate.user._id)),
    inviteTokenHash: status === "invited" ? invite.tokenHash : null,
    inviteExpiresAt: status === "invited" ? inviteExpiresAt : null,
    updatedAt: now,
    disabledAt: null,
  };

  const membership = await memberships.findOneAndUpdate(
    { orgId: new ObjectId(orgId), userId },
    {
      $set: update,
      $setOnInsert: {
        orgId: new ObjectId(orgId),
        userId,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (status === "invited") {
    const resetToken = await createToken(String(userId), "reset", 60);
    const resetUrl = `${resetEmailLink(resetToken)}&invite=${encodeURIComponent(invite.raw)}`;
    const mail = buildOrgInviteMail({
      resetUrl,
      orgName: org.name,
      role,
      displayName: existing?.name ?? null,
      expiresAt: inviteExpiresAt.toISOString(),
    });
    await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } else {
    const accessUrl = `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/login`;
    const mail = buildOrgAccessMail({
      accessUrl,
      orgName: org.name,
      role,
      displayName: existing?.name ?? null,
    });
    await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  await recordAuditEvent({
    scope: "org",
    action: "org.member.invite",
    actorUserId: String(gate.user._id),
    actorIp: getRequestIp(req),
    target: { type: "org_membership", id: membership?._id ? String(membership._id) : undefined },
    after: membership ?? null,
    reason: status === "invited" ? "invite_sent" : "member_added",
  });

  return NextResponse.json({
    ok: true,
    membershipId: membership?._id ? String(membership._id) : null,
    status,
  });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
