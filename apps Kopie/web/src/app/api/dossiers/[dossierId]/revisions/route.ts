import { NextRequest, NextResponse } from "next/server";
import { dossierRevisionsCol } from "@features/dossier/db";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const items = await (await dossierRevisionsCol())
    .find({ dossierId })
    .sort({ timestamp: -1 })
    .limit(200)
    .toArray();

  return NextResponse.json({
    ok: true,
    items: items.map(({ _id, ...rest }) => rest),
  });
}
