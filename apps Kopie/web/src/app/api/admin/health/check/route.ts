export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

const EnvSchema = z.object({
  CORE_DB_NAME: z.string().min(1),
  CORE_MONGODB_URI: z.string().min(1),
});

async function loadSystemMatrix() {
  try {
    const mod = await import("@/server/health");
    return mod.runSystemMatrix;
  } catch (err) {
    console.error("[admin/health] system matrix unavailable", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const envCheck = EnvSchema.safeParse(process.env);
  if (!envCheck.success) {
    return NextResponse.json(
      { error: "env_missing", details: envCheck.error.flatten() },
      { status: 503 },
    );
  }

  const runSystemMatrix = await loadSystemMatrix();
  if (!runSystemMatrix) {
    return NextResponse.json(
      { error: "system_check_unavailable", details: "env invalid" },
      { status: 503 },
    );
  }

  const services = await runSystemMatrix();
  return NextResponse.json({ ts: new Date().toISOString(), services });
}
