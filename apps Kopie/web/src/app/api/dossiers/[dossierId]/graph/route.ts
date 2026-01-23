import { NextResponse } from "next/server";
import { z } from "zod";
import {
  dossierEdgesCol,
  dossierClaimsCol,
  dossierSourcesCol,
  dossierFindingsCol,
  openQuestionsCol,
} from "@features/dossier/db";
import { findDossierByAnyId } from "@features/dossier/lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({ dossierId: z.string().min(1) });

async function resolveParams(p: any): Promise<{ dossierId: string }> {
  const val = p && typeof p.then === "function" ? await p : p;
  return ParamsSchema.parse(val);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ dossierId: string }> },
) {
  const { dossierId } = await resolveParams(context.params);
  const dossier = await findDossierByAnyId(dossierId);
  if (!dossier) {
    return NextResponse.json({ ok: false, error: "dossier_not_found" }, { status: 404 });
  }

  const dossierKey = dossier.dossierId;
  const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "1";
  const edgeQuery = includeArchived ? { dossierId: dossierKey } : { dossierId: dossierKey, active: { $ne: false } };
  const [claims, sources, findings, openQuestions, edges] = await Promise.all([
    (await dossierClaimsCol()).find({ dossierId: dossierKey }).toArray(),
    (await dossierSourcesCol()).find({ dossierId: dossierKey }).toArray(),
    (await dossierFindingsCol()).find({ dossierId: dossierKey }).toArray(),
    (await openQuestionsCol()).find({ dossierId: dossierKey }).toArray(),
    (await dossierEdgesCol()).find(edgeQuery).toArray(),
  ]);

  const nodes = [
    ...claims.map((claim) => ({
      id: claim.claimId,
      type: "claim",
      label: claim.text,
      status: claim.status,
      kind: claim.kind,
    })),
    ...sources.map((source) => ({
      id: source.sourceId,
      type: "source",
      label: source.title,
      publisher: source.publisher,
      sourceType: source.type,
      url: source.url,
    })),
    ...findings.map((finding) => ({
      id: finding.findingId,
      type: "finding",
      label: finding.verdict,
      verdict: finding.verdict,
      claimId: finding.claimId,
    })),
    ...openQuestions.map((q) => ({
      id: q.questionId,
      type: "open_question",
      label: q.text,
      status: q.status,
    })),
  ];

  const graphEdges = edges.map((edge) => ({
    id: edge.edgeId,
    from: edge.fromId,
    to: edge.toId,
    rel: edge.rel,
    fromType: edge.fromType,
    toType: edge.toType,
    weight: edge.weight ?? null,
    justification: edge.justification ?? null,
  }));

  return NextResponse.json({
    ok: true,
    summary: {
      nodeCount: nodes.length,
      edgeCount: graphEdges.length,
      claims: claims.length,
      sources: sources.length,
      findings: findings.length,
      openQuestions: openQuestions.length,
    },
    nodes,
    edges: graphEdges,
  });
}
