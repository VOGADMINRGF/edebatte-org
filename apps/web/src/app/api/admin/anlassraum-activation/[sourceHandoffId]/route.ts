import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  activateApprovedAnlassraum,
  approveAnlassraumActivation,
  approveAnlassraumPublication,
  publishApprovedAnlassraum,
  rejectAnlassraumActivation,
  rejectAnlassraumPublication,
  reviewAnlassraumQuestionGuard,
} from "@/features/create/anlassraumActivationWorkflowServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExistingActionSchema = z
  .object({
    action: z.enum([
      "approveAnlassraumActivation",
      "rejectAnlassraumActivation",
      "activateApprovedAnlassraum",
      "approveAnlassraumPublication",
      "rejectAnlassraumPublication",
      "publishApprovedAnlassraum",
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
    action: z.literal("reviewAnlassraumQuestionGuard"),
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
      body.action === "reviewAnlassraumQuestionGuard"
        ? await reviewAnlassraumQuestionGuard({
            sourceHandoffId,
            actorUserId,
            actorExtractionSource: body.actorExtractionSource,
            evidenceRefs: body.evidenceRefs,
            actorContexts: body.actorContexts,
            noNamedActorsConfirmed: body.noNamedActorsConfirmed,
          })
        : body.action === "approveAnlassraumActivation"
          ? await approveAnlassraumActivation({
              sourceHandoffId,
              actorUserId,
            })
          : body.action === "rejectAnlassraumActivation"
          ? await rejectAnlassraumActivation({
              sourceHandoffId,
              actorUserId,
            })
          : body.action === "activateApprovedAnlassraum"
            ? await activateApprovedAnlassraum({
                sourceHandoffId,
                actorUserId,
              })
            : body.action === "approveAnlassraumPublication"
              ? await approveAnlassraumPublication({
                  sourceHandoffId,
                  actorUserId,
                })
              : body.action === "rejectAnlassraumPublication"
                ? await rejectAnlassraumPublication({
                    sourceHandoffId,
                    actorUserId,
                  })
                : await publishApprovedAnlassraum({
                    sourceHandoffId,
                    actorUserId,
                  });

    return NextResponse.json({ ok: true, record: result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "anlassraum_activation_action_failed";
    const status =
      message === "anlassraum_activation_state_conflict" ||
      message === "anlassraum_visibility_state_conflict"
        ? 409
        : message === "anlassraum_activation_record_not_found"
        ? 404
        : message === "anlassraum_missing"
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
