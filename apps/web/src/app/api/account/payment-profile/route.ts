import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId } from "@core/db/triMongo";
import { upsertUserPaymentProfile, getUserPaymentProfile } from "@core/db/pii/userPaymentProfiles";
import { applyStrongVerificationIfComplete } from "@core/auth/verificationProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  iban: z.string().min(8),
  bic: z.string().optional(),
  holderName: z.string().min(2).max(120),
});

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(iban: string) {
  const cleaned = normalizeIban(iban);
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  if (!/^[A-Z]{2}[0-9A-Z]+$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
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

function maskIban(iban: string) {
  const clean = normalizeIban(iban);
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  const middleLength = Math.max(0, clean.length - 8);
  const maskedMiddle = "*".repeat(middleLength);
  const combined = `${start}${maskedMiddle}${end}`;
  return combined.match(/.{1,4}/g)?.join(" ") ?? `${start} **** ${end}`;
}

function validateBic(bic?: string) {
  if (!bic) return null;
  const normalized = bic.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized)) {
    throw new Error("invalid_bic");
  }
  return normalized;
}

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const profile = await getUserPaymentProfile(new ObjectId(userId));
  return NextResponse.json({
    ok: true,
    paymentProfile: profile
      ? {
          ibanMasked: profile.ibanMasked,
          holderName: profile.holderName,
          bic: profile.bic ?? null,
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const iban = normalizeIban(parsed.data.iban);
  if (!isValidIban(iban)) {
    return NextResponse.json({ ok: false, error: "invalid_iban" }, { status: 400 });
  }

  let bic: string | null = null;
  try {
    bic = validateBic(parsed.data.bic);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "invalid_bic" }, { status: 400 });
  }

  const masked = maskIban(iban);
  const holderName = parsed.data.holderName.trim();
  const userObjectId = new ObjectId(userId);

  const profile = await upsertUserPaymentProfile(userObjectId, {
    ibanMasked: masked,
    bic,
    holderName,
    verifiedBy: "manual",
  });

  await applyStrongVerificationIfComplete(userObjectId);

  return NextResponse.json({
    ok: true,
    paymentProfile: {
      ibanMasked: profile?.ibanMasked ?? masked,
      holderName: profile?.holderName ?? holderName,
      bic: profile?.bic ?? bic,
    },
  });
}
