import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { ErrorLogModel } from "@/models/ErrorLog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await ErrorLogModel.collection();
  const item = await col.findOne({ _id: new ObjectId(id) });
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const related = item.traceId
    ? await col
        .find({ traceId: item.traceId })
        .sort({ timestamp: -1 })
        .limit(30)
        .toArray()
    : [];

  return NextResponse.json({
    ok: true,
    item: serialize(item),
    related: related.map(serialize),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { resolved?: boolean } | null;
  if (!body || typeof body.resolved !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const col = await ErrorLogModel.collection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { resolved: body.resolved, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: serialize(result) });
}

function serialize(doc: any) {
  return {
    ...doc,
    _id: doc._id?.toString?.() ?? String(doc._id),
    timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}
