// apps/web/src/features/security/crypto.ts
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";
const ALG = "aes-256-gcm";

export function deriveKey(secret: string, salt?: Buffer) {
  const s = salt ?? randomBytes(16);
  const key = scryptSync(secret, s, 32);
  return { key, salt: s };
}
export function encryptString(plaintext: string, secret: string) {
  const { key, salt } = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { alg: ALG, salt: salt.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64"), data: enc.toString("base64") };
}
export function decryptString(payload: { alg: string; salt: string; iv: string; tag: string; data: string; }, secret: string) {
  if (payload.alg !== ALG) throw new Error("ALG_MISMATCH");
  const salt = Buffer.from(payload.salt, "base64");
  const iv   = Buffer.from(payload.iv,   "base64");
  const tag  = Buffer.from(payload.tag,  "base64");
  const data = Buffer.from(payload.data, "base64");
  const { key } = deriveKey(secret, salt);
  const dec = createDecipheriv(ALG, key, iv);
  dec.setAuthTag(tag);
  const out = Buffer.concat([dec.update(data), dec.final()]);
  return out.toString("utf8");
}
