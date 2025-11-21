// core/telemetry/aiUsage.ts
import { coreCol } from "../db/triMongo";
import type { AiUsageEvent, AiUsageDailyRow } from "./aiUsageTypes";

const COLLECTION_USAGE = "ai_usage";
const COLLECTION_DAILY = "ai_usage_daily";

export async function logAiUsage(event: AiUsageEvent): Promise<void> {
  const col = await coreCol<AiUsageEvent>(COLLECTION_USAGE);
  await col.insertOne({
    ...event,
    createdAt: event.createdAt ?? new Date(),
  });
}

export async function aggregateDailyUsage(date: Date): Promise<void> {
  const usageCol = await coreCol<AiUsageEvent>(COLLECTION_USAGE);
  const dailyCol = await coreCol<AiUsageDailyRow>(COLLECTION_DAILY);
  const isoDate = date.toISOString().slice(0, 10);

  const rows = await usageCol
    .aggregate<AiUsageDailyRow>([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${isoDate}T00:00:00.000Z`),
            $lt: new Date(`${isoDate}T23:59:59.999Z`),
          },
        },
      },
      {
        $group: {
          _id: {
            provider: "$provider",
            pipeline: "$pipeline",
            region: "$region",
          },
          tokensTotal: { $sum: { $add: ["$tokensInput", "$tokensOutput"] } },
          costTotalEur: { $sum: "$costEur" },
          callsTotal: { $sum: 1 },
          callsError: {
            $sum: {
              $cond: [{ $eq: ["$success", true] }, 0, 1],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: isoDate,
          provider: "$_id.provider",
          pipeline: "$_id.pipeline",
          region: "$_id.region",
          tokensTotal: 1,
          costTotalEur: 1,
          callsTotal: 1,
          callsError: 1,
        },
      },
    ])
    .toArray();

  if (!rows.length) return;

  for (const row of rows) {
    await dailyCol.updateOne(
      {
        date: row.date,
        provider: row.provider,
        pipeline: row.pipeline,
        region: row.region ?? null,
      },
      { $set: row },
      { upsert: true },
    );
  }
}
