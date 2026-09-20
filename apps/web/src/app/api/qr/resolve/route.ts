export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId, coreCol } from "@core/db/triMongo";
import { campaignsCol } from "@features/campaign/db";
import { getLatestDossierUpsertContractByCode } from "@features/dossier/protocolUpsert";
import { getLatestRoundSeedContractByCode } from "@features/topicRound/seedContract";
import { isQrQuestionSetPubliclyReleased } from "@/features/create/qrQuestionSetGuard";

async function logScan(args: { code: string; targetType: string; targetIds: string[]; req: NextRequest }) {
  try {
    const scans = await coreCol("qr_scans");
    const ip = args.req.headers.get("x-forwarded-for") ?? args.req.headers.get("x-real-ip") ?? null;
    const userAgent = args.req.headers.get("user-agent") ?? null;
    await scans.insertOne({
      code: args.code,
      targetType: args.targetType,
      targetIds: args.targetIds,
      ip,
      userAgent,
      createdAt: new Date(),
    });
  } catch {
    // Tracking darf keine Fehler werfen
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qrId = searchParams.get("qrId")?.trim();
  if (!qrId) {
    return NextResponse.json({ success: false, error: "missing_qr" }, { status: 400 });
  }

  const setsCol = await coreCol("qr_question_sets");
  const set = await setsCol.findOne({ code: qrId, status: "active" });
  if (isQrQuestionSetPubliclyReleased(set)) {
    const [protocolEntryCount, latestProtocolEntry, relatedEvents, latestDossierUpsertContract, latestRoundSeedContract] =
      await Promise.all([
        (await coreCol("qr_protocol_entries")).countDocuments({ code: qrId }),
        (await coreCol("qr_protocol_entries"))
          .find({ code: qrId })
          .sort({ createdAt: -1 })
          .limit(1)
          .next(),
        (await coreCol("events"))
          .find(
            { qrSetCode: qrId },
            { projection: { _id: 1, title: 1, startAt: 1, anlassraumId: 1, dossierId: 1 } },
          )
          .sort({ startAt: -1 })
          .limit(10)
          .toArray(),
        getLatestDossierUpsertContractByCode(qrId),
        getLatestRoundSeedContractByCode(qrId),
      ]);

    void logScan({ code: qrId, targetType: "set", targetIds: [set.code], req });
    return NextResponse.json({
      success: true,
      data: {
        targetType: "set",
        targetIds: [set.code],
        title: set.title ?? null,
        anlassraumId: set.anlassraumId ? String(set.anlassraumId) : null,
        dossierId: set.dossierId ? String(set.dossierId) : null,
        roundSlug: set.roundSlug ?? null,
        protocolStatus: set.protocolStatus ?? "open",
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
      },
    });
  }

  const targetsCol = await coreCol("qr_targets");
  const target = await targetsCol.findOne({ code: qrId, status: "active" });
  if (target?.targetType === "campaign") {
    const campaignId = target?.targetIds?.[0];
    if (campaignId && ObjectId.isValid(campaignId)) {
      const campaigns = await campaignsCol();
      const campaign = await campaigns.findOne({ _id: new ObjectId(campaignId) });
      if (campaign) {
        void logScan({ code: qrId, targetType: "campaign", targetIds: [campaignId], req });
        return NextResponse.json({
          success: true,
          data: {
            targetType: "campaign",
            targetIds: [campaignId],
            title: campaign.title ?? null,
          },
        });
      }
    }
  }
  if (target?.targetType === "campaign_session") {
    const [campaignId, sessionId] = target?.targetIds ?? [];
    if (campaignId && ObjectId.isValid(campaignId)) {
      const campaigns = await campaignsCol();
      const campaign = await campaigns.findOne({ _id: new ObjectId(campaignId) });
      if (campaign) {
        void logScan({ code: qrId, targetType: "campaign_session", targetIds: [campaignId, sessionId].filter(Boolean), req });
        return NextResponse.json({
          success: true,
          data: {
            targetType: "campaign_session",
            targetIds: [campaignId, sessionId].filter(Boolean),
            title: campaign.title ?? null,
          },
        });
      }
    }
  }

  return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
}
