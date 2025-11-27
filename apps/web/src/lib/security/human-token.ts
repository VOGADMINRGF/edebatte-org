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

export async function verifyHumanToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}
