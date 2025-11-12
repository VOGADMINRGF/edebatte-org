import { NextRequest } from "next/server";
import { VoteModel } from "@/models/votes/Vote";
import crypto from "crypto";

function ok(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function err(reason: string, status = 400) {
  return ok({ ok: false, reason }, status);
}

function hash(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 40);
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const statementId = String(ctx.params.id || "").trim();
    if (!statementId) return err("MISSING_STATEMENT_ID", 400);

    const b = await req.json().catch(() => ({}));
    const choice = String(b?.choice || "").trim(); // "yes" | "no" | "skip"
    let sessionId = typeof b?.sessionId === "string" ? b.sessionId : "";

    if (!["yes", "no", "skip"].includes(choice)) return err("INVALID_CHOICE", 400);

    if (!sessionId) {
      const ip = req.headers.get("x-forwarded-for") || "0.0.0.0";
      const ua = req.headers.get("user-agent") || "-";
      sessionId = hash(ip + "|" + ua); // pseudonymisiert
    }

    const Vote = await VoteModel();
    await Vote.updateOne(
      { statementId, sessionId },
      { $set: { choice } },
      { upsert: true }
    );

    return ok({ ok: true });
  } catch (e: any) {
    return err("SERVER_ERROR", 500);
  }
}
