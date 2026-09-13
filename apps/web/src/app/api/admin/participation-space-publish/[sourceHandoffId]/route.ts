import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  activateApprovedParticipationSpace,
  approveParticipationSpaceActivation,
  approveParticipationSpacePublication,
  publishApprovedParticipationSpace,
  rejectParticipationSpaceActivation,
  rejectParticipationSpacePublication,
  reviewParticipationSpaceQuestionGuard,
} from "@/features/create/participationSpaceRuntimeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExistingActionSchema = z
  .object({
    action: z.enum([
      "approveParticipationSpaceActivation",
      "rejectParticipationSpaceActivation",
      "activateApprovedParticipationSpace",
      "approveParticipationSpacePublication",
      "rejectParticipationSpacePublication",
      "publishApprovedParticipationSpace",
    ]),
  })
  .strict();

const ActorContextSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    name: z.string().trim().min(1).max(240),
    type: z.enum([
      "person",
      "company",
      "party",
      "organization",
      "public_body",
      "media",
      "other",
    ]),
    role: z.enum([
      "source",
      "initiator",
      "affected_party",
      "competent_authority",
      "position_holder",
      "documented_case",
      "procedure_subject",
      "context",
      "target",
    ]),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).min(1),
  })
  .strict();

const ReviewActionSchema = z
  .object({
    action: z.literal("reviewParticipationSpaceQuestionGuard"),
    actorExtractionSource: z.enum([
      "entity_registry",
      "actor_graph",
      "human_review",
    ]),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).min(1),
    actorContexts: z.array(ActorContextSchema).max(50).optional(),
    noNamedActorsConfirmed: z.boolean().optional(),
  })
  .strict();

const BodySchema = z.discriminatedUnion("action", [
  ExistingActionSchema,
  ReviewActionSchema,
]);

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      sourceHandoffId: string;
    }>;
  },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const actorUserId = gate?._id?.toHexString?.() ?? "";
  if (!actorUserId) {
    return NextResponse.json(
      { ok: false, error: "admin_user_id_missing" },
      { status: 400 },
    );
  }

  try {
    const { sourceHandoffId } = await context.params;
    const body = BodySchema.parse(await req.json());

    const result =
      body.action === "reviewParticipationSpaceQuestionGuard"
        ? await reviewParticipationSpaceQuestionGuard({
            sourceHandoffId,
            actorUserId,
            actorExtractionSource: body.actorExtractionSource,
            evidenceRefs: body.evidenceRefs,
            actorContexts: body.actorContexts,
            noNamedActorsConfirmed: body.noNamedActorsConfirmed,
          })
        : body.action === "approveParticipationSpaceActivation"
          ? await approveParticipationSpaceActivation({
              sourceHandoffId,
              actorUserId,
            })
          : body.action === "rejectParticipationSpaceActivation"
          ? await rejectParticipationSpaceActivation({
              sourceHandoffId,
              actorUserId,
            })
          : body.action === "activateApprovedParticipationSpace"
            ? await activateApprovedParticipationSpace({
                sourceHandoffId,
                actorUserId,
              })
            : body.action === "approveParticipationSpacePublication"
              ? await approveParticipationSpacePublication({
                  sourceHandoffId,
                  actorUserId,
                })
              : body.action === "rejectParticipationSpacePublication"
                ? await rejectParticipationSpacePublication({
                    sourceHandoffId,
                    actorUserId,
                  })
                : await publishApprovedParticipationSpace({
                    sourceHandoffId,
                    actorUserId,
                  });

    return NextResponse.json({ ok: true, record: result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "participation_space_publish_action_failed";
    const status =
      message === "participation_space_publish_state_conflict"
        ? 409
        : message === "participation_space_publish_record_not_found"
        ? 404
        : message === "participation_space_missing"
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
