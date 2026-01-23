
export type Role = "guest"|"user"|"editor"|"admin" | (string & {});
export const ADMIN_ROLES = new Set<Role>(["admin","editor"]);

export function isPublic(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/faq") || pathname.startsWith("/about");
}
export function isVerifiedPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/editor");
}
export function isLocationOnboarding(pathname: string): boolean {
  return pathname.startsWith("/onboarding/location");
}
