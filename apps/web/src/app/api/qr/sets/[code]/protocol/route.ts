export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, coreCol } from "@core/db/triMongo";
import { anlassraumCol, anlassraumStructureCol } from "@features/anlassraum/db";
import {
  countDossierUpsertContractsByCode,
  createProtocolDossierUpsertContract,
  getLatestDossierUpsertContractByCode,
} from "@features/dossier/protocolUpsert";
import {
  countRoundSeedContractsByCode,
  createProtocolRoundSeedContract,
  getLatestRoundSeedContractByCode,
} from "@features/topicRound/seedContract";
import { requireCreatorContext } from "../../../../streams/utils";
import { isQrQuestionSetPubliclyReleased } from "@/features/create/qrQuestionSetGuard";

const ProtocolPayloadSchema = z.object({
  summary: z.string().min(3).max(4000),
  openQuestions: z.array(z.string().min(3).max(280)).max(20).optional(),
  decisions: z.array(z.string().min(3).max(280)).max(20).optional(),
  nextSteps: z.array(z.string().min(3).max(280)).max(20).optional(),
  tags: z.array(z.string().min(1).max(60)).max(20).optional(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const sets = await coreCol("qr_question_sets");
  const set = await sets.findOne({ code });
  if (!isQrQuestionSetPubliclyReleased(set)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const protocolCol = await coreCol("qr_protocol_entries");
  const [entries, protocolEntryCount, relatedEvents, latestDossierContract, latestRoundSeedContract, dossierContractCount, roundContractCount] =
    await Promise.all([
      protocolCol.find({ code }).sort({ createdAt: -1 }).limit(50).toArray(),
      protocolCol.countDocuments({ code }),
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
      code: set.code,
      title: set.title ?? null,
      anlassraumId: set.anlassraumId ? String(set.anlassraumId) : null,
      dossierId: set.dossierId ? String(set.dossierId) : null,
      roundSlug: set.roundSlug ?? null,
      protocolStatus: set.protocolStatus ?? "open",
      lastProtocolEntryId: set.lastProtocolEntryId ? String(set.lastProtocolEntryId) : null,
      lastDossierUpsertContractId: set.lastDossierUpsertContractId ?? null,
      lastRoundSeedContractId: set.lastRoundSeedContractId ?? null,
    },
    entries: entries.map((entry: any) => ({
      id: entry._id?.toString?.() ?? "",
      anlassraumId: entry.anlassraumId ? String(entry.anlassraumId) : null,
      dossierId: entry.dossierId ? String(entry.dossierId) : null,
      summary: entry.summary,
      openQuestions: entry.openQuestions ?? [],
      decisions: entry.decisions ?? [],
      nextSteps: entry.nextSteps ?? [],
      tags: entry.tags ?? [],
      provenance: entry.provenance ?? null,
      createdBy: entry.createdBy ?? null,
      createdAt: entry.createdAt?.toISOString?.() ?? null,
    })),
    audit: {
      protocolEntryCount,
      dossierUpsertContractCount: dossierContractCount,
      roundSeedContractCount: roundContractCount,
      eventRefs: relatedEvents.map((event: any) => ({
        id: String(event._id),
        title: event.title ?? null,
        startAt: event.startAt?.toISOString?.() ?? null,
        anlassraumId: event.anlassraumId ? String(event.anlassraumId) : null,
        dossierId: event.dossierId ? String(event.dossierId) : null,
      })),
      latestDossierUpsertContract: latestDossierContract,
      latestRoundSeedContract,
    },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { code } = await context.params;
  const payload = ProtocolPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const sets = await coreCol("qr_question_sets");
  const set = await sets.findOne({ code, status: "active" });
  if (!isQrQuestionSetPubliclyReleased(set)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!ctx.isStaff && set.creatorId && String(set.creatorId) !== ctx.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const eventDocs = await (await coreCol("events"))
    .find(
      { qrSetCode: code },
      { projection: { _id: 1, title: 1, startAt: 1, anlassraumId: 1, dossierId: 1 } },
    )
    .sort({ startAt: -1 })
    .limit(10)
    .toArray();
  const eventRefs = eventDocs.map((event: any) => ({
    id: String(event._id),
    title: event.title ?? null,
    startAt: event.startAt?.toISOString?.() ?? null,
  }));

  let linkedAnlassraumId =
    set.anlassraumId && ObjectId.isValid(String(set.anlassraumId))
      ? new ObjectId(String(set.anlassraumId))
      : null;
  let linkedDossierId =
    set.dossierId && ObjectId.isValid(String(set.dossierId))
      ? new ObjectId(String(set.dossierId))
      : null;
  let topicKey: string | null = null;

  if (!linkedAnlassraumId) {
    const eventLinkedAnlassraum = eventDocs.find(
      (event: any) => event.anlassraumId && ObjectId.isValid(String(event.anlassraumId)),
    );
    if (eventLinkedAnlassraum) {
      linkedAnlassraumId = new ObjectId(String(eventLinkedAnlassraum.anlassraumId));
    }
  }
  if (!linkedDossierId) {
    const eventLinkedDossier = eventDocs.find(
      (event: any) => event.dossierId && ObjectId.isValid(String(event.dossierId)),
    );
    if (eventLinkedDossier) {
      linkedDossierId = new ObjectId(String(eventLinkedDossier.dossierId));
    }
  }

  if (linkedAnlassraumId) {
    const room = await (await anlassraumCol()).findOne(
      { _id: linkedAnlassraumId },
      { projection: { topicKey: 1, dossierId: 1 } },
    );
    topicKey = room?.topicKey ?? null;
    if (!linkedDossierId && room?.dossierId) {
      linkedDossierId = room.dossierId;
    }
  }

  const provenance = {
    sourceType: "protocol" as const,
    qrSetCode: code,
    eventIds: eventRefs.map((item) => item.id),
    anlassraumId: linkedAnlassraumId?.toHexString() ?? null,
    dossierId: linkedDossierId?.toHexString() ?? null,
    actorId: ctx.userId,
    timestamp: now.toISOString(),
  };

  const protocolEntry = {
    code,
    qrSetId: set._id,
    anlassraumId: linkedAnlassraumId,
    dossierId: linkedDossierId,
    roundSlug: set.roundSlug ?? null,
    summary: payload.data.summary,
    openQuestions: payload.data.openQuestions ?? [],
    decisions: payload.data.decisions ?? [],
    nextSteps: payload.data.nextSteps ?? [],
    tags: payload.data.tags ?? [],
    provenance,
    createdBy: ctx.userId,
    createdAt: now,
  };

  const inserted = await (await coreCol("qr_protocol_entries")).insertOne(protocolEntry);

  if (linkedAnlassraumId) {
    const structureCol = await anlassraumStructureCol();
    const entryShortId = inserted.insertedId.toString().slice(-10);

    const notes = [
      {
        id: `qr-protocol-${entryShortId}`,
        kind: `event_protocol:${code}`,
        text: payload.data.summary,
      },
      ...(payload.data.decisions ?? []).map((decision, idx) => ({
        id: `qr-decision-${entryShortId}-${idx + 1}`,
        kind: `decision:protocol:${code}`,
        text: decision,
      })),
      ...(payload.data.nextSteps ?? []).map((nextStep, idx) => ({
        id: `qr-next-${entryShortId}-${idx + 1}`,
        kind: `next_step:protocol:${code}`,
        text: nextStep,
      })),
    ];

    const questions = (payload.data.openQuestions ?? []).map((question, idx) => ({
      id: `qr-question-${entryShortId}-${idx + 1}`,
      text: question,
      dimension: `event_followup:${code}`,
    }));

    await structureCol.updateOne(
      { anlassraumId: linkedAnlassraumId },
      {
        $setOnInsert: {
          anlassraumId: linkedAnlassraumId,
          claims: [],
          knots: [],
          segments: [],
          actors: [],
          riskFlags: [],
          createdAt: now,
        },
        $push: {
          notes: { $each: notes },
          questions: { $each: questions },
        },
        $set: {
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  const dossierUpsertContract = await createProtocolDossierUpsertContract({
    protocolEntryId: inserted.insertedId,
    qrSetCode: code,
    anlassraumId: linkedAnlassraumId,
    dossierId: linkedDossierId,
    summary: payload.data.summary,
    openQuestions: payload.data.openQuestions ?? [],
    decisions: payload.data.decisions ?? [],
    nextSteps: payload.data.nextSteps ?? [],
    tags: payload.data.tags ?? [],
    eventRefs,
    createdBy: ctx.userId,
  });

  const roundSeedContract = await createProtocolRoundSeedContract({
    protocolEntryId: inserted.insertedId,
    qrSetCode: code,
    anlassraumId: linkedAnlassraumId,
    dossierId: linkedDossierId,
    title: set.title ?? null,
    topicKey,
    summary: payload.data.summary,
    openQuestions: payload.data.openQuestions ?? [],
    decisions: payload.data.decisions ?? [],
    nextSteps: payload.data.nextSteps ?? [],
    tags: payload.data.tags ?? [],
    eventRefs,
    createdBy: ctx.userId,
  });

  await sets.updateOne(
    { _id: set._id },
    {
      $set: {
        protocolStatus: "logged",
        lastProtocolEntryId: inserted.insertedId,
        lastProtocolAt: now,
        lastDossierUpsertContractId: dossierUpsertContract.contractId,
        lastRoundSeedContractId: roundSeedContract.contractId,
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({
    ok: true,
    entryId: inserted.insertedId.toString(),
    anlassraumId: linkedAnlassraumId?.toHexString() ?? null,
    dossierId: linkedDossierId?.toHexString() ?? null,
    provenance,
    dossierUpsertContract,
    roundSeedContract,
    protocolStatus: "logged",
  });
}
