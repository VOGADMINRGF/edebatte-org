import { ObjectId } from "@core/db/triMongo";
import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/db/triMongo";


export async function POST(req: NextRequest) {
  const { id, name, type } = await req.json().catch(() => ({}));
  if (!name)
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  const col = await coreCol("orgs");
  const now = new Date();
  if (id && ObjectId.isValid(id)) {
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, type, updatedAt: now } },
      { upsert: false },
    );
  } else {
    await col.insertOne({
      name,
      type: type || "other",
      createdAt: now,
      updatedAt: now,
    });
  }
  return NextResponse.json({ ok: true });
}
