export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

import crypto from "crypto";
import { votesCol, coreCol, ObjectId } from "@core/db/triMongo";
import UserGameStats from "src/models/game/UserGameStats";
import { ensureUserMeetsVerificationLevel } from "@features/auth/verificationAccess";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

type Val = "agree" | "neutral" | "disagree";

/** Region aus Edge/CDN-Headern */
function parseRegion(h: Headers) {
  const rc = (h.get("x-country") || h.get("cf-ipcountry") || "").toUpperCase();
  return rc || "UNK";
}

/** Erste IP aus XFF o.ä. ziehen */
function getClientIp(req: NextRequest): string {
  const fwd = (req.headers.get("x-forwarded-for") ||
    (req as any).ip ||
    "") as string;
  return fwd.split(",")[0].trim();
}

/** IPv4 /24, IPv6 /64 Subnetz-String */
function ipSubnet(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length >= 3) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    return null;
  }
  if (ip.includes(":")) {
    const groups = ip.split(":");
    return groups.slice(0, 4).join(":") + "::/64";
  }
  return null;
}

/** HMAC-SHA256 (falls SECRET vorhanden), sonst SHA256 */
function stableHash(input: string | null): string | null {
  if (!input) return null;
  const secret = process.env.IP_HASH_SECRET;
  return secret
    ? crypto.createHmac("sha256", secret).update(input).digest("hex")
    : crypto.createHash("sha256").update(input).digest("hex");
}

async function summaryOf(statementId: ObjectId) {
  const stmts = await coreCol("statements");
  const s = await stmts.findOne(
    { _id: statementId },
    { projection: { votes: 1, stats: 1 } },
  );

  const votes = {
    agree: s?.votes?.agree ?? 0,
    neutral: s?.votes?.neutral ?? 0,
    disagree: s?.votes?.disagree ?? 0,
    requiredMajority: s?.votes?.requiredMajority ?? 50,
  };
  const stats = {
    views: s?.stats?.views ?? 0,
    votesAgree: s?.stats?.votesAgree ?? 0,
    votesNeutral: s?.stats?.votesNeutral ?? 0,
    votesDisagree: s?.stats?.votesDisagree ?? 0,
    votesTotal: s?.stats?.votesTotal ?? 0,
  };

  return { votes, stats };
}

export async function POST(req: NextRequest) {
  // Rate Limit (z. B. 120 Aktionen / Minute)
  const lim = await rateLimitOrThrow("vote:cast", 120, 60_000);
  if (!lim.ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    // Tipp: lim enthält i.d.R. resetAt/remaining -> kann in Headers zurückgegeben werden
  }

  // Body lesen & validieren
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* noop */
  }

  const userId = req.cookies.get("u_id")?.value || null;
  const levelCheck = await ensureUserMeetsVerificationLevel(userId, "email");
  if (!levelCheck.ok) {
    const errCode =
      "error" in levelCheck ? levelCheck.error : "insufficient_level";
    return NextResponse.json(
      {
        error: errCode,
        requiredLevel: "email",
        currentLevel: levelCheck.level,
      },
      { status: errCode === "login_required" ? 401 : 403 },
    );
  }

  const statementIdStr = String(body?.statementId ?? "");
  const rawValue = String(body?.value ?? "").toLowerCase();
  const value = rawValue as Val;
  const touch = Boolean(body?.touch); // wenn true: bei gleicher Stimme nur "antippen"

  if (!ObjectId.isValid(statementIdStr)) {
    return NextResponse.json({ error: "invalid_statementId" }, { status: 400 });
  }
  if (!(value in VALID)) {
    return NextResponse.json({ error: "invalid_vote" }, { status: 400 });
  }

  const statementId = new ObjectId(statementIdStr);

  // Identität: userId → (fp + ipSubnet) → fp → 400
  const fp = (req.headers.get("x-fp") || "").slice(0, 200) || null;
  const ip = getClientIp(req);
  const subnet = ipSubnet(ip);
  const subnetHash = stableHash(subnet);

  let key: Record<string, any> = { statementId };
  key.userId = String(userId);

  const regionCode = parseRegion(req.headers);
  const now = new Date();

  // Collections
  const votesColRef = await votesCol("votes");
  const stmtsColRef = await coreCol("statements");

  // Bisherige Stimme lesen
  const existing = await votesColRef.findOne(key, { projection: { value: 1 } });

  // Early return bei gleicher Stimme (falls touch=false)
  if (existing && existing.value === value && !touch) {
    const sum = await summaryOf(statementId);
    return NextResponse.json({ ok: true, unchanged: true, ...sum });
  }

  // Vote upserten (immer), mit minimaler PII (Subnetz-Hash statt IP)
  await votesColRef.updateOne(
    key,
    {
      $set: {
        statementId,
        value,
        userId: userId ?? null,
        fp: fp ?? null,
        ipSubnet: subnetHash ?? null,
        regionCode,
        day: now.toISOString().slice(0, 10),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  // Zähler-Inkremente vorbereiten
  const inc: Record<string, number> = {};

  if (!existing) {
    // Erststimme: votes.* & stats.* erhöhen
    inc[`votes.${value}`] = 1;
    inc["stats.votesTotal"] = 1;
    if (value === "agree") inc["stats.votesAgree"] = 1;
    if (value === "neutral") inc["stats.votesNeutral"] = 1;
    if (value === "disagree") inc["stats.votesDisagree"] = 1;
  } else if (existing.value !== value) {
    // Umstimmen: alten Wert dekrementieren, neuen inkrementieren; total bleibt gleich
    inc[`votes.${existing.value as Val}`] = -1;
    inc[`votes.${value}`] = (inc[`votes.${value}`] ?? 0) + 1;

    if (existing.value === "agree")
      inc["stats.votesAgree"] = (inc["stats.votesAgree"] ?? 0) - 1;
    if (existing.value === "neutral")
      inc["stats.votesNeutral"] = (inc["stats.votesNeutral"] ?? 0) - 1;
    if (existing.value === "disagree")
      inc["stats.votesDisagree"] = (inc["stats.votesDisagree"] ?? 0) - 1;

    if (value === "agree")
      inc["stats.votesAgree"] = (inc["stats.votesAgree"] ?? 0) + 1;
    if (value === "neutral")
      inc["stats.votesNeutral"] = (inc["stats.votesNeutral"] ?? 0) + 1;
    if (value === "disagree")
      inc["stats.votesDisagree"] = (inc["stats.votesDisagree"] ?? 0) + 1;
  } else {
    // gleiche Stimme & touch=true → keine Counter-Änderung
  }

  if (Object.keys(inc).length > 0) {
    await stmtsColRef.updateOne({ _id: statementId }, { $inc: inc });
  }

  // ---- Gamification: XP & ggf. Badge vergeben (idempotent) ----
  try {
    if (userId) {
      const isFirst = !existing;
      const changed = !existing || existing.value !== value;

      if (changed) {
        const hdrRequestId = req.headers.get("x-request-id") || undefined;
        const userKey = String(userId);
        // deterministische Event-ID, falls kein x-request-id vorhanden
        const eventId =
          hdrRequestId ||
          `vote:${statementId.toHexString()}:${userKey}:${value}`;

        await UserGameStats.awardXp(userKey, isFirst ? 2 : 1, {
          badgeCode: isFirst ? "FIRST_VOTE" : undefined,
          eventId,
          timezone: "Europe/Berlin",
        });
      }
    }
  } catch (err) {
    // Gamification darf nie den Vote blockieren
    console.error("[gamify] awardXp failed:", err);
  }

  const sum = await summaryOf(statementId);
  return NextResponse.json({ ok: true, ...sum });
}
