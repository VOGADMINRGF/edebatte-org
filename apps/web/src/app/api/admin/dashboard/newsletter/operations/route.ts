import { NextRequest, NextResponse } from "next/server";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  getNewsletterOperationsSnapshot,
  newsletterRuntimeConfiguration,
} from "@/features/newsletter/newsletterRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const snapshot = await getNewsletterOperationsSnapshot();
  return NextResponse.json({
    ok: true,
    snapshot,
    configuration: newsletterRuntimeConfiguration(),
  });
}
