import { NextResponse } from "next/server";
import { votesCol } from "@core/db/triMongo";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: statementId } = await context.params;
  const votes = await votesCol("votes");
  const since = Date.now() - 90 * 24 * 3600 * 1000;

  const agg = await votes
    .aggregate([
      { $match: { statementId, ts: { $gte: since } } },
      {
        $project: {
          day: {
            $toDate: {
              $subtract: ["$ts", { $mod: ["$ts", 24 * 3600 * 1000] }],
            },
          },
          value: 1,
        },
      },
      { $group: { _id: { day: "$day", value: "$value" }, n: { $sum: 1 } } },
      {
        $group: {
          _id: "$_id.day",
          agree: {
            $sum: { $cond: [{ $eq: ["$_id.value", "agree"] }, "$n", 0] },
          },
          neutral: {
            $sum: { $cond: [{ $eq: ["$_id.value", "neutral"] }, "$n", 0] },
          },
          disagree: {
            $sum: { $cond: [{ $eq: ["$_id.value", "disagree"] }, "$n", 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const series = agg.map((a: any) => ({
    day: new Date(a._id).toISOString().slice(0, 10),
    agree: a.agree,
    neutral: a.neutral,
    disagree: a.disagree,
    total: a.agree + a.neutral + a.disagree,
  }));

  return NextResponse.json({ id: statementId, series }, { status: 200 });
}
