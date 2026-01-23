import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "DISABLED",
      message:
        "Intern queue endpoint disabled in web workspace. Use /api/factcheck/enqueue instead.",
    },
    { status: 404 },
  );
}

