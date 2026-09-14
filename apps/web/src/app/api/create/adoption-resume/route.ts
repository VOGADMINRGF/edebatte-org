import { NextRequest, NextResponse } from "next/server";
import {
  CREATE_ANON_SESSION_COOKIE,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";
import { resumeGuestAdoptionDraftForAuthenticatedAccount } from "@/features/create/createGuestAdoptionPreparation";
import { enforceCreateMutationSecurity } from "@/features/create/createRouteSecurity";
import { getSessionUser } from "@/lib/server/auth/sessionUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rejected(status: 400 | 403 | 503) {
  return NextResponse.json(
    {
      ok: false,
      errorCode: "CREATE_ADOPTION_RESUME_UNAVAILABLE",
      message: "Die Anfrage konnte nicht verarbeitet werden.",
    },
    { status },
  );
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req).catch(() => null);
  const userId = sessionUser?._id?.toHexString?.() ?? null;
  if (!sessionUser || !sessionUser.sessionValid || !userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const session = verifyAnonymousSession(
    req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value,
  );
  if (!session) return rejected(403);

  const securityFailure = await enforceCreateMutationSecurity({
    req,
    scope: "create_guest_adoption_resume",
    actorKey: `user:${userId}`,
  });
  if (securityFailure) return securityFailure;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return rejected(400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length !== 0) {
    return rejected(400);
  }

  const result = await resumeGuestAdoptionDraftForAuthenticatedAccount({
    session,
    userId,
  });
  if (!result.ok) return rejected(503);
  return NextResponse.json({ ok: true, state: result.state, draftId: result.draftId });
}
