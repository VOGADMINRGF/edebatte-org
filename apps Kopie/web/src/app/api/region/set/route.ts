import { BodySchema } from "@/lib/validation/body";
// apps/web/src/app/api/region/set/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/dbWeb";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, persist } = BodySchema.parse(body);

    // 1) Prüfe Region
    const region = await prisma.region.findUnique({ where: { code } });
    if (!region) {
      return NextResponse.json(
        { error: "unknown_region_code" },
        { status: 404 },
      );
    }

    // 2) Cookie setzen (180 Tage)
    const c = cookies();
    c.set("u_region", code, {
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    // 3) Optional ins Profil persistieren (wenn eingeloggt)
    if (persist) {
      try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (userId) {
          const userProfile = (prisma as any).userProfile;
          if (userProfile?.update) {
            await userProfile.update({
              where: { userId },
              data: { regionId: region.id },
            });
          }
        }
      } catch {
        // NextAuth nicht aktiv → still ignorieren
      }
    }

    // 4) (Optional) Revalidate Seiten, die Region anzeigen
    try {
      revalidatePath("/dashboard");
      revalidatePath("/"); // falls Startseite region-abhängig ist
    } catch {
      // in lokalen Devs ggf. nicht verfügbar → ignorieren
    }

    return NextResponse.json({
      ok: true,
      region: {
        id: region.id,
        code: region.code,
        name: region.name,
        level: region.level,
      },
      persisted: !!persist,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "invalid_body", issues: err.issues },
        { status: 400 },
      );
    }
    console.error("[api/region/set]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
