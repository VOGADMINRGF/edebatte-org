import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  dossierEdgesCol,
  openQuestionsCol,
} from "@features/dossier/db";
import { findDossierByAnyId } from "@features/dossier/lookup";
import { sanitizeClaimPublic, selectEffectiveFindings } from "@features/dossier/effective";
import { rateLimitHeaders } from "@/utils/rateLimitHelpers";
import { rateLimitPublic } from "@/utils/publicRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({ dossierId: z.string().min(1) });
const EXPORT_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

async function resolveParams(p: any): Promise<{ dossierId: string }> {
  const val = p && typeof p.then === "function" ? await p : p;
  return ParamsSchema.parse(val);
}

function stripId<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id, ...rest } = doc;
  return rest;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const rl = await rateLimitPublic(req, EXPORT_RATE_LIMIT.limit, EXPORT_RATE_LIMIT.windowMs, "dossier_export_json");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const { dossierId } = await resolveParams(context.params);
  const dossier = await findDossierByAnyId(dossierId);
  if (!dossier) {
    return NextResponse.json({ ok: false, error: "dossier_not_found" }, { status: 404 });
  }

  const dossierKey = dossier.dossierId;
  const [claims, sources, findings, openQuestions, edges] = await Promise.all([
    (await dossierClaimsCol()).find({ dossierId: dossierKey }).sort({ createdAt: 1 }).toArray(),
    (await dossierSourcesCol()).find({ dossierId: dossierKey }).sort({ publishedAt: -1, createdAt: -1 }).toArray(),
    (await dossierFindingsCol()).find({ dossierId: dossierKey }).sort({ updatedAt: -1 }).toArray(),
    (await openQuestionsCol()).find({ dossierId: dossierKey }).sort({ status: 1, createdAt: 1 }).toArray(),
    (await dossierEdgesCol()).find({ dossierId: dossierKey, active: { $ne: false } }).sort({ createdAt: 1 }).toArray(),
  ]);
  const effectiveFindings = selectEffectiveFindings(findings);

  return NextResponse.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    dossier: stripId(dossier),
    claims: claims.map(stripId).map(sanitizeClaimPublic),
    sources: sources.map(stripId),
    findings: effectiveFindings.map(stripId),
    openQuestions: openQuestions.map(stripId),
    edges: edges.map(stripId),
  }, { headers: rateLimitHeaders(rl) });
}
