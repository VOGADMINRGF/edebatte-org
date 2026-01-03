import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { formatError } from "@core/errors/formatError";
import { logger } from "@core/observability/logger";
import { hasPermission, PERMISSIONS, type Role } from "@core/auth/rbac";
import { safeRandomId } from "@core/utils/random";
import { analyzeContribution } from "@features/analyze/analyzeContribution";
import { voteDraftsCol } from "@features/feeds/db";
import { ObjectId } from "@core/db/triMongo";
import { callAriSearchSerp, type SerpResultLite } from "@features/ai/providers/ari_search";
import { factcheckJobsCol, type FactcheckJobStatus } from "@features/factcheck/db";
import type { AnalyzeResult, StatementRecord } from "@features/analyze/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLAIMS = 8;
const MAX_SERP_QUERY_CHARS = 220;

const EnqueueSchema = z.object({
  // bevorzugt: draftId (VoteDraft) oder text
  draftId: z.string().optional().nullable(),
  contributionId: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  language: z.string().optional().nullable(), // "de" | "en" | ...
  // optional: bereits vorhandene claims (z.B. aus Draft)
  claims: z.array(z.any()).optional().nullable(),
  // evidence lookup
  withSerp: z.boolean().optional().default(true),
});

function toShortLang(v?: string | null): string {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return "de";
  return t.split(/[-_]/)[0] || "de";
}

function roleFromRequest(req: NextRequest): Role {
  const cookieRole = req.cookies.get("u_role")?.value as Role | undefined;
  const headerRole = (req.headers.get("x-role") as Role) || undefined;
  let role: Role = cookieRole ?? headerRole ?? "guest";
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(req.url);
    const qRole = url.searchParams.get("role") as Role | null;
    if (qRole) role = qRole;
  }
  return role;
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function coerceClaims(claims: unknown, maxClaims: number): StatementRecord[] {
  if (!Array.isArray(claims)) return [];
  // Wir akzeptieren entweder StatementRecord oder string (text)
  const normalized = claims
    .map((c, idx) => {
      if (typeof c === "string") {
        const text = c.trim();
        if (!text) return null;
        return { id: String(idx + 1), text } as any;
      }
      if (c && typeof c === "object" && typeof (c as any).text === "string") {
        const text = String((c as any).text).trim();
        if (!text) return null;
        // minimal: id/text
        return {
          id: String((c as any).id ?? idx + 1),
          text,
          title: (c as any).title ?? null,
          responsibility: (c as any).responsibility ?? null,
          importance: (c as any).importance ?? null,
          topic: (c as any).topic ?? null,
          domains: (c as any).domains ?? undefined,
          domain: (c as any).domain ?? undefined,
        } as any;
      }
      return null;
    })
    .filter(Boolean) as StatementRecord[];
  return normalized.slice(0, maxClaims);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const role = roleFromRequest(req);
    if (!hasPermission(role, PERMISSIONS.FACTCHECK_ENQUEUE)) {
      const fe = formatError("FORBIDDEN", "Permission denied", { role });
      return json(fe, 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON", message: "Malformed JSON" }, 400);
    }

    let payload: z.infer<typeof EnqueueSchema>;
    try {
      payload = EnqueueSchema.parse(body);
    } catch (e) {
      const ze = e as ZodError;
      return json({ ok: false, code: "VALIDATION_ERROR", issues: ze.issues }, 400);
    }

    const lang = toShortLang(payload.language);
    const jobId = safeRandomId();

    // 1) Input bestimmen: Text oder Draft laden
    let inputText = (payload.text ?? "").trim();

    // 1a) Falls draftId vorhanden: VoteDraft laden (triMongo core -> vote_drafts)
    if (!inputText && payload.draftId) {
      try {
        const drafts = await voteDraftsCol();
        const id = payload.draftId.trim();
        if (ObjectId.isValid(id)) {
          const doc = await drafts.findOne({ _id: new ObjectId(id) });
          if (doc) {
            inputText = [doc.title, doc.summary].filter(Boolean).join("\n").trim();
          }
        }
      } catch {
        // ignore
      }
    }

    if (!inputText) {
      return json({ ok: false, code: "MISSING_INPUT", message: "Provide text or draftId" }, 400);
    }

    // 2) Claims bestimmen: entweder payload.claims, oder Analyze via Orchestrator
    let claims = coerceClaims(payload.claims, MAX_CLAIMS);
    let serpResults: SerpResultLite[] = [];
    let analysisError: string | null = null;
    let analysis: AnalyzeResult | null = null;

    if (claims.length === 0) {
      try {
        analysis = await analyzeContribution({
          text: inputText,
          locale: lang,
          pipeline: "factcheck" as any,
          maxClaims: MAX_CLAIMS,
        });
      } catch (err: any) {
        analysisError = err?.message ?? "analyze_failed";
        logger.warn({ err, analysisError }, "FACTCHECK_ANALYZE_FAIL");
      }

      if (analysis) {
        claims = coerceClaims(analysis.claims ?? [], MAX_CLAIMS);
      }
    }

    const status: FactcheckJobStatus = analysisError ? "failed" : "completed";

    // 3) SERP (optional, schnell & begrenzt)
    if (payload.withSerp !== false && claims.length > 0) {
      const q = (claims[0]?.text ?? inputText).slice(0, MAX_SERP_QUERY_CHARS);
      const serp = await callAriSearchSerp(q);
      if (serp.ok) serpResults = serp.results;
    }

    // 4) Persist Job (triMongo)
    const col = await factcheckJobsCol();
    const now = new Date();
    await col.insertOne({
      jobId,
      draftId: payload.draftId ?? null,
      contributionId: payload.contributionId ?? null,
      language: lang,
      inputText,
      status,
      verdict: "UNDETERMINED",
      confidence: 0.5,
      claims,
      serpResults,
      error: analysisError,
      createdAt: now,
      updatedAt: now,
      finishedAt: now,
    } as any);

    const durationMs = Date.now() - t0;
    return json({
      ok: true,
      jobId,
      status,
      claimsCount: claims.length,
      serpCount: serpResults.length,
      durationMs,
      analysisError: analysisError ?? undefined,
    });
  } catch (e: any) {
    const fe = formatError("INTERNAL_ERROR", "Unexpected failure", e?.message ?? String(e));
    logger.error({ fe, e }, "FACTCHECK_ENQUEUE_FAIL");
    return NextResponse.json(fe, { status: 500 });
  }
}
