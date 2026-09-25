import { describe, expect, it, vi } from "vitest";
import {
  assertSafeExternalUrl,
  isBlockedExternalAddress,
  safeExternalFetch,
  type SafeExternalHttpResponse,
} from "@/lib/net/safeExternalFetch";

const PUBLIC = { address: "93.184.216.34", family: 4 };

function body(...chunks: string[]): AsyncIterable<Uint8Array> {
  return (async function* () {
    for (const chunk of chunks) yield Buffer.from(chunk);
  })();
}

function response(
  status: number,
  headers: Record<string, string>,
  ...chunks: string[]
): SafeExternalHttpResponse {
  return { status, headers, body: body(...chunks), destroy: vi.fn() };
}

describe("safeExternalFetch C8 security boundary", () => {
  it.each([
    "http://localhost/a",
    "http://x.local/a",
    "http://x.internal/a",
    "http://x.home.arpa/a",
    "http://127.0.0.1/a",
    "http://10.0.0.1/a",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.1/a",
    "http://100.64.0.1/a",
    "http://[::1]/a",
    "http://[fc00::1]/a",
    "http://[fe80::1]/a",
    "http://[::ffff:127.0.0.1]/a",
  ])("rejects blocked URL before request dispatch: %s", (url) => {
    expect(() => assertSafeExternalUrl(url)).toThrow();
  });

  it("covers documentation/reserved address ranges", () => {
    expect(isBlockedExternalAddress("192.0.2.10")).toBe(true);
    expect(isBlockedExternalAddress("198.51.100.2")).toBe(true);
    expect(isBlockedExternalAddress("203.0.113.5")).toBe(true);
    expect(isBlockedExternalAddress("2001:db8::1")).toBe(true);
  });

  it("rejects a public hostname if any DNS answer is blocked", async () => {
    const requestImpl = vi.fn();
    await expect(
      safeExternalFetch(
        "https://example.org/source",
        { accept: "text/plain", maxBytes: 100, userAgent: "test" },
        {
          lookupHost: async () => [PUBLIC, { address: "127.0.0.1", family: 4 }],
          requestImpl,
        },
      ),
    ).rejects.toThrow("external_source_address_blocked");
    expect(requestImpl).not.toHaveBeenCalled();
  });

  it("pins the validated public address and revalidates every redirect", async () => {
    const requestImpl = vi.fn(async (url: URL, address: typeof PUBLIC) => {
      expect(address).toEqual(PUBLIC);
      if (url.hostname === "example.org") {
        return response(302, { location: "http://127.0.0.1/private" });
      }
      return response(200, { "content-type": "text/plain" }, "never");
    });
    await expect(
      safeExternalFetch(
        "https://example.org/source",
        { accept: "text/plain", maxBytes: 100, userAgent: "test" },
        { lookupHost: async () => [PUBLIC], requestImpl },
      ),
    ).rejects.toThrow("external_source_address_blocked");
    expect(requestImpl).toHaveBeenCalledTimes(1);
  });

  it("enforces declared and streamed byte ceilings", async () => {
    const base = {
      accept: "text/plain",
      maxBytes: 5,
      userAgent: "test",
    };
    await expect(
      safeExternalFetch("https://example.org/source", base, {
        lookupHost: async () => [PUBLIC],
        requestImpl: async () =>
          response(200, { "content-length": "6", "content-type": "text/plain" }, "123456"),
      }),
    ).rejects.toThrow("external_source_too_large");

    await expect(
      safeExternalFetch("https://example.org/source", base, {
        lookupHost: async () => [PUBLIC],
        requestImpl: async () =>
          response(200, { "content-type": "text/plain" }, "123", "456"),
      }),
    ).rejects.toThrow("external_source_too_large");
  });

  it("enforces the total timeout", async () => {
    await expect(
      safeExternalFetch(
        "https://example.org/source",
        { accept: "text/plain", maxBytes: 100, userAgent: "test", timeoutMs: 5 },
        {
          lookupHost: async () => [PUBLIC],
          requestImpl: async () => new Promise<SafeExternalHttpResponse>(() => {}),
        },
      ),
    ).rejects.toThrow("external_source_timeout");
  });
});
