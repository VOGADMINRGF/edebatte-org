import { BRAND } from "@/lib/brand";
import { normalizeInternalRedirectPath, type InternalRedirectPath } from "@/features/create/finalizeRedirect";
import { ROUTE_ALIAS_CANONICAL_PATHS } from "@features/routes/routeInventoryContract";

export type WrapperMvpSurfaceBucket = "mvp" | "later" | "excluded" | "unknown" | "invalid";

export type WrapperMvpPathClassification = {
  bucket: WrapperMvpSurfaceBucket;
  path: InternalRedirectPath | null;
  canonicalPath: InternalRedirectPath | null;
};

export type WrapperHrefClassification =
  | {
      kind: "internal";
      href: string;
      path: InternalRedirectPath;
      surface: WrapperMvpPathClassification;
    }
  | {
      kind: "external";
      href: string;
      protocol: string;
    }
  | {
      kind: "invalid";
      href: string;
      reason: "empty" | "invalid_path" | "unsupported_protocol";
    };

const WRAPPER_ALIAS_CANONICAL: Record<InternalRedirectPath, InternalRedirectPath> = {
  "/anlassraum": ROUTE_ALIAS_CANONICAL_PATHS["/anlassraum"] as InternalRedirectPath,
  "/sw": "/swipes",
  "/swipe": "/swipes",
  "/vormerken": ROUTE_ALIAS_CANONICAL_PATHS["/vormerken"] as InternalRedirectPath,
};

const MVP_EXACT_PATHS = new Set<InternalRedirectPath>([
  "/",
  "/start",
  "/login",
  "/logout",
  "/account",
  "/account/payment",
  "/account/security",
  "/create",
  "/swipes",
  "/runden",
  "/anlassraum",
  "/pricing",
  "/order",
  "/vormerken",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerrufsbelehrung",
  "/barrierefreiheit",
  "/sw",
  "/swipe",
]);

const MVP_PREFIX_PATHS: readonly InternalRedirectPath[] = ["/swipes/", "/round/", "/dossier/", "/pricing/"];

const LATER_EXACT_PATHS = new Set<InternalRedirectPath>(["/atlas", "/atlas/weekly", "/community"]);
const LATER_PREFIX_PATHS: readonly InternalRedirectPath[] = ["/companion/", "/report/"];

const EXCLUDED_EXACT_PATHS = new Set<InternalRedirectPath>(["/studio", "/atlas/social-review"]);
const EXCLUDED_PREFIX_PATHS: readonly InternalRedirectPath[] = [
  "/admin/",
  "/dashboard/",
  "/demo/",
  "/embed/",
  "/research/",
  "/overlay/",
];

const BRAND_ORIGIN = new URL(BRAND.baseUrl).origin;
const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function toComparablePath(input: InternalRedirectPath): InternalRedirectPath {
  const [pathname] = input.split("?");
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1) as InternalRedirectPath;
  }
  return pathname as InternalRedirectPath;
}

function matchesPrefix(path: InternalRedirectPath, prefixes: readonly InternalRedirectPath[]): boolean {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

function classifyPathBucket(path: InternalRedirectPath): WrapperMvpSurfaceBucket {
  const normalized = toComparablePath(path);

  if (EXCLUDED_EXACT_PATHS.has(normalized) || matchesPrefix(normalized, EXCLUDED_PREFIX_PATHS)) {
    return "excluded";
  }
  if (MVP_EXACT_PATHS.has(normalized) || matchesPrefix(normalized, MVP_PREFIX_PATHS)) {
    return "mvp";
  }
  if (LATER_EXACT_PATHS.has(normalized) || matchesPrefix(normalized, LATER_PREFIX_PATHS)) {
    return "later";
  }
  return "unknown";
}

function toInternalPath(input: string): InternalRedirectPath | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    return normalizeInternalRedirectPath(trimmed);
  }

  try {
    const url = new URL(trimmed);
    if (url.origin !== BRAND_ORIGIN) return null;
    return normalizeInternalRedirectPath(`${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}

export function classifyWrapperMvpPath(input: unknown): WrapperMvpPathClassification {
  if (typeof input !== "string") {
    return { bucket: "invalid", path: null, canonicalPath: null };
  }

  const path = toInternalPath(input);
  if (!path) {
    return { bucket: "invalid", path: null, canonicalPath: null };
  }

  const comparable = toComparablePath(path);
  const canonicalPath = WRAPPER_ALIAS_CANONICAL[comparable] ?? null;
  const bucket = classifyPathBucket(path);

  return {
    bucket,
    path,
    canonicalPath,
  };
}

export function isWrapperMvpAllowedPath(input: unknown): boolean {
  return classifyWrapperMvpPath(input).bucket === "mvp";
}

export function classifyWrapperHref(input: unknown): WrapperHrefClassification {
  const href = typeof input === "string" ? input.trim() : "";
  if (!href) {
    return { kind: "invalid", href: "", reason: "empty" };
  }

  const internal = toInternalPath(href);
  if (internal) {
    return {
      kind: "internal",
      href,
      path: internal,
      surface: classifyWrapperMvpPath(internal),
    };
  }

  try {
    const parsed = new URL(href);
    if (!SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return { kind: "invalid", href, reason: "unsupported_protocol" };
    }
    return { kind: "external", href, protocol: parsed.protocol };
  } catch {
    return { kind: "invalid", href, reason: "invalid_path" };
  }
}
