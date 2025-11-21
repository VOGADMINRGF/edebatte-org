export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";

function isAdmin(req: NextRequest) {
  const role = req.cookies.get("u_role")?.value || "guest";
  return role === "admin" || role === "superadmin";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = req.nextUrl;
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("limit") || 25)),
  );
  const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));

  const Users = await getCol("users");

  const filter: any = q
    ? {
        $or: [
          { email: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    Users.find(filter, {
      projection: {
        email: 1,
        name: 1,
        role: 1,
        verifiedEmail: 1,
        emailVerified: 1,
        verification: 1,
        suspended: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    Users.countDocuments(filter),
  ]);

  return NextResponse.json({ ok: true, items, total, limit, skip });
}
