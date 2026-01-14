// apps/web/src/app/api/votes/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { ObjectId } from "@core/db/triMongo";
import { NextRequest, NextResponse } from "next/server";

import crypto from "crypto";
import { coreCol, votesCol } from "@core/db/db/triMongo";

type Val = "agree" | "neutral" | "disagree";

function getClientIp(req: NextRequest): string {
  const fwd = (req.headers.get("x-forwarded-for") ||
    (req as any).ip ||
    "") as string;
  return fwd.split(",")[0].trim();
}
function ipSubnet(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(".")) {
    const p = ip.split(".");
    return p.length >= 3 ? `${p[0]}.${p[1]}.${p[2]}.0/24` : null;
  }
  if (ip.includes(":")) {
    const g = ip.split(":");
    return g.slice(0, 4).join(":") + "::/64";
  }
  return null;
}
function stableHash(s: string | null): string | null {
  if (!s) return null;
  const sec = process.env.IP_HASH_SECRET;
  return sec
    ? crypto.createHmac("sha256", sec).update(s).digest("hex")
    : crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const statementIdStr = String(body?.statementId ?? "");
    const v = String(body?.value ?? "").toLowerCase() as Val;

    if (!ObjectId.isValid(statementIdStr)) {
      return NextResponse.json(
        { error: "invalid_statementId" },
        { status: 400 },
      );
    }
    if (!(v in VALID)) {
      return NextResponse.json({ error: "invalid_vote" }, { status: 400 });
    }

    const statementId = new ObjectId(statementIdStr);

    // Ident keys: userId > (fp+subnet) > fp
    const userId =
      req.cookies.get("u_id")?.value || req.headers.get("x-user-id") || null;
    const fp = (req.headers.get("x-fp") || "").slice(0, 200) || null;
    const subnetHash = stableHash(ipSubnet(getClientIp(req)));

    const key: Record<string, any> = { statementId };
    if (userId) key.userId = String(userId);
    else if (fp && subnetHash) {
      key.fp = fp;
      key.ipSubnet = subnetHash;
    } else if (fp) key.fp = fp;
    else
      return NextResponse.json(
        { error: "missing_identifier" },
        { status: 400 },
      );

    const votes = await votesCol("votes");
    const stmts = await coreCol("statements");

    const existing = await votes.findOne(key, { projection: { value: 1 } });

    const now = new Date();
    await votes.updateOne(
      key,
      {
        $set: {
          statementId,
          value: v,
          userId: userId ?? null,
          fp: fp ?? null,
          ipSubnet: subnetHash ?? null,
          updatedAt: now,
          day: now.toISOString().slice(0, 10),
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    // Counters am Statement anpassen
    const inc: Record<string, number> = {};
    if (!existing) {
      inc[`votes.${v}`] = 1;
      inc["stats.votesTotal"] = 1;
      if (v === "agree") inc["stats.votesAgree"] = 1;
      if (v === "neutral") inc["stats.votesNeutral"] = 1;
      if (v === "disagree") inc["stats.votesDisagree"] = 1;
    } else if (existing.value !== v) {
      inc[`votes.${existing.value as Val}`] = -1;
      inc[`votes.${v}`] = (inc[`votes.${v}`] ?? 0) + 1;

      if (existing.value === "agree")
        inc["stats.votesAgree"] = (inc["stats.votesAgree"] ?? 0) - 1;
      if (existing.value === "neutral")
        inc["stats.votesNeutral"] = (inc["stats.votesNeutral"] ?? 0) - 1;
      if (existing.value === "disagree")
        inc["stats.votesDisagree"] = (inc["stats.votesDisagree"] ?? 0) - 1;

      if (v === "agree")
        inc["stats.votesAgree"] = (inc["stats.votesAgree"] ?? 0) + 1;
      if (v === "neutral")
        inc["stats.votesNeutral"] = (inc["stats.votesNeutral"] ?? 0) + 1;
      if (v === "disagree")
        inc["stats.votesDisagree"] = (inc["stats.votesDisagree"] ?? 0) + 1;
    }
    if (Object.keys(inc).length) {
      await stmts.updateOne({ _id: statementId }, { $inc: inc });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/votes/submit failed:", e?.message || e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
