// apps/web/src/app/api/region/effective/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/** -------- Utils -------- */
function headerCountry(h: Headers): string | null {
  const v = (
    h.get("x-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-vercel-ip-country") ||
    ""
  )?.toUpperCase();
  return v || null;
}

/** erlaubt ISO2 oder ISO2-EXT (z. B. DE, AT, CH, DE-BE) */
function normalize(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase().slice(0, 8);
  return /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(c) ? c : null;
}

/** Prisma lazy laden (kein harter Build-Dep) */
async function getPrismaWeb(): Promise<any | null> {
  try {
    const mod: any = await import("src/lib/dbWeb");
    return mod?.prismaWeb ?? mod ?? null;
  } catch {
    return null;
  }
}

/** Minimal vereinheitlichter Payload – falls DB da ist, anreichern */
async function findRegionPayload(code: string) {
  const prismaWeb: any = await getPrismaWeb();
  if (prismaWeb?.region) {
    try {
      const r = await prismaWeb.region.findUnique({ where: { code } });
      if (r) return { id: r.id, code: r.code, name: r.name, level: r.level };
    } catch {
      /* noop */
    }
  }
  // Fallback: nur Code
  return { code } as {
    id?: string;
    code: string;
    name?: string;
    level?: number;
  };
}

/** Optionaler Profil-Fallback: nur wenn next-auth + authOptions vorhanden sind */
async function getProfileRegionFromSession(): Promise<{
  id?: string;
  code: string;
  name?: string;
  level?: number;
} | null> {
  try {
    const nextAuthMod: any = await import("next-auth");
    const getServerSession: (opts: any) => Promise<any> =
      nextAuthMod.getServerSession;

    // "@/lib/auth" darf fehlen → wenn Import scheitert, abbrechen
    const authMod: any = await import("src/lib/auth");
    const authOptions = authMod?.authOptions;
    if (!authOptions) return null;

    const prismaWeb: any = await getPrismaWeb();
    if (!prismaWeb?.userProfile) return null;

    const session: any = await getServerSession(authOptions);
    const userId: string | null = session?.user?.id
      ? String(session.user.id)
      : null;
    if (!userId) return null;

    const prof = await prismaWeb.userProfile.findUnique({
      where: { userId },
      include: { region: true },
    });
    if (prof?.region) {
      return {
        id: prof.region.id,
        code: prof.region.code,
        name: prof.region.name,
        level: prof.region.level,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** -------- Handler -------- */
export async function GET(req: NextRequest) {
  // 1) Profil (nur wenn NextAuth/Prisma verfügbar)
  const profRegion = await getProfileRegionFromSession();
  if (profRegion) {
    return NextResponse.json({ region: profRegion, source: "profile" });
  }

  // 2) Manuell: Query oder Cookie (Next 15: cookies() kann async sein)
  const url = new URL(req.url);
  const qManual = normalize(
    url.searchParams.get("region") || url.searchParams.get("code"),
  );
  const c = await cookies();
  // akzeptiere sowohl "region_code" (neu) als auch "u_region" (legacy)
  const cookieManual = normalize(
    c.get("region_code")?.value || c.get("u_region")?.value,
  );

  if (qManual) {
    const region = await findRegionPayload(qManual);
    return NextResponse.json({ region, source: "query" });
  }
  if (cookieManual) {
    const region = await findRegionPayload(cookieManual);
    return NextResponse.json({ region, source: "cookie" });
  }

  // 3) Header (Edge/CDN)
  const hdr = normalize(headerCountry(req.headers));
  if (hdr) {
    const region = await findRegionPayload(hdr);
    return NextResponse.json({ region, source: "header" });
  }

  // 4) Kein Treffer
  return NextResponse.json({ region: null, source: "none" });
}
