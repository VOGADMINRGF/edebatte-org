export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  buildVoxyOperationsAgentAdvisories,
  loadVoxyOperationsSnapshot,
} from "@/features/voxyVideo/localCompositionOperations";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const snapshot = await loadVoxyOperationsSnapshot();
    return NextResponse.json({
      ok: true,
      snapshot,
      advisories: buildVoxyOperationsAgentAdvisories(snapshot),
      healthAuthority: "deterministic_snapshot_only",
      agentMutationAllowed: false,
      agentHealthUpgradeAllowed: false,
      autoRepair: false,
      autoRestart: false,
      autoDeploy: false,
      autoRollback: false,
      autoPublish: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "voxy_operations_snapshot_failed",
        safeErrorCode:
          error instanceof Error && error.message.includes("persistence")
            ? "operations_persistence_unavailable"
            : "operations_snapshot_exception",
      },
      { status: 503 },
    );
  }
}
