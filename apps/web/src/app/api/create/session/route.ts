import { NextRequest, NextResponse } from "next/server";
import {
  CREATE_MUTATION_CSRF_HEADER,
  CREATE_MUTATION_CSRF_VALUE,
} from "@/features/create/createMutationSecurityContract";
import {
  CREATE_ANON_SESSION_COOKIE,
  createAnonymousStorageContext,
  createAnonymousSession,
  createAnonymousSessionCookieOptions,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOriginRequest(req: NextRequest) {
  const origin = req.headers.get("origin")?.trim() ?? "";
  const fetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";
  const csrf = req.headers.get(CREATE_MUTATION_CSRF_HEADER)?.trim() ?? "";
  return (
    origin === new URL(req.url).origin &&
    fetchSite === "same-origin" &&
    csrf === CREATE_MUTATION_CSRF_VALUE
  );
}

function sessionResponse(
  session: Parameters<typeof createAnonymousStorageContext>[0],
) {
  const storageContext = createAnonymousStorageContext(session);
  if (!storageContext) {
    return NextResponse.json(
      { ok: false, errorCode: "CREATE_SESSION_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: true, storageContext },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  if (!sameOriginRequest(req)) {
    return NextResponse.json(
      { ok: false, errorCode: "CREATE_REQUEST_REJECTED" },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  const existing = verifyAnonymousSession(
    req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value,
  );
  if (existing) {
    return sessionResponse(existing);
  }

  const created = createAnonymousSession();
  if (!created) {
    return NextResponse.json(
      { ok: false, errorCode: "CREATE_SESSION_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const response = sessionResponse(created.session);
  response.cookies.set(
    CREATE_ANON_SESSION_COOKIE,
    created.value,
    createAnonymousSessionCookieOptions(),
  );
  return response;
}
