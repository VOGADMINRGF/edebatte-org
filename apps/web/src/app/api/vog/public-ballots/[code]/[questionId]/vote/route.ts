export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizeVogOriginMetadata,
  resolveVogPublicBallotLocales,
} from "@features/vog/publicBallotContract";
import { VoteModel } from "@/models/votes/Vote";
import {
  getVogPublicBallotReadModel,
  loadVogPublicBallotRecord,
} from "@/features/vog/publicBallotReadModel";
import {
  enforceVogPublicBallotVoteSecurity,
  readVogPublicBallotVoteJson,
  resolveVogGuestToken,
  setVogGuestParticipationCookie,
} from "@/features/vog/publicBallotSecurity";

const VotePayloadSchema = z
  .object({
    choice: z.string().trim().min(1).max(240),
    source: z.string().trim().max(64).optional(),
    origin: z.string().trim().max(64).optional(),
    origin_id: z.string().trim().max(120).optional(),
    locale: z.string().trim().max(48).optional(),
    reading_locale: z.string().trim().max(48).optional(),
    ui_locale: z.string().trim().max(48).optional(),
    output_locale: z.string().trim().max(48).optional(),
  })
  .strict();

let voteIndexPromise: Promise<string> | null = null;

async function ensureVogGuestVoteIndex() {
  const votes = await VoteModel();
  voteIndexPromise ??= votes
    .createIndex(
      {
        qrSetId: 1,
        qrQuestionId: 1,
        participationClass: 1,
        sessionId: 1,
      },
      {
        unique: true,
        name: "vog_guest_vote_idempotency_unique",
        partialFilterExpression: {
          participationClass: "open_guest",
          sessionId: { $type: "string" },
        },
      },
    )
    .catch((error) => {
      voteIndexPromise = null;
      throw error;
    });
  await voteIndexPromise;
  return votes;
}

function isDuplicateKey(error: unknown) {
  const candidate = error as { code?: number | string; codeName?: string };
  return candidate?.code === 11000 || candidate?.codeName === "DuplicateKey";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string; questionId: string }> },
) {
  const guest = resolveVogGuestToken(req);
  const securityFailure = await enforceVogPublicBallotVoteSecurity({
    req,
    guestTokenHash: guest.tokenHash,
  });
  if (securityFailure) return securityFailure;

  const payload = await readVogPublicBallotVoteJson(req);
  if ("response" in payload) return payload.response;
  const parsed = VotePayloadSchema.safeParse(payload.value);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 },
    );
  }

  const { code, questionId } = await context.params;
  const record = await loadVogPublicBallotRecord({ code, questionId });
  if (!record) {
    return NextResponse.json(
      { ok: false, error: "ballot_not_found" },
      { status: 404 },
    );
  }
  if (record.lifecycle !== "open") {
    return NextResponse.json(
      { ok: false, error: "ballot_closed", lifecycle: record.lifecycle },
      { status: 409 },
    );
  }
  if (!record.canonicalOptions.includes(parsed.data.choice)) {
    return NextResponse.json(
      { ok: false, error: "invalid_option" },
      { status: 400 },
    );
  }

  const locales = resolveVogPublicBallotLocales({
    release: record.release,
    locale: parsed.data.locale,
    readingLocale: parsed.data.reading_locale,
    uiLocale: parsed.data.ui_locale,
    outputLocale: parsed.data.output_locale,
  });
  const originMetadata = normalizeVogOriginMetadata(
    parsed.data,
    record.release.originId,
    locales,
  );
  const now = new Date();
  const filter = {
    qrSetId: record.code,
    qrQuestionId: record.questionId,
    participationClass: "open_guest" as const,
    sessionId: guest.tokenHash,
  };
  const update = {
    $set: {
      choice: parsed.data.choice,
      updatedAt: now,
    },
    $setOnInsert: {
      statementId: `vog:${record.release.originId}`,
      qrSetId: record.code,
      qrQuestionId: record.questionId,
      participationClass: "open_guest" as const,
      attributionMode: "hidden" as const,
      legitimacyClass: "open_public_consultation" as const,
      sessionId: guest.tokenHash,
      originMetadata,
      createdAt: now,
    },
  };

  let writeResult: { upsertedId?: unknown; matchedCount?: number };
  try {
    const votes = await ensureVogGuestVoteIndex();
    writeResult = await votes.updateOne(filter, update, { upsert: true });
  } catch (error) {
    if (!isDuplicateKey(error)) {
      return NextResponse.json(
        { ok: false, error: "vote_storage_unavailable" },
        { status: 503 },
      );
    }
    try {
      const votes = await VoteModel();
      writeResult = await votes.updateOne(filter, update, { upsert: false });
    } catch {
      return NextResponse.json(
        { ok: false, error: "vote_storage_unavailable" },
        { status: 503 },
      );
    }
  }

  const ballot = await getVogPublicBallotReadModel({
    code: record.code,
    questionId: record.questionId,
    readingLocale: originMetadata.readingLocale,
    uiLocale: originMetadata.uiLocale,
    outputLocale: originMetadata.outputLocale,
    guestTokenHash: guest.tokenHash,
  }).catch(() => null);

  const response = NextResponse.json({
    ok: true,
    vote: {
      selection: parsed.data.choice,
      updatedExisting: !writeResult.upsertedId,
      participationClass: "open_guest",
      attributionMode: "hidden",
    },
    ballot,
    resultProjectionUnavailable: !ballot,
  });
  return guest.isNew
    ? setVogGuestParticipationCookie(response, guest.token)
    : response;
}
