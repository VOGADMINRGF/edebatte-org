import { ObjectId } from "@core/triMongo";
import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";


export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const Users = await getCol("users");
  await Users.updateOne(
    { _id: new ObjectId(id) },
    {
      $unset: { "verification.twoFA": "" },
      $set: { updatedAt: new Date() },
    },
  );

  return NextResponse.json({ ok: true });
}
