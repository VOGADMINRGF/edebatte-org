export const runtime = "nodejs";

import { getCookie } from "@/lib/http/typedCookies";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // <— hier korrigiert

export type RegionLevel =
  | "country"
  | "state"
  | "county"
  | "city"
  | "nuts"
  | "custom";

export interface RegionDTO {
  id: string;
  code: string;
  name: string;
  level: RegionLevel | string;
}

export type RegionSource = "profile" | "cookie" | "none";

export interface EffectiveRegionResult {
  region: RegionDTO | null;
  source: RegionSource;
  userId?: string | null;
}

function normalizeLevel(level: unknown): RegionLevel | string {
  if (typeof level === "string") return level as RegionLevel | string;
  if (typeof level === "number") return String(level);
  return (level ?? "custom") as RegionLevel | string;
}

/** Liest den Wert des u_region-Cookies asynchron (z. B. DE-BE-BERLIN). */
export async function readRegionCookie(): Promise<string | undefined> {
  const raw = await getCookie("u_region");
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

/**
 * Liefert die effektiv aktive Region:
 * 1. falls User eingeloggt → Profil.Region
 * 2. sonst Cookie
 * 3. sonst Fallback (keine Region)
 */
export async function getEffectiveRegion(): Promise<EffectiveRegionResult> {
  // 1) Versuch: über Profil (NextAuth optional)
  try {
    const session: any = (await getServerSession(authOptions)) as any;
    const userId = session?.user?.id ?? null;

    if (userId) {
      const userProfile = (prisma as any).userProfile;
      if (userProfile?.findUnique) {
        const prof = await userProfile.findUnique({
          where: { userId },
          include: { region: true },
        });

        if (prof?.region) {
          return {
            region: {
              id: prof.region.id,
              code: prof.region.code,
              name: prof.region.name,
              level: prof.region.level as RegionLevel,
            },
            source: "profile",
            userId,
          };
        }
      }

      // kein Profil-Regionseintrag → Cookie prüfen
      const c = await readRegionCookie();
      if (c) {
        const region = await prisma.region.findUnique({ where: { code: c } });
        if (region) {
          return {
            region: {
              id: region.id,
              code: region.code,
              name: region.name,
              level: normalizeLevel(region.level),
            },
            source: "cookie",
            userId,
          };
        }
      }

      // kein Cookie → none
      return { region: null, source: "none", userId };
    }
  } catch {
    // NextAuth evtl. nicht aktiviert → still ignorieren
  }

  // 2) Nur Cookie (auch ohne Login)
  const cookieVal = await readRegionCookie();
  if (cookieVal) {
    const region = await prisma.region.findUnique({
      where: { code: cookieVal },
    });
    if (region) {
      return {
        region: {
          id: region.id,
          code: region.code,
          name: region.name,
              level: normalizeLevel(region.level),
        },
        source: "cookie",
        userId: null,
      };
    }
  }

  // 3) Kein Profil & kein Cookie → none
  return { region: null, source: "none", userId: null };
}
