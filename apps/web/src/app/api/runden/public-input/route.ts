import { ObjectId } from "@core/db/triMongo";
import { anlassraumCol } from "@features/anlassraum/db";
import { getParticipationSignalReviewRuntimeRepo } from "@features/region";
import { publicationVisibilityLabel } from "@features/region/publicationRiskLadder";
import { PublicAnlassraumInputPayloadSchema } from "@features/topicRound/publicInput";
import { buildPublicAnlassraumParticipationSignal } from "@features/topicRound/server/publicInputSubmission";
import { isAnlassraumPublicInputAllowed } from "@/features/create/anlassraumActivationWorkflowServer";
import { NextResponse } from "next/server";

function normalizeRoomContext(room: Record<string, unknown>, anlassraumId: string) {
  return {
    anlassraumId,
    title: String(room.title ?? "").trim(),
    summary:
      String(room.summary ?? "").trim() || String(room.description ?? "").trim() || null,
    isPublic: room.isPublic === true,
    regionKey: String(room.regionKey ?? "").trim() || null,
  };
}

export async function POST(req: Request) {
  try {
    const payload = PublicAnlassraumInputPayloadSchema.parse(await req.json());
    const rooms = await anlassraumCol();
    const room =
      (await rooms.findOne({
        _id: new ObjectId(payload.anlassraumId),
      })) as Record<string, unknown> | null;

    if (
      !room ||
      !(await isAnlassraumPublicInputAllowed({
        anlassraumId: payload.anlassraumId,
        roomIsPublic: room.isPublic === true,
        roomStatus: String(room.status ?? "").trim() || null,
        roomPublishedAt:
          (room.publishedAt as Date | string | null | undefined) ?? null,
        roomReviewedBy: String(room.reviewedBy ?? "").trim() || null,
        roomApprovedBy: String(room.approvedBy ?? "").trim() || null,
        activationWorkflowSourceHandoffId:
          String(room.activationWorkflowSourceHandoffId ?? "").trim() || null,
      }))
    ) {
      return NextResponse.json(
        { ok: false, error: "public_anlassraum_not_found" },
        { status: 404 },
      );
    }

    const roomContext = normalizeRoomContext(room, payload.anlassraumId);
    if (!roomContext.title) {
      return NextResponse.json(
        { ok: false, error: "public_anlassraum_context_invalid" },
        { status: 409 },
      );
    }

    const signal = await buildPublicAnlassraumParticipationSignal({
      payload,
      room: roomContext,
      id: `region-participation-public-anlassraum-${new ObjectId().toHexString()}`,
    });

    const record = await getParticipationSignalReviewRuntimeRepo().createParticipationSignalRecord(
      signal,
    );

    return NextResponse.json(
      {
        ok: true,
        signal: {
          id: record.id,
          anlassraumId: payload.anlassraumId,
          sourceType: record.sourceType,
          reviewStatus: record.reviewStatus,
          visibilityState: record.visibilityState,
          visibilityLabel: publicationVisibilityLabel(record.visibilityState),
          noAutoPublish: record.noAutoPublish,
          noAutoCreateDossier: record.noAutoCreateDossier,
          noAutoCreateAnlassraum: record.noAutoCreateAnlassraum,
          noRepresentativeClaim: record.noRepresentativeClaim,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: "invalid_public_anlassraum_input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "public_anlassraum_input_unavailable" },
      { status: 503 },
    );
  }
}
