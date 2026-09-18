import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { getParticipationSignalReviewRuntimeRepo } from "@features/region";
import { buildStreamPublicRuntime } from "@features/stream/publicRuntime";
import { StreamPublicInputPayloadSchema, STREAM_PUBLIC_INPUT_EMPTY_STATE_COPY } from "@features/stream/publicInput";
import { buildStreamParticipationSignal } from "@features/stream/server/publicInputSubmission";
import { streamPublicInputsCol } from "@features/stream/db";
import type { StreamPublicInputDoc } from "@features/stream/types";

function visibilityMarker(value: StreamPublicInputDoc["visibilityState"]): StreamPublicInputDoc["publicVisibilityMarker"] {
  if (value === "public_unverified") return "public_unverified";
  if (value === "public_reviewed" || value === "public_official") return "public_reviewed";
  return "review_only";
}

function riskHintFor(kind: StreamPublicInputDoc["kind"]) {
  if (kind === "source_hint" || kind === "correction") {
    return "Quellen- und Korrekturhinweise bleiben bis zur Prüfung im Review-Kontext.";
  }
  if (kind === "option" || kind === "concern") {
    return "Optionen und Bedenken werden erst nach Prüfung in Folgeflächen verdichtet.";
  }
  return "Beiträge aus dem Stream bleiben reviewpflichtig und werden nicht automatisch veröffentlicht.";
}

function responseVisibilityLabel(record: { reviewStatus: string; visibilityState: string }) {
  if (record.reviewStatus !== "accepted") return "reviewpflichtig";
  if (record.visibilityState === "public_official") return "amtlich freigegeben";
  if (record.visibilityState === "public_reviewed") return "geprüft sichtbar";
  if (record.visibilityState === "public_unverified") return "sichtbar, aber nicht amtlich bestätigt";
  return "reviewpflichtig";
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("u_id")?.value ?? null;
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "login_required" },
        { status: 401 },
      );
    }

    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      return NextResponse.json(
        { ok: false, error: "unsupported_media_type" },
        { status: 415 },
      );
    }

    const payload = StreamPublicInputPayloadSchema.parse(await req.json());
    const runtime = await buildStreamPublicRuntime(payload.streamId);

    if (!runtime || !runtime.participation.openForInput) {
      return NextResponse.json(
        { ok: false, error: "public_stream_not_open" },
        { status: 409 },
      );
    }

    if (
      runtime.session.requireVerifiedParticipants === true &&
      req.cookies.get("u_verified")?.value !== "1"
    ) {
      return NextResponse.json(
        { ok: false, error: "verification_required" },
        { status: 403 },
      );
    }

    const inputId = `stream-public-input-${new ObjectId().toHexString()}`;
    const signal = await buildStreamParticipationSignal({
      payload,
      context: {
        streamId: runtime.session.id,
        slug: runtime.session.slugOrId,
        title: runtime.session.title,
        summary: runtime.session.description ?? null,
        topicKey: runtime.session.topicKey ?? null,
        regionCode: runtime.session.regionCode ?? null,
        anlassraumId: runtime.context.anlassraumId,
        anlassraumTitle: runtime.context.anlassraumTitle,
        dossierId: runtime.context.dossierId,
      },
      id: inputId,
    });

    const record = await getParticipationSignalReviewRuntimeRepo().createParticipationSignalRecord(
      signal,
    );

    const now = new Date();
    const doc: StreamPublicInputDoc = {
      inputId,
      origin: "stream",
      streamSessionId: new ObjectId(runtime.session.id),
      streamSlug: runtime.session.slugOrId,
      streamTitle: runtime.session.title,
      eventTitle: runtime.session.title,
      anlassraumId: runtime.context.anlassraumId,
      dossierId: runtime.context.dossierId,
      kind: payload.kind,
      text: payload.text.trim(),
      sourceUrl: String(payload.sourceUrl ?? "").trim() || null,
      reviewState: record.reviewStatus,
      visibilityState: record.visibilityState,
      publicVisibilityMarker: visibilityMarker(record.visibilityState),
      riskHint: riskHintFor(payload.kind),
      piiHint: "Keine automatische Veröffentlichung personenbezogener Angaben. Beiträge bleiben im Review-Pfad.",
      createdAt: now,
      updatedAt: now,
    };

    await (await streamPublicInputsCol()).insertOne(doc);

    return NextResponse.json(
      {
        ok: true,
        input: {
          id: inputId,
          kind: payload.kind,
          reviewState: record.reviewStatus,
          visibilityState: record.visibilityState,
          visibilityLabel: responseVisibilityLabel(record),
          noAutoPublish: true,
          noAutoDossierUpdate: true,
          noAutoAnlassraumUpdate: true,
          noAutoSocial: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: "invalid_public_stream_input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "public_stream_input_unavailable",
        hint: STREAM_PUBLIC_INPUT_EMPTY_STATE_COPY,
      },
      { status: 503 },
    );
  }
}
