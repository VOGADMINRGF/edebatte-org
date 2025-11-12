import { NextResponse } from "next/server";
import { coreCol, ObjectId } from "@core/triMongo";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ ok:false, error:"bad_id" }, { status:400 });
  }
  const col = await coreCol("statements");
  const doc = await col.findOne({ _id: new ObjectId(params.id) });
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
