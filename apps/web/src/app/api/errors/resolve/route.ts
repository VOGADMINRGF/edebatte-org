// apps/web/src/app/api/errors/resolve/route.ts
import { NextResponse } from "next/server";
import { getCol, ObjectId } from "@core/db/triMongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { _id?: string; traceId?: string; resolved?: boolean };

// Minimaltyp für die Log-Dokumente (angepasst an dein Projection-Subset)
type ErrorLogDoc = {
  _id: ObjectId;
  traceId?: string;
  code?: string;
  path?: string;
  resolved?: boolean;
  timestamp?: Date | string | number;
};

export async function POST(req: Request) {
  try {
    const { _id, traceId, resolved }: Body = await req.json();

    if (typeof resolved !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "`resolved` must be boolean" },
        { status: 400 }
      );
    }

    const filter =
      _id ? { _id: new ObjectId(_id) }
    : traceId ? { traceId }
    : null;

    if (!filter) {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "Provide `_id` or `traceId`" },
        { status: 400 }
      );
    }

    const col = await getCol<ErrorLogDoc>("error_logs"); // default-Store: core

    const result = await col.findOneAndUpdate(
      filter,
      { $set: { resolved } },
      {
        returnDocument: "after", // statt { new: true }
        projection: { _id: 1, traceId: 1, code: 1, path: 1, resolved: 1, timestamp: 1 },
      }
    );

    const updated = result?.value; // ✅ ModifyResult<T> hat .value

    if (!updated) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: updated }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
