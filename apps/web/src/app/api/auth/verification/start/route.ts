import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId, getCol } from "@core/db/triMongo";
import { startIdentityVerification } from "@core/auth/identityVerificationService";
import { logIdentityEvent } from "@core/telemetry/identityEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  method: z.enum(["otb_app", "eid_scan"]),
});

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

  const Users = await getCol("users");
  const user = await Users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { verifiedEmail: 1, emailVerified: 1 } },
  );
  if (!user || !(user.verifiedEmail || user.emailVerified)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 403 });
  }

  const session = await startIdentityVerification(new ObjectId(userId), parsed.data.method);
  await logIdentityEvent("identity_otb_start", {
    userId,
    meta: { method: parsed.data.method, provider: session.provider },
  });
  return NextResponse.json({
    ok: true,
    sessionId: session._id.toString(),
    status: session.status,
    provider: session.provider,
  });
}
