// apps/web/src/app/api/auth/me/route.ts
import { ObjectId } from "@core/db/triMongo";
import { NextResponse } from "next/server";
import { readSession } from "@/utils/session";
import { coreCol } from "@core/db/db/triMongo";

export const runtime = "nodejs";

type UserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  roles?: Array<string | { role?: string; subRole?: string }> | null;
  accessTier?: string | null;
  b2cPlanId?: string | null;
  engagementXp?: number | null;
  vogMembershipStatus?: string | null;
};

export async function GET() {
  const noStore = { headers: { "Cache-Control": "no-store" } };

  try {
    const sess = await readSession();
    if (!sess?.uid || !/^[0-9a-fA-F]{24}$/.test(sess.uid)) {
      return NextResponse.json({ user: null }, noStore);
    }

    const users = await coreCol<UserDoc>("users");
    const doc = await users.findOne({ _id: new ObjectId(sess.uid) });

    if (!doc) return NextResponse.json({ user: null }, noStore);

    const roles = Array.isArray(doc.roles)
      ? doc.roles.map((r: any) => (typeof r === "string" ? r : r?.role)).filter(Boolean)
      : [];

    return NextResponse.json(
      {
        user: {
          id: String(doc._id),
          email: doc.email ?? null,
          name: doc.name ?? null,
          roles: roles.length ? roles : ["user"],
          accessTier: doc.accessTier ?? null,
          b2cPlanId: doc.b2cPlanId ?? null,
          engagementXp: doc.engagementXp ?? null,
          vogMembershipStatus: doc.vogMembershipStatus ?? null,
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
