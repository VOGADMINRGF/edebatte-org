import { NextRequest, NextResponse } from "next/server";
import { coreCol, votesCol } from "@core/db/triMongo";
import chatkontrolleDossier from "@features/dossier/data/chatkontrolleDossier";
import type { StoredDossier } from "@features/dossier/infra/types";
import { ensureUserMeetsVerificationLevel } from "@features/auth/verificationAccess";
import { getPublishedDossierBySlugOrId } from "@/features/dossier/publicRuntime";
import {
  collectPublicDossierVoteOptions,
  resolvePublicDossierVotePolicy,
} from "@/features/dossier/publicVotePolicy";
import { shouldAllowDemoDossierFallback } from "@/features/runtimeDataGuardrails";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOSSIER_STORE = "dossier_store";
const DOSSIER_VOTES = "dossier_votes";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VoteBody = {
  optionId?: string;
};

type DossierVoteDoc = {
  dossierId: string;
  userId: string;
  optionId: string;
  createdAt: Date;
  updatedAt: Date;
};

function readId(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function loadPublicDossier(dossierId: string) {
  if (dossierId === "chatkontrolle") return chatkontrolleDossier;

  const published = await getPublishedDossierBySlugOrId(dossierId).catch(() => null);
  if (published?.detail?.dossier) return published.detail.dossier;

  const col = await coreCol<StoredDossier>(DOSSIER_STORE);
  const stored = await col.findOne({ dossierId });
  return stored?.dossier ?? null;
}

async function buildSummary(dossierId: string, userId: string | null, optionIds: string[]) {
  const col = await votesCol<DossierVoteDoc>(DOSSIER_VOTES);
  const grouped = await col
    .aggregate<{ _id: string; count: number }>([
      { $match: { dossierId, optionId: { $in: optionIds } } },
      { $group: { _id: "$optionId", count: { $sum: 1 } } },
    ])
    .toArray();
  const counts = new Map(grouped.map((row) => [String(row._id), Number(row.count) || 0]));
  const totalVotes = optionIds.reduce((sum, optionId) => sum + (counts.get(optionId) ?? 0), 0);
  const mine = userId ? await col.findOne({ dossierId, userId }) : null;

  return {
    totalVotes,
    myOptionId: mine?.optionId ?? null,
    options: optionIds.map((optionId) => ({
      id: optionId,
      count: counts.get(optionId) ?? 0,
      pct: totalVotes > 0 ? Math.round(((counts.get(optionId) ?? 0) / totalVotes) * 100) : 0,
    })),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const dossierId = readId(id);
  if (!dossierId) {
    return NextResponse.json({ ok: false, error: "dossierId_missing" }, { status: 400 });
  }
  if (shouldAllowDemoDossierFallback(dossierId)) {
    return NextResponse.json({ ok: false, error: "use_demo_vote_route" }, { status: 400 });
  }

  try {
    const dossier = await loadPublicDossier(dossierId);
    if (!dossier) {
      return NextResponse.json({ ok: false, error: "dossier_not_found" }, { status: 404 });
    }
    const policy = resolvePublicDossierVotePolicy(dossier);
    const userId = req.cookies.get("u_id")?.value ?? null;
    const summary = await buildSummary(
      dossierId,
      userId,
      policy.options.map((option) => option.id),
    );
    return NextResponse.json({
      ok: true,
      enabled: policy.enabled,
      policy: policy.policy,
      pilot: policy.pilot,
      reason: policy.reason,
      totalVotes: summary.totalVotes,
      myOptionId: summary.myOptionId,
      options: policy.options.map((option) => ({
        ...option,
        ...(summary.options.find((item) => item.id === option.id) ?? { count: 0, pct: 0 }),
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "vote_summary_unavailable", message: "Die Bürgerstimmung kann derzeit nicht geladen werden." },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const lim = await rateLimitOrThrow("dossier:vote", 60, 60_000);
  if (!lim.ok) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

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
      { ok: false, error: "use_demo_vote_route", message: "Demo-Abstimmungen laufen ausschließlich über die Demo-Route." },
      { status: 400 },
    );
  }

  const userId = req.cookies.get("u_id")?.value ?? null;
  const levelCheck = await ensureUserMeetsVerificationLevel(userId, "email");
  if (!levelCheck.ok) {
    const error = "error" in levelCheck ? levelCheck.error : "insufficient_level";
    return NextResponse.json(
      {
        ok: false,
        error,
        message:
          error === "login_required"
            ? "Bitte melde dich an, um deine Stimme zu speichern."
            : "Für die Abstimmung ist mindestens eine bestätigte E-Mail-Adresse erforderlich.",
        requiredLevel: "email",
        currentLevel: levelCheck.level,
      },
      { status: error === "login_required" ? 401 : 403 },
    );
  }

  try {
    const dossier = await loadPublicDossier(dossierId);
    if (!dossier) {
      return NextResponse.json({ ok: false, error: "dossier_not_found" }, { status: 404 });
    }
    const policy = resolvePublicDossierVotePolicy(dossier);
    if (!policy.enabled) {
      return NextResponse.json(
        { ok: false, error: "vote_not_enabled", message: policy.reason },
        { status: 409 },
      );
    }
    const options = collectPublicDossierVoteOptions(dossier);
    if (!options.some((option) => option.id === optionId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_option", message: "Diese Entscheidungsoption gehört nicht zum veröffentlichten Dossierstand." },
        { status: 400 },
      );
    }

    const now = new Date();
    const col = await votesCol<DossierVoteDoc>(DOSSIER_VOTES);
    const key = { dossierId, userId: String(userId) };
    const existing = await col.findOne(key, { projection: { optionId: 1 } });
    await col.updateOne(
      key,
      {
        $set: { optionId, updatedAt: now },
        $setOnInsert: { dossierId, userId: String(userId), createdAt: now },
      },
      { upsert: true },
    );

    const summary = await buildSummary(
      dossierId,
      String(userId),
      options.map((option) => option.id),
    );

    return NextResponse.json({
      ok: true,
      changed: existing?.optionId !== optionId,
      updatedAt: now.toISOString(),
      totalVotes: summary.totalVotes,
      myOptionId: summary.myOptionId,
      options: options.map((option) => ({
        ...option,
        ...(summary.options.find((item) => item.id === option.id) ?? { count: 0, pct: 0 }),
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "vote_runtime_unavailable", message: "Die Abstimmung konnte gerade nicht gespeichert werden. Bitte versuche es erneut." },
      { status: 503 },
    );
  }
}
