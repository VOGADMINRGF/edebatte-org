import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { getPiiProfile } from "@core/pii/userProfileService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const profile = await getPiiProfile(new ObjectId(userId));
  if (!profile) {
    return NextResponse.json({ ok: true, personal: null });
  }

  return NextResponse.json({
    ok: true,
    personal: {
      givenName: profile.personal?.givenName ?? null,
      familyName: profile.personal?.familyName ?? null,
      email: profile.contacts?.emailPrimary ?? null,
    },
  });
}
