import { normalizeInternalRedirectPath, type InternalRedirectPath } from "@/features/create/finalizeRedirect";

export type MobileAppShellPolicyReason = "core" | "auth" | "excluded" | "web";

export type MobileAppShellPolicy = {
  shellEnabled: boolean;
  bottomNavEnabled: boolean;
  compactHeader: boolean;
  hideFooter: boolean;
  reason: MobileAppShellPolicyReason;
  path: InternalRedirectPath | null;
};

const EXCLUDED_EXACT_PATHS = new Set<InternalRedirectPath>([
  "/admin",
  "/dashboard",
  "/demo",
  "/embed",
  "/research",
  "/studio",
  "/partner/demo",
]);

const EXCLUDED_PREFIX_PATHS: readonly InternalRedirectPath[] = [
  "/admin/",
  "/dashboard/",
  "/demo/",
  "/embed/",
  "/research/",
  "/operator/",
  "/atlas/social-review",
];

const CORE_EXACT_PATHS = new Set<InternalRedirectPath>([
  "/",
  "/start",
  "/create",
  "/swipes",
  "/themen",
  "/runden",
  "/anlassraum",
  "/dossier",
  "/factcheck",
  "/stream",
  "/pricing",
  "/order",
  "/vormerken",
  "/account",
  "/account/security",
  "/account/payment",
]);

const CORE_PREFIX_PATHS: readonly InternalRedirectPath[] = [
  "/create/",
  "/swipes/",
  "/dossier/",
  "/factcheck/",
  "/companion/",
  "/live/",
  "/stream/",
  "/topic/",
  "/round/",
  "/qr/",
  "/pricing/",
];

const AUTH_EXACT_PATHS = new Set<InternalRedirectPath>(["/login", "/register"]);
const AUTH_PREFIX_PATHS: readonly InternalRedirectPath[] = ["/register/"];

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

function isExcluded(path: InternalRedirectPath): boolean {
  return EXCLUDED_EXACT_PATHS.has(path) || matchesPrefix(path, EXCLUDED_PREFIX_PATHS);
}

function isCore(path: InternalRedirectPath): boolean {
  return CORE_EXACT_PATHS.has(path) || matchesPrefix(path, CORE_PREFIX_PATHS);
}

function isAuth(path: InternalRedirectPath): boolean {
  return AUTH_EXACT_PATHS.has(path) || matchesPrefix(path, AUTH_PREFIX_PATHS);
}

export function classifyMobileAppShellPath(pathname: unknown): MobileAppShellPolicy {
  const normalizedPath = normalizeInternalRedirectPath(pathname);
  if (!normalizedPath) {
    return {
      shellEnabled: false,
      bottomNavEnabled: false,
      compactHeader: false,
      hideFooter: false,
      reason: "web",
      path: null,
    };
  }

  const path = toComparablePath(normalizedPath);
  if (isExcluded(path)) {
    return {
      shellEnabled: false,
      bottomNavEnabled: false,
      compactHeader: false,
      hideFooter: false,
      reason: "excluded",
      path,
    };
  }

  if (isCore(path)) {
    return {
      shellEnabled: true,
      bottomNavEnabled: true,
      compactHeader: true,
      hideFooter: true,
      reason: "core",
      path,
    };
  }

  if (isAuth(path)) {
    return {
      shellEnabled: true,
      bottomNavEnabled: false,
      compactHeader: true,
      hideFooter: true,
      reason: "auth",
      path,
    };
  }

  return {
    shellEnabled: false,
    bottomNavEnabled: false,
    compactHeader: false,
    hideFooter: false,
    reason: "web",
    path,
  };
}

export function isMobileAppShellPath(pathname: unknown): boolean {
  return classifyMobileAppShellPath(pathname).shellEnabled;
}
