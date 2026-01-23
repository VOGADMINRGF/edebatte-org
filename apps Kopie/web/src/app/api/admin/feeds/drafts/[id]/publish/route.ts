import { NextRequest, NextResponse } from "next/server";
import { publishVoteDraft } from "@features/feeds/publishVoteDraft";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { id } = await context.params;
  const result = await publishVoteDraft(id);
  if (!result.ok) {
    const status = result.error === "draft_not_found" ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
