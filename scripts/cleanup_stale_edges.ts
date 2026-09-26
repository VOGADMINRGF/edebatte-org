#!/usr/bin/env tsx
import { coreCol } from "@core/db/triMongo";
import { mutateDossierWithRevision } from "@features/dossier/revisions";

type EdgeDoc = {
  _id?: unknown;
  edgeId: string;
  dossierId: string;
  fromId: string;
  toId: string;
  rel: string;
  active?: boolean;
  createdAt?: Date;
};

type FindingDoc = {
  findingId: string;
  verdict: string;
};

function verdictToRel(verdict?: string) {
  switch (String(verdict ?? "").toLowerCase()) {
    case "supports":
      return "supports";
    case "refutes":
      return "refutes";
    default:
      return "mentions";
  }
}

function parseLimit(args: string[]) {
  const arg = args.find((a) => a.startsWith("--limit="));
  if (!arg) return 0;
  const v = Number(arg.split("=")[1] ?? "0");
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function parseDossierId(args: string[]) {
  const arg = args.find((a) => a.startsWith("--dossierId="));
  return arg ? String(arg.split("=")[1] ?? "").trim() : "";
}

async function run() {
  const args = process.argv.slice(2);
  const limit = parseLimit(args);
  const dossierIdFilter = parseDossierId(args);
  const dryRun = args.includes("--dry-run");

  const col = await coreCol<EdgeDoc>("dossier_edges");
  const findingCol = await coreCol<FindingDoc>("dossier_findings");
  const dossiers = dossierIdFilter
    ? [dossierIdFilter]
    : await col.distinct("dossierId", {});

  let processed = 0;
  let archived = 0;

  for (const dossierId of dossiers) {
    if (limit && processed >= limit) break;
    processed += 1;

    const findings = await findingCol
      .find({ dossierId }, { projection: { findingId: 1, verdict: 1 } })
      .toArray();
    const keepRelByFinding = new Map(
      findings.map((finding) => [finding.findingId, verdictToRel(finding.verdict)]),
    );

    const edges = await col
      .find({
        dossierId,
        fromType: "finding",
        toType: "source",
        rel: { $in: ["supports", "refutes", "mentions"] },
      } as any)
      .toArray();

    let dossierArchived = 0;
    let missingFinding = 0;

    for (const edge of edges) {
      const keepRel = keepRelByFinding.get(edge.fromId);
      if (!keepRel) {
        missingFinding += 1;
        continue;
      }

      if (edge.rel === keepRel || edge.active === false) continue;
      dossierArchived += 1;
      archived += 1;

      if (!dryRun) {
        await mutateDossierWithRevision({
          dossierId,
          mutate: async (session) => {
            const res = await col.updateOne(
              { _id: edge._id, active: { $ne: false } },
              { $set: { active: false, archivedAt: new Date(), archivedReason: "stale_cleanup" } },
              { session },
            );
            return {
              result: null,
              revision:
                res.modifiedCount > 0
                  ? {
                      entityType: "edge",
                      entityId: edge.edgeId,
                      action: "update",
                      diffSummary: "Edge archiviert (Cleanup).",
                      byRole: "system",
                    }
                  : null,
            };
          },
        });
      }
    }

    console.log(
      `[edges-cleanup] dossier=${dossierId} edges=${edges.length} archived=${dossierArchived} missingFinding=${missingFinding} dryRun=${dryRun}`,
    );
  }

  console.log(`[edges-cleanup] done dossiers=${processed} archived=${archived} dryRun=${dryRun}`);
}

run().catch((err) => {
  console.error("[edges-cleanup] fatal", err);
  process.exit(1);
});
