import { ObjectId } from "@core/triMongo";
import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";


export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const col = await coreCol("orgs");
  await col.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
