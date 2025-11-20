// apps/web/src/app/api/auth/me/route.ts
import { ObjectId } from "@core/db/triMongo";
import { NextResponse } from "next/server";
import { readSession } from "@/utils/session";

import { piiCol /* ggf. coreCol */ } from "@core/db/db/triMongo";

export const runtime = "nodejs";

type UserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  roles?: string[];
};

export async function GET() {
  const noStore = { headers: { "Cache-Control": "no-store" } };

  try {
    const sess = readSession();
    // Falls keine Session → wie bei dir: { user: null } (HTTP 200)
    if (!(sess as any)?.uid || !/^[0-9a-fA-F]{24}$/.test((sess as any)?.uid)) {
      return NextResponse.json({ user: null }, noStore);
    }

    // Wenn deine Users in "core" liegen, nimm coreCol("users")
    const users = await piiCol("users");

    const doc = await users.findOne(
      { _id: new ObjectId((sess as any)?.uid) },
      { projection: { passwordHash: 0 } },
    );

    if (!doc) return NextResponse.json({ user: null }, noStore);

    return NextResponse.json(
      {
        user: {
          id: String(doc._id),
          email: doc.email ?? null,
          name: doc.name ?? null,
          roles: Array.isArray(doc.roles) ? doc.roles : ["user"],
        },
      },
      noStore,
    );
  } catch (err) {
    console.error("[/api/auth/me] error:", err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, ...noStore },
    );
  }
}
