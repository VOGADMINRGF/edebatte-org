export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import { getLatestDossierUpsertContractByCode } from "@features/dossier/protocolUpsert";
import { getLatestRoundSeedContractByCode } from "@features/topicRound/seedContract";
import { VoteModel } from "@/models/votes/Vote";
import { isQrQuestionSetPubliclyReleased } from "@/features/create/qrQuestionSetGuard";

type SummaryOption = { label: string; count: number };
type SummaryQuestion = {
  id: string;
  title: string;
  description: string | null;
  publicAttribution: "public" | "hidden";
  totalVotes: number;
  options: SummaryOption[];
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
  }

  const setsCol = await coreCol("qr_question_sets");
  const set = await setsCol.findOne({ code, status: "active" });
  if (!isQrQuestionSetPubliclyReleased(set)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const [protocolEntryCount, latestProtocolEntry, relatedEvents, latestDossierUpsertContract, latestRoundSeedContract] =
    await Promise.all([
      (await coreCol("qr_protocol_entries")).countDocuments({ code }),
      (await coreCol("qr_protocol_entries"))
        .find({ code })
        .sort({ createdAt: -1 })
        .limit(1)
        .next(),
      (await coreCol("events"))
        .find(
          { qrSetCode: code },
          { projection: { _id: 1, title: 1, startAt: 1, anlassraumId: 1, dossierId: 1 } },
        )
        .sort({ startAt: -1 })
        .limit(10)
        .toArray(),
      getLatestDossierUpsertContractByCode(code),
      getLatestRoundSeedContractByCode(code),
    ]);

  const Vote = await VoteModel();
  const rows = await Vote.aggregate([
    { $match: { qrSetId: code } },
    {
      $group: {
        _id: { questionId: "$qrQuestionId", choice: "$choice" },
        count: { $sum: 1 },
      },
    },
  ]).toArray();

  const countMap = new Map<string, Map<string, number>>();
  let totalVotes = 0;
  rows.forEach((row: any) => {
    const questionId = String(row?._id?.questionId ?? "");
    const choice = String(row?._id?.choice ?? "");
    const count = Number(row?.count ?? 0);
    totalVotes += count;
    if (!countMap.has(questionId)) {
      countMap.set(questionId, new Map());
    }
    const inner = countMap.get(questionId)!;
    inner.set(choice, (inner.get(choice) ?? 0) + count);
  });

  const questions: SummaryQuestion[] = (set.questions ?? []).map((q: any) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const optionCounts = countMap.get(String(q.id ?? "")) ?? new Map();
    const summaryOptions = options.map((opt: string) => ({
      label: opt,
      count: optionCounts.get(opt) ?? 0,
    }));
    const questionTotal = summaryOptions.reduce((sum, opt) => sum + opt.count, 0);
    return {
      id: String(q.id ?? ""),
      title: q.title ?? "Frage",
      description: q.description ?? null,
      publicAttribution: q.publicAttribution === "public" ? "public" : "hidden",
      totalVotes: questionTotal,
      options: summaryOptions,
    };
  });

  return NextResponse.json({
    ok: true,
    set: {
      code: set.code,
      title: set.title ?? null,
      status: set.status ?? "active",
      anlassraumId: set.anlassraumId ? String(set.anlassraumId) : null,
      dossierId: set.dossierId ? String(set.dossierId) : null,
      roundSlug: set.roundSlug ?? null,
      protocolStatus: set.protocolStatus ?? "open",
      lastProtocolEntryId: set.lastProtocolEntryId ? String(set.lastProtocolEntryId) : null,
      lastDossierUpsertContractId: set.lastDossierUpsertContractId ?? null,
      lastRoundSeedContractId: set.lastRoundSeedContractId ?? null,
    },
    totalVotes,
    questions,
    followUp: {
      protocolEntryCount,
      latestProtocolEntryId: latestProtocolEntry?._id
        ? String(latestProtocolEntry._id)
        : null,
      latestProtocolAt: latestProtocolEntry?.createdAt?.toISOString?.() ?? null,
      eventRefs: relatedEvents.map((event: any) => ({
        id: String(event._id),
        title: event.title ?? null,
        startAt: event.startAt?.toISOString?.() ?? null,
        anlassraumId: event.anlassraumId ? String(event.anlassraumId) : null,
        dossierId: event.dossierId ? String(event.dossierId) : null,
      })),
      latestDossierUpsertContract,
      latestRoundSeedContract,
    },
  });
}
