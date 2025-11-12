import { ObjectId } from "@core/triMongo";
import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

import { isOrgType } from "@/models/org";

export async function POST(req: NextRequest) {
  const { id, name, type } = await req.json().catch(() => ({}));
  if (!name)
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  const t = isOrgType(type) ? type : "other";
  const col = await coreCol("orgs");
  const now = new Date();
  if (id && ObjectId.isValid(id)) {
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, type: t, updatedAt: now } },
    );
  } else {
    await col.insertOne({
      name,
      type: t,
      members: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  return NextResponse.json({ ok: true });
}
