// apps/web/src/utils/tokens.ts
import crypto from "crypto";
import { piiCol } from "@core/db/triMongo";

type TokenType = "verify" | "reset";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function createToken(
  userId: string,
  type: TokenType,
  ttlMinutes: number,
) {
  const raw = crypto.randomBytes(24).toString("hex");
  const tokenHash = sha256(raw);
  const col = await piiCol("tokens");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await col.insertOne({
    userId,
    type,
    tokenHash,
    expiresAt,
    usedAt: null,
    createdAt: new Date(),
  });
  return raw;
}

export async function consumeToken(raw: string, type: TokenType) {
  const col = await piiCol("tokens");
  const tokenHash = sha256(raw);
  const doc = await col.findOne({
    tokenHash,
    type,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!doc) return null;
  await col.updateOne({ _id: doc._id }, { $set: { usedAt: new Date() } });
  return doc.userId as string;
}
