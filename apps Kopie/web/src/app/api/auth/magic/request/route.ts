import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "magic_login_disabled" },
    { status: 410 },
  );
}
