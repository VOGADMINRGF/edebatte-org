import { NextRequest, NextResponse } from "next/server";
import {
  enforceCreateMutationSecurity,
  getVerifiedGuestClaimSubject,
} from "@/features/create/createRouteSecurity";
import {
  CREATE_ANON_SESSION_COOKIE,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";
import { prepareGuestAdoptionPreparation } from "@/features/create/createGuestAdoptionPreparation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "edebatte_create_adoption_preparation";

function failure(
  errorCode: "CREATE_INVALID_REQUEST" | "CREATE_REQUEST_REJECTED" | "CREATE_PREPARATION_UNAVAILABLE",
  status: 400 | 403 | 503,
) {
  return NextResponse.json({
    ok: false,
    errorCode,
    message: "Die Anfrage konnte nicht verarbeitet werden.",
  }, { status });
}

function clearPreparationCookie(response: ReturnType<typeof NextResponse.json>) {
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}

export async function POST(req: NextRequest) {
  const subject = getVerifiedGuestClaimSubject(req);
  const session = verifyAnonymousSession(req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value);
  if (!subject || !session || subject !== session.id) {
    return failure("CREATE_REQUEST_REJECTED", 403);
  }

  const security = await enforceCreateMutationSecurity({
    req,
    scope: "create_guest_adoption_preparation",
    actorKey: `guest:${subject}`,
  });
  if (security) return security;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return failure("CREATE_INVALID_REQUEST", 400);
  }
  if (
    !payload || typeof payload !== "object" || Array.isArray(payload) ||
    Object.keys(payload).length !== 1 || !("claim" in payload) ||
    typeof (payload as { claim?: unknown }).claim !== "string"
  ) {
    return failure("CREATE_INVALID_REQUEST", 400);
  }
  const claim = (payload as { claim: string }).claim.trim();
  if (!claim || claim.length > 10_000 || Buffer.byteLength(claim, "utf8") > 30_000) {
    return failure("CREATE_INVALID_REQUEST", 400);
  }

  const result = await prepareGuestAdoptionPreparation({
    session,
    claim,
  });
  if (result.ok === false) {
    const status = result.reason === "invalid" ? 400 : result.reason === "rejected" ? 403 : 503;
    const code = result.reason === "invalid" ? "CREATE_INVALID_REQUEST" : result.reason === "rejected" ? "CREATE_REQUEST_REJECTED" : "CREATE_PREPARATION_UNAVAILABLE";
    const response = result.afterBarrier ? clearPreparationCookie(failure(code, status)) : failure(code, status);
    return response;
  }

  const maxAge = Math.min(900, Math.floor((result.expiresAtMs - Date.now()) / 1000));
  if (maxAge <= 0) {
    return clearPreparationCookie(failure("CREATE_PREPARATION_UNAVAILABLE", 503));
  }
  const response = NextResponse.json({ ok: true, status: "prepared" }, { status: 202 });
  response.cookies.set(COOKIE, result.preparationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return response;
}
