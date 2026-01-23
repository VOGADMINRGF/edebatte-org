//
// apps/web/src/app/api/you/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { youQuery } from "@features/utils/ai/youClient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { query, options } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    const result = await youQuery(query, options ?? {});
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[api/you/query] error", e?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
