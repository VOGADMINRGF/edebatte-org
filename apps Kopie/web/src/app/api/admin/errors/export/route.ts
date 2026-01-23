import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export async function GET(req: NextRequest) {
  const lvl = (new URL(req.url).searchParams.get("lvl") || "").toLowerCase();
  const col = await coreCol("error_logs").catch(() => null);
  if (!col) return NextResponse.json("no logs", { status: 200 });

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const q: any = { ts: { $gte: since } };
  if (lvl) q.lvl = lvl;
  const items = await col.find(q).sort({ ts: -1 }).limit(2000).toArray();

  const rows = [["ts", "lvl", "msg"]];
  for (const x of items)
    rows.push([
      new Date(x.ts).toISOString(),
      x.lvl || "error",
      (x.msg || "").toString().replace(/\n/g, " "),
    ]);
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return NextResponse.json(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=errors_last24h.csv",
    },
  });
}
