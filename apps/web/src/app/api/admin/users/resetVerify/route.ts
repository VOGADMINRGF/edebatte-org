import { ObjectId } from "@core/triMongo";
import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";
import { piiCol } from "@core/db/triMongo";

import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const Users = await getCol("users");
  const u = await Users.findOne(
    { _id: new ObjectId(id) },
    { projection: { email: 1 } },
  );
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const Tokens = await piiCol("tokens");
  const token = crypto.randomBytes(24).toString("base64url");
  const now = new Date();
  const exp = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2);
  await Tokens.insertOne({
    type: "verify_email",
    userId: u._id,
    email: u.email,
    token,
    createdAt: now,
    expiresAt: exp,
  });

  const verifyLink = `/verify?email=${encodeURIComponent(u.email)}&token=${token}`;
  return NextResponse.json({ ok: true, verifyLink });
}
