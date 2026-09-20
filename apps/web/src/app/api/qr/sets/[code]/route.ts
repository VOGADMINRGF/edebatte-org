export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import {
  getLatestDossierUpsertContractByCode,
  countDossierUpsertContractsByCode,
} from "@features/dossier/protocolUpsert";
import {
  countRoundSeedContractsByCode,
  getLatestRoundSeedContractByCode,
} from "@features/topicRound/seedContract";
import { isQrQuestionSetPubliclyReleased } from "@/features/create/qrQuestionSetGuard";

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const col = await coreCol("qr_question_sets");
  const doc = await col.findOne({ code, status: "active" });
  if (!isQrQuestionSetPubliclyReleased(doc)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const protocolCol = await coreCol("qr_protocol_entries");
  const [protocolEntryCount, latestProtocolEntry, relatedEvents, latestDossierUpsertContract, latestRoundSeedContract, dossierUpsertContractCount, roundSeedContractCount] =
    await Promise.all([
      protocolCol.countDocuments({ code }),
      protocolCol.find({ code }).sort({ createdAt: -1 }).limit(1).next(),
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
      countDossierUpsertContractsByCode(code),
      countRoundSeedContractsByCode(code),
    ]);

  return NextResponse.json({
    ok: true,
    set: {
      code: doc.code,
      title: doc.title ?? null,
      questions: doc.questions ?? [],
      anlassraumId: doc.anlassraumId ? String(doc.anlassraumId) : null,
      dossierId: doc.dossierId ? String(doc.dossierId) : null,
      roundSlug: doc.roundSlug ?? null,
      protocolStatus: doc.protocolStatus ?? "open",
      lastProtocolEntryId: doc.lastProtocolEntryId ? String(doc.lastProtocolEntryId) : null,
      lastDossierUpsertContractId: doc.lastDossierUpsertContractId ?? null,
      lastRoundSeedContractId: doc.lastRoundSeedContractId ?? null,
    },
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
      dossierUpsertContractCount,
      roundSeedContractCount,
      latestDossierUpsertContract,
      latestRoundSeedContract,
    },
  });
}
