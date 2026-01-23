// apps/web/src/app/api/errors/resolve.ts
import { NextResponse } from "next/server";
import { getCol, ObjectId } from "@core/db/triMongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { _id?: string; traceId?: string; resolved?: boolean };

export async function POST(req: Request) {
  try {
    const { _id, traceId, resolved }: Body = await req.json();

    if (typeof resolved !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "`resolved` must be boolean" },
        { status: 400 },
      );
    }

    const filter =
      _id ? { _id: new ObjectId(_id) } :
      traceId ? { traceId } :
      null;

    if (!filter) {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "Provide `_id` or `traceId`" },
        { status: 400 },
      );
    }

    const col = await getCol("error_logs"); // default-Store: core

    const res = await col.findOneAndUpdate(
      filter as any,
      { $set: { resolved } },
      {
        returnDocument: "after",
        projection: { _id: 1, traceId: 1, code: 1, path: 1, resolved: 1, timestamp: 1 },
      } as any
    );

    // kompatibel für v5 (ModifyResult) und v6 (T|null)
    const updated = (res && typeof res === "object" && "value" in (res as any))
      ? (res as any).value
      : res;

    if (!updated) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: updated }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
