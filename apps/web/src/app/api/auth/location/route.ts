// apps/web/src/app/api/profile/location/route.ts
export const runtime = "nodejs";

import { ObjectId } from "@core/triMongo";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCookie } from "@/lib/http/typedCookies";
import { coreCol } from "@core/db/triMongo";


// Helper: getCookie kann string oder { value } liefern
async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

type LocPatch = {
  city: string;
  zip?: string;
  country?: string; // ISO-CC (uppercased)
  lat?: number;
  lng?: number;
};

// ---------- GET: aktuelle Location lesen ----------
export async function GET(_req: NextRequest) {
  const uid = await readCookie("u_id");
  if (!uid || !ObjectId.isValid(uid)) {
    return NextResponse.json({ ok: false, error: "NO_UID" }, { status: 401 });
  }

  const Users = await coreCol("users");
  const user = await Users.findOne(
    { _id: new ObjectId(uid) },
    { projection: { "profile.location": 1 } },
  );

  return NextResponse.json({
    ok: true,
    location: user?.profile?.location ?? null,
  });
}

// ---------- POST: Location setzen/aktualisieren ----------
export async function POST(req: NextRequest) {
  const uid = await readCookie("u_id");
  if (!uid || !ObjectId.isValid(uid)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as Partial<LocPatch> | null;

  const city = String(body?.city ?? "").trim();
  if (!city) {
    return NextResponse.json(
      { ok: false, error: "CITY_REQUIRED" },
      { status: 400 },
    );
  }

  const zip = body?.zip != null ? String(body.zip) : undefined;
  const country =
    body?.country != null ? String(body.country).toUpperCase() : undefined;

  const lat =
    typeof body?.lat === "number" && Number.isFinite(body.lat)
      ? body.lat
      : undefined;
  const lng =
    typeof body?.lng === "number" && Number.isFinite(body.lng)
      ? body.lng
      : undefined;

  const location: LocPatch = { city, zip, country, lat, lng };

  const Users = await coreCol("users");
  await Users.updateOne(
    { _id: new ObjectId(uid) },
    {
      $set: {
        "profile.location": location,
        updatedAt: new Date(),
      },
    },
  );

  const res = NextResponse.json({ ok: true, location });
  // Flag-Cookie wie in V1
  res.cookies.set("u_loc", "1", { path: "/", sameSite: "lax" });
  return res;
}
