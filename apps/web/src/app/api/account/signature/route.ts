import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId } from "@core/db/triMongo";
import { upsertUserSignature } from "@core/db/pii/userSignatures";
import { applyStrongVerificationIfComplete } from "@core/auth/verificationProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["digital", "id_document"]).default("digital"),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }
  const json = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  const userObjectId = new ObjectId(userId);
  const signature = await upsertUserSignature(userObjectId, parsed.success ? parsed.data.kind : "digital", {
    provider: "manual",
  });
  await applyStrongVerificationIfComplete(userObjectId);
  return NextResponse.json({
    ok: true,
    signature: signature
      ? { kind: signature.kind, storedAt: signature.storedAt }
      : { kind: parsed.data?.kind ?? "digital", storedAt: new Date() },
  });
}
