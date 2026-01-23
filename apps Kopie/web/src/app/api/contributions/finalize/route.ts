import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCol, ObjectId } from "@core/db/triMongo";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FinalizeSchema = z.object({
  draftId: z.string().min(1),
  selectedClaimIds: z.array(z.string()).min(1),
  topicTitle: z.string().optional(),
  source: z.enum(["contribution_new", "statement_new"]).optional(),
});

type DraftDoc = {
  _id: ObjectId;
  authorId: string;
  analysis?: any;
  status?: "draft" | "finalized";
  proposalIds?: string[];
};

type ProposalDoc = {
  _id?: ObjectId;
  draftId: ObjectId;
  authorId: string;
  claimId: string;
  text: string;
  title?: string | null;
  responsibility?: string | null;
  topic?: string | null;
  stance?: string | null;
  importance?: number | null;
  source?: string;
  topicTitle?: string;
  status: "proposed";
  createdAt: Date;
};

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("u_id")?.value;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
    }

    const body = FinalizeSchema.parse(await req.json());
    const Drafts = await getCol<DraftDoc>("contribution_drafts");
    const Proposals = await getCol<ProposalDoc>("statement_proposals");

    let draftOid: ObjectId;
    try {
      draftOid = new ObjectId(body.draftId);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_draft" }, { status: 400 });
    }

    const draft = await Drafts.findOne({ _id: draftOid, authorId: userId });
    if (!draft) {
      return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404 });
    }

    if (draft.status === "finalized" && Array.isArray(draft.proposalIds) && draft.proposalIds.length > 0) {
      return NextResponse.json({
        ok: true,
        proposalIds: draft.proposalIds,
        redirectTo: `/swipes?fromDraft=${body.draftId}`,
      });
    }

    const claims = Array.isArray(draft.analysis?.claims) ? draft.analysis.claims : [];
    const selectedSet = new Set(body.selectedClaimIds);
    const selectedClaims = claims.filter((claim: any) => selectedSet.has(String(claim?.id)));

    if (selectedClaims.length === 0) {
      return NextResponse.json({ ok: false, error: "no_claims_selected" }, { status: 400 });
    }

    const now = new Date();
    const insertDocs: ProposalDoc[] = selectedClaims.map((claim: any) => ({
      draftId: draftOid,
      authorId: draft.authorId,
      claimId: String(claim.id),
      text: String(claim.text ?? ""),
      title: claim.title ?? null,
      responsibility: claim.responsibility ?? null,
      topic: claim.topic ?? null,
      stance: claim.stance ?? null,
      importance: typeof claim.importance === "number" ? claim.importance : null,
      source: body.source,
      topicTitle: body.topicTitle,
      status: "proposed",
      createdAt: now,
    }));

    const insert = await Proposals.insertMany(insertDocs);
    const proposalIds = Object.values(insert.insertedIds).map((id) => String(id));

    await Drafts.updateOne(
      { _id: draftOid },
      {
        $set: {
          status: "finalized",
          finalizedAt: now,
          proposalIds,
        },
      },
    );

    return NextResponse.json({
      ok: true,
      proposalIds,
      redirectTo: `/swipes?fromDraft=${body.draftId}`,
    });
  } catch (err: any) {
    const message = err?.issues?.[0]?.message ?? err?.message ?? "Finalize failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
