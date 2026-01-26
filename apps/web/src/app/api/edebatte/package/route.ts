import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { coreCol, ObjectId } from "@core/db/triMongo";
import { sendMail } from "@/utils/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  package: z.string(),
  source: z.string().optional(),
  billingInterval: z.enum(["monthly", "yearly"]).optional(),
  prepay: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const userId = jar.get("u_id")?.value;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const normalizedPackage = parsed.data.package.replace(/^edb-/, "");
  if (!["basis", "start", "pro"].includes(normalizedPackage)) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const Users = await coreCol("users");
  const userObjectId = new ObjectId(userId);
  const existing = await Users.findOne(
    { _id: userObjectId },
    { projection: { email: 1, profile: 1, displayName: 1, firstName: 1, lastName: 1, edebatte: 1 } },
  );

  const currentPackage = (existing as any)?.edebatte?.package;
  const currentStatus = (existing as any)?.edebatte?.status;

  await Users.updateOne(
    { _id: userObjectId },
    {
      $set: {
        "edebatte.package": normalizedPackage,
        "edebatte.status": "preorder",
        "edebatte.updatedAt": new Date(),
        "edebatte.preorderAt": new Date(),
        "edebatte.source": parsed.data.source || "self_service",
        "edebatte.billingInterval": parsed.data.billingInterval || null,
        "edebatte.prepay": parsed.data.prepay ?? null,
      },
    },
  );

  const to =
    (existing as any)?.email ||
    (existing as any)?.profile?.email ||
    (existing as any)?.profile?.contactEmail ||
    null;

  const displayName =
    (existing as any)?.profile?.displayName ||
    (existing as any)?.displayName ||
    [existing?.firstName, existing?.lastName].filter(Boolean).join(" ") ||
    "";

  const isSame = currentPackage === normalizedPackage && currentStatus === "preorder";
  if (to && !isSame) {
    const planLabel =
      normalizedPackage === "basis"
        ? "eDebatte Basis"
        : normalizedPackage === "start"
          ? "eDebatte Start"
          : "eDebatte Pro";

    const subject = `Vorbestellung bestätigt: ${planLabel}`;
    const greeting = displayName ? `Hallo ${displayName},` : "Hallo,";
    const html = `
      <p>${greeting}</p>
      <p>vielen Dank für deine Vorbestellung von <strong>${planLabel}</strong>. Wir haben deinen Status im Profil hinterlegt.</p>
      <p><strong>Vorbestellung:</strong> −15% · <strong>Vorkasse:</strong> +10% · <strong>2 Jahre:</strong> +5% (max. 30%).</p>
      <p>Wenn du Vorkasse oder eine 2‑Jahres‑Option nutzen möchtest, antworte kurz auf diese E‑Mail. Wir senden dir dann die Zahlungsdetails.</p>
      <p>Danke für deine Unterstützung!<br/>Dein eDebatte‑Team</p>
    `;
    const text = `${greeting}\n\nVielen Dank für deine Vorbestellung von ${planLabel}. Wir haben deinen Status im Profil hinterlegt.\n\nVorbestellung: −15% · Vorkasse: +10% · 2 Jahre: +5% (max. 30%).\nWenn du Vorkasse oder eine 2‑Jahres‑Option nutzen möchtest, antworte kurz auf diese E‑Mail. Wir senden dir dann die Zahlungsdetails.\n\nDanke für deine Unterstützung!\nDein eDebatte‑Team`;
    await sendMail({ to, subject, html, text });
  }

  return NextResponse.json({ ok: true });
}
