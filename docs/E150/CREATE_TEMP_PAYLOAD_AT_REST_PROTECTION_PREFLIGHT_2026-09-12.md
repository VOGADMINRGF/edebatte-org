# Temporary Payload At-Rest Protection — Pre-Implementation Evidence

Status: **historical, revision-bound, pre-implementation evidence**

```text
BASE_MAIN_SHA=f30477a4ad255bdb6ccfedf655321a49ad44fa14
TASK=CREATE-TEMP-PAYLOAD-AT-REST-PROTECTION-01
RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
SECURITY_PREFLIGHT=PASS
CRYPTO_PRIMITIVE_PREFLIGHT=PASS
KEY_MANAGEMENT_PREFLIGHT=PASS
ROTATION_PREFLIGHT=PASS
SERVER_ONLY_PREFLIGHT=PASS
LOGGING_REDACTION_PREFLIGHT=PASS
TESTABILITY_PREFLIGHT=PASS
SIZE_PREFLIGHT=PASS
COLLISION_RESULT=NONE
SPLIT_REQUIRED=false
```

The selected generic primitive is Node 20 `node:crypto` AES-256-GCM, not libsodium (declared but unused and requiring an additional async/bundling contract). Existing `features/security/crypto.ts` and `features/utils/mfaCrypto.ts` are comparison evidence only and are not reused. The implementation is Node/server-only (`import "server-only"`), never Edge or client code.

The exact authorized boundary is two new files only: `apps/web/src/lib/server/atRestEncryption.ts` and `apps/web/tests/at-rest-encryption.contract.test.ts`. It has no database, API, UI, cookie, Guest, account, TTL, provider, filesystem or payment behavior. No secret value or provisioning is authorized.

The frozen contract requires AES-256-GCM with 32-byte strictly base64-decoded keys, fresh probabilistically unique 12-byte `randomBytes` IVs, and no zeroization claim. `EDEBATTE_AT_REST_ACTIVE_KEY_VERSION` and `EDEBATTE_AT_REST_KEYRING` are identifiers only. A strict duplicate-detecting versioned keyring encrypts with one active key and decrypts solely by envelope key version; unknown or absent keys fail closed, with no try-all-keys fallback. Old decrypt-only keys remain only through their consumer retention horizon or migration.

Envelope `v1` is exact-field, strict unpadded base64url `{ version, algorithm: "aes-256-gcm", keyVersion, iv, ciphertext, authTag }`; malformed/unknown fields, version, algorithm, encoding, IV/tag length, modification or truncation fail closed. A finite server-owned typed purpose starts with `create.guest-adoption-preparation`; canonical server-derived AAD binds version, algorithm, keyVersion and purpose. Callers cannot supply arbitrary AAD.

The API is generic `encryptAtRest({ purpose, plaintext: Uint8Array })` / `decryptAtRest({ purpose, envelope })`, with explicit synthetic injected test keyring only. It has a defensive generic byte ceiling while consumers apply stricter limits. Stable internal errors are `invalid_keyring`, `missing_active_key`, `invalid_key`, `malformed_envelope`, `unsupported_version`, `unsupported_algorithm`, `unknown_key_version`, `invalid_nonce`, `invalid_encoding`, `authentication_failed`, `plaintext_too_large`, `invalid_purpose`; the primitive performs no logging and leaks no plaintext, key, IV, tag or envelope. Production key provisioning remains a separate gate; code may merge without a production key and never generates a fallback key.

Required test coverage includes roundtrip, nonce variation/concurrency, no plaintext leakage, keyring validation/rotation, strict envelope and tamper rejection, purpose-AAD mismatch, UTF-8/empty/bounded input, error/log redaction, server-only/no-side-effect assertions, and no test-key production fallback. Payment future reuse is compatible, but no IBAN persistence or payment change is authorized. C4A remains blocked until this foundation is implemented, reviewed, merged, marked done, and then freshly preflighted on refreshed main.
