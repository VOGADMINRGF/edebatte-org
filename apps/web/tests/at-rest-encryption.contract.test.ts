import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AT_REST_AUTH_TAG_LENGTH_BYTES,
  AT_REST_IV_LENGTH_BYTES,
  MAX_AT_REST_PLAINTEXT_BYTES,
  AtRestEncryptionError,
  createAtRestEncryption,
  decodeAtRestUtf8,
  decryptAtRest,
  encodeAtRestUtf8,
  encryptAtRest,
} from "@/lib/server/atRestEncryption";

const KEY_ONE = Buffer.alloc(32, 17).toString("base64");
const KEY_TWO = Buffer.alloc(32, 34).toString("base64");
const CONFIG = { activeKeyVersion: "v1", keyring: `v1:${KEY_ONE};v2:${KEY_TWO}` };
const PURPOSE = "create.guest-adoption-preparation" as const;
const bytes = (value: string) => new TextEncoder().encode(value);
const expectCode = (callback: () => unknown, code: string) => {
  expect(callback).toThrow(expect.objectContaining({ code }));
};

afterEach(() => vi.unstubAllEnvs());

describe("at-rest encryption foundation", () => {
  it("roundtrips bytes and UTF-8 without a production secret", () => {
    const crypto = createAtRestEncryption(CONFIG);
    const envelope = crypto.encryptAtRest({ purpose: PURPOSE, plaintext: bytes("Grüße 🔐") });
    expect(decodeAtRestUtf8(crypto.decryptAtRest({ purpose: PURPOSE, envelope }))).toBe("Grüße 🔐");
    expect(decodeAtRestUtf8(encodeAtRestUtf8("äöüß"))).toBe("äöüß");
  });

  it("uses fresh probabilistically unique IVs and never serializes plaintext", async () => {
    const crypto = createAtRestEncryption(CONFIG);
    const plaintext = bytes("sensitive test payload");
    const envelopes = await Promise.all(Array.from({ length: 12 }, () => crypto.encryptAtRest({ purpose: PURPOSE, plaintext })));
    expect(new Set(envelopes.map((envelope) => envelope.iv)).size).toBe(envelopes.length);
    expect(new Set(envelopes.map((envelope) => envelope.ciphertext)).size).toBe(envelopes.length);
    expect(JSON.stringify(envelopes[0])).not.toContain("sensitive test payload");
    expect(Buffer.from(envelopes[0].iv, "base64url")).toHaveLength(AT_REST_IV_LENGTH_BYTES);
    expect(Buffer.from(envelopes[0].authTag, "base64url")).toHaveLength(AT_REST_AUTH_TAG_LENGTH_BYTES);
  });

  it("fails production wrappers closed without either required environment variable", () => {
    vi.stubEnv("EDEBATTE_AT_REST_ACTIVE_KEY_VERSION", "");
    vi.stubEnv("EDEBATTE_AT_REST_KEYRING", "");
    expectCode(() => encryptAtRest({ purpose: PURPOSE, plaintext: bytes("x") }), "missing_active_key");
    vi.stubEnv("EDEBATTE_AT_REST_ACTIVE_KEY_VERSION", "v1");
    expectCode(() => decryptAtRest({ purpose: PURPOSE, envelope: {} }), "invalid_keyring");
  });

  it("strictly validates keyrings, key versions, keys, and active membership", () => {
    for (const keyring of [`v1:${KEY_ONE};v1:${KEY_TWO}`, `bad:key:${KEY_ONE}`]) {
      expectCode(() => createAtRestEncryption({ activeKeyVersion: "v1", keyring }), "invalid_keyring");
    }
    for (const keyring of ["v1:not-base64", `v1:${Buffer.alloc(31).toString("base64")}`, `v1:${Buffer.alloc(33).toString("base64")}`]) {
      expectCode(() => createAtRestEncryption({ activeKeyVersion: "v1", keyring }), "invalid_key");
    }
    expectCode(() => createAtRestEncryption({ activeKeyVersion: "v1", keyring: `v1:${KEY_ONE.replace(/=$/, "")}` }), "invalid_key");
    expectCode(() => createAtRestEncryption({ activeKeyVersion: "", keyring: `v1:${KEY_ONE}` }), "missing_active_key");
    expectCode(() => createAtRestEncryption({ activeKeyVersion: "v2", keyring: `v1:${KEY_ONE}` }), "missing_active_key");
  });

  it("supports rotation only by the declared envelope key version", () => {
    const oldCrypto = createAtRestEncryption({ activeKeyVersion: "v1", keyring: `v1:${KEY_ONE};v2:${KEY_TWO}` });
    const oldEnvelope = oldCrypto.encryptAtRest({ purpose: PURPOSE, plaintext: bytes("old") });
    const rotated = createAtRestEncryption({ activeKeyVersion: "v2", keyring: `v1:${KEY_ONE};v2:${KEY_TWO}` });
    expect(rotated.encryptAtRest({ purpose: PURPOSE, plaintext: bytes("new") }).keyVersion).toBe("v2");
    expect(decodeAtRestUtf8(rotated.decryptAtRest({ purpose: PURPOSE, envelope: oldEnvelope }))).toBe("old");
    expectCode(() => createAtRestEncryption({ activeKeyVersion: "v2", keyring: `v2:${KEY_TWO}` }).decryptAtRest({ purpose: PURPOSE, envelope: oldEnvelope }), "unknown_key_version");
  });

  it("strictly validates the exact envelope shape and canonical base64url", () => {
    const crypto = createAtRestEncryption(CONFIG);
    const envelope = crypto.encryptAtRest({ purpose: PURPOSE, plaintext: new Uint8Array() });
    expect(decodeAtRestUtf8(crypto.decryptAtRest({ purpose: PURPOSE, envelope }))).toBe("");
    for (const malformed of [null, [], "x", {}, { ...envelope, extra: "x" }]) {
      expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: malformed }), "malformed_envelope");
    }
    expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: { ...envelope, iv: `${envelope.iv}=` } }), "invalid_encoding");
    expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: { ...envelope, iv: "AA" } }), "invalid_nonce");
    expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: { ...envelope, authTag: "AA" } }), "malformed_envelope");
    expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: { ...envelope, iv: "!" } }), "invalid_encoding");
    expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: { ...envelope, version: "v2" } }), "unsupported_version");
    expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: { ...envelope, algorithm: "aes-256-cbc" } }), "unsupported_algorithm");
  });

  it("fails closed on tampering, wrong purpose, unknown keys, and runtime purpose bypass", () => {
    const crypto = createAtRestEncryption(CONFIG);
    const envelope = crypto.encryptAtRest({ purpose: PURPOSE, plaintext: bytes("private") });
    const alter = (value: string) => `${value[0] === "A" ? "B" : "A"}${value.slice(1)}`;
    for (const altered of [{ ...envelope, ciphertext: alter(envelope.ciphertext) }, { ...envelope, authTag: alter(envelope.authTag) }, { ...envelope, keyVersion: "v2" }]) {
      expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: altered }), "authentication_failed");
    }
    expectCode(() => crypto.decryptAtRest({ purpose: "wrong-purpose" as AtRestEncryptionPurpose, envelope }), "invalid_purpose");
    expectCode(() => crypto.decryptAtRest({ purpose: PURPOSE, envelope: { ...envelope, keyVersion: "removed" } }), "unknown_key_version");
    expectCode(() => crypto.encryptAtRest({ purpose: "wrong-purpose" as AtRestEncryptionPurpose, plaintext: bytes("x") }), "invalid_purpose");
  });

  it("enforces the generic plaintext ceiling for encryption and decrypted data", () => {
    const crypto = createAtRestEncryption(CONFIG);
    const maximum = crypto.encryptAtRest({ purpose: PURPOSE, plaintext: new Uint8Array(MAX_AT_REST_PLAINTEXT_BYTES) });
    expect(crypto.decryptAtRest({ purpose: PURPOSE, envelope: maximum })).toHaveLength(MAX_AT_REST_PLAINTEXT_BYTES);
    expectCode(() => crypto.encryptAtRest({ purpose: PURPOSE, plaintext: new Uint8Array(MAX_AT_REST_PLAINTEXT_BYTES + 1) }), "plaintext_too_large");
  });

  it("keeps error messages free of sensitive inputs", () => {
    const secret = "plaintext-should-not-leak";
    try {
      createAtRestEncryption({ activeKeyVersion: "v1", keyring: `v1:${secret}` });
    } catch (error) {
      expect(error).toBeInstanceOf(AtRestEncryptionError);
      expect((error as Error).message).not.toContain(secret);
      expect((error as Error).message).not.toContain(KEY_ONE);
    }
  });

  it("is server-only Node crypto with no data, network, payment, or logging side effects", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/server/atRestEncryption.ts"), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toContain('from "node:crypto"');
    for (const forbidden of ["fetch(", "Mongo", "Prisma", "cookie", "console.log", "console.error", "console.warn", "payment"]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
