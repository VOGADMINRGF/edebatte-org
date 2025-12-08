import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCol, ObjectId } from "@core/db/triMongo";
import { piiCol } from "@core/db/db/triMongo";
import { CREDENTIAL_COLLECTION } from "../sharedAuth";
import { createEmailVerificationToken } from "@core/auth/emailVerificationService";
import { DEFAULT_LOCALE, isSupportedLocale } from "@core/locale/locales";
import { hashPassword } from "@/utils/password";
import { logIdentityEvent } from "@core/telemetry/identityEvents";
import { sendMail } from "@/utils/mailer";
import { buildVerificationMail } from "@/utils/emailTemplates";
import { ensureBasicPiiProfile } from "@core/pii/userProfileService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(120),
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(160).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  email: z.string().email(),
  password: z.string().min(12),
  preferredLocale: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const body = parsed.data;
  const email = body.email.trim().toLowerCase();
  const locale = normalizeLocale(body.preferredLocale);
  const givenName = body.firstName?.trim() || undefined;
  const familyName = body.lastName?.trim() || undefined;
  const birthDate = body.birthDate?.trim() || undefined;
  const displayName = body.name.trim();

  if (!isPasswordStrong(body.password)) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const url = new URL(req.url);
  const householdSizeRaw = url.searchParams.get("householdSize");
  const householdSize = householdSizeRaw
    ? Math.max(1, Math.min(10, Number(householdSizeRaw) || 1))
    : 1;

  const Users = await getCol("users");
  const existing = await Users.findOne(
    { email },
    { projection: { _id: 1, verifiedEmail: 1, createdAt: 1 } },
  );

  if (existing && existing.verifiedEmail) {
    return NextResponse.json({ error: "email_in_use" }, { status: 409 });
  }

  const now = new Date();
  const passwordHash = await hashPassword(body.password);
  const baseDoc = {
    email,
    name: displayName,
    passwordHash,
    role: "user",
    verifiedEmail: false,
    emailVerified: false,
    accessTier: "citizenBasic",
    profile: {
      displayName,
      locale,
    },
    settings: {
      preferredLocale: locale,
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
    const insert = await Users.insertOne(baseDoc);
    userId = insert.insertedId;
  } else {
    userId = existing._id as ObjectId;
    await Users.updateOne(
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
    },
    { upsert: true },
  );

  const { rawToken } = await createEmailVerificationToken(userId, email);

  let piiProfileError: string | null = null;
  try {
    await ensureBasicPiiProfile(userId, {
      email,
      displayName,
      givenName,
      familyName,
      birthDate: birthDate ?? null,
      householdSize: householdSize > 1 ? householdSize : undefined,
    });
  } catch (err) {
    piiProfileError =
      err instanceof Error ? err.message : String(err ?? "unknown error");
    console.error("[register] ensureBasicPiiProfile failed", err);
  }

  try {
    await logIdentityEvent("identity_register", {
      userId: String(userId),
      meta: {
        email,
        householdSize: householdSize > 1 ? householdSize : undefined,
        piiProfileError,
      },
    });
  } catch (telemetryErr) {
    console.error(
      "[register] logIdentityEvent(identity_register) failed",
      telemetryErr,
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const verifyUrl = `${origin.replace(
    /\/$/,
    "",
  )}/register/verify-email?token=${encodeURIComponent(
    rawToken,
  )}&email=${encodeURIComponent(email)}`;

  const mail = buildVerificationMail({
    verifyUrl,
    displayName: body.name.trim(),
  });

  await sendMail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

function isPasswordStrong(value: string) {
  return value.length >= 12 && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function normalizeLocale(locale?: string) {
  if (locale && isSupportedLocale(locale)) return locale;
  return DEFAULT_LOCALE;
}
