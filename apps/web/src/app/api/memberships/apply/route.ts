import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId, coreCol, piiCol } from "@core/db/triMongo";
import { z } from "zod";
import { upsertMembershipPaymentProfile } from "@core/db/pii/userPaymentProfiles";
import { safeRandomId } from "@core/utils/random";
import { sendMail } from "@/utils/mailer";
import {
  buildHouseholdInviteMail,
  buildMembershipApplyAdminMail,
  buildMembershipApplyUserMail,
} from "@/utils/emailTemplates";
import type { MembershipApplication, HouseholdMemberRef } from "@core/memberships/types";
import type { HouseholdInvite } from "@core/pii/households/types";
import {
  logIdentityEvent,
  logHouseholdInviteSent,
  logMembershipApplySubmitted,
} from "@core/telemetry/identityEvents";
import { resolveRegionInfo } from "@core/geo/region";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_COUNTRY = (process.env.GEO_DEFAULT_COUNTRY ?? "de").toLowerCase();

const memberSchema = z.object({
  givenName: z.string().min(1).max(120).optional(),
  familyName: z.string().min(1).max(160).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  email: z.string().email().optional(),
  role: z.enum(["primary", "adult", "youth"]).default("adult"),
});

const paymentSchema = z.object({
  type: z.literal("bank_transfer"),
  billingName: z.string().min(2).max(200),
  street: z.string().min(2).max(200).optional(),
  postalCode: z.string().min(2).max(20).optional(),
  city: z.string().min(2).max(100).optional(),
  country: z.string().min(2).max(100).optional(),
  iban: z.string().min(10).max(40).optional(),
  mandateReference: z.string().max(140).optional(),
  geo: z
    .object({
      lat: z.coerce.number(),
      lon: z.coerce.number(),
      label: z.string().optional(),
    })
    .optional(),
});

const bodySchema = z.object({
  amountPerPeriod: z.coerce.number().min(0),
  membershipAmountPerMonth: z.coerce.number().min(0).optional(),
  peopleCount: z.coerce.number().int().min(1).max(20).optional(),
  rhythm: z.enum(["monthly", "once", "yearly"]),
  householdSize: z.coerce.number().int().min(1).max(20),
  members: z.array(memberSchema).min(1),
  payment: paymentSchema,
  legalTransparencyAccepted: z.boolean(),
  legalStatuteAccepted: z.boolean(),
  edebatte: z
    .object({
      enabled: z.boolean(),
      planKey: z
        .enum(["basis", "start", "pro", "edb-basis", "edb-start", "edb-pro"])
        .optional(),
      listPricePerMonth: z.coerce.number().optional(),
      discountPercent: z.coerce.number().optional(),
      finalPricePerMonth: z.coerce.number().optional(),
      billingMode: z.enum(["monthly", "yearly"]).optional(),
    })
    .optional(),
});

function normalizeIban(raw?: string) {
  return raw?.replace(/\s+/g, "").toUpperCase();
}

function maskIban(raw?: string) {
  if (!raw) return "";
  const cleaned = normalizeIban(raw) ?? "";
  if (cleaned.length <= 8) return cleaned;
  const last4 = cleaned.slice(-4);
  return `${cleaned.slice(0, 2)}** **** **** ${last4}`;
}

export async function POST(req: NextRequest) {
  const parsedBody = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[membership/apply] invalid_input", parsedBody.error.issues);
    }
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_input",
        message: "Ungültige Eingabedaten.",
        issues: process.env.NODE_ENV !== "production" ? parsedBody.error.issues : undefined,
      },
      { status: 400 },
    );
  }
  const body = parsedBody.data;

  const paymentEnv = {
    accountMode: (process.env.VOG_ACCOUNT_MODE as any) || "private_preUG",
    recipient: process.env.VOG_PAYMENT_BANK_RECIPIENT || "PLEASE_SET_RECIPIENT",
    iban: process.env.VOG_PAYMENT_BANK_IBAN || "PLEASE_SET_IBAN",
    bic: process.env.VOG_PAYMENT_BANK_BIC || "",
    bankName: process.env.VOG_PAYMENT_BANK_NAME || "",
    referencePrefix: process.env.VOG_PAYMENT_REFERENCE_PREFIX || "VOG-",
  };
  const geoRegion =
    body.payment.geo && Number.isFinite(body.payment.geo.lat) && Number.isFinite(body.payment.geo.lon)
      ? await resolveRegionInfo({
          lat: body.payment.geo.lat,
          lon: body.payment.geo.lon,
          countryCode: DEFAULT_COUNTRY.toUpperCase(),
          postalCode: body.payment.postalCode ?? undefined,
          city: body.payment.city ?? undefined,
        })
      : null;

  if (!body.legalTransparencyAccepted || !body.legalStatuteAccepted) {
    return NextResponse.json(
      { ok: false, error: "legal_required" },
      { status: 400 },
    );
  }

  if (body.members.length > body.householdSize) {
    return NextResponse.json(
      { ok: false, error: "household_mismatch" },
      { status: 400 },
    );
  }

  const hasPrimary = body.members.some((m) => m.role === "primary");
  if (!hasPrimary) {
    return NextResponse.json(
      { ok: false, error: "primary_required" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const Users = await coreCol("users");
  const user = await Users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1, name: 1, emailVerified: 1, verification: 1 } },
  );
  if (!user || user.emailVerified === false) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 403 });
  }

  // Zahlungsprofil anlegen/updaten
  const paymentProfileId = await upsertMembershipPaymentProfile(new ObjectId(userId), {
    type: body.payment.type,
    billingName: body.payment.billingName,
    billingAddress: {
      street: body.payment.street,
      postalCode: body.payment.postalCode,
      city: body.payment.city,
      country: body.payment.country,
    },
    iban: normalizeIban(body.payment.iban),
    mandateReference: body.payment.mandateReference,
  });

  const now = new Date();
  const MembersCol = await coreCol<MembershipApplication>("membership_applications");
  const membershipId = new ObjectId();
  const paymentReference = `${paymentEnv.referencePrefix}${String(membershipId).slice(-6)}`;
  const dunningFirstDays = Number(process.env.VOG_DUNNING_DAYS_FIRST ?? "7");
  const firstDueAt = new Date(now.getTime() + Math.max(1, dunningFirstDays) * 24 * 60 * 60 * 1000);

  const memberRefs: HouseholdMemberRef[] = body.members.map((m) => ({
    email: m.email ?? null,
    givenName: m.givenName ?? null,
    familyName: m.familyName ?? null,
    birthDate: m.birthDate ?? null,
    role: m.role,
    status: m.role === "primary" ? "active" : "invited",
  }));

  const application: MembershipApplication = {
    _id: membershipId,
    coreUserId: new ObjectId(userId),
    householdSize: body.householdSize,
    peopleCount: body.peopleCount ?? body.householdSize,
    membershipAmountPerMonth: body.membershipAmountPerMonth ?? body.amountPerPeriod,
    members: memberRefs,
    amountPerPeriod: body.amountPerPeriod,
    rhythm: body.rhythm,
    edebatte: body.edebatte ?? { enabled: false },
    paymentProfileId,
    paymentMethod: "bank_transfer",
    paymentReference,
    paymentInfo: {
      method: "bank_transfer",
      reference: paymentReference,
      bankRecipient: paymentEnv.recipient,
      bankIbanMasked: maskIban(paymentEnv.iban),
      bankBic: paymentEnv.bic || null,
      bankName: paymentEnv.bankName || null,
      accountMode: paymentEnv.accountMode as any,
      mandateStatus: "planned",
    },
    legalAcceptedAt: now,
    transparencyVersion: "2025-12-01",
    statuteVersion: "Entwurf-2026-v1",
    firstDueAt,
    dunningLevel: 0,
    lastReminderSentAt: null,
    cancelledAt: null,
    cancelledReason: null,
    status: "waiting_payment",
    createdAt: now,
    updatedAt: now,
    address: body.payment.street
      ? {
          street: body.payment.street,
          postalCode: body.payment.postalCode,
          city: body.payment.city,
          country: body.payment.country,
          geo: body.payment.geo
            ? {
                lat: body.payment.geo.lat,
                lon: body.payment.geo.lon,
                label: body.payment.geo.label,
                region: geoRegion ?? undefined,
              }
            : undefined,
        }
      : undefined,
  };

  await MembersCol.insertOne(application);

  // Snapshot im User aktualisieren
  await Users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        "membership.status": "waiting_payment",
        "membership.amountPerMonth": application.membershipAmountPerMonth ?? application.amountPerPeriod,
        "membership.rhythm": application.rhythm,
        "membership.householdSize": application.householdSize,
        "membership.peopleCount": application.peopleCount ?? application.householdSize,
        "membership.submittedAt": now,
        "membership.applicationId": application._id,
        "membership.edebatte": application.edebatte,
        "membership.paymentMethod": application.paymentMethod ?? null,
        "membership.paymentReference": paymentReference,
        "membership.paymentInfo": application.paymentInfo,
        updatedAt: now,
      },
    },
  );

  // Household Invites nur für Nicht-Primaries mit E-Mail
  const invitesCol = await piiCol<HouseholdInvite>("household_invites");
  const inviteTargets = memberRefs.filter(
    (m) => m.role !== "primary" && m.email && m.email !== user.email,
  );
  let invitesCreated = 0;
  const inviteTokens: { email: string; token: string; name?: string | null }[] = [];
  if (inviteTargets.length > 0) {
    const invites: HouseholdInvite[] = inviteTargets.map((m) => ({
      _id: new ObjectId(),
      membershipId: application._id,
      coreUserId: new ObjectId(userId),
      targetEmail: m.email!,
      targetGivenName: m.givenName ?? null,
      targetFamilyName: m.familyName ?? null,
      token: safeRandomId(),
      status: "pending",
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    }));
    await invitesCol.insertMany(invites);
    invitesCreated = invites.length;
    inviteTokens.push(
      ...invites.map((inv) => ({
        email: inv.targetEmail,
        token: inv.token,
        name: [inv.targetGivenName, inv.targetFamilyName].filter(Boolean).join(" "),
      })),
    );
  }

  // Mails
  const payerMail = user.email;
  const payerName = user.name || memberRefs.find((m) => m.role === "primary")?.givenName || "Mitglied";
  if (payerMail) {
    const mail = buildMembershipApplyUserMail({
      displayName: payerName,
      amountPerPeriod: body.amountPerPeriod,
      rhythm: body.rhythm,
      householdSize: body.householdSize,
      membershipId: String(application._id),
      edebatte: body.edebatte,
      paymentMethod: application.paymentMethod,
      paymentReference,
      paymentInfo: application.paymentInfo,
    });
    await sendMail({
      to: payerMail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  const adminTo = process.env.MAIL_ADMIN_TO || "members@voiceopengov.org";
  const adminMail = buildMembershipApplyAdminMail({
    membershipId: String(application._id),
    userId: String(userId),
    email: user.email ?? "n/a",
    amountPerPeriod: body.amountPerPeriod,
    rhythm: body.rhythm,
    householdSize: body.householdSize,
    paymentMethod: application.paymentMethod,
    paymentReference,
  });
  await sendMail({
    to: adminTo,
    subject: adminMail.subject,
    html: adminMail.html,
    text: adminMail.text,
  });

  try {
    await logMembershipApplySubmitted({
      userId: String(userId),
      membershipId: String(application._id),
      amountPerPeriod: body.amountPerPeriod,
      rhythm: body.rhythm,
      householdSize: body.householdSize,
    });
  } catch (err) {
    console.error("[membership.apply] telemetry failed", err);
  }

  if (invitesCreated > 0) {
    const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const base = origin.replace(/\/$/, "");
    for (const inv of inviteTokens) {
      const inviteUrl = `${base}/register?invite=${encodeURIComponent(inv.token)}`;
      const inviteMail = buildHouseholdInviteMail({
        targetName: inv.name,
        inviteUrl,
        inviterName: payerName,
      });
      await sendMail({
        to: inv.email,
        subject: inviteMail.subject,
        html: inviteMail.html,
        text: inviteMail.text,
      });
    }

    try {
      await logHouseholdInviteSent({
        userId: String(userId),
        membershipId: String(application._id),
        inviteCount: invitesCreated,
      });
    } catch (err) {
      console.error("[membership.apply] invite telemetry failed", err);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        membershipId: String(application._id),
        invitesCreated,
      },
    },
    { status: 201 },
  );
}
