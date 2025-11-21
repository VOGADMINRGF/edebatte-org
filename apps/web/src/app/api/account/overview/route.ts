import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAccountOverview } from "@features/account/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const overview = await getAccountOverview(userId);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, overview });
}
