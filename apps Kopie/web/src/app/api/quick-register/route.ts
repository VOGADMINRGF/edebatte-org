import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/utils/rateLimiter"; // mit '/‘
import { getServerSession } from "next-auth";
import { authOptions } from "@lib/auth"; // ohne '/‘
import { piiConn } from "@lib/db/pii";
import { getQuickSignupModel } from "@lib/pii/QuickSignup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ipHeader = req.headers.get("x-forwarded-for");
  const ip = ipHeader?.split(",")[0]?.trim() || null;

  const rl = await rateLimit(ip ?? "unknown", "quick_register", 30, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfterSec },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetSec),
        },
      },
    );
  }

  try {
    const body = BodyZ.parse(await req.json());

    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      userId = (session as any)?.user?.id ?? null;
    } catch {
      // NextAuth evtl. nicht aktiv – ok
    }

    const ua = req.headers.get("user-agent") || null;

    // --- PII (Mongo) schreiben
    const conn = await piiConn();
    const QuickSignup = getQuickSignupModel(conn);
    const doc = await QuickSignup.create({
      name: body.name ?? null,
      email: body.email ?? null,
      consent: body.consent,
      source: body.source,
      ip,
      userAgent: ua,
      userId,
    });

    // Cookie über Response setzen (vermeidet TS-Fehler bei cookies().set)
    const res = NextResponse.json(
      {
        data: {
          id: String(doc._id),
          createdAt: doc.createdAt,
          name: doc.name,
          email: doc.email,
          source: doc.source,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      },
    );

    res.cookies.set("u_quick", String(doc._id), {
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "invalid_request", issues: err.issues },
        { status: 400 },
      );
    }
    console.error("[quick-register]", err);
    return NextResponse.json(
      {
        error: "internal_error",
        detail: String(err?.message ?? err),
      },
      { status: 500 },
    );
  }
}
