import { NextResponse } from "next/server";
import { z } from "zod";
import { factcheckJobsCol } from "@features/factcheck/db";

const ParamsSchema = z.object({ contributionId: z.string().min(1) });

async function resolveParams(p: any): Promise<{ contributionId: string }> {
  const val = p && typeof p.then === "function" ? await p : p;
  return ParamsSchema.parse(val);
}

export async function GET(
  _: Request,
  context: { params: Promise<{ contributionId: string }> },
) {
  const { contributionId } = await resolveParams(context.params);

  const col = await factcheckJobsCol();
  const job = await col
    .find({ contributionId })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray()
    .then((xs: any[]) => xs?.[0] ?? null);

  if (!job) {
    return NextResponse.json(
      { ok: false, reason: "No job found for contributionId", results: [] },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    job: {
      jobId: job.jobId ?? null,
      status: job.status ?? null,
      verdict: job.verdict ?? null,
      confidence: job.confidence ?? null,
      durationMs: job.durationMs ?? null,
      createdAt: job.createdAt ?? null,
      finishedAt: job.finishedAt ?? null,
    },
    results: job.claims ?? [],
    serpResults: job.serpResults ?? [],
    error: job.error ?? null,
  });
}
