// apps/web/src/app/api/votes/summary/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { type Filter, type FindOptions } from "mongodb";
import { coreCol, votesCol, ObjectId } from "@core/db/triMongo";

type SummaryKey = "agree" | "neutral" | "disagree";
type Summary = Record<SummaryKey, number>;

type VotingRule =
  | {
      type: "simple-majority";
      minQuorum?: number;
      weightMap?: Record<string, number>;
    }
  | {
      type: "two-thirds";
      minQuorum?: number;
      weightMap?: Record<string, number>;
    }
  | { type: "weighted"; minQuorum?: number; weightMap: Record<string, number> };

type VoteDoc = {
  _id?: ObjectId;
  statementId: ObjectId | string;
  vote?: string;
  choice?: string;
  role?: string;
};

function normChoice(raw: unknown): SummaryKey {
  const v = String(raw ?? "").toLowerCase();
  if (v === "agree" || v === "yes" || v === "pro" || v === "for")
    return "agree";
  if (v === "disagree" || v === "no" || v === "contra" || v === "against")
    return "disagree";
  return "neutral";
}
function emptySummary(): Summary {
  return { agree: 0, neutral: 0, disagree: 0 };
}
function coerceSummary(v: any): Summary {
  return {
    agree: Number.isFinite(v?.agree) ? v.agree : 0,
    neutral: Number.isFinite(v?.neutral) ? v.neutral : 0,
    disagree: Number.isFinite(v?.disagree) ? v.disagree : 0,
  };
}
function computeResult(
  rule: VotingRule,
  s: Summary,
): "passed" | "not_passed" | null {
  const total = s.agree + s.neutral + s.disagree;
  if (total === 0) return null;
  if (rule.minQuorum && total < rule.minQuorum) return "not_passed";
  if (rule.type === "two-thirds") {
    const needed = Math.ceil((2 * total) / 3);
    return s.agree >= needed ? "passed" : "not_passed";
  }
  return s.agree > s.disagree ? "passed" : "not_passed";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statementIdParam = url.searchParams.get("statementId");
  const fresh = url.searchParams.get("fresh") === "true";
  if (!statementIdParam) {
    return NextResponse.json(
      { ok: false, error: "Missing statementId" },
      { status: 400 },
    );
  }
  const statementIdStr = statementIdParam;
  const isObjId = ObjectId.isValid(statementIdStr);

  const stmtsRef = await coreCol("statements");
  const votesRef = await votesCol("votes");

  // Statement (für votingRule + ggf. Cache)
  let statement: any = null;
  if (isObjId) {
    statement = await stmtsRef.findOne(
      { _id: new ObjectId(statementIdStr) },
      { projection: { votes: 1, stats: 1, votingRule: 1, id: 1 } },
    );
  }
  if (!statement) {
    statement = await stmtsRef.findOne(
      { id: statementIdStr },
      { projection: { votes: 1, stats: 1, votingRule: 1, id: 1 } },
    );
  }
  if (!statement) {
    return NextResponse.json(
      { ok: false, error: "Statement not found" },
      { status: 404 },
    );
  }

  const votingRule: VotingRule = statement.votingRule || {
    type: "simple-majority",
  };

  async function summaryFromVotes(): Promise<{
    summary: Summary;
    total: number;
  }> {
    let match: Filter<VoteDoc>;
    if (isObjId) {
      match = {
        $or: [
          { statementId: new ObjectId(statementIdStr) },
          { statementId: statementIdStr },
        ],
      };
    } else {
      match = { statementId: statementIdStr };
    }
    const options: FindOptions<VoteDoc> = {
      projection: { vote: 1, choice: 1, role: 1 },
    };
    const cursor = votesRef.find(match as any, options).batchSize(1000);

    const weighted = votingRule.type === "weighted";
    const weightMap = (votingRule as any).weightMap || {};
    let s = emptySummary();
    let total = 0;

    for await (const doc of cursor) {
      const key = normChoice(doc.vote ?? doc.choice);
      if (weighted) {
        const role = doc?.role ?? "Bürger";
        const wRaw = (weightMap as Record<string, unknown>)[role];
        const w = typeof wRaw === "number" && Number.isFinite(wRaw) ? wRaw : 1;
        s[key] += w;
        total += w;
      } else {
        s[key] += 1;
        total += 1;
      }
    }
    return { summary: s, total };
  }

  const cached = coerceSummary(statement.votes);
  const cachedTotal = cached.agree + cached.neutral + cached.disagree;
  const stats = {
    views: Number(statement?.stats?.views) || 0,
    votesAgree: Number(statement?.stats?.votesAgree) || 0,
    votesNeutral: Number(statement?.stats?.votesNeutral) || 0,
    votesDisagree: Number(statement?.stats?.votesDisagree) || 0,
    votesTotal: Number(statement?.stats?.votesTotal) || cachedTotal,
  };

  const mustLive =
    fresh ||
    votingRule.type === "weighted" ||
    (cachedTotal === 0 && stats.votesTotal > 0);

  let data: Summary;
  let total: number;
  let source: "cached" | "live" = "cached";
  if (mustLive) {
    const live = await summaryFromVotes();
    data = live.summary;
    total = live.total;
    source = "live";
  } else {
    data = cached;
    total = cachedTotal;
  }

  const result = computeResult(votingRule, data);

  return NextResponse.json(
    { ok: true, data, meta: { total, votingRule, result, stats, source } },
    { status: 200 },
  );
}
