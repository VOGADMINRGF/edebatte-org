import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  registerSwipeForUser,
  type RegisterSwipeResult,
  type SwipeDirection,
} from "@features/swipe/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_COOKIE_KEY = "guest_swipes";
const GUEST_LIMIT = 3;

function isErrorResult(result: RegisterSwipeResult): result is Extract<RegisterSwipeResult, { ok: false }> {
  return result.ok === false;
}

export async function POST(req: NextRequest) {
  let payload: { statementId?: string; direction?: SwipeDirection } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value ?? null;
  const guestCountRaw = cookieStore.get(GUEST_COOKIE_KEY)?.value ?? "0";
  const guestCount = Number.isFinite(Number(guestCountRaw)) ? Number(guestCountRaw) : 0;

  const direction =
    typeof payload.direction === "string" ? (payload.direction as SwipeDirection) : ("" as SwipeDirection);
  const statementId = typeof payload.statementId === "string" ? payload.statementId : "";

  const result = await registerSwipeForUser(userId, {
    statementId,
    direction,
    guestSwipesUsed: guestCount,
    guestLimit: GUEST_LIMIT,
  });

  if (isErrorResult(result)) {
    if (result.error === "GUEST_LIMIT_REACHED") {
      return NextResponse.json(
        {
          ok: false,
          reason: "GUEST_LIMIT_REACHED",
          count: result.count ?? guestCount,
          limit: result.limit ?? GUEST_LIMIT,
          nextAllowedAt: result.nextAllowedAt ?? null,
        },
        { status: 429 },
      );
    }

    const status =
      result.error === "USER_NOT_FOUND"
        ? 401
        : result.error === "FORBIDDEN"
          ? 403
          : result.error === "UNKNOWN"
            ? 500
            : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const res = NextResponse.json({ ok: true, stats: result.stats ?? null });
  if (!userId && result.guest) {
    res.cookies.set(GUEST_COOKIE_KEY, String(result.guest.nextCount), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return res;
}
