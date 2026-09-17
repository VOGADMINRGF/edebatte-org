import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { assertStoreConfigured, getCol, ObjectId } from "@core/db/triMongo";
import { piiCol } from "@core/db/db/triMongo";
import { CREDENTIAL_COLLECTION } from "../sharedAuth";
import { createEmailVerificationToken } from "@core/auth/emailVerificationService";
import { DEFAULT_LOCALE, isSupportedLocale } from "@core/locale/locales";
import { hashPassword } from "@/utils/password";
import { logIdentityEvent } from "@core/telemetry/identityEvents";
import { mailFailureMetadata, sendMail } from "@/utils/mailer";
import { buildVerificationMail } from "@/utils/emailTemplates";
import { publicOrigin } from "@/utils/publicOrigin";
import { ensureBasicPiiProfile } from "@core/pii/userProfileService";
import { incrementRateLimit } from "@/lib/security/rate-limit";
import { verifyHumanTokenDetailed } from "@/lib/security/human-token";
import { ensureFounderWelcomeForUser } from "@/lib/onboarding/founderWelcome";
import { logOnboardingEvent } from "@/lib/onboarding/events";
import { refreshUserPreferenceSnapshot } from "@/lib/onboarding/preferenceSnapshot";
import { runContentTranslationProduction } from "@/features/i18n/contentTranslationProduction";
import { normalizeInternalRedirectPath } from "@/features/create/finalizeRedirect";
import {
  LEGACY_REGISTER_HONEYPOT_FIELD_NAME,
  REGISTER_HONEYPOT_FIELD_NAME,
  readRegisterHoneypotValue,
} from "@/features/auth/registerSecurityContract";
import { upsertMembershipPaymentProfile } from "@core/db/pii/userPaymentProfiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addressSchema = z.object({
  street: z.string().trim().min(2).max(200),
  houseNumber: z.string().trim().min(1).max(20),
  line2: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().min(2).max(20),
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(120),
});

const bankSchema = z.object({
  accountHolder: z.string().trim().min(2).max(200),
  iban: z.string().trim().min(15).max(34),
  bic: z.string().trim().max(11).optional(),
  consent: z.literal(true),
});

const schema = z.object({
  name: z.string().min(2).max(120),
  firstName: z.string().min(2).max(120).optional(),
  lastName: z.string().min(2).max(160).optional(),
  birthDate: z.string().optional(), // Sanitizing unten
  address: addressSchema,
  bank: bankSchema,
  email: z.string().email(),
  password: z.string().min(12),
  preferredLocale: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
  title: z.string().trim().max(80).optional(),
  pronouns: z.string().trim().max(80).optional(),
  humanToken: z.string().min(10).max(1024),
  formStartedAt: z.coerce.number().optional(),
  hp_register: z.string().optional(),
  reg_guardian_reference: z.string().optional(),
  inviteCode: z.string().trim().max(128).optional(),
  next: z.string().max(2048).optional(),
});

const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes
const MIN_FILL_MS = 3000;
const MAX_FILL_MS = 2 * 60 * 60 * 1000;
const MIN_PARTICIPATION_AGE = 14;
const REFERRAL_REWARD_ANALYSIS_STARTS = 1;
const REFERRAL_CODE_RE = /^[a-zA-Z0-9_-]{6,128}$/;

type UserProfileDoc = {
  _id: ObjectId;
  name?: string | null;
  email?: string | null;
  profile?: {
    inviteToken?: string | null;
    publicShareId?: string | null;
  };
};

type FounderWelcomeResult = {
  founderUserId: string | null;
  founderDisplayName: string | null;
  friendRequestCreated: boolean;
  welcomeMessageCreated: boolean;
} | null;

type ReferralDoc = {
  _id?: ObjectId;
  inviteCode: string;
  inviterUserId: string;
  invitedUserId: string;
  status: "linked";
  createdAt: Date;
  updatedAt: Date;
  connectedAt?: Date;
  notifiedAt?: Date;
  rewardGrantedAt?: Date;
  rewardAnalysisStarts?: number;
};

function sanitizeInviteCode(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || !REFERRAL_CODE_RE.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

async function applyReferralFlow({
  users,
  invitedUserId,
  inviteCode,
}: {
  users: Awaited<ReturnType<typeof getCol>>;
  invitedUserId: ObjectId;
  inviteCode: string;
}) {
  const invitedUserIdStr = String(invitedUserId);

  const inviter = await users.findOne(
    {
      _id: { $ne: invitedUserId },
      $or: [
        { "profile.inviteToken": inviteCode },
        { "profile.publicShareId": inviteCode },
      ],
    },
    { projection: { _id: 1, name: 1, email: 1 } },
  ) as UserProfileDoc | null;
  if (!inviter?._id) return { linked: false as const, reason: "inviter_not_found" as const };

  const inviterUserId = String(inviter._id);
  const now = new Date();
  const referralsCol = await getCol<ReferralDoc>("user_referrals");
  const existingReferral = await referralsCol.findOne(
    { invitedUserId: invitedUserIdStr },
    { projection: { inviterUserId: 1, rewardGrantedAt: 1 } },
  );
  if (existingReferral?.inviterUserId && existingReferral.inviterUserId !== inviterUserId) {
    return {
      linked: true as const,
      inviterUserId: existingReferral.inviterUserId,
      rewardGranted: Boolean(existingReferral.rewardGrantedAt),
    };
  }

  const upsert = await referralsCol.updateOne(
    { invitedUserId: invitedUserIdStr },
    {
      $setOnInsert: {
        inviteCode,
        inviterUserId,
        invitedUserId: invitedUserIdStr,
        status: "linked",
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  const referralDoc = await referralsCol.findOne(
    { invitedUserId: invitedUserIdStr },
    { projection: { rewardGrantedAt: 1 } },
  );
  if (!upsert.upsertedId && referralDoc?.rewardGrantedAt) {
    return { linked: true as const, inviterUserId, rewardGranted: false as const };
  }

  await users.updateOne(
    { _id: invitedUserId },
    {
      $set: {
        "profile.referral.inviterUserId": inviterUserId,
        "profile.referral.inviteCode": inviteCode,
        "profile.referral.attributedAt": now,
        updatedAt: now,
      },
    },
  );

  const friendRequestsCol = await getCol("social_friend_requests");
  await Promise.all([
    friendRequestsCol.updateOne(
      { fromUserId: inviterUserId, toUserId: invitedUserIdStr },
      {
        $set: {
          status: "accepted",
          source: "referral",
          acceptedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          message: "Verbunden über Einladungslink",
        },
      },
      { upsert: true },
    ),
    friendRequestsCol.updateOne(
      { fromUserId: invitedUserIdStr, toUserId: inviterUserId },
      {
        $set: {
          status: "accepted",
          source: "referral",
          acceptedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          message: "Verbunden über Einladungslink",
        },
      },
      { upsert: true },
    ),
  ]);

  const messagesCol = await getCol("social_messages");
  const referralText = "hat sich über deinen Einladungslink registriert.";
  const referralContentLifecycle = await runContentTranslationProduction({
    originalText: referralText,
    originalLanguage: "de",
    maxLength: 600,
  });
  const referralContent = referralContentLifecycle.content ?? {
    originalLanguage: "de",
    originalText: referralText,
    translations: {},
    translationStatus: "missing" as const,
    translatedAt: null,
    translationProvider: null,
    translationModel: null,
  };
  await messagesCol.updateOne(
    { fromUserId: invitedUserIdStr, toUserId: inviterUserId, kind: "referral_signup" },
    {
      $setOnInsert: {
        text: referralText,
        originalLanguage: referralContent.originalLanguage ?? "de",
        originalText: referralContent.originalText ?? referralText,
        translations: referralContent.translations ?? {},
        translationStatus: referralContent.translationStatus ?? "missing",
        translatedAt: referralContent.translatedAt ?? null,
        translationProvider: referralContent.translationProvider ?? null,
        translationModel: referralContent.translationModel ?? null,
        readAt: null,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  await users.updateOne(
    { _id: inviter._id },
    {
      $inc: {
        "usage.contributionCredits": REFERRAL_REWARD_ANALYSIS_STARTS,
        "stats.contributionCredits": REFERRAL_REWARD_ANALYSIS_STARTS,
        "profile.referrals.successfulInvites": 1,
        "profile.referrals.rewardAnalysisStarts": REFERRAL_REWARD_ANALYSIS_STARTS,
      },
      $set: {
        "profile.referrals.lastSuccessAt": now,
        updatedAt: now,
      },
    },
  );

  await referralsCol.updateOne(
    { invitedUserId: invitedUserIdStr },
    {
      $set: {
        connectedAt: now,
        notifiedAt: now,
        rewardGrantedAt: now,
        rewardAnalysisStarts: REFERRAL_REWARD_ANALYSIS_STARTS,
        updatedAt: now,
      },
    },
  );

  return { linked: true as const, inviterUserId, rewardGranted: true as const };
}

function hashedClientKey(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ua = req.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  // Register touches core (users/social/referrals) and pii (credentials/profile).
  assertStoreConfigured("core", "api/auth/register");
  assertStoreConfigured("pii", "api/auth/register");
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const body = parsed.data;
  const honeypotValue = readRegisterHoneypotValue({
    [REGISTER_HONEYPOT_FIELD_NAME]: body[REGISTER_HONEYPOT_FIELD_NAME],
    [LEGACY_REGISTER_HONEYPOT_FIELD_NAME]: body[LEGACY_REGISTER_HONEYPOT_FIELD_NAME],
  });
  if (honeypotValue) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[register] honeypot tripped", {
        hasCurrentFieldValue: Boolean(String(body[REGISTER_HONEYPOT_FIELD_NAME] ?? "").trim()),
        hasLegacyFieldValue: Boolean(String(body[LEGACY_REGISTER_HONEYPOT_FIELD_NAME] ?? "").trim()),
      });
    }
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const rateKey = hashedClientKey(req);
  const attempts = await incrementRateLimit(`register:${rateKey}`, RATE_LIMIT_WINDOW);
  if (attempts > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const startedAt = body.formStartedAt;
  const durationMs = typeof startedAt === "number" ? Date.now() - startedAt : null;
  if (durationMs !== null) {
    if (durationMs < MIN_FILL_MS || durationMs > MAX_FILL_MS) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
  }

  const humanCheck = await verifyHumanTokenDetailed(body.humanToken);
  if (!humanCheck.ok) {
    const reason = "code" in humanCheck ? humanCheck.code : "invalid";
    return NextResponse.json(
      { error: reason === "expired" ? "human_token_expired" : "human_token_invalid" },
      { status: 400 },
    );
  }
  if (humanCheck.payload.formId !== "register") {
    return NextResponse.json({ error: "human_token_invalid" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const locale = normalizeLocale(body.preferredLocale);
  const givenName = body.firstName?.trim() || undefined;
  const familyName = body.lastName?.trim() || undefined;
  const birthDate = normalizeBirthDate(body.birthDate);
  const title = body.title?.trim() || undefined;
  const pronouns = body.pronouns?.trim() || undefined;
  const address = normalizeAddress(body.address);
  const normalizedIban = normalizeIban(body.bank.iban);
  const bankBic = normalizeBic(body.bank.bic);
  const displayName = body.name.trim();
  const inviteFromQuery = sanitizeInviteCode(req.nextUrl.searchParams.get("invite"));
  const inviteCode = sanitizeInviteCode(body.inviteCode) ?? inviteFromQuery;
  const continuationTarget = normalizeInternalRedirectPath(body.next) ?? null;

  if (!isPasswordStrong(body.password)) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }
  if (!isValidIban(normalizedIban)) {
    return NextResponse.json({ error: "invalid_iban" }, { status: 400 });
  }
  if (bankBic && !isValidBic(bankBic)) {
    return NextResponse.json({ error: "invalid_bic" }, { status: 400 });
  }
  if (!birthDate) {
    return NextResponse.json({ error: "birthdate_invalid" }, { status: 400 });
  }
  if (!isAtLeastAge(birthDate, MIN_PARTICIPATION_AGE)) {
    return NextResponse.json(
      { error: "minimum_age_not_met", minAge: MIN_PARTICIPATION_AGE },
      { status: 400 },
    );
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

  let referralResult:
    | { linked: false; reason: "inviter_not_found" | "flow_failed" }
    | { linked: true; inviterUserId: string; rewardGranted: boolean }
    | null = null;
  if (inviteCode) {
    try {
      referralResult = await applyReferralFlow({
        users: Users,
        invitedUserId: userId,
        inviteCode,
      });
    } catch (referralErr) {
      console.error("[register] applyReferralFlow failed", referralErr);
      referralResult = { linked: false, reason: "flow_failed" };
    }
  }

  try {
    await Users.updateOne(
      { _id: userId, "profile.onboarding.registeredAt": { $exists: false } },
      {
        $set: {
          "profile.onboarding.registeredAt": now,
          updatedAt: now,
        },
      },
    );
    await logOnboardingEvent("register_completed", {
      userId: String(userId),
      meta: {
        viaInvite: Boolean(inviteCode),
      },
    });
  } catch (onboardingErr) {
    console.error("[register] onboarding registration marker failed", onboardingErr);
  }

  let founderWelcomeResult: FounderWelcomeResult = null;
  try {
    founderWelcomeResult = await ensureFounderWelcomeForUser(userId, { source: "register" });
    if (founderWelcomeResult?.friendRequestCreated) {
      await logOnboardingEvent("founder_friend_request_created", {
        userId: String(userId),
        meta: {
          founderUserId: founderWelcomeResult.founderUserId,
        },
      });
    }
    if (founderWelcomeResult?.welcomeMessageCreated) {
      await logOnboardingEvent("founder_welcome_message_created", {
        userId: String(userId),
        meta: {
          founderUserId: founderWelcomeResult.founderUserId,
        },
      });
    }
  } catch (founderErr) {
    console.error("[register] founder welcome flow failed", founderErr);
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

  let emailVerification:
    | { status: "sent" }
    | {
        status: "pending";
        reason: "token_create_failed" | "mail_dispatch_failed" | "unknown";
        delivery?: ReturnType<typeof mailFailureMetadata>;
      } = { status: "sent" };
  let rawToken: string | null = null;

  let piiProfileError: string | null = null;
  let bankProfileError: string | null = null;
  try {
    await ensureBasicPiiProfile(userId, {
      email,
      displayName,
      givenName,
      familyName,
      birthDate: birthDate ?? null,
      title: title ?? null,
      pronouns: pronouns ?? null,
      address: {
        street: [address.street, address.houseNumber, address.line2].filter(Boolean).join(" "),
        postalCode: address.postalCode,
        city: address.city,
        country: address.country,
      },
      householdSize: householdSize > 1 ? householdSize : undefined,
    });
  } catch (err) {
    piiProfileError =
      err instanceof Error ? err.message : String(err ?? "unknown error");
    console.error("[register] ensureBasicPiiProfile failed", err);
  }

  try {
    await upsertMembershipPaymentProfile(userId, {
      type: "bank_transfer",
      billingName: body.bank.accountHolder.trim(),
      billingAddress: {
        street: [address.street, address.houseNumber, address.line2].filter(Boolean).join(" "),
        postalCode: address.postalCode,
        city: address.city,
        country: address.country,
      },
      iban: normalizedIban,
      bic: bankBic || null,
    });
  } catch (err) {
    bankProfileError =
      err instanceof Error ? err.message : String(err ?? "unknown error");
    console.error("[register] upsertMembershipPaymentProfile failed", err);
  }

  let preferenceSeedTransitions = {
    interestsCompletedNow: false,
    locationCompletedNow: false,
    personalizedReadyNow: false,
  };
  try {
    const seeded = await refreshUserPreferenceSnapshot(userId);
    preferenceSeedTransitions = seeded.transitions;
    if (seeded.transitions.interestsCompletedNow) {
      await logOnboardingEvent("interests_completed", { userId: String(userId) });
    }
    if (seeded.transitions.locationCompletedNow) {
      await logOnboardingEvent("location_completed", { userId: String(userId) });
    }
    if (seeded.transitions.personalizedReadyNow) {
      await logOnboardingEvent("personalized_start_ready", { userId: String(userId) });
    }
  } catch (seedErr) {
    console.error("[register] preference snapshot seed failed", seedErr);
  }

  try {
    await logIdentityEvent("identity_register", {
      userId: String(userId),
      meta: {
        email,
        householdSize: householdSize > 1 ? householdSize : undefined,
        piiProfileError,
        bankProfileError,
        referralLinked: referralResult?.linked ?? false,
        referralRewardGranted: referralResult?.linked ? referralResult.rewardGranted : false,
        referralReason:
          referralResult && "reason" in referralResult ? referralResult.reason : undefined,
        founderUserId: founderWelcomeResult?.founderUserId ?? undefined,
        founderFriendRequestCreated: founderWelcomeResult?.friendRequestCreated ?? false,
        founderWelcomeMessageCreated: founderWelcomeResult?.welcomeMessageCreated ?? false,
        onboardingInterestsCompleted: preferenceSeedTransitions.interestsCompletedNow,
        onboardingLocationCompleted: preferenceSeedTransitions.locationCompletedNow,
        personalizedStartReady: preferenceSeedTransitions.personalizedReadyNow,
      },
    });
  } catch (telemetryErr) {
    console.error(
      "[register] logIdentityEvent(identity_register) failed",
      telemetryErr,
    );
  }

  try {
    const tokenResult = await createEmailVerificationToken(
      userId,
      email,
      continuationTarget,
    );
    rawToken = tokenResult.rawToken;
  } catch (err) {
    emailVerification = { status: "pending", reason: "token_create_failed" };
    console.error("[register] createEmailVerificationToken failed", err);
  }

  if (rawToken) {
    try {
      const origin = publicOrigin();
      const verifyUrl = `${origin.replace(
        /\/$/,
        "",
      )}/register/verify-email?token=${encodeURIComponent(
        rawToken,
      )}&email=${encodeURIComponent(email)}`;

      const mail = buildVerificationMail({
        verifyUrl,
        displayName: body.name.trim(),
        locale,
      });

      const mailResult = await sendMail({
        to: email,
        mail,
        delivery: "required_delivery",
        tag: "registration_verification",
      });

      if (!mailResult?.ok) {
        emailVerification = {
          status: "pending",
          reason: "mail_dispatch_failed",
          delivery: mailFailureMetadata(mailResult),
        };
      }
    } catch (err) {
      emailVerification = { status: "pending", reason: "mail_dispatch_failed" };
      console.error("[register] verification mail dispatch failed", err);
    }
  }

  if (emailVerification.status === "pending") {
    return NextResponse.json(
      {
        ok: false,
        error:
          emailVerification.reason === "mail_dispatch_failed"
            ? "mail_delivery_failed"
            : "verification_setup_failed",
        partial: true,
        accountCreated: true,
        emailVerification,
      },
      {
        status:
          emailVerification.reason === "mail_dispatch_failed" ? 502 : 500,
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      emailVerification,
    },
    { status: 201 },
  );
}

function isPasswordStrong(value: string) {
  return value.length >= 12 && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function normalizeLocale(locale?: string) {
  if (locale && isSupportedLocale(locale)) return locale;
  return DEFAULT_LOCALE;
}

function normalizeAddress(raw: z.infer<typeof addressSchema>) {
  return {
    street: raw.street.trim(),
    houseNumber: raw.houseNumber.trim(),
    line2: raw.line2?.trim() || "",
    postalCode: raw.postalCode.trim(),
    city: raw.city.trim(),
    country: raw.country.trim(),
  };
}

function normalizeIban(raw?: string | null) {
  return raw?.replace(/\s+/g, "").toUpperCase() ?? "";
}

function normalizeBic(raw?: string | null) {
  return raw?.replace(/\s+/g, "").toUpperCase() ?? "";
}

function isValidIban(iban: string) {
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z]{2}[0-9A-Z]+$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const value = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const digit of value) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

function isValidBic(bic: string) {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);
}

function normalizeBirthDate(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // akzeptiere YYYY-MM-DD oder DD.MM.YYYY
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const deMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  let yyyy: string | null = null;
  let mm: string | null = null;
  let dd: string | null = null;

  if (isoMatch) {
    [, yyyy, mm, dd] = isoMatch;
  } else if (deMatch) {
    [, dd, mm, yyyy] = deMatch;
  }

  if (!yyyy || !mm || !dd) {
    return null;
  }

  const normalized = `${yyyy}-${mm}-${dd}`;
  if (!parseIsoDateStrict(normalized)) return null;
  return normalized;
}

function parseIsoDateStrict(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return isValid ? date : null;
}

function isAtLeastAge(isoBirthDate: string, minAge: number): boolean {
  const birthDate = parseIsoDateStrict(isoBirthDate);
  if (!birthDate) return false;
  const now = new Date();
  const latestAllowed = new Date(Date.UTC(now.getUTCFullYear() - minAge, now.getUTCMonth(), now.getUTCDate()));
  return birthDate.getTime() <= latestAllowed.getTime();
}