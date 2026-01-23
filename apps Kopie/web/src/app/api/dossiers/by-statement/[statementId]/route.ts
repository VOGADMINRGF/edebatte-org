import { NextResponse } from "next/server";
import { z } from "zod";
import {
  dossiersCol,
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  openQuestionsCol,
} from "@features/dossier/db";
import {
  loadStatementByAnyId,
  getCanonicalStatementId,
  getStatementAliases,
} from "@features/dossier/statement";
import { sanitizeClaimPublic, selectEffectiveFindings } from "@features/dossier/effective";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({ statementId: z.string().min(1) });

async function resolveParams(p: any): Promise<{ statementId: string }> {
  const val = p && typeof p.then === "function" ? await p : p;
  return ParamsSchema.parse(val);
}

function stripId<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id, ...rest } = doc;
  return rest;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ statementId: string }> },
) {
  const { statementId } = await resolveParams(context.params);
  const statement = await loadStatementByAnyId(statementId);
  if (!statement) {
    return NextResponse.json({ ok: false, error: "statement_not_found" }, { status: 404 });
  }

  const canonicalStatementId = getCanonicalStatementId(statement, statementId);
  const aliases = getStatementAliases(statement);
  const ids = [canonicalStatementId, ...aliases].filter(Boolean);
  const dossier = await (await dossiersCol()).findOne({
    $or: [{ statementId: { $in: ids } }, { dossierId: { $in: ids } }],
  } as any);
  if (!dossier) {
    return NextResponse.json({ ok: false, error: "dossier_not_found" }, { status: 404 });
  }

  const dossierId = dossier.dossierId;
  const includeRaw = new URL(req.url).searchParams.get("include") === "raw";
  const [claims, sources, findings, openQuestions] = await Promise.all([
    (await dossierClaimsCol()).find({ dossierId }).sort({ createdAt: 1 }).toArray(),
    (await dossierSourcesCol()).find({ dossierId }).sort({ publishedAt: -1, createdAt: -1 }).toArray(),
    (await dossierFindingsCol()).find({ dossierId }).sort({ updatedAt: -1 }).toArray(),
    (await openQuestionsCol()).find({ dossierId }).sort({ status: 1, createdAt: 1 }).toArray(),
  ]);

  const effectiveFindings = selectEffectiveFindings(findings);
  const counts = {
    claims: claims.length,
    sources: sources.length,
    findings: effectiveFindings.length,
    edges: 0,
    openQuestions: openQuestions.length,
  };

  return NextResponse.json({
    ok: true,
    dossier: { ...stripId(dossier), counts },
    claims: claims.map(stripId).map(sanitizeClaimPublic),
    sources: sources.map(stripId),
    findings: effectiveFindings.map(stripId),
    findingsRaw: includeRaw ? findings.map(stripId) : undefined,
    openQuestions: openQuestions.map(stripId),
  });
}
