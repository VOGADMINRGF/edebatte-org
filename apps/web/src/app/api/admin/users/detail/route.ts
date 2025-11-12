import { ObjectId } from "@core/triMongo";
import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";
import { coreCol } from "@core/db/triMongo";


export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !ObjectId.isValid(id))
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const Users = await getCol("users");
  const u = await Users.findOne(
    { _id: new ObjectId(id) },
    {
      projection: {
        email: 1,
        name: 1,
        role: 1,
        suspended: 1,
        createdAt: 1,
        verifiedEmail: 1,
        "verification.twoFA.enabled": 1,
      },
    },
  );
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const Acts = await coreCol("activity_logs").catch(() => null);
  const acts = Acts
    ? await Acts.find({ userId: id }).sort({ ts: -1 }).limit(50).toArray()
    : [];
  return NextResponse.json({
    ok: true,
    user: { id, ...u },
    activity: acts.map((x: any) => ({ ts: x.ts, type: x.type, meta: x.meta || {} })),
  });
}
