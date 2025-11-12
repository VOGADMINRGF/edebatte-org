import { ObjectId } from "@core/triMongo";
import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";


export async function POST(req: NextRequest) {
  const { id, role } = await req.json().catch(() => ({}));
  if (
    !ObjectId.isValid(id) ||
    !["user", "editor", "moderator", "admin"].includes(role)
  )
    return NextResponse.json({ error: "bad_input" }, { status: 400 });

  const Users = await getCol("users");
  await Users.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role, updatedAt: new Date() } },
  );
  return NextResponse.json({ ok: true });
}
