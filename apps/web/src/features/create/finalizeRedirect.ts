export type InternalRedirectPath = `/${string}`;

const INTERNAL_REDIRECT_ORIGIN = "https://internal-redirect.invalid";
const ENCODED_OCTET_RE = /%[0-9a-f]{2}/i;
const ENCODED_UNSAFE_ASCII_RE = /%(?:5c|0[0-9a-f]|1[0-9a-f]|7f)/i;
const ENCODED_NETWORK_PATH_RE = /^\/(?:%2f){2}/i;
const MAX_REDIRECT_DECODE_DEPTH = 2;

function trimString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasUnsafeRawRedirectCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (character === "\\" || codePoint <= 0x1f || codePoint === 0x7f) return true;
  }
  return false;
}

export function hasUnsafeNavigationTargetRepresentation(value: unknown): boolean {
  if (typeof value !== "string") return true;
  if (value !== value.trim()) return true;

  let current = value;

  for (let depth = 0; depth <= MAX_REDIRECT_DECODE_DEPTH; depth += 1) {
    if (hasUnsafeRawRedirectCharacter(current) || current.startsWith("//")) return true;

    if (depth === MAX_REDIRECT_DECODE_DEPTH) {
      return ENCODED_UNSAFE_ASCII_RE.test(current) || ENCODED_NETWORK_PATH_RE.test(current);
    }

    if (!ENCODED_OCTET_RE.test(current)) return false;

    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) return false;
      current = decoded;
    } catch {
      return true;
    }
  }

  return true;
}

export function normalizeInternalRedirectPath(value: unknown): InternalRedirectPath | null {
  if (typeof value !== "string") return null;
  if (hasUnsafeNavigationTargetRepresentation(value)) return null;

  const trimmed = trimString(value);
  if (!trimmed) return null;
  if (!trimmed.startsWith("/")) return null;

  try {
    const parsed = new URL(trimmed, INTERNAL_REDIRECT_ORIGIN);
    if (parsed.origin !== INTERNAL_REDIRECT_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` as InternalRedirectPath;
  } catch {
    return null;
  }
}

export function buildFinalizeRedirectPath(params: {
  draftId: string;
  dossierId?: string | null;
}): InternalRedirectPath {
  const dossierId = trimString(params.dossierId);
  if (dossierId) {
    return `/dossier/${encodeURIComponent(dossierId)}` as InternalRedirectPath;
  }
  return `/swipes?fromDraft=${encodeURIComponent(params.draftId)}` as InternalRedirectPath;
}

export function buildFinalizeFallbackPath(params: {
  dossierId?: string | null;
  preferredSurface?: "swipes" | "runden";
  anlassraumId?: string | null;
  fallbackReturnTo?: string | null;
}): InternalRedirectPath {
  const explicitReturn = normalizeInternalRedirectPath(params.fallbackReturnTo);
  if (explicitReturn) return explicitReturn;

  const dossierId = trimString(params.dossierId);
  if (dossierId) {
    return `/dossier/${encodeURIComponent(dossierId)}` as InternalRedirectPath;
  }

  if (params.preferredSurface === "runden") {
    const normalizedAnlassraumId = normalizeAnlassraumId(params.anlassraumId);
    if (normalizedAnlassraumId) {
      return `/runden?view=active&anlassraumId=${encodeURIComponent(normalizedAnlassraumId)}` as InternalRedirectPath;
    }
    return "/runden?view=active";
  }

  return "/swipes";
}

function normalizeAnlassraumId(value: unknown): string | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{24}$/.test(normalized)) return null;
  return normalized;
}

export function resolveFinalizeRedirectTarget(params: {
  apiRedirectTo?: unknown;
  fallbackRedirectTo?: unknown;
}): InternalRedirectPath | null {
  return (
    normalizeInternalRedirectPath(params.apiRedirectTo) ??
    normalizeInternalRedirectPath(params.fallbackRedirectTo)
  );
}

export function resolveAndNavigateAfterFinalize(params: {
  apiRedirectTo?: unknown;
  fallbackRedirectTo?: unknown;
  navigate: (target: InternalRedirectPath) => void;
}): InternalRedirectPath | null {
  const target = resolveFinalizeRedirectTarget(params);
  if (target) {
    params.navigate(target);
  }
  return target;
}
