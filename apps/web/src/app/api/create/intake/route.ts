import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  enforceCreateMutationSecurity,
  getVerifiedGuestClaimSubject,
} from "@/features/create/createRouteSecurity";
import { runGuestClaimSingleFlight } from "@/features/create/createOrchestrationSingleFlight";
import {
  inspectGuestClaim,
  isSafePersistedGuestClaimResult,
  type PersistedGuestClaimResult,
} from "@/features/create/safety/createGuestClaimSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuestClaimPublicErrorCode =
  | "CREATE_INVALID_REQUEST"
  | "CREATE_REQUEST_REJECTED"
  | "CREATE_REQUEST_TOO_LARGE"
  | "CREATE_RATE_LIMITED"
  | "CREATE_RATE_LIMIT_UNAVAILABLE"
  | "CREATE_GUEST_CLAIM_IN_PROGRESS"
  | "CREATE_GUEST_CLAIM_UNAVAILABLE"
  | "CREATE_GUEST_UNSAFE_RESPONSE"
  | "CREATE_GUEST_INTERNAL_ERROR";

type GuestClaimFailureResponse = {
  ok: false;
  errorCode: GuestClaimPublicErrorCode;
  message: "Die Anfrage konnte nicht verarbeitet werden.";
};

type GuestClaimSuccessResponse = {
  ok: true;
  operationId: string;
  status: "accepted";
};

function failure(errorCode: GuestClaimPublicErrorCode, status: number) {
  const body: GuestClaimFailureResponse = {
    ok: false,
    errorCode,
    message: "Die Anfrage konnte nicht verarbeitet werden.",
  };
  return NextResponse.json(body, { status });
}

function subjectDigest(subject: string) {
  return crypto.createHash("sha256").update(`create-guest-claim:${subject}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const subject = getVerifiedGuestClaimSubject(req);
  if (!subject) return failure("CREATE_REQUEST_REJECTED", 403);
  const securityFailure = await enforceCreateMutationSecurity({
    req,
    scope: "create_guest_claim",
    actorKey: `guest:${subjectDigest(subject)}`,
  });
  if (securityFailure) return securityFailure;
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return failure("CREATE_INVALID_REQUEST", 400);
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return failure("CREATE_INVALID_REQUEST", 400);
  }
  const record = rawBody as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Object.hasOwn(record, "claim")) {
    return failure("CREATE_INVALID_REQUEST", 400);
  }
  const claim = record.claim;
  const inspected = inspectGuestClaim(claim);
  if (!inspected.ok) return failure("CREATE_REQUEST_REJECTED", 403);
  const singleFlight = await runGuestClaimSingleFlight<PersistedGuestClaimResult>({
    subjectDigest: subjectDigest(subject),
    inputDigest: inspected.normalizedDigest,
    isSafeResult: isSafePersistedGuestClaimResult,
    run: async () => ({
      version: 1,
      status: "accepted",
      operationId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }),
  });
  if (singleFlight.kind === "active") {
    return failure("CREATE_GUEST_CLAIM_IN_PROGRESS", 409);
  }
  if (singleFlight.kind === "unavailable") {
    return failure("CREATE_GUEST_CLAIM_UNAVAILABLE", 503);
  }
  if (singleFlight.kind === "unsafe") {
    return failure("CREATE_GUEST_UNSAFE_RESPONSE", 500);
  }
  if (!isSafePersistedGuestClaimResult(singleFlight.result)) {
    return failure("CREATE_GUEST_UNSAFE_RESPONSE", 500);
  }
  const body: GuestClaimSuccessResponse = {
    ok: true,
    operationId: singleFlight.result.operationId,
    status: "accepted",
  };
  return NextResponse.json(body, { status: 202 });
}
