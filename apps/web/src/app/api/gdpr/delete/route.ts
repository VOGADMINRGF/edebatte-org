import { NextRequest, NextResponse } from "next/server";
import { ObjectId, coreCol, piiCol, votesCol } from "@core/db/triMongo";
import { clearSession, readSession } from "@/utils/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRMATION = "DELETE_MY_EDEBATTE_ACCOUNT";

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session?.uid || !ObjectId.isValid(session.uid)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (body?.confirmation !== CONFIRMATION) {
    return NextResponse.json(
      { error: "confirmation_required", confirmation: CONFIRMATION },
      { status: 400 },
    );
  }

  const userId = new ObjectId(session.uid);
  const byUser = { userId };
  const byCoreUser = { coreUserId: userId };

  const [votes, contributions, profiles, credentials, emailTokens, challenges] = await Promise.all([
    votesCol("votes"),
    coreCol("contributions"),
    piiCol("user_profiles"),
    piiCol("user_credentials"),
    piiCol("emailTokens"),
    piiCol("twofactor_challenges"),
  ]);

  const results = await Promise.all([
    votes.deleteMany(byUser as any),
    contributions.deleteMany(byUser as any),
    profiles.deleteMany({ $or: [byUser, byCoreUser] } as any),
    credentials.deleteMany(byCoreUser as any),
    emailTokens.deleteMany({ $or: [byUser, byCoreUser] } as any),
    challenges.deleteMany({ $or: [byUser, byCoreUser] } as any),
  ]);

  const users = await coreCol("users");
  const userDelete = await users.deleteOne({ _id: userId } as any);
  await clearSession();

  return NextResponse.json(
    {
      ok: true,
      deleted: {
        votes: results[0].deletedCount,
        contributions: results[1].deletedCount,
        profiles: results[2].deletedCount,
        credentials: results[3].deletedCount,
        emailTokens: results[4].deletedCount,
        twoFactorChallenges: results[5].deletedCount,
        users: userDelete.deletedCount,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
