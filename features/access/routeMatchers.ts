import type { RoutePolicy, RouteId, RouteMatchMode } from "./types";
import { DEFAULT_ROUTE_POLICIES } from "./types";

export type RouteMatcher = {
  routeId: RouteId;
  regex: RegExp;
};

export const DEFAULT_ROUTE_MATCHERS: RouteMatcher[] = DEFAULT_ROUTE_POLICIES.map(buildRouteMatcher);

export function matchRoute(
  pathname: string,
  matchers: RouteMatcher[] = DEFAULT_ROUTE_MATCHERS,
): RouteId | null {
  for (const matcher of matchers) {
    if (matcher.regex.test(pathname)) {
      return matcher.routeId;
    }
  }
  return null;
}

export function buildRouteMatcher(policy: RoutePolicy): RouteMatcher {
  return {
    routeId: policy.routeId,
    regex: new RegExp(pathPatternToRegex(policy.pathPattern, policy.matchMode)),
  };
}

function pathPatternToRegex(pattern: string, mode: RouteMatchMode = "prefix"): string {
  if (!pattern.startsWith("/")) {
    pattern = `/${pattern}`;
  }
  const segments = pattern.split("/").filter((seg, index) => !(index === 0 && seg.length === 0));
  const regexParts = segments.map((segment) => {
    if (!segment) return "";
    if (segment.startsWith(":")) {
      return "[^/]+";
    }
    return escapeRegex(segment);
  });
  const pathBody = regexParts.filter(Boolean).join("/");
  const base = pathBody.length ? `/${pathBody}` : "/";
  const suffix =
    mode === "exact"
      ? base === "/"
        ? ""
        : "/?"
      : "(?:/.*)?";
  return `^${base}${suffix}$`;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
