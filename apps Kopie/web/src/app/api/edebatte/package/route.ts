import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { coreCol, ObjectId } from "@core/db/triMongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  package: z.enum(["basis", "start", "pro"]),
});

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const userId = jar.get("u_id")?.value;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  // Placeholder-Update: Wir merken das gewünschte Paket im User-Dokument an.
  const Users = await coreCol("users");
  await Users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        "edebatte.package": parsed.data.package,
        "edebatte.status": "preorder",
        "edebatte.updatedAt": new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true });
}
