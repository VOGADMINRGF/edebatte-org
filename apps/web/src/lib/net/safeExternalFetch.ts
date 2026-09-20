import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_REDIRECTS = 3;

const blockedAddresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["100::", 64],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:2::", 48],
  ["2001:db8::", 32],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

const blockedHostnames = new Set([
  "localhost",
  "instance-data",
  "metadata.aws.internal",
  "metadata.google.internal",
]);

type LookupHost = (hostname: string) => Promise<LookupAddress[]>;

export type SafeExternalHttpResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  body: AsyncIterable<Uint8Array>;
  destroy?: () => void;
};

type RequestImpl = (
  url: URL,
  address: LookupAddress,
  headers: Record<string, string>,
  timeoutMs: number,
) => Promise<SafeExternalHttpResponse>;

export type SafeExternalFetchDependencies = {
  lookupHost?: LookupHost;
  requestImpl?: RequestImpl;
};

export type SafeExternalFetchOptions = {
  accept: string;
  maxBytes: number | ((input: { contentType: string; finalUrl: string }) => number);
  maxRedirects?: number;
  timeoutMs?: number;
  userAgent: string;
  validateUrl?: (rawUrl: string) => void;
};

export type SafeExternalFetchResult = {
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
  headers: IncomingHttpHeaders;
  redirectCount: number;
  status: number;
};

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function mappedIpv4(address: string): string | null {
  const suffix = address.toLowerCase().match(/^::ffff:(.+)$/)?.[1];
  if (!suffix) return null;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(suffix)) return suffix;
  const words = suffix.split(":");
  if (words.length !== 2 || words.some((word) => !/^[0-9a-f]{1,4}$/.test(word))) return null;
  const high = Number.parseInt(words[0], 16);
  const low = Number.parseInt(words[1], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function isBlockedExternalAddress(address: string): boolean {
  const normalized = normalizeHostname(address);
  const mapped = mappedIpv4(normalized);
  if (mapped) return blockedAddresses.check(mapped, "ipv4");
  const family = isIP(normalized);
  if (family === 4) return blockedAddresses.check(normalized, "ipv4");
  if (family === 6) return blockedAddresses.check(normalized, "ipv6");
  return true;
}

export function assertSafeExternalUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("external_source_url_invalid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("external_source_protocol_blocked");
  }
  if (url.username || url.password) {
    throw new Error("external_source_credentials_blocked");
  }
  const hostname = normalizeHostname(url.hostname);
  if (
    !hostname ||
    blockedHostnames.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new Error("external_source_host_blocked");
  }
  if (isIP(hostname) > 0 && isBlockedExternalAddress(hostname)) {
    throw new Error("external_source_address_blocked");
  }
  return url;
}

async function resolvePublicAddress(
  hostname: string,
  lookupHost: LookupHost,
): Promise<LookupAddress> {
  const normalized = normalizeHostname(hostname);
  const literalFamily = isIP(normalized);
  const addresses = literalFamily
    ? [{ address: normalized, family: literalFamily }]
    : await lookupHost(normalized);
  if (
    addresses.length === 0 ||
    addresses.some((entry) => isBlockedExternalAddress(entry.address))
  ) {
    throw new Error("external_source_address_blocked");
  }
  return addresses[0]!;
}

function headerValue(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

async function defaultRequest(
  url: URL,
  address: LookupAddress,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<SafeExternalHttpResponse> {
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  const lookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [address]);
      return;
    }
    callback(null, address.address, address.family);
  };
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        headers,
        lookup,
      },
      (response) => {
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: response,
          destroy: () => response.destroy(),
        });
      },
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("external_source_timeout"));
    });
    req.once("error", reject);
    req.end();
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T> {
  if (timeoutMs <= 0) throw new Error("external_source_timeout");
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          onTimeout?.();
          reject(new Error("external_source_timeout"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readLimitedBody(
  response: SafeExternalHttpResponse,
  maxBytes: number,
  timeoutMs: number,
): Promise<Buffer> {
  const declaredLength = Number(headerValue(response.headers, "content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    response.destroy?.();
    throw new Error("external_source_too_large");
  }

  const read = async () => {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response.body) {
      const next = Buffer.from(chunk);
      total += next.length;
      if (total > maxBytes) {
        response.destroy?.();
        throw new Error("external_source_too_large");
      }
      chunks.push(next);
    }
    return Buffer.concat(chunks, total);
  };

  return withTimeout(read(), timeoutMs, () => response.destroy?.());
}

export async function safeExternalFetch(
  rawUrl: string,
  options: SafeExternalFetchOptions,
  dependencies: SafeExternalFetchDependencies = {},
): Promise<SafeExternalFetchResult> {
  const lookupHost =
    dependencies.lookupHost ??
    ((hostname: string) => dnsLookup(hostname, { all: true, verbatim: true }));
  const requestImpl = dependencies.requestImpl ?? defaultRequest;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  options.validateUrl?.(rawUrl);
  let currentUrl = assertSafeExternalUrl(rawUrl);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const remainingBeforeRequest = deadline - Date.now();
    if (remainingBeforeRequest <= 0) throw new Error("external_source_timeout");

    options.validateUrl?.(currentUrl.href);
    const address = await resolvePublicAddress(currentUrl.hostname, lookupHost);
    const response = await withTimeout(
      requestImpl(
        currentUrl,
        address,
        {
          accept: options.accept,
          "user-agent": options.userAgent,
        },
        remainingBeforeRequest,
      ),
      remainingBeforeRequest,
    );

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      response.destroy?.();
      const location = headerValue(response.headers, "location");
      if (!location) throw new Error("external_source_redirect_invalid");
      if (redirectCount >= maxRedirects) {
        throw new Error("external_source_redirect_limit");
      }
      const next = new URL(location, currentUrl).href;
      options.validateUrl?.(next);
      currentUrl = assertSafeExternalUrl(next);
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      response.destroy?.();
      throw new Error(`external_source_http_${response.status}`);
    }

    const contentType = headerValue(response.headers, "content-type").toLowerCase();
    const maxBytes =
      typeof options.maxBytes === "function"
        ? options.maxBytes({ contentType, finalUrl: currentUrl.href })
        : options.maxBytes;
    const remainingForBody = deadline - Date.now();
    const buffer = await readLimitedBody(response, maxBytes, remainingForBody);
    if (buffer.length === 0) throw new Error("external_source_empty");

    return {
      buffer,
      contentType,
      finalUrl: currentUrl.href,
      headers: response.headers,
      redirectCount,
      status: response.status,
    };
  }

  throw new Error("external_source_redirect_limit");
}
