// apps/web/src/utils/session.ts
export const runtime = "nodejs";

import { env } from "@/utils/env";
import { cookies } from "next/headers";
import { getCookie } from "@/lib/http/typedCookies";
import crypto from "node:crypto";

const COOKIE_NAME = "session_token";
if (!env.JWT_SECRET) throw new Error("env.JWT_SECRET missing");

export type SessionPayload = {
  uid: string;
  roles?: string[];
  iat: number; // ms epoch
  exp: number; // ms epoch
};

// ---------- intern: JWT (HS256) ----------
function b64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sign(payload: Record<string, any>) {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", env.JWT_SECRET!).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function verify(token: string): SessionPayload | null {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const data = `${h}.${p}`;
  const expected = b64url(crypto.createHmac("sha256", env.JWT_SECRET!).update(data).digest());
  if (expected !== s) return null;
  try {
    const obj = JSON.parse(Buffer.from(p, "base64").toString("utf8")) as SessionPayload;
    if (obj.exp && Date.now() >= obj.exp) return null;
    return obj;
  } catch {
    return null;
  }
}

// ---------- Helpers ----------
function toVal(v: unknown): string | undefined {
  return typeof v === "string" ? v : (v as any)?.value;
}

// ---------- API ----------
export async function getSessionToken(): Promise<string | undefined> {
  return toVal(await await getCookie(COOKIE_NAME));
}

export async function createSession(uid: string, roles: string[] = []) {
  const now = Date.now();
  const days = Number(env.SESSION_TTL_DAYS ?? 7);
  const exp = now + days * 24 * 60 * 60 * 1000;
  const token = sign({ uid, roles, iat: now, exp });

  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor((exp - now) / 1000),
  });

  return token;
}

export async function readSession(): Promise<SessionPayload | null> {
  const t = await getSessionToken();
  if (!t) return null;
  return verify(t);
}

export async function clearSession() {
  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  return verify(token);
}
