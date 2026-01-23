// apps/web/src/app/api/_echo/route.ts
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { ok: true, where: "app/api/_echo" },
    { status: 200 },
  );
}
