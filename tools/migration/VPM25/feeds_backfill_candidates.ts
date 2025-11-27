// tools/migration/VPM25/feeds_backfill_candidates.ts
// Usage: pnpm tsx tools/migration/VPM25/feeds_backfill_candidates.ts

import { closeAll } from "@/core/db/triMongo";
import { statementCandidatesCol } from "@/features/feeds/db";
import type { StatementCandidate } from "@/features/feeds/types";

async function main() {
  const col = await statementCandidatesCol();
  const now = new Date();

  const filter = {
    $or: [
      { analyzeStatus: { $exists: false } },
      { analyzeStatus: null },
    ],
  };

  const update = {
    $set: {
      analyzeStatus: "pending" as StatementCandidate["analyzeStatus"],
      analyzeRequestedAt: now,
      analyzeStartedAt: null,
      analyzeCompletedAt: null,
      analyzeError: null,
      analyzeLocale: null,
      analyzeResultId: null,
      priority: "normal",
    },
  };

  const result = await col.updateMany(filter, update);
  console.log(
    `[feeds_backfill_candidates] updated ${result.modifiedCount} documents (matched ${result.matchedCount}).`,
  );
}

main()
  .catch((err) => {
    console.error("[feeds_backfill_candidates] error", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeAll();
  });
