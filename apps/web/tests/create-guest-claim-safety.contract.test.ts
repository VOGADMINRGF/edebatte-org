import { describe, expect, it } from "vitest";
import {
  MAX_ARRAY_ENTRIES,
  MAX_DEPTH,
  MAX_NODES,
  MAX_OBJECT_KEYS,
  MAX_STRING_CHARS,
  inspectGuestClaim,
  isSafePersistedGuestClaimResult,
} from "@/features/create/safety/createGuestClaimSafety";

function nested(depth: number): unknown {
  let value: unknown = "sicher";
  for (let index = 0; index < depth; index += 1) value = { value };
  return value;
}

describe("guest claim recursive safety contract", () => {
  it.each([
    [{ profile: { email: "person@example.org" } }, "nested email"],
    [{ values: [{ phone: "+49 30 1234567" }] }, "nested telephone"],
    [{ nested: { authorization: "Bearer credential-value" } }, "secret key"],
    [{ nested: ["Bearer credential-value"] }, "bearer credential"],
    [{ nested: ["session=secret-cookie-value"] }, "cookie credential"],
    [{ nested: ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturepart"] }, "JWT-like value"],
    [{ url: "https://any-host.invalid/path?X-Amz-Signature=secret" }, "AWS signed URL"],
    [{ url: "https://any-host.invalid/path?X-Goog-Signature=secret" }, "Google signed URL"],
    [{ url: "https://any-host.invalid/path?sig=secret&se=tomorrow" }, "Azure SAS URL"],
    [{ url: "https://any-host.invalid/path?token=secret" }, "generic token URL"],
    [{ url: "https%3A%2F%2Fexample.invalid%2Fpath%3Ftoken%3Dsecret" }, "fully encoded generic token URL"],
    [{ url: "https%253A%252F%252Fexample.invalid%252Fpath%253Ftoken%253Dsecret" }, "double-encoded generic token URL"],
    [{ url: "https%3A%2F%2Fexample.invalid%2Fpath%3FX-Amz-Signature%3Dsecret" }, "fully encoded AWS signed URL"],
    [{ url: "https%3A%2F%2Fuser%3Asecret%40example.invalid%2Fpath" }, "fully encoded URL userinfo"],
    [{ url: "[https://example.invalid/path%20here?token=secret](https://example.invalid/path%20here?token=secret)" }, "encoded path generic token URL"],
    [{ url: "[https://example.invalid/path%2520here%253Ftoken%253Dsecret](https://example.invalid/path%2520here%253Ftoken%253Dsecret)" }, "double-encoded path generic token URL"],
    [{ url: "https%3A%2F%2Fexample.invalid%2Fpath%2520here%3Ftoken%3Dsecret" }, "fully encoded scheme with encoded path token URL"],
    [{ url: "[https://example.invalid/a%20b?X-Amz-Signature=secret](https://example.invalid/a%20b?X-Amz-Signature=secret)" }, "encoded path AWS signed URL"],
    [{ url: "[https://user:secret@example.invalid/path%20here](https://user:secret@example.invalid/path%20here)" }, "encoded path URL userinfo"],
    [{ url: "h%74tps%3A%2F%2Fexample.invalid%2Fpath%3Ftoken%3Dsecret" }, "partially encoded scheme token URL"],
    [{ url: "%2568%2574%2574%2570%2573%253A%252F%252Fexample.invalid%252F%253Ftoken%253Dsecret" }, "multi-pass encoded lowercase scheme token URL"],
    [{ url: "h%2574tps%253A%252F%252Fexample.invalid%252F%253Ftoken%253Dsecret" }, "mixed-level encoded scheme token URL"],
    [{ url: "%48%54%54%50%53%3A%2F%2Fexample.invalid%2F%3Ftoken%3Dsecret" }, "uppercase encoded scheme token URL"],
    [{ url: "%2548%2554%2554%2550%2553%253A%252F%252Fexample.invalid%252F%253Ftoken%253Dsecret" }, "multi-pass uppercase encoded scheme token URL"],
    [{ url: "https://example.invalid/path(foo)?token=secret" }, "parenthesized path token URL"],
    [{ url: "https://example.invalid/path[foo]?token=secret" }, "bracketed path token URL"],
    [{ url: "https://example.invalid/a(b)c?X-Amz-Signature=secret" }, "parenthesized path AWS signed URL"],
    [{ url: "https://example.invalid/a[b]c?X-Goog-Signature=secret" }, "bracketed path Google signed URL"],
    [{ nested: ["Cookie: sessionid=secret"] }, "Cookie header credential"],
    [{ nested: ["Set-Cookie: sessionid=secret"] }, "Set-Cookie header credential"],
    [{ nested: ["cOoKiE: sessionid=secret", "sEt-CoOkIe: sessionid=secret"] }, "mixed-case cookie header credential"],
    [{ url: "https://any-host.invalid/%ZZ" }, "malformed percent encoding"],
    [{ url: `https://any-host.invalid/${"%25".repeat(5)}41` }, "decode budget exceeded"],
    [{ ip: "203.0.113.42" }, "IPv4"],
    [{ ip: "2001:db8::1" }, "IPv6"],
    [{ address: "Musterstraße 12" }, "address key"],
  ])("rejects %s", (value) => {
    expect(inspectGuestClaim(value)).toEqual({ ok: false });
  });

  it("enforces deterministic traversal limits and accepts their boundaries", () => {
    expect(inspectGuestClaim(nested(MAX_DEPTH))).toMatchObject({ ok: true });
    expect(inspectGuestClaim(nested(MAX_DEPTH + 1))).toEqual({ ok: false });
    const atNodeBoundary = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [
      `branch${index}`,
      Array.from({ length: index === 7 ? 247 : 256 }, () => null),
    ]));
    const beyondNodeBoundary = { ...atNodeBoundary, branch7: Array.from({ length: 248 }, () => null) };
    expect(inspectGuestClaim(atNodeBoundary)).toMatchObject({ ok: true });
    expect(inspectGuestClaim(beyondNodeBoundary)).toEqual({ ok: false });
    expect(inspectGuestClaim(Object.fromEntries(Array.from({ length: MAX_OBJECT_KEYS }, (_, index) => [`key${index}`, null])))).toMatchObject({ ok: true });
    expect(inspectGuestClaim(Object.fromEntries(Array.from({ length: MAX_OBJECT_KEYS + 1 }, (_, index) => [`key${index}`, null])))).toEqual({ ok: false });
    expect(inspectGuestClaim(Array.from({ length: MAX_ARRAY_ENTRIES }, () => null))).toMatchObject({ ok: true });
    expect(inspectGuestClaim(Array.from({ length: MAX_ARRAY_ENTRIES + 1 }, () => null))).toEqual({ ok: false });
    expect(inspectGuestClaim("a".repeat(MAX_STRING_CHARS))).toMatchObject({ ok: true });
    expect(inspectGuestClaim("a".repeat(MAX_STRING_CHARS + 1))).toEqual({ ok: false });
  });

  it("accepts safe nested JSON and creates a stable digest independent of object order", () => {
    const first = inspectGuestClaim({ topic: "Sichere Schulwege", facts: [true, 3, null], detail: { district: "Nord" } });
    const second = inspectGuestClaim({ detail: { district: "Nord" }, facts: [true, 3, null], topic: "Sichere Schulwege" });
    expect(first).toMatchObject({ ok: true });
    expect(second).toEqual(first);
  });

  it("allows harmless percent encoding that is not a URL", () => {
    expect(inspectGuestClaim({ note: "100%20finanziert" })).toMatchObject({ ok: true });
  });

  it("allows a normal URL with path parentheses and brackets without credential query data", () => {
    expect(inspectGuestClaim({ url: "https://example.invalid/path(foo)[bar]?page=1" })).toMatchObject({ ok: true });
  });

  it("accepts only the exact persisted result allowlist", () => {
    const safe = { version: 1, status: "accepted", operationId: "550e8400-e29b-41d4-a716-446655440000", createdAt: "2026-09-11T12:00:00.000Z" };
    expect(isSafePersistedGuestClaimResult(safe)).toBe(true);
    expect(isSafePersistedGuestClaimResult({ ...safe, metadata: {} })).toBe(false);
    expect(isSafePersistedGuestClaimResult({ ...safe, operationId: "not-a-uuid" })).toBe(false);
  });
});
