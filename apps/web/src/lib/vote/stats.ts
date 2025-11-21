//apps/web/src/lib/vote/stats.ts
import { VoteModel } from "@/models/votes/Vote";
import { redisPublish } from "@/lib/redis"; // nur für Invalidation-Event, optional
import { ObjectId } from "@core/db/triMongo";

type Totals = {
  agree: number;
  neutral: number;
  disagree: number;
  total: number;
  pctAgree: number;
  pctNeutral: number;
  pctDisagree: number;
};
type CountryRow = {
  country: string;
  agree: number;
  neutral: number;
  disagree: number;
  total: number;
  pctAgree: number;
  pctNeutral: number;
  pctDisagree: number;
};

function pctOf(total: number, n: number) {
  return total ? Math.round((n / total) * 1000) / 10 : 0;
}

export async function getVoteStats(statementId: string) {
  const Vote = await VoteModel();
  const sid = new ObjectId(statementId);

  const totalsCursor = Vote.aggregate([
    { $match: { statementId: sid, deletedAt: { $exists: false } } },
    {
      $facet: {
        totals: [{ $group: { _id: "$choice", c: { $sum: 1 } } }],
        byCountry: [
          { $match: { "region.country": { $type: "string" } } },
          {
            $group: {
              _id: {
                country: { $toUpper: "$region.country" },
                choice: "$choice",
              },
              c: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);
  totalsCursor.allowDiskUse(true);
  const [res] = await totalsCursor.toArray();

  // totals
  const tMap: Record<string, number> = { agree: 0, neutral: 0, disagree: 0 };
  for (const t of res?.totals ?? []) tMap[t._id] = t.c;
  const total = tMap.agree + tMap.neutral + tMap.disagree;
  const totals: Totals = {
    agree: tMap.agree,
    neutral: tMap.neutral,
    disagree: tMap.disagree,
    total,
    pctAgree: pctOf(total, tMap.agree),
    pctNeutral: pctOf(total, tMap.neutral),
    pctDisagree: pctOf(total, tMap.disagree),
  };

  // byCountry
  const cMap = new Map<string, CountryRow>();
  for (const r of res?.byCountry ?? []) {
    const c = r._id.country;
    if (!c) continue;
    if (!cMap.has(c))
      cMap.set(c, {
        country: c,
        agree: 0,
        neutral: 0,
        disagree: 0,
        total: 0,
        pctAgree: 0,
        pctNeutral: 0,
        pctDisagree: 0,
      });
    const row = cMap.get(c)!;
    (row as any)[r._id.choice] += r.c;
    row.total += r.c;
  }
  const byCountry = [...cMap.values()]
    .map((x) => ({
      ...x,
      pctAgree: pctOf(x.total, x.agree),
      pctNeutral: pctOf(x.total, x.neutral),
      pctDisagree: pctOf(x.total, x.disagree),
    }))
    .sort((a, b) => b.total - a.total);

  return { totals, byCountry };
}

export async function getVoteTimeseries(statementId: string, days = 30) {
  const Vote = await VoteModel();
  const sid = new ObjectId(statementId);
  const since = new Date(Date.now() - days * 864e5);
  since.setUTCHours(0, 0, 0, 0);

  const rowsCursor = Vote.aggregate([
    {
      $match: {
        statementId: sid,
        deletedAt: { $exists: false },
        day: { $gte: since },
      },
    },
    { $group: { _id: { day: "$day", choice: "$choice" }, c: { $sum: 1 } } },
    { $sort: { "_id.day": 1 } },
  ]);
  rowsCursor.allowDiskUse(true);
  const rows = await rowsCursor.toArray();

  const out: Array<{
    day: string;
    agree: number;
    neutral: number;
    disagree: number;
    total: number;
  }> = [];
  for (const r of rows) {
    const day = new Date(r._id.day).toISOString().slice(0, 10);
    let row = out.find((x) => x.day === day);
    if (!row) {
      row = { day, agree: 0, neutral: 0, disagree: 0, total: 0 };
      out.push(row);
    }
    (row as any)[r._id.choice] += r.c;
    row.total += r.c;
  }
  return out;
}
