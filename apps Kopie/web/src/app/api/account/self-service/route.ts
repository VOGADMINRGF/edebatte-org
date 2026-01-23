import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol, ObjectId } from "@core/db/triMongo";
import { piiCol } from "@core/db/db/triMongo";
import { sendMail } from "@/utils/mailer";
import { verifyPassword } from "@/utils/password";
import { clearSession, readSession } from "@/utils/session";
import { CREDENTIAL_COLLECTION } from "../../auth/sharedAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["cancel_membership", "delete_account"]),
  note: z.string().max(1000).optional(),
  password: z.string().min(8).optional(),
});

export async function POST(req: NextRequest) {
  const session = await readSession();
  const userId = session?.uid ?? null;

  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const { action, note, password } = parsed.data;
  const oid = new ObjectId(userId);
  const Users = await coreCol("users");
  const user = await Users.findOne(
    { _id: oid },
    { projection: { email: 1, name: 1, profile: 1, membership: 1 } },
  );
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  const now = new Date();
  const reason = (note ?? "").trim().slice(0, 240) || action;
  const membershipSet: Record<string, unknown> = {
    "membership.status": "cancelled",
    "membership.cancelledAt": now,
    "membership.cancelledReason": reason,
    "membership.endedByUser": true,
  };

  if (action === "cancel_membership") {
    await Users.updateOne(
      { _id: oid },
      {
        $set: {
          ...membershipSet,
          updatedAt: now,
        },
      },
    );
  } else {
    if (!password) {
      return NextResponse.json({ ok: false, error: "password_required" }, { status: 400 });
    }
    const credsCol = await piiCol(CREDENTIAL_COLLECTION);
    const creds = await credsCol.findOne({ coreUserId: oid }, { projection: { passwordHash: 1 } });
    if (!creds?.passwordHash) {
      return NextResponse.json({ ok: false, error: "credentials_missing" }, { status: 400 });
    }
    const pwdOk = await verifyPassword(password, String(creds.passwordHash));
    if (!pwdOk) {
      return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
    }

    await Users.updateOne(
      { _id: oid },
      {
        $set: {
          ...membershipSet,
          accountDeletion: {
            status: "requested",
            requestedAt: now,
            reason,
          },
          updatedAt: now,
        },
      },
    );
  }

  const Applications = await coreCol("membership_applications");
  await Applications.updateMany(
    { coreUserId: oid },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        cancelledReason: reason,
        updatedAt: now,
      },
    },
  );

  const to = process.env.CONTACT_INBOX || "members@edebatte.org";
  const safeName = (user as any)?.profile?.displayName || (user as any)?.name || "Unbekannt";
  const safeEmail = (user as any)?.email || "unbekannt";
  const html = `
    <h3>Selbst-Service Anfrage</h3>
    <p><strong>UserID:</strong> ${oid.toHexString()}</p>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>E-Mail:</strong> ${safeEmail}</p>
    <p><strong>Aktion:</strong> ${action}</p>
    <p><strong>Hinweis:</strong> ${reason || "–"}</p>
  `;

  await sendMail({
    to,
    subject: `[Self-Service] ${action === "cancel_membership" ? "Mitgliedschaft beenden" : "Account-Löschung"} angefordert`,
    html,
  });

  if (action === "delete_account") {
    await clearSession();
  }

  return NextResponse.json({
    ok: true,
    action,
    next: action === "delete_account" ? "/logout" : "/account",
  });
}
