"use server";
import { randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "csrf_token";

export function issueCsrfToken(): string {
  const token = randomBytes(32).toString("hex");
  cookies().set(COOKIE, token, { httpOnly: true, path: "/", sameSite: "lax" });
  return token;
}

export function verifyCsrfToken(provided?: string | null): boolean {
  const stored = cookies().get(COOKIE)?.value;
  if (!stored || !provided) return false;
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
