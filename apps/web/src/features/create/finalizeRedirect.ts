export type InternalRedirectPath = `/${string}`;

const INTERNAL_REDIRECT_ORIGIN = "https://internal-redirect.invalid";

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

export function normalizeInternalRedirectPath(value: unknown): InternalRedirectPath | null {
  if (typeof value !== "string") return null;
  if (hasUnsafeRawRedirectCharacter(value)) return null;

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
