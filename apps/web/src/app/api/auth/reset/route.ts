import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ResetSetSchema } from "@/utils/authSchemas";
import { consumeToken } from "@/utils/tokens";
import { coreCol, piiCol, ObjectId } from "@core/db/triMongo";
import { CREDENTIAL_COLLECTION } from "../sharedAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const { token, password } = ResetSetSchema.parse(body);

  const uid = await consumeToken(token, "reset");
  if (!uid)
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, rounds);

  const userId = ObjectId.createFromHexString(uid);
  const users = await coreCol("users");
  await users.updateOne({ _id: userId }, { $set: { passwordHash } });

  const creds = await piiCol(CREDENTIAL_COLLECTION);
  await creds.updateOne(
    { coreUserId: userId },
    {
      $set: { passwordHash },
      $setOnInsert: { coreUserId: userId },
      $currentDate: { updatedAt: true },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
