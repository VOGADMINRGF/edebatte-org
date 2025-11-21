import bcrypt from "bcryptjs";
import { env } from "@/utils/env";

const DEFAULT_ROUNDS = 12;
const rounds = Math.max(
  DEFAULT_ROUNDS,
  Number.isFinite(Number(env.BCRYPT_ROUNDS)) ? Number(env.BCRYPT_ROUNDS) : DEFAULT_ROUNDS,
);

export async function hashPassword(plain: string) {
  if (!plain) throw new Error("hashPassword: empty password not allowed");
  return bcrypt.hash(String(plain), rounds);
}

export async function verifyPassword(plain: string, hash: string) {
  if (!hash) return false;
  return bcrypt.compare(String(plain), String(hash));
}
