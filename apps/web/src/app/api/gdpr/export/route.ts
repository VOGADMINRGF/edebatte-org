import { NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import { ObjectId, coreCol, piiCol, votesCol } from "@core/db/triMongo";
import { readSession } from "@/utils/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function collectByUser(collection: Collection<Document>, userId: ObjectId) {
  return collection
    .find({
      $or: [
        { _id: userId },
        { userId },
        { coreUserId: userId },
      ],
    })
    .toArray();
}

export async function GET() {
  const session = await readSession();
  if (!session?.uid || !ObjectId.isValid(session.uid)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = new ObjectId(session.uid);
  const [users, contributions, profiles, votes] = await Promise.all([
    collectByUser(await coreCol("users"), userId),
    collectByUser(await coreCol("contributions"), userId),
    collectByUser(await piiCol("user_profiles"), userId),
    collectByUser(await votesCol("votes"), userId),
  ]);

  const payload = {
    ok: true,
    exportedAt: new Date().toISOString(),
    data: {
      core: { users, contributions },
      pii: { user_profiles: profiles },
      votes: { votes },
    },
  };

  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="edebatte_export_${session.uid}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
