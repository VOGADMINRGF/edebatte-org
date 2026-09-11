import "server-only";

import crypto from "node:crypto";
import { isIP } from "node:net";
import {
  CREATE_SAFETY_EMAIL_RE,
  CREATE_SAFETY_PHONE_RE,
  CREATE_SAFETY_POSTAL_RE,
  CREATE_SAFETY_STREET_RE,
} from "@/features/create/safety/createSafetyLexicon";

export const MAX_DEPTH = 12;
export const MAX_NODES = 2048;
export const MAX_OBJECT_KEYS = 128;
export const MAX_ARRAY_ENTRIES = 256;
export const MAX_STRING_CHARS = 10_000;
export const MAX_PERCENT_DECODE_PASSES = 4;

export type PersistedGuestClaimResult = {
  version: 1;
  status: "accepted";
  operationId: string;
  createdAt: string;
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JWT_LIKE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;
const BEARER = /\bbearer\s+[a-z0-9._~+/=-]{8,}/i;
const COOKIE_CREDENTIAL = /\b(?:set-)?cookie\s*(?:=|:)|\bsession\s*=/i;
const CREDENTIAL_KEY = /^(?:authorization|cookie|setcookie|apikey|secret|token|accesstoken|refreshtoken|session|password|clientsecret|privatekey|signature|sig|xamzsignature|xgoogsignature|sastoken)$/;
const PII_KEY = /^(?:name|firstname|lastname|fullname|givenname|familyname|dob|dateofbirth|birthdate|birthday|email|phone|telephone|address|street|postalcode|postcode|zip|userid|useridnumber|nationalid|socialsecuritynumber|ssn)$/;
const SIGNED_QUERY_KEY = /(?:^|[-_])(signature|sig|token|credential|auth|authorization|access[-_]?token|api[-_]?key)(?:$|[-_])/i;
const AWS_QUERY_KEY = /^x-amz-(?:algorithm|credential|date|expires|signedheaders|signature|security-token)$/i;
const GOOGLE_QUERY_KEY = /^x-goog-(?:algorithm|credential|date|expires|signedheaders|signature)$/i;
const AZURE_QUERY_KEY = /^(?:sig|se|sp|sv|sr|skoid|sktid|skt|ske|sks|skv)$/i;
const IP_TOKEN = /(?:\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[0-9a-f]{0,4}:[0-9a-f:]{2,}\b)/gi;
const URL_START = /(?:h|%68)(?:t|%74)(?:t|%74)(?:p|%70)(?:(?:s|%73))?(?::|%(?:25)*3a)(?:\/|%(?:25)*2f)(?:\/|%(?:25)*2f)/giu;
const URL_CANDIDATE_BOUNDARY = /[\s<>"'\[\]\(\)]/u;

function matches(pattern: RegExp, value: string) {
  return new RegExp(pattern.source, pattern.flags.replaceAll("g", "")).test(value);
}

function normalizedKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function hasMalformedPercentEncoding(value: string) {
  return /%(?![0-9a-f]{2})/i.test(value);
}

function decodePercentEncoding(value: string): string | null {
  let current = value;
  for (let pass = 0; pass < MAX_PERCENT_DECODE_PASSES; pass += 1) {
    if (hasMalformedPercentEncoding(current)) return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (decoded === current) return current;
    current = decoded;
  }
  if (hasMalformedPercentEncoding(current)) return null;
  try {
    if (decodeURIComponent(current) !== current) return null;
  } catch {
    return null;
  }
  return current;
}

function hasSignedUrl(value: string) {
  const candidates = Array.from(value.matchAll(URL_START), (match) => {
    const remainder = value.slice(match.index ?? 0);
    const boundary = remainder.search(URL_CANDIDATE_BOUNDARY);
    return boundary === -1 ? remainder : remainder.slice(0, boundary);
  });
  for (const candidate of candidates) {
    const normalized = decodePercentEncoding(candidate);
    if (!normalized) return true;
    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      continue;
    }
    if (url.username || url.password) return true;
    for (const [key] of url.searchParams) {
      const normalizedQueryKey = decodePercentEncoding(key);
      if (!normalizedQueryKey) return true;
      if (
        SIGNED_QUERY_KEY.test(normalizedQueryKey) ||
        AWS_QUERY_KEY.test(normalizedQueryKey) ||
        GOOGLE_QUERY_KEY.test(normalizedQueryKey) ||
        AZURE_QUERY_KEY.test(normalizedQueryKey)
      ) {
        return true;
      }
    }
  }
  return false;
}

function hasSensitiveLeaf(value: string) {
  const containsIp = (value.match(IP_TOKEN) ?? []).some((candidate) => isIP(candidate) !== 0);
  return (
    matches(CREATE_SAFETY_EMAIL_RE, value) ||
    matches(CREATE_SAFETY_PHONE_RE, value) ||
    matches(CREATE_SAFETY_STREET_RE, value) ||
    matches(CREATE_SAFETY_POSTAL_RE, value) ||
    isIP(value.trim()) !== 0 ||
    containsIp ||
    BEARER.test(value) ||
    COOKIE_CREDENTIAL.test(value) ||
    JWT_LIKE.test(value.trim()) ||
    hasSignedUrl(value)
  );
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

export function inspectGuestClaim(value: unknown): { ok: true; normalizedDigest: string } | { ok: false } {
  const seen = new Set<object>();
  let nodes = 0;
  const visit = (entry: unknown, depth: number): boolean => {
    nodes += 1;
    if (nodes > MAX_NODES || depth > MAX_DEPTH) return false;
    if (entry === null || typeof entry === "boolean") return true;
    if (typeof entry === "number") return Number.isFinite(entry);
    if (typeof entry === "string") {
      return entry.length <= MAX_STRING_CHARS && !hasSensitiveLeaf(entry);
    }
    if (typeof entry !== "object") return false;
    if (seen.has(entry)) return false;
    seen.add(entry);
    if (Array.isArray(entry)) {
      if (entry.length > MAX_ARRAY_ENTRIES) return false;
      return entry.every((child) => visit(child, depth + 1));
    }
    if (Object.getPrototypeOf(entry) !== Object.prototype) return false;
    const record = entry as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > MAX_OBJECT_KEYS) return false;
    return keys.every((key) => {
      const normalized = normalizedKey(key);
      return !CREDENTIAL_KEY.test(normalized) && !PII_KEY.test(normalized) && visit(record[key], depth + 1);
    });
  };
  if (!visit(value, 0)) return { ok: false };
  return {
    ok: true,
    normalizedDigest: crypto.createHash("sha256").update(canonicalize(value)).digest("hex"),
  };
}

export function isSafePersistedGuestClaimResult(value: unknown): value is PersistedGuestClaimResult {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "createdAt,operationId,status,version") return false;
  if (record.version !== 1 || record.status !== "accepted" || typeof record.operationId !== "string" || typeof record.createdAt !== "string") return false;
  if (!UUID_V4.test(record.operationId)) return false;
  const timestamp = new Date(record.createdAt);
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === record.createdAt;
}
