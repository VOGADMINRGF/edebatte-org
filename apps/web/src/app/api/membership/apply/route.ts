import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId, getCol } from "@core/db/triMongo";
import { upsertPiiProfile } from "@core/pii/userProfileService";
import { insertMembershipApplication, type MembershipPackage } from "@core/membership/applications";
import { BANK_DETAILS } from "@/config/banking";
import { sendMail } from "@/utils/mailer";
import { buildMembershipConfirmationMail } from "@/utils/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEMBERSHIP_SCHEMA = z.object({
  plan: z.enum(["basis", "pro", "premium"]),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(160),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional().nullable(),
  street: z.string().min(3).max(160),
  postalCode: z.string().min(3).max(20),
  city: z.string().min(2).max(120),
  country: z.string().min(2).max(120),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  notes: z.string().max(2000).optional(),
});

const PLAN_LABEL: Record<MembershipPackage, string> = {
  basis: "Basis (0 €)",
  pro: "Pro (14,99 €)",
  premium: "Premium (34,99 €)",
};

const PLAN_PRICE: Record<MembershipPackage, number> = {
  basis: 0,
  pro: 14.99,
  premium: 34.99,
};

export async function POST(req: NextRequest) {
  if (process.env.MEMBERSHIP_LEGACY_APPLY_DISABLED !== "0") {
    return NextResponse.json(
      {
        ok: false,
        error: "deprecated_endpoint",
        message: "Dieser Endpoint ist veraltet. Bitte nutze /mitglied-antrag.",
        next: "/mitglied-antrag",
      },
      { status: 410 },
    );
  }

  const cookieStore = cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = MEMBERSHIP_SCHEMA.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const body = parsed.data;
  const plan = body.plan;
  const basePrice = PLAN_PRICE[plan];
  const monthlyAmount = roundCurrency(basePrice);

  const oid = new ObjectId(userId);
  const Users = await getCol("users");
  const userDoc = await Users.findOne(
    { _id: oid },
    { projection: { email: 1, name: 1, membership: 1, profile: 1 } },
  );
  if (!userDoc) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  const now = new Date();
  const reference = buildReferenceCode(oid);

  await upsertPiiProfile(oid, {
    email: body.email,
    phone: body.phone ?? null,
    givenName: body.firstName,
    familyName: body.lastName,
    fullName: `${body.firstName} ${body.lastName}`.trim(),
    birthDate: body.birthDate && body.birthDate.length ? body.birthDate : null,
    address: {
      street: body.street,
      postalCode: body.postalCode,
      city: body.city,
      country: body.country,
    },
  });

  const applicationId = await insertMembershipApplication({
    userId: oid,
    plan,
    monthlyAmountEUR: monthlyAmount,
    reference: `${BANK_DETAILS.referenceHint} · ${reference}`,
    notes: body.notes ?? null,
    contact: {
      email: body.email,
      phone: body.phone ?? null,
      firstName: body.firstName,
      lastName: body.lastName,
    },
    address: {
      street: body.street,
      postalCode: body.postalCode,
      city: body.city,
      country: body.country,
    },
    birthDate: body.birthDate && body.birthDate.length ? body.birthDate : null,
    status: "received",
  });

  const membershipUpdate: Record<string, any> = {
    "membership.lastApplication": {
      plan,
      monthlyAmountEUR: monthlyAmount,
      submittedAt: now,
      notes: body.notes ?? null,
    },
    updatedAt: now,
  };

  if (!userDoc.membership || userDoc.membership.status === "none" || userDoc.membership.status === "pending") {
    membershipUpdate["membership.status"] = "pending";
    membershipUpdate["membership.plan"] = plan;
    membershipUpdate["membership.monthlyAmountEUR"] = monthlyAmount;
  }

  await Users.updateOne({ _id: oid }, { $set: membershipUpdate });

  const mail = buildMembershipConfirmationMail({
    firstName: body.firstName,
    planLabel: PLAN_LABEL[plan],
    monthlyAmount,
    reference: `${BANK_DETAILS.referenceHint} · ${reference}`,
    bank: BANK_DETAILS,
  });

  await sendMail({
    to: body.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return NextResponse.json({
    ok: true,
    applicationId: String(applicationId),
    reference: `${BANK_DETAILS.referenceHint} · ${reference}`,
    monthlyAmount,
    bank: BANK_DETAILS,
  });
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function buildReferenceCode(userId: ObjectId) {
  const suffix = userId.toHexString().slice(-6).toUpperCase();
  const timeCode = Date.now().toString(36).toUpperCase();
  return `EDB-${timeCode}-${suffix}`;
}
