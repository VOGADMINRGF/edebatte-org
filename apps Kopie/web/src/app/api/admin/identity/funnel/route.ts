// LEGACY_KEEP: Alte Funnel-Route; liefert jetzt Telemetrie-Snapshot statt
// direkter User-Collection. Für neue Auswertungen bitte /admin/telemetry/identity nutzen.
import { NextRequest, NextResponse } from "next/server";
import { getIdentityFunnelSnapshot, type IdentityEventName } from "@core/telemetry/identityEvents";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRangeDays(value: string | null): number {
  switch (value) {
    case "7":
    case "week":
      return 7;
    case "90":
    case "quarter":
      return 90;
    case "30":
    case "month":
    default:
      return 30;
  }
}

const STAGES: { key: IdentityEventName; label: string }[] = [
  { key: "identity_register", label: "Registriert" },
  { key: "identity_email_verify_confirm", label: "E-Mail bestätigt" },
  { key: "identity_otb_confirm", label: "OTB bestätigt" },
  { key: "identity_strong_completed", label: "Strong abgeschlossen" },
];

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const rangeDays = parseRangeDays(searchParams.get("range"));
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - (rangeDays - 1));

    const snapshot = await getIdentityFunnelSnapshot(fromDate, toDate);
    const stages = STAGES.map(({ key, label }) => ({
      stage: label,
      value: snapshot.totalsByEvent[key],
    }));

    const dropOff = stages.slice(0, -1).map((stage, idx) => {
      const nextValue = stages[idx + 1]?.value ?? 0;
      return {
        label: `${stage.stage} → ${stages[idx + 1]?.stage ?? ""}`.trim(),
        value: Math.max(stage.value - nextValue, 0),
      };
    });

    return NextResponse.json({ ok: true, snapshot, stages, dropOff });
  } catch (error) {
    console.error("[api] legacy identity funnel failed", error);
    return NextResponse.json({ ok: false, error: "identity snapshot failed" }, { status: 500 });
  }
}
