import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  CREATE_MUTATION_CSRF_HEADER,
  CREATE_MUTATION_CSRF_VALUE,
} from "@/features/create/createMutationSecurityContract";
import {
  CREATE_ANON_SESSION_COOKIE,
  clearAnonymousSessionCookieOptions,
  createAnonymousSession,
  createAnonymousSessionCookieOptions,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";
import { getClientIp } from "@/utils/rateLimitHelpers";
import { consumePersistentRateLimit } from "@/utils/persistentRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISSUANCE_LIMIT = 12;
const ISSUANCE_WINDOW_MS = 10 * 60 * 1000;

function noStoreJson(
  body: { ok: true } | { ok: false; errorCode: string },
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function requestIsSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin")?.trim() ?? "";
  const fetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";
  const csrf = req.headers.get(CREATE_MUTATION_CSRF_HEADER)?.trim() ?? "";
  return (
    origin === new URL(req.url).origin &&
    fetchSite === "same-origin" &&
    csrf === CREATE_MUTATION_CSRF_VALUE
  );
}

function issuanceSubject(req: NextRequest) {
  return crypto
    .createHash("sha256")
    .update(`create_session_issuance:${getClientIp(req)}`)
    .digest("hex");
}

async function consumeIssuanceLimit(req: NextRequest) {
  return consumePersistentRateLimit({
    namespace: "create:anonymous_session:ip",
    subjectHash: issuanceSubject(req),
    limit: ISSUANCE_LIMIT,
    windowMs: ISSUANCE_WINDOW_MS,
  });
}

export async function POST(req: NextRequest) {
  if (!requestIsSameOrigin(req)) {
    return noStoreJson({ ok: false, errorCode: "CREATE_REQUEST_REJECTED" }, 403);
  }

  const cookie = req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value;
  if (cookie) {
    const existing = verifyAnonymousSession(cookie);
    if (existing) return noStoreJson({ ok: true }, 200);

    const response = noStoreJson(
      { ok: false, errorCode: "CREATE_SESSION_INVALID" },
      401,
    );
    response.cookies.set(
      CREATE_ANON_SESSION_COOKIE,
      "",
      clearAnonymousSessionCookieOptions(),
    );
    return response;
  }

  let issuance;
  try {
    issuance = await consumeIssuanceLimit(req);
  } catch {
    return noStoreJson(
      { ok: false, errorCode: "CREATE_SESSION_RATE_LIMIT_UNAVAILABLE" },
      503,
    );
  }
  if (!issuance.ok) {
    const response = noStoreJson(
      { ok: false, errorCode: "CREATE_SESSION_RATE_LIMITED" },
      429,
    );
    response.headers.set("Retry-After", String(Math.ceil(issuance.retryIn / 1000)));
    return response;
  }

  const created = createAnonymousSession();
  if (!created) {
    return noStoreJson(
      { ok: false, errorCode: "CREATE_SESSION_UNAVAILABLE" },
      503,
    );
  }

  const response = noStoreJson({ ok: true }, 200);
  response.cookies.set(
    CREATE_ANON_SESSION_COOKIE,
    created.value,
    createAnonymousSessionCookieOptions(),
  );
  return response;
}
