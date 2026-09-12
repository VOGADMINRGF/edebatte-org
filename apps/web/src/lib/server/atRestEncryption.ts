import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const MAX_AT_REST_PLAINTEXT_BYTES = 64 * 1024;
export const AT_REST_ENVELOPE_VERSION = "v1" as const;
export const AT_REST_ALGORITHM = "aes-256-gcm" as const;
export const AT_REST_KEY_LENGTH_BYTES = 32;
export const AT_REST_IV_LENGTH_BYTES = 12;
export const AT_REST_AUTH_TAG_LENGTH_BYTES = 16;

const PURPOSES = ["create.guest-adoption-preparation"] as const;
const ENVELOPE_FIELDS = ["version", "algorithm", "keyVersion", "iv", "ciphertext", "authTag"] as const;
const KEY_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_CIPHERTEXT_ENCODED_LENGTH = (MAX_AT_REST_PLAINTEXT_BYTES + AT_REST_AUTH_TAG_LENGTH_BYTES) * 2;

export type AtRestEncryptionPurpose = (typeof PURPOSES)[number];

export type AtRestEnvelope = {
  version: typeof AT_REST_ENVELOPE_VERSION;
  algorithm: typeof AT_REST_ALGORITHM;
  keyVersion: string;
  iv: string;
  ciphertext: string;
  authTag: string;
};

export type AtRestEncryptionErrorCode =
  | "invalid_keyring"
  | "missing_active_key"
  | "invalid_key"
  | "malformed_envelope"
  | "unsupported_version"
  | "unsupported_algorithm"
  | "unknown_key_version"
  | "invalid_nonce"
  | "invalid_encoding"
  | "authentication_failed"
  | "plaintext_too_large"
  | "invalid_purpose";

export class AtRestEncryptionError extends Error {
  readonly code: AtRestEncryptionErrorCode;

  constructor(code: AtRestEncryptionErrorCode) {
    super(`at_rest_encryption_failed:${code}`);
    this.name = "AtRestEncryptionError";
    this.code = code;
  }
}

export type AtRestEncryptionConfig = {
  activeKeyVersion: string;
  keyring: string;
};

export type AtRestEncryption = {
  encryptAtRest(input: { purpose: AtRestEncryptionPurpose; plaintext: Uint8Array }): AtRestEnvelope;
  decryptAtRest(input: { purpose: AtRestEncryptionPurpose; envelope: unknown }): Uint8Array;
};

function fail(code: AtRestEncryptionErrorCode): never {
  throw new AtRestEncryptionError(code);
}

function assertPurpose(purpose: unknown): asserts purpose is AtRestEncryptionPurpose {
  if (typeof purpose !== "string" || !PURPOSES.includes(purpose as AtRestEncryptionPurpose)) {
    fail("invalid_purpose");
  }
}

function assertPlaintext(plaintext: unknown): asserts plaintext is Uint8Array {
  if (!(plaintext instanceof Uint8Array)) fail("plaintext_too_large");
  if (plaintext.byteLength > MAX_AT_REST_PLAINTEXT_BYTES) fail("plaintext_too_large");
}

function assertKeyVersion(value: unknown, code: AtRestEncryptionErrorCode): asserts value is string {
  if (typeof value !== "string" || !KEY_VERSION_PATTERN.test(value)) fail(code);
}

function decodeStandardBase64Key(value: string): Buffer {
  if (!BASE64_PATTERN.test(value)) fail("invalid_key");
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value || decoded.byteLength !== AT_REST_KEY_LENGTH_BYTES) {
    fail("invalid_key");
  }
  return decoded;
}

function parseKeyring(serialized: unknown, activeKeyVersion: unknown): Map<string, Buffer> {
  if (typeof serialized !== "string" || serialized.length === 0 || typeof activeKeyVersion !== "string") {
    fail("invalid_keyring");
  }
  assertKeyVersion(activeKeyVersion, "missing_active_key");

  const keyring = new Map<string, Buffer>();
  for (const entry of serialized.split(";")) {
    if (entry.length === 0) fail("invalid_keyring");
    const separator = entry.indexOf(":");
    if (separator <= 0 || separator !== entry.lastIndexOf(":")) fail("invalid_keyring");
    const version = entry.slice(0, separator);
    const encodedKey = entry.slice(separator + 1);
    assertKeyVersion(version, "invalid_keyring");
    if (keyring.has(version)) fail("invalid_keyring");
    keyring.set(version, decodeStandardBase64Key(encodedKey));
  }
  if (!keyring.has(activeKeyVersion)) fail("missing_active_key");
  return keyring;
}

function encodeBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function decodeBase64Url(value: unknown): Buffer {
  if (typeof value !== "string" || !BASE64URL_PATTERN.test(value) || value.includes("=")) fail("invalid_encoding");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) fail("invalid_encoding");
  return decoded;
}

function buildAad(purpose: AtRestEncryptionPurpose, keyVersion: string): Buffer {
  return Buffer.from(`edebatte:at-rest:${AT_REST_ENVELOPE_VERSION}|${AT_REST_ALGORITHM}|${keyVersion}|${purpose}`, "utf8");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function parseEnvelope(value: unknown): AtRestEnvelope {
  if (!isPlainObject(value)) fail("malformed_envelope");
  const keys = Object.keys(value).sort();
  if (keys.length !== ENVELOPE_FIELDS.length || keys.some((key, index) => key !== [...ENVELOPE_FIELDS].sort()[index])) {
    fail("malformed_envelope");
  }
  if (value.version !== AT_REST_ENVELOPE_VERSION) {
    if (typeof value.version === "string") fail("unsupported_version");
    fail("malformed_envelope");
  }
  if (value.algorithm !== AT_REST_ALGORITHM) {
    if (typeof value.algorithm === "string") fail("unsupported_algorithm");
    fail("malformed_envelope");
  }
  assertKeyVersion(value.keyVersion, "malformed_envelope");
  if (typeof value.iv !== "string" || typeof value.ciphertext !== "string" || typeof value.authTag !== "string") {
    fail("malformed_envelope");
  }
  if (value.ciphertext.length > MAX_CIPHERTEXT_ENCODED_LENGTH) fail("malformed_envelope");
  const iv = decodeBase64Url(value.iv);
  const ciphertext = decodeBase64Url(value.ciphertext);
  const authTag = decodeBase64Url(value.authTag);
  if (iv.byteLength !== AT_REST_IV_LENGTH_BYTES) fail("invalid_nonce");
  if (authTag.byteLength !== AT_REST_AUTH_TAG_LENGTH_BYTES) fail("malformed_envelope");
  if (ciphertext.byteLength > MAX_AT_REST_PLAINTEXT_BYTES) fail("plaintext_too_large");
  return value as AtRestEnvelope;
}

export function createAtRestEncryption(config: AtRestEncryptionConfig): AtRestEncryption {
  const keyring = parseKeyring(config?.keyring, config?.activeKeyVersion);
  const activeKeyVersion = config.activeKeyVersion;
  const activeKey = keyring.get(activeKeyVersion);
  if (!activeKey) fail("missing_active_key");

  return {
    encryptAtRest({ purpose, plaintext }) {
      assertPurpose(purpose);
      assertPlaintext(plaintext);
      const iv = randomBytes(AT_REST_IV_LENGTH_BYTES); // Fresh IVs provide probabilistic, not guaranteed, uniqueness.
      const cipher = createCipheriv(AT_REST_ALGORITHM, activeKey, iv);
      cipher.setAAD(buildAad(purpose, activeKeyVersion));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return {
        version: AT_REST_ENVELOPE_VERSION,
        algorithm: AT_REST_ALGORITHM,
        keyVersion: activeKeyVersion,
        iv: encodeBase64Url(iv),
        ciphertext: encodeBase64Url(ciphertext),
        authTag: encodeBase64Url(cipher.getAuthTag()),
      };
    },
    decryptAtRest({ purpose, envelope }) {
      assertPurpose(purpose);
      const parsed = parseEnvelope(envelope);
      const iv = decodeBase64Url(parsed.iv);
      const ciphertext = decodeBase64Url(parsed.ciphertext);
      const authTag = decodeBase64Url(parsed.authTag);
      const key = keyring.get(parsed.keyVersion);
      if (!key) fail("unknown_key_version");
      try {
        const decipher = createDecipheriv(AT_REST_ALGORITHM, key, iv);
        decipher.setAAD(buildAad(purpose, parsed.keyVersion));
        decipher.setAuthTag(authTag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        if (plaintext.byteLength > MAX_AT_REST_PLAINTEXT_BYTES) fail("plaintext_too_large");
        return new Uint8Array(plaintext);
      } catch (error) {
        if (error instanceof AtRestEncryptionError) throw error;
        fail("authentication_failed");
      }
    },
  };
}

function loadProductionConfig(): AtRestEncryptionConfig {
  const activeKeyVersion = process.env.EDEBATTE_AT_REST_ACTIVE_KEY_VERSION;
  const keyring = process.env.EDEBATTE_AT_REST_KEYRING;
  if (!activeKeyVersion) fail("missing_active_key");
  if (!keyring) fail("invalid_keyring");
  return { activeKeyVersion, keyring };
}

export function encryptAtRest(input: { purpose: AtRestEncryptionPurpose; plaintext: Uint8Array }): AtRestEnvelope {
  return createAtRestEncryption(loadProductionConfig()).encryptAtRest(input);
}

export function decryptAtRest(input: { purpose: AtRestEncryptionPurpose; envelope: unknown }): Uint8Array {
  return createAtRestEncryption(loadProductionConfig()).decryptAtRest(input);
}

export function encodeAtRestUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function decodeAtRestUtf8(value: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(value);
}
