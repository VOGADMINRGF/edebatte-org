// apps/web/src/app/api/auth/verify/route.ts
import { ObjectId } from "@core/triMongo";
import { NextResponse } from "next/server";
import { coreCol, piiCol } from "@core/db/triMongo";


export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const tokens = await piiCol("emailTokens");
    const row = await tokens.findOne({ type: "verify", token });
    if (!row)
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const users = await coreCol("users");
    await users.updateOne(
      { _id: new ObjectId(row.userId) },
      { $set: { verified: true, updatedAt: new Date() } },
    );
    await tokens.deleteOne({ _id: row._id });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal Error" },
      { status: 500 },
    );
  }
}
