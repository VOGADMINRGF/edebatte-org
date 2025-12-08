// apps/web/src/app/api/auth/totp/totpHelpers.ts
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generiert ein Base32-Secret (ca. 160 Bit, RFC-konform für Google Authenticator).
 */
export function generateTotpSecret(byteLength = 20): string {
  const buf = randomBytes(byteLength);
  return base32Encode(buf);
}

/**
 * Prüft einen TOTP-Code gegen ein Base32-Secret.
 * Standard: 6 Stellen, 30-Sekunden-Fenster, ±1 Zeitschritt Toleranz.
 */
export function verifyTotpToken(
  token: string,
  secret: string,
  opts?: {
    stepSeconds?: number;
    digits?: number;
    window?: number;
    timestampMs?: number;
  },
): boolean {
  const stepSeconds = opts?.stepSeconds ?? 30;
  const digits = opts?.digits ?? 6;
  const window = opts?.window ?? 1;
  const timestampMs = opts?.timestampMs ?? Date.now();

  const normalizedToken = String(token).replace(/\s+/g, "");
  const expectedTokenBuf = Buffer.from(normalizedToken);

  const secretBuf = base32Decode(secret);
  const counterNow = Math.floor(timestampMs / 1000 / stepSeconds);

  for (let offset = -window; offset <= window; offset++) {
    const counter = counterNow + offset;
    if (counter < 0) continue;

    const code = generateCode(secretBuf, counter, digits);
    const codeBuf = Buffer.from(code);

    if (
      codeBuf.length === expectedTokenBuf.length &&
      timingSafeEqual(codeBuf, expectedTokenBuf)
    ) {
      return true;
    }
  }

  return false;
}

/** Interne Helfer **/

function generateCode(secret: Buffer, counter: number, digits: number): string {
  const counterBuf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const modulo = 10 ** digits;
  const otp = binary % modulo;

  return otp.toString().padStart(digits, "0");
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const index = (value >>> (bits - 5)) & 31;
      output += BASE32_ALPHABET[index];
      bits -= 5;
    }
  }

  if (bits > 0) {
    const index = (value << (5 - bits)) & 31;
    output += BASE32_ALPHABET[index];
  }

  // Auth-Apps akzeptieren Base32 normalerweise ohne '='-Padding.
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}
