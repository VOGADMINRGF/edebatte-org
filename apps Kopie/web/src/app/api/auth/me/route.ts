// apps/web/src/app/api/auth/me/route.ts
import { ObjectId } from "@core/db/triMongo";
import { NextResponse } from "next/server";
import { readSession } from "@/utils/session";
import { coreCol } from "@core/db/db/triMongo";
import { getEngagementLevel } from "@features/user/engagement";
import { deriveAccessTierFromPlanCode } from "@core/access/accessTiers";

export const runtime = "nodejs";

type UserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  profile?: {
    avatarUrl?: string | null;
    avatarStyle?: "initials" | "abstract" | "emoji" | null;
  } | null;
  roles?: Array<string | { role?: string; subRole?: string }> | null;
  accessTier?: string | null;
  b2cPlanId?: string | null;
  engagementXp?: number | null;
  stats?: { xp?: number | null; engagementLevel?: string | null; contributionCredits?: number | null };
  usage?: { xp?: number | null; contributionCredits?: number | null };
  vogMembershipStatus?: string | null;
};

export async function GET() {
  const noStore = { headers: { "Cache-Control": "no-store" } };

  try {
    const sess = await readSession();
    if (!sess?.uid || !/^[0-9a-fA-F]{24}$/.test(sess.uid)) {
      return NextResponse.json({ user: null }, { status: 401, ...noStore });
    }

    const users = await coreCol<UserDoc>("users");
    const doc = await users.findOne({ _id: new ObjectId(sess.uid) });

    if (!doc) return NextResponse.json({ user: null }, { status: 401, ...noStore });

    const roles = Array.isArray(doc.roles)
      ? doc.roles.map((r: any) => (typeof r === "string" ? r : r?.role)).filter(Boolean)
      : [];

    const xp = doc.engagementXp ?? doc.stats?.xp ?? doc.usage?.xp ?? 0;
    const engagementLevel = doc.stats?.engagementLevel || getEngagementLevel(xp ?? 0);
    const contributionCredits =
      doc.stats?.contributionCredits ?? doc.usage?.contributionCredits ?? null;
    const accessTier = deriveAccessTierFromPlanCode(doc.accessTier ?? doc.b2cPlanId ?? null);
    const planSlug = doc.b2cPlanId ?? accessTier ?? null;

    return NextResponse.json(
      {
        user: {
          id: String(doc._id),
          email: doc.email ?? null,
          name: doc.name ?? null,
          roles: roles.length ? roles : ["user"],
          accessTier,
          b2cPlanId: planSlug,
          engagementXp: doc.engagementXp ?? null,
          engagementLevel: engagementLevel ?? null,
          contributionCredits,
          planSlug,
          vogMembershipStatus: doc.vogMembershipStatus ?? null,
          isSuperadmin: roles.includes("superadmin"),
          avatarUrl: doc.profile?.avatarUrl ?? null,
          avatarStyle: doc.profile?.avatarStyle ?? null,
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
