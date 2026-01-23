import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") || "/login";
  return NextResponse.redirect(
    new URL(`/login?error=magic_disabled&next=${encodeURIComponent(next)}`, url.origin),
  );
}
