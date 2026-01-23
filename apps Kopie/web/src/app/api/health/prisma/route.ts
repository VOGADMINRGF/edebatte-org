
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const now = await prisma.$queryRaw`SELECT NOW()`;
    return NextResponse.json({ ok: true, now });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
