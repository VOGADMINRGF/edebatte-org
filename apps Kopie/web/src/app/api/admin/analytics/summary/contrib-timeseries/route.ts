import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export async function GET() {
  const col = await coreCol("statements");
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const agg = await col
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return NextResponse.json({
    ok: true,
    series: agg.map((x: any) => ({ date: x._id, count: x.count })),
  });
}
