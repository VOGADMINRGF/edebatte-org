import { useRouteGuard } from "@features/auth/hooks/useRouteGuard";

// Fallback-Typen (bis die echten in @features stabil sind)
export type AccessRule = any;
export type UserLike = any;

export const DEFAULT_RULES: AccessRule[] = [];

type Options = {
  user?: UserLike;
  rules?: AccessRule[];
};

export default function useRouteGuardClient(opts: Options = {}) {
  return (useRouteGuard as any)(opts);
}
