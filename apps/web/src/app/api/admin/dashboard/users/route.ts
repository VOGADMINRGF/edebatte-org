import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, getCol } from "@core/db/triMongo";
import { requireAdminOrResponse, userIsSuperadmin } from "@/lib/server/auth/admin";
import type { UserRole } from "@/types/user";
import { deriveAccessTierFromPlanCode } from "@core/access/accessTiers";
import { piiCol } from "@core/db/db/triMongo";
import { CREDENTIAL_COLLECTION } from "@/app/api/auth/sharedAuth";
import { hashPassword } from "@/utils/password";
import { createEmailVerificationToken } from "@core/auth/emailVerificationService";
import { buildSetPasswordMail, buildVerificationMail } from "@/utils/emailTemplates";
import { sendMail } from "@/utils/mailer";
import { DEFAULT_LOCALE } from "@core/locale/locales";
import { logIdentityEvent } from "@core/telemetry/identityEvents";
import { ensureBasicPiiProfile } from "@core/pii/userProfileService";
import { createToken } from "@/utils/tokens";
import { resetEmailLink } from "@/utils/email";

type UserDoc = {
  _id: ObjectId;
  email: string;
  email_lc?: string | null;
  name?: string | null;
  roles?: UserRole[];
  role?: UserRole | null;
  createdAt?: Date;
  lastLoginAt?: Date;
  accessTier?: string | null;
  b2cPlanId?: string | null;
  tier?: string | null;
  stats?: { lastSeenAt?: Date };
  membership?: any;
  settings?: { newsletterOptIn?: boolean | null };
  newsletterOptIn?: boolean | null;
};

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(12).optional(),
  roles: z.array(z.string()).optional(),
  accessTier: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
  sendVerification: z.boolean().optional(),
  sendPasswordLink: z.boolean().optional(),
}).refine((data) => Boolean(data.password || data.sendPasswordLink), {
  message: "missing_password",
  path: ["password"],
});

function mapUser(doc: UserDoc) {
  const roles = Array.isArray(doc.roles)
    ? doc.roles
    : doc.role
    ? [doc.role]
    : [];
  const pkg = doc.membership?.edebatte?.planKey ?? null;
  const membershipStatus = doc.membership?.status ?? null;
  const lastSeen = doc.stats?.lastSeenAt ?? doc.lastLoginAt ?? null;
  const newsletterOptIn = Boolean(doc.settings?.newsletterOptIn ?? doc.newsletterOptIn);
  const planCode = doc.membership?.planCode ?? null;
  const accessTier = doc.accessTier ?? doc.b2cPlanId ?? doc.tier ?? null;

  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name ?? null,
    roles,
    packageCode: pkg,
    membershipStatus,
    newsletterOptIn,
    accessTier,
    planCode,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    lastSeenAt: lastSeen ? new Date(lastSeen).toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const users = await getCol<UserDoc>("users");
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const role = searchParams.get("role");
  const pkg = searchParams.get("package");
  const newsletter = searchParams.get("newsletter");
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 25);
  const activeDays = Number(searchParams.get("activeDays") ?? NaN);
  const createdDays = Number(searchParams.get("createdDays") ?? NaN);

  const filter: any = {};
  if (q) {
    filter.$or = [
      { email: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
    ];
  }
  if (role) {
    filter.$or = filter.$or || [];
    filter.$or.push({ roles: role }, { role });
  }
  if (pkg) {
    filter["membership.edebatte.planKey"] = pkg;
  }
  if (newsletter === "true") {
    filter.$or = filter.$or || [];
    filter.$or.push({ "settings.newsletterOptIn": true }, { newsletterOptIn: true });
  } else if (newsletter === "false") {
    filter.$or = filter.$or || [];
    filter.$or.push({ "settings.newsletterOptIn": { $ne: true } }, { newsletterOptIn: { $ne: true } });
  }
  if (!Number.isNaN(activeDays) && activeDays > 0) {
    const since = new Date();
    since.setDate(since.getDate() - activeDays);
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ "stats.lastSeenAt": { $gte: since } }, { lastLoginAt: { $gte: since } }],
    });
  }
  if (!Number.isNaN(createdDays) && createdDays > 0) {
    const since = new Date();
    since.setDate(since.getDate() - createdDays);
    filter.$and = filter.$and || [];
    filter.$and.push({ createdAt: { $gte: since } });
  }

  const total = await users.countDocuments(filter);
  const docs = await users
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return NextResponse.json({
    items: docs.map(mapUser),
    total,
    page,
    pageSize,
  });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminOrResponse(req);
  if (actor instanceof Response) return actor;

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    roles?: UserRole[];
    packageCode?: string | null;
    membershipStatus?: string | null;
    newsletterOptIn?: boolean;
    planCode?: string | null;
    accessTier?: string | null;
  };

  if (!body.userId || !ObjectId.isValid(body.userId)) {
    return NextResponse.json({ ok: false, error: "missing_user" }, { status: 400 });
  }

  const users = await getCol<UserDoc>("users");
  const target = await users.findOne({ _id: new ObjectId(body.userId) }, { projection: { roles: 1, role: 1 } });
  if (!target) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  // safety: only superadmin can edit superadmin roles
  const actorIsSuper = userIsSuperadmin(actor as any);
  const targetRoles = Array.isArray(target.roles)
    ? target.roles
    : target.role
    ? [target.role]
    : [];

  if (targetRoles.includes("superadmin") && !actorIsSuper) {
    return NextResponse.json({ ok: false, error: "forbidden_superadmin" }, { status: 403 });
  }

  const update: any = {};
  if (Array.isArray(body.roles)) {
    if (body.roles.includes("superadmin") && !actorIsSuper) {
      return NextResponse.json({ ok: false, error: "forbidden_superadmin" }, { status: 403 });
    }
    update.roles = body.roles;
  }
  if (body.packageCode !== undefined) {
    update["membership.edebatte.planKey"] = body.packageCode;
  }
  if (body.membershipStatus !== undefined) {
    update["membership.status"] = body.membershipStatus;
  }
  const incomingPlan = typeof body.planCode === "string" ? body.planCode : typeof body.accessTier === "string" ? body.accessTier : null;
  if (incomingPlan) {
    const derived = deriveAccessTierFromPlanCode(incomingPlan);
    update["membership.planCode"] = incomingPlan;
    update.accessTier = derived;
    update.b2cPlanId = derived;
    update.tier = derived;
  }
  if (body.newsletterOptIn !== undefined) {
    update["settings.newsletterOptIn"] = !!body.newsletterOptIn;
    update.newsletterOptIn = !!body.newsletterOptIn;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ ok: false, error: "nothing_to_update" }, { status: 400 });
  }

  await users.updateOne({ _id: new ObjectId(body.userId) }, { $set: update, $currentDate: { updatedAt: true } });
  const updated = await users.findOne({ _id: new ObjectId(body.userId) });
  return NextResponse.json({ ok: true, user: updated ? mapUser(updated as UserDoc) : null });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminOrResponse(req);
  if (actor instanceof Response) return actor;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const body = parsed.data;
  const email = body.email.trim().toLowerCase();
  const email_lc = email;
  const name = body.name.trim();
  const roles = Array.isArray(body.roles) ? body.roles.map((r) => String(r)) : [];
  const actorIsSuper = userIsSuperadmin(actor as any);

  if (roles.includes("superadmin") && !actorIsSuper) {
    return NextResponse.json({ ok: false, error: "forbidden_superadmin" }, { status: 403 });
  }

  const users = await getCol<UserDoc>("users");
  const existing = await users.findOne(
    { $or: [{ email }, { email_lc }] },
    { projection: { _id: 1, verifiedEmail: 1, createdAt: 1 } },
  );

  if (existing && (existing as any).verifiedEmail) {
    return NextResponse.json({ ok: false, error: "email_in_use" }, { status: 409 });
  }

  const sendPasswordLink = body.sendPasswordLink ?? false;
  let finalPassword = body.password?.trim() ?? "";
  if (!finalPassword && sendPasswordLink) {
    finalPassword = generatePassword(18);
  }
  if (!finalPassword) {
    return NextResponse.json({ ok: false, error: "missing_password" }, { status: 400 });
  }
  if (!isPasswordStrong(finalPassword)) {
    return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
  }

  const now = new Date();
  const passwordHash = await hashPassword(finalPassword);
  const accessTier = body.accessTier ? deriveAccessTierFromPlanCode(body.accessTier) : "citizenBasic";

  const baseDoc = {
    email,
    email_lc,
    name,
    role: (roles[0] as UserRole) ?? "user",
    roles: roles as UserRole[],
    verifiedEmail: false,
    emailVerified: false,
    accessTier,
    b2cPlanId: accessTier,
    tier: accessTier,
    profile: {
      displayName: name,
      locale: DEFAULT_LOCALE,
    },
    settings: {
      preferredLocale: DEFAULT_LOCALE,
      newsletterOptIn: body.newsletterOptIn ?? false,
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

  let userId: ObjectId;
  if (!existing) {
    const insert = await users.insertOne(baseDoc as any);
    userId = insert.insertedId;
  } else {
    userId = existing._id as ObjectId;
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          ...baseDoc,
          createdAt: existing.createdAt ?? now,
        },
      },
    );
  }

  const credentials = await piiCol(CREDENTIAL_COLLECTION);
  await credentials.updateOne(
    { coreUserId: userId },
    {
      $set: {
        coreUserId: userId,
        email,
        passwordHash,
        twoFactorEnabled: false,
      },
      $setOnInsert: {
        createdAt: now,
      },
      $currentDate: { updatedAt: true },
    },
    { upsert: true },
  );

  let verifyUrl: string | null = null;
  if (body.sendVerification ?? true) {
    const { rawToken } = await createEmailVerificationToken(userId, email);
    const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    verifyUrl = `${origin.replace(/\/$/, "")}/register/verify-email?token=${encodeURIComponent(
      rawToken,
    )}&email=${encodeURIComponent(email)}`;

    const mail = buildVerificationMail({
      verifyUrl,
      displayName: name,
    });

    await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  let resetUrl: string | null = null;
  if (sendPasswordLink) {
    const rawToken = await createToken(String(userId), "reset", 60);
    resetUrl = resetEmailLink(rawToken);
    const mail = buildSetPasswordMail({ resetUrl, displayName: name });
    await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  try {
    await ensureBasicPiiProfile(userId, {
      email,
      displayName: name,
    });
  } catch (err) {
    console.error("[admin.users] ensureBasicPiiProfile failed", err);
  }

  try {
    await logIdentityEvent("identity_register", {
      userId: String(userId),
      meta: { source: "admin_create", sendVerification: body.sendVerification ?? true },
    });
  } catch (err) {
    console.error("[admin.users] logIdentityEvent failed", err);
  }

  const updated = await users.findOne({ _id: userId });
  return NextResponse.json({
    ok: true,
    user: updated ? mapUser(updated as UserDoc) : null,
    verifyUrl,
    resetUrl,
  });
}

function isPasswordStrong(value: string) {
  return value.length >= 12 && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function generatePassword(length = 16) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%_-+=*";
  const all = `${letters}${digits}${symbols}`;
  const bytes = crypto.randomBytes(length);
  const core = Array.from(bytes, (b) => all[b % all.length]).join("");
  return `${core.slice(0, length - 3)}${digits[0]}${symbols[0]}${letters[0]}`;
}
