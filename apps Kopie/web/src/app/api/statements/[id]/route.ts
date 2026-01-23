import { NextResponse } from "next/server";
import { coreCol, ObjectId } from "@core/db/triMongo";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok:false, error:"bad_id" }, { status:400 });
  }
  const col = await coreCol("statements");
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });
  return NextResponse.json({ ok:true, data:{
    id: String(doc._id),
    title: doc.title ?? null,
    text: doc.text,
    category: doc.category ?? null,
    language: doc.language ?? null,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    analysis: doc.analysis ?? null,
  }});
}
