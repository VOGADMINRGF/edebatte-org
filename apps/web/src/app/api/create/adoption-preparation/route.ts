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
    return failure(code, status);
  }
  return NextResponse.json({ ok: true, status: "prepared" }, { status: 202 });
}
