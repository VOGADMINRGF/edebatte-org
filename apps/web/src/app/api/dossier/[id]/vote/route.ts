import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { votesCol } from "@core/db/triMongo";
import chatkontrolleDossier from "@features/dossier/data/chatkontrolleDossier";
import { shouldAllowDemoDossierFallback } from "@/features/runtimeDataGuardrails";
import {
  getPublicDossierVoteConfig,
  getPublicDossierVoteOptions,
  withPublicDossierVoteConfig,
} from "@/components/dossier/publicVotingContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VoteBody = {
  optionId?: string;
};

type DossierVoteDoc = {
  dossierId: string;
  voterHash: string;
  voterKind: "user" | "anonymous";
  optionId: string;
  createdAt: Date;
  updatedAt: Date;
};

const ANON_COOKIE = "edebatte_dossier_voter";
const VOTE_COLLECTION = "dossier_public_votes";

function readId(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dossierForVoting(dossierId: string) {
  if (dossierId === "chatkontrolle") {
    return withPublicDossierVoteConfig(chatkontrolleDossier);
  }
  return null;
}

function hashIdentifier(value: string) {
  const secret = process.env.VOTE_ID_SECRET ?? process.env.IP_HASH_SECRET;
  return secret
    ? crypto.createHmac("sha256", secret).update(value).digest("hex")
    : crypto.createHash("sha256").update(value).digest("hex");
}

function existingVoter(req: NextRequest) {
  const userId = readId(req.cookies.get("u_id")?.value);
  if (userId) {
    return {
      voterHash: hashIdentifier(`user:${userId}`),
      voterKind: "user" as const,
      anonymousToken: null,
    };
  }

  const anonymousToken = readId(req.cookies.get(ANON_COOKIE)?.value);
  if (!anonymousToken) return null;
  return {
    voterHash: hashIdentifier(`anonymous:${anonymousToken}`),
    voterKind: "anonymous" as const,
    anonymousToken,
  };
}

function voterForWrite(req: NextRequest) {
  const existing = existingVoter(req);
  if (existing) return existing;
  const anonymousToken = crypto.randomUUID();
  return {
    voterHash: hashIdentifier(`anonymous:${anonymousToken}`),
    voterKind: "anonymous" as const,
    anonymousToken,
  };
}

async function buildSummary(dossierId: string, selectedOptionId: string | null) {
  const votes = await votesCol(VOTE_COLLECTION);
  const grouped = await votes
    .aggregate<{ _id: string; count: number }>([
      { $match: { dossierId } },
      { $group: { _id: "$optionId", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();
  const totalVotes = grouped.reduce((sum, item) => sum + item.count, 0);
  return {
    totalVotes,
    counts: Object.fromEntries(grouped.map((item) => [item._id, item.count])),
    selectedOptionId,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const dossierId = readId(id);
  if (!dossierId) {
    return NextResponse.json({ ok: false, error: "dossierId_missing" }, { status: 400 });
  }
  if (shouldAllowDemoDossierFallback(dossierId)) {
    return NextResponse.json(
      { ok: false, error: "use_demo_vote_route" },
      { status: 400 },
    );
  }

  const dossier = dossierForVoting(dossierId);
  if (!dossier || !getPublicDossierVoteConfig(dossier).enabled) {
    return NextResponse.json(
      {
        ok: false,
        error: "vote_runtime_unavailable",
        message: "Für dieses Dossier ist derzeit keine öffentliche Abstimmung freigegeben.",
      },
      { status: 503 },
    );
  }

  try {
    const voter = existingVoter(req);
    const votes = await votesCol(VOTE_COLLECTION);
    const ownVote = voter
      ? await votes.findOne(
          { dossierId, voterHash: voter.voterHash },
          { projection: { optionId: 1 } },
        )
      : null;
    const summary = await buildSummary(dossierId, readId(ownVote?.optionId));
    return NextResponse.json({ ok: true, ...summary }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "vote_runtime_unavailable",
        message: "Die Abstimmungsdaten sind aktuell nicht verfügbar.",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const dossierId = readId(id);
  const body = (await req.json().catch(() => ({}))) as VoteBody;
  const optionId = readId(body.optionId);

  if (!dossierId) {
    return NextResponse.json({ ok: false, error: "dossierId_missing" }, { status: 400 });
  }
  if (!optionId) {
    return NextResponse.json({ ok: false, error: "optionId_missing" }, { status: 400 });
  }
  if (shouldAllowDemoDossierFallback(dossierId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "use_demo_vote_route",
        message: "Demo-Abstimmungen müssen über die explizite Demo-Route laufen.",
      },
      { status: 400 },
    );
  }

  const dossier = dossierForVoting(dossierId);
  if (!dossier) {
    return NextResponse.json(
      {
        ok: false,
        error: "vote_runtime_unavailable",
        message: "Die Abstimmungsruntime für dieses Dossier ist aktuell nicht verfügbar.",
      },
      { status: 503 },
    );
  }

  const voteConfig = getPublicDossierVoteConfig(dossier);
  const options = getPublicDossierVoteOptions(dossier);
  if (!voteConfig.enabled || options.length < voteConfig.minOptions) {
    return NextResponse.json(
      {
        ok: false,
        error: "vote_not_released",
        message: "Die Abstimmung ist für diesen Dossierstand noch nicht freigegeben.",
      },
      { status: 409 },
    );
  }
  if (!options.some((option) => option.id === optionId)) {
    return NextResponse.json({ ok: false, error: "invalid_option" }, { status: 400 });
  }

  try {
    const voter = voterForWrite(req);
    const votes = await votesCol(VOTE_COLLECTION);
    const now = new Date();
    await votes.updateOne(
      { dossierId, voterHash: voter.voterHash },
      {
        $set: {
          dossierId,
          voterHash: voter.voterHash,
          voterKind: voter.voterKind,
          optionId,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    const summary = await buildSummary(dossierId, optionId);
    const response = NextResponse.json(
      { ok: true, ...summary, updatedAt: now.toISOString() },
      { status: 200 },
    );
    if (voter.voterKind === "anonymous" && !req.cookies.get(ANON_COOKIE)?.value) {
      response.cookies.set(ANON_COOKIE, voter.anonymousToken ?? crypto.randomUUID(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "vote_runtime_unavailable",
        message: "Die Stimme konnte aktuell nicht gespeichert werden.",
      },
      { status: 503 },
    );
  }
}
