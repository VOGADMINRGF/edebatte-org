// E200: Short-lived opaque token for validated HumanCheck submissions.
import { randomUUID, createSecretKey } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const DEFAULT_SECRET = "dev-humanchk-secret";

function getSecretKey() {
  const secret = process.env.HUMAN_CHECK_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
  return createSecretKey(Buffer.from(secret));
}

export async function signHumanToken(payload: { formId?: string; timeToSolve: number; puzzleSeed: string }) {
  const secret = getSecretKey();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    formId: payload.formId ?? "public-updates",
    timeToSolve: payload.timeToSolve,
    puzzleSeed: payload.puzzleSeed,
    nonce: randomUUID(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(nowSeconds)
    .setExpirationTime("10m")
    .sign(secret);
  return jwt;
}

type HumanTokenVerifyResult =
  | { ok: true; payload: JWTPayload }
  | { ok: false; code: "expired" | "invalid" };

function decodeJwtPayload(token: string): JWTPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyHumanTokenDetailed(token: string): Promise<HumanTokenVerifyResult> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return { ok: true, payload };
  } catch {
    const decoded = decodeJwtPayload(token);
    const expRaw = typeof decoded?.exp === "number" ? decoded.exp : Number(decoded?.exp);
    if (Number.isFinite(expRaw) && expRaw * 1000 < Date.now()) {
      return { ok: false, code: "expired" };
    }
    return { ok: false, code: "invalid" };
  }
}

export async function verifyHumanToken(token: string): Promise<JWTPayload | null> {
  const result = await verifyHumanTokenDetailed(token);
  return result.ok ? result.payload : null;
}
