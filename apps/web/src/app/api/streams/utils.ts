import { getCookie } from "@/lib/http/typedCookies";
import type { NextRequest } from "next/server";

const CREATOR_ROLES = new Set([
  "admin",
  "superadmin",
  "moderator",
  "staff",
  "creator",
]);

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export interface CreatorContext {
  userId: string;
  role: string;
  isStaff: boolean;
}

export async function requireCreatorContext(
  req: NextRequest,
): Promise<CreatorContext | null> {
  const role = req.cookies.get("u_role")?.value ?? (await readCookie("u_role")) ?? "guest";
  const userId = req.cookies.get("u_id")?.value ?? (await readCookie("u_id"));
  if (!userId) return null;
  if (!CREATOR_ROLES.has(role)) return null;
  return {
    userId,
    role,
    isStaff: role === "admin" || role === "superadmin" || role === "moderator" || role === "staff",
  };
}
