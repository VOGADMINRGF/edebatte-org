import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export async function GET() {
  const col = await coreCol("orgs");
  const items = await col.find({}).sort({ createdAt: -1 }).limit(200).toArray();
  return NextResponse.json({
    ok: true,
    items: items.map((x) => ({
      id: String(x._id),
      name: x.name,
      type: x.type || "other",
      members: x.members || 0,
    })),
  });
}
