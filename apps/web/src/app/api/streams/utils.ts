import { getCookie } from "@/lib/http/typedCookies";
import type { NextRequest } from "next/server";

const CREATOR_ROLES = new Set([
  "admin",
  "superadmin",
  "moderator",
  "staff",
  "creator",
]);
const CREATOR_TIERS = new Set([
  "citizenPro",
  "citizenUltra",
  "institutionBasic",
  "institutionPremium",
  "staff",
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
  const tier = req.cookies.get("u_tier")?.value ?? (await readCookie("u_tier"));
  const verified = req.cookies.get("u_verified")?.value ?? (await readCookie("u_verified")) ?? "0";
  const userId = req.cookies.get("u_id")?.value ?? (await readCookie("u_id"));
  if (!userId) return null;
  const hasCreatorRole = CREATOR_ROLES.has(role);
  const hasCreatorTier = tier ? CREATOR_TIERS.has(tier) : false;
  const isStaffRole = role === "admin" || role === "superadmin" || role === "moderator" || role === "staff";
  if (!(hasCreatorRole || hasCreatorTier)) return null;
  if (!isStaffRole && verified !== "1") return null;
  return {
    userId,
    role,
    isStaff: isStaffRole,
  };
}
