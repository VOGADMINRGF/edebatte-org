import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stableHash } from "@core/utils/hash";
import {
  dossierClaimsCol,
  dossierEdgesCol,
  dossierFindingsCol,
  dossierSourcesCol,
  updateDossierCounts,
} from "@features/dossier/db";
import { DossierFindingVerdictSchema, type DossierEdgeRel } from "@features/dossier/schemas";
import {
  DOSSIER_LIMITS,
  clampLocator,
  clampQuote,
  clampRationaleItem,
} from "@features/dossier/limits";
import { logDossierRevision } from "@features/dossier/revisions";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const CitationSchema = z.object({
  sourceId: z.string().min(1),
  quote: z.string().max(DOSSIER_LIMITS.quote).optional(),
  locator: z.string().max(DOSSIER_LIMITS.locator).optional(),
});

const FindingInputSchema = z.object({
  claimId: z.string().min(1),
  verdict: DossierFindingVerdictSchema,
  rationale: z
    .union([
      z.string().min(1).max(DOSSIER_LIMITS.rationale),
      z.array(z.string().min(1).max(DOSSIER_LIMITS.rationale)).min(1).max(12),
    ])
    .optional(),
  citations: z.array(CitationSchema).optional(),
});

const BodySchema = z.object({
  items: z.array(FindingInputSchema).min(1),
});

function normalizeRationale(input?: string | string[]) {
  if (!input) return [] as string[];
  if (Array.isArray(input)) {
    return input.map((item) => clampRationaleItem(item)).filter(Boolean) as string[];
  }
  return input
    .split(/\n+/)
    .map((item) => clampRationaleItem(item))
    .filter(Boolean) as string[];
}

function verdictToClaimStatus(verdict: z.infer<typeof DossierFindingVerdictSchema>) {
  switch (verdict) {
    case "supports":
      return "supported";
    case "refutes":
      return "refuted";
    case "mixed":
    case "unclear":
    default:
      return "unclear";
  }
}

async function archiveEdges(params: {
  dossierId: string;
  fromId: string;
  toId: string;
  keepRel: DossierEdgeRel;
  byRole: "editor" | "admin";
  byUserId?: string;
}) {
  const edgeCol = await dossierEdgesCol();
  const now = new Date();
  const staleEdges = await edgeCol
    .find({
      dossierId: params.dossierId,
      fromId: params.fromId,
      toId: params.toId,
      rel: { $ne: params.keepRel },
      active: { $ne: false },
    })
    .toArray();

  if (staleEdges.length === 0) return;

  await edgeCol.updateMany(
    {
      dossierId: params.dossierId,
      fromId: params.fromId,
      toId: params.toId,
      rel: { $ne: params.keepRel },
      active: { $ne: false },
    },
    { $set: { active: false, archivedAt: now, archivedReason: "verdict_changed" } },
  );

  for (const edge of staleEdges) {
    await logDossierRevision({
      dossierId: params.dossierId,
      entityType: "edge",
      entityId: edge.edgeId,
      action: "update",
      diffSummary: "Edge archiviert (Verdict geaendert).",
      byRole: params.byRole,
      byUserId: params.byUserId,
    });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const raw = await req.json();
  const body = BodySchema.parse(raw);

  const claimCol = await dossierClaimsCol();
  const findingCol = await dossierFindingsCol();
  const edgeCol = await dossierEdgesCol();
  const sourceCol = await dossierSourcesCol();

  const existingEditorFindings = await findingCol
    .find({ dossierId, producedBy: "editor" })
    .toArray();
  const existingByClaim = new Map(existingEditorFindings.map((f: any) => [f.claimId, f]));

  const preparedItems = body.items.map((item) => {
    const existing = existingByClaim.get(item.claimId);
    const rationale =
      item.rationale === undefined ? existing?.rationale ?? [] : normalizeRationale(item.rationale);
    const citations = (item.citations ?? existing?.citations ?? [])
      .map((c) => ({
        sourceId: c.sourceId,
        quote: clampQuote(c.quote),
        locator: clampLocator(c.locator),
      }))
      .filter((c) => Boolean(c.sourceId));
    return { item, rationale, citations };
  });

  const citationIds = new Set<string>();
  for (const prepared of preparedItems) {
    for (const citation of prepared.citations) {
      citationIds.add(citation.sourceId);
    }
  }
  const sourceDocs = citationIds.size
    ? await sourceCol
        .find({ dossierId, sourceId: { $in: Array.from(citationIds) } }, { projection: { sourceId: 1 } })
        .toArray()
    : [];
  const knownSources = new Set(sourceDocs.map((s) => s.sourceId));

  const now = new Date();
  const edgeCreatedBy: "pipeline" | "editor" = auth.actorRole === "pipeline" ? "pipeline" : "editor";
  const results: Array<{ claimId: string; created: boolean; warnings?: string[] }> = [];

  for (const prepared of preparedItems) {
    const item = prepared.item;
    const claim = await claimCol.findOne({ dossierId, claimId: item.claimId });
    if (!claim) {
      results.push({ claimId: item.claimId, created: false, warnings: ["claim_not_found"] });
      continue;
    }

    const producedBy = "editor";
    const findingId = `finding_${item.claimId}_editor`;
    const verdict = item.verdict;
    const rationale = prepared.rationale;
    const citations = prepared.citations;

    const warnings: string[] = [];
    const validCitations = citations.filter((c) => {
      if (!knownSources.has(c.sourceId)) {
        warnings.push(`source_missing:${c.sourceId}`);
        return false;
      }
      return true;
    });

    const findingRes = await findingCol.updateOne(
      { dossierId, claimId: item.claimId, producedBy },
      {
        $set: {
          findingId,
          dossierId,
          claimId: item.claimId,
          verdict,
          rationale,
          citations: validCitations,
          producedBy,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const claimStatus = verdictToClaimStatus(verdict);
    const claimRes = await claimCol.updateOne(
      { dossierId, claimId: item.claimId },
      { $set: { status: claimStatus, updatedAt: now } },
    );

    for (const citation of validCitations) {
      const rel: DossierEdgeRel =
        verdict === "supports" ? "supports" : verdict === "refutes" ? "refutes" : "mentions";
      await archiveEdges({
        dossierId,
        fromId: findingId,
        toId: citation.sourceId,
        keepRel: rel,
        byRole: auth.actorRole === "admin" ? "admin" : "editor",
        byUserId: auth.userId,
      });

      const edgeId = `edge_${stableHash(`${dossierId}:${findingId}:${citation.sourceId}:${rel}`).slice(0, 12)}`;
      const edgeRes = await edgeCol.updateOne(
        { dossierId, fromId: findingId, toId: citation.sourceId, rel },
        {
          $set: {
            fromType: "finding",
            fromId: findingId,
            toType: "source",
            toId: citation.sourceId,
            rel,
            active: true,
          },
          $unset: { archivedAt: "", archivedReason: "" },
          $setOnInsert: {
            dossierId,
            edgeId,
            createdBy: edgeCreatedBy,
            createdAt: now,
          },
        },
        { upsert: true },
      );
      await logDossierRevision({
        dossierId,
        entityType: "edge",
        entityId: edgeId,
        action: edgeRes.upsertedId ? "create" : "update",
        diffSummary: edgeRes.upsertedId ? "Graph-Edge erstellt (Editor-Finding)." : "Graph-Edge aktualisiert (Editor-Finding).",
        byRole: auth.actorRole,
        byUserId: auth.userId,
      });
    }

    const claimEdgeId = `edge_${stableHash(`${dossierId}:${item.claimId}:${findingId}:context`).slice(0, 12)}`;
    const claimEdgeRes = await edgeCol.updateOne(
      { dossierId, fromId: item.claimId, toId: findingId, rel: "context_for" },
      {
        $set: {
          fromType: "claim",
          fromId: item.claimId,
          toType: "finding",
          toId: findingId,
          rel: "context_for",
          active: true,
        },
        $unset: { archivedAt: "", archivedReason: "" },
        $setOnInsert: {
          dossierId,
          edgeId: claimEdgeId,
          createdBy: edgeCreatedBy,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await logDossierRevision({
      dossierId,
      entityType: "edge",
      entityId: claimEdgeId,
      action: claimEdgeRes.upsertedId ? "create" : "update",
      diffSummary: claimEdgeRes.upsertedId
        ? "Claim-Finding-Edge erstellt (Editor-Finding)."
        : "Claim-Finding-Edge aktualisiert (Editor-Finding).",
      byRole: auth.actorRole,
      byUserId: auth.userId,
    });

    await logDossierRevision({
      dossierId,
      entityType: "finding",
      entityId: findingId,
      action: findingRes.upsertedId ? "create" : "update",
      diffSummary: findingRes.upsertedId ? "Finding angelegt (Editor)." : "Finding aktualisiert (Editor).",
      byRole: auth.actorRole,
      byUserId: auth.userId,
    });

    if (claimRes.modifiedCount > 0) {
      await logDossierRevision({
        dossierId,
        entityType: "claim",
        entityId: item.claimId,
        action: "status_change",
        diffSummary: "Claim-Status aktualisiert (Editor-Finding).",
        byRole: auth.actorRole,
        byUserId: auth.userId,
      });
    }

    results.push({ claimId: item.claimId, created: Boolean(findingRes.upsertedId), warnings });
  }

  const counts = await updateDossierCounts(dossierId, "Editor Finding Update");
  return NextResponse.json({ ok: true, items: results, counts });
}
