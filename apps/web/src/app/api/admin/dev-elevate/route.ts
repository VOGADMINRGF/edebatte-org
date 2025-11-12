// apps/web/src/app/api/admin/dev-elevate/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCookie } from "@/lib/http/typedCookies";
import { getCol, ObjectId } from "@core/triMongo";


export async function POST(_req: NextRequest) {
  // Hart stoppen in Production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN" },
      { status: 403 },
    );
  }

  // UID aus Cookie lesen (Helper ist async)
  const uid = await getCookie("u_id");
  if (!uid || !ObjectId.isValid(uid)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const Users = await getCol("users");
    await Users.updateOne(
      { _id: new ObjectId(uid) },
      { $set: { role: "admin", updatedAt: new Date() } },
      { upsert: false },
    );

    const res = NextResponse.json({ ok: true });
    // Rolle auch als Cookie setzen (nur für Dev, lax reicht)
    res.cookies.set("u_role", "admin", {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "ELEVATE_FAILED" },
      { status: 500 },
    );
  }
}
