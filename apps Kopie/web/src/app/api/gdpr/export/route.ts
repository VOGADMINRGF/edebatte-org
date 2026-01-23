import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/getServerUser";
import { mongo } from "@/db/mongoose";
import mongoose from "mongoose";

// Beispiel: sammle Kernressourcen; erweitere bei Bedarf
export async function GET() {
  const user = await getServerUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await mongo();
  const db = mongoose.connection.db;

  const out: Record<string, unknown[]> = {};
  for (const col of ["users", "userprofiles", "votes", "contributions"]) {
    const exists = await (db as any).listCollections({ name: col }).hasNext();
    if (!exists) continue;
    const arr = await (db as any)
      .collection(col)
      .find({
        $or: [
          { _id: new mongoose.Types.ObjectId(user.id) },
          { userId: new mongoose.Types.ObjectId(user.id) },
        ],
      })
      .toArray();
    if (arr.length) out[col] = arr;
  }

  return NextResponse.json(JSON.stringify({ ok: true, data: out }), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="vog_export_${user.id}.json"`,
    },
  });
}
