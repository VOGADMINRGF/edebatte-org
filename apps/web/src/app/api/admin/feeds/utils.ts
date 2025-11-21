import type { NextRequest } from "next/server";

const STAFF_ROLES = new Set(["admin", "superadmin", "moderator", "staff"]);

export function isStaffRequest(req: NextRequest): boolean {
  const role = req.cookies.get("u_role")?.value ?? "guest";
  return STAFF_ROLES.has(role);
}

export function formatObjectId(id: any): string {
  return typeof id === "string" ? id : id?.toHexString?.() ?? "";
}
