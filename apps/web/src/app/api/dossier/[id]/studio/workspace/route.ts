import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGovernanceActorOrResponse } from "@/lib/server/auth/governance";
import {
  summarizeRequestScopeContext,
  type RequestScopeSummary,
} from "@/lib/server/auth/requestScope";
import { hasVerifiedMembershipWriteAccess } from "@/lib/server/auth/membershipDirectoryRepository";
import { findDossierByAnyId } from "@features/dossier/lookup";
import {
  type DossierStudioWorkspaceSource,
  getDossierStudioWorkspaceRepo,
} from "@features/dossier/server/studioPersistence";
import {
  MasterPostSchema,
  SOCIAL_DISTRIBUTION_CHANNELS,
  SocialDistributionPlanSchema,
  SocialCarouselOutputSchema,
  SocialDistributionDraftSchema,
} from "@features/outputEngine";
import { getSocialDistributionRepo } from "@features/outputEngine/socialDistributionRuntime";
import {
  buildOrganizationDashboardReadModel,
  canEditOrganizationResource,
  canApprovePublication,
  canCreateDossierDraft,
  canReadRegionDashboard,
  canViewRegionResource,
  findRegionSignalDraftRecordByDraftId,
  getOperationalRegionById,
  organizationEntitlementAllowsScope,
  regionScopeFromRegionAccessContext,
  type RegionAccessContext,
} from "@features/region";
import { isExplicitDemoDossierId } from "@/features/runtimeDataGuardrails";
import { createOrGetVoxyStudioDraftFromApprovedDossierWorkspace } from "@/features/voxyVideo/studioDossierAutoIntake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WorkspaceWriteStatusSchema = z.enum(["draft", "needs_review"]);

const WorkspaceMutationSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    masterPostDraft: MasterPostSchema.optional(),
    distributionDraft: SocialDistributionDraftSchema.optional(),
    carouselDraft: SocialCarouselOutputSchema.optional(),
    audienceNotes: z.string().trim().min(1).nullable().optional(),
    reviewNotes: z.string().trim().min(1).nullable().optional(),
    status: WorkspaceWriteStatusSchema.optional(),
  })
  .strict();

const WorkspaceOfficialApprovalSchema = z
  .object({
    action: z.enum(["approve_publication", "revoke_publication"]),
    note: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

const SocialDistributionCreateSchema = z
  .object({
    socialDistributionAction: z.literal("create_draft"),
    plan: SocialDistributionPlanSchema,
    selectedChannels: z.array(z.enum([
      "website_update",
      "newsletter_draft",
      "embed_snippet",
      "qr_asset",
      "linkedin_draft",
      "x_draft",
      "mastodon_draft",
      "instagram_asset",
      "press_note",
    ])).min(1),
    initialStatus: z
      .enum([
        "draft_created",
        "asset_generated",
        "needs_review",
        "review_requested",
        "queued",
        "scheduled_ready",
      ])
      .optional(),
    note: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

const SocialDistributionStatusSchema = z
  .object({
    socialDistributionAction: z.enum([
      "request_review",
      "approve",
      "queue",
      "schedule_ready",
      "mark_exported",
      "mark_copied",
      "block",
      "fail",
      "archive",
    ]),
    postId: z.string().trim().min(1),
    note: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

const SocialDistributionSchedulerSchema = z
  .object({
    socialSchedulerAction: z.enum([
      "schedule_channel",
      "mark_posting",
      "mark_posted",
      "mark_failed",
      "cancel_channel",
    ]),
    postId: z.string().trim().min(1),
    channel: z.enum(SOCIAL_DISTRIBUTION_CHANNELS),
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    note: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

type RouteParams = { params: Promise<{ id: string }> };

type ResolvedStudioAccess = {
  dossierId: string;
  workspace: Awaited<
    ReturnType<ReturnType<typeof getDossierStudioWorkspaceRepo>["getDossierStudioWorkspace"]>
  >;
  regionId: string | null;
  organizationId: string | null;
  unitId: string | null;
  source: DossierStudioWorkspaceSource;
  title: string;
  provenance: {
    sourceSignalId?: string;
    sourceRegionId?: string;
    sourceDraftId?: string;
    notProductionData?: boolean;
    fixture?: boolean;
  };
  accessContext: RegionAccessContext | null;
  requestScopeSummary: RequestScopeSummary | null;
  roles: string[];
  isAdmin: boolean;
};

async function buildAccessContextFromRuntime(input: {
  gate: Awaited<ReturnType<typeof requireGovernanceActorOrResponse>>;
  regionId: string | null;
}) {
  if (input.gate instanceof Response) return null;
  if (!input.regionId && !input.gate.actor.isAdmin) return null;
  return input.gate.requestScope.regionAccess;
}

async function resolveStudioAccess(
  req: NextRequest,
  params: RouteParams,
): Promise<ResolvedStudioAccess | Response> {
  const { id } = await params.params;
  const repo = getDossierStudioWorkspaceRepo();
  const workspace = await repo.getDossierStudioWorkspace(id);
  const draftRecord = await findRegionSignalDraftRecordByDraftId(id);
  const dossier = await findDossierByAnyId(id).catch(() => null);

  const inferredRegionId = workspace?.regionId ?? draftRecord?.regionId ?? null;
  const region = inferredRegionId ? await getOperationalRegionById(inferredRegionId) : null;
  const regionId = region?.id ?? inferredRegionId ?? null;
  const gateWithRegion = await requireGovernanceActorOrResponse(req, { regionId });
  if (gateWithRegion instanceof Response) return gateWithRegion;
  const accessContext = await buildAccessContextFromRuntime({
    gate: gateWithRegion,
    regionId,
  });

  const source =
    workspace?.source ??
    (isExplicitDemoDossierId(id)
      ? "imported_demo"
      : draftRecord?.provenance.sourceSignalId?.startsWith("region-participation-")
        ? "public_participation_signal"
        : draftRecord
          ? "region_signal_draft"
          : "manual_admin");

  return {
    dossierId: id,
    workspace,
    regionId,
    organizationId:
      workspace?.organizationId ??
      accessContext?.organization.primaryOrganizationId ??
      null,
    unitId: workspace?.unitId ?? null,
    source,
    title:
      workspace?.title ??
      dossier?.title ??
      draftRecord?.title ??
      `Studio-Arbeitsstand ${id}`,
    provenance: {
      sourceSignalId: draftRecord?.provenance.sourceSignalId,
      sourceRegionId: draftRecord?.provenance.sourceRegionId,
      sourceDraftId: draftRecord?.draftId,
      notProductionData: draftRecord?.provenance.notProductionData,
      fixture: draftRecord?.provenance.pilotFixture,
    },
    accessContext,
    requestScopeSummary: summarizeRequestScopeContext(gateWithRegion.requestScope),
    roles: [...gateWithRegion.roles],
    isAdmin: gateWithRegion.actor.isAdmin,
  };
}

function readDeniedResponse() {
  return NextResponse.json(
    { ok: false, error: "studio_workspace_read_forbidden" },
    { status: 403 },
  );
}

function writeDeniedResponse() {
  return NextResponse.json(
    { ok: false, error: "studio_workspace_write_forbidden" },
    { status: 403 },
  );
}

function canReadWorkspace(access: ResolvedStudioAccess) {
  if (!access.regionId || !access.accessContext) return false;
  const scope = regionScopeFromRegionAccessContext({ accessContext: access.accessContext });
  if (!canViewRegionResource(scope, { regionId: access.regionId, organizationId: access.organizationId })) {
    return false;
  }
  return canReadRegionDashboard(access.accessContext, access.regionId);
}

function canWriteWorkspace(access: ResolvedStudioAccess) {
  if (!access.regionId || !access.accessContext) return false;
  const scope = regionScopeFromRegionAccessContext({ accessContext: access.accessContext });
  if (
    !canViewRegionResource(scope, { regionId: access.regionId, organizationId: access.organizationId }) ||
    !canEditOrganizationResource(scope, { organizationId: access.organizationId })
  ) {
    return false;
  }
  return canCreateDossierDraft(access.accessContext, access.regionId);
}

function canApproveWorkspacePublication(access: ResolvedStudioAccess) {
  if (!access.regionId || !access.accessContext) return false;
  const scope = regionScopeFromRegionAccessContext({ accessContext: access.accessContext });
  if (
    !canViewRegionResource(scope, { regionId: access.regionId, organizationId: access.organizationId }) ||
    !canEditOrganizationResource(scope, { organizationId: access.organizationId })
  ) {
    return false;
  }
  return canApprovePublication(access.accessContext, access.regionId);
}

function workspaceResponseBody(
  workspace: NonNullable<ResolvedStudioAccess["workspace"]> | null,
  access: ResolvedStudioAccess,
) {
  return {
    ok: true,
    workspace,
    access: {
      adminFallback: access.accessContext?.adminFallback ?? false,
      operatorModeLabel: access.accessContext?.adminFallback ? "Betreiber-Modus" : null,
      authoritySource: access.accessContext?.authoritySource ?? "unverified_hint_only",
      verificationStatus: access.accessContext?.verificationStatus ?? "none",
      canRead: canReadWorkspace(access),
      canEdit: canWriteWorkspace(access),
      canApproveOfficialPublication: canApproveWorkspacePublication(access),
    },
  };
}

function socialDistributionStatusFromAction(
  action: z.infer<typeof SocialDistributionStatusSchema>["socialDistributionAction"],
) {
  switch (action) {
    case "request_review":
      return "review_requested" as const;
    case "approve":
      return "approved" as const;
    case "queue":
      return "queued" as const;
    case "schedule_ready":
      return "scheduled_ready" as const;
    case "mark_exported":
      return "exported" as const;
    case "mark_copied":
      return "copied" as const;
    case "block":
      return "blocked" as const;
    case "fail":
      return "error" as const;
    case "archive":
    default:
      return "archived" as const;
  }
}

function schedulerStatusFromAction(
  action: z.infer<typeof SocialDistributionSchedulerSchema>["socialSchedulerAction"],
) {
  switch (action) {
    case "schedule_channel":
      return "scheduled" as const;
    case "mark_posting":
      return "posting" as const;
    case "mark_posted":
      return "posted" as const;
    case "mark_failed":
      return "failed" as const;
    case "cancel_channel":
    default:
      return "cancelled" as const;
  }
}

function channelTextMapFromPlan(plan: z.infer<typeof SocialDistributionPlanSchema>) {
  const versions = new Map(plan.channelVersions.map((entry) => [entry.channel, entry]));
  return Object.fromEntries(
    plan.targets.map((target) => {
      const version = versions.get(target.channel);
      return [
        target.channel,
        [version?.excerpt, version?.detail, target.postText]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .trim(),
      ];
    }),
  );
}

async function resolveSocialDistributionDashboard(access: ResolvedStudioAccess) {
  const userId = access.accessContext?.userId ?? "";
  if (!userId) return null;
  return buildOrganizationDashboardReadModel({
    userId,
    roles: access.roles,
    isAdmin: access.isAdmin,
    actorRole: null,
  });
}

async function assertSocialDistributionAccess(params: {
  access: ResolvedStudioAccess;
  visibilityState: z.infer<typeof SocialDistributionPlanSchema>["visibilityState"];
}) {
  const { access, visibilityState } = params;
  const requestScope = access.requestScopeSummary;

  if (!canWriteWorkspace(access)) {
    return {
      ok: false as const,
      status: 403,
      error: "social_distribution_write_forbidden",
      message: "Schreibrechte fehlen für diesen Organisationspfad.",
    };
  }

  if (!access.organizationId && !requestScope?.organizationId) {
    return {
      ok: false as const,
      status: 403,
      error: "social_distribution_org_scope_required",
      message:
        "Produktive Distribution bleibt organisationsgebunden. Ohne bestätigten Org-Scope entsteht kein aktiver Verteilentwurf.",
    };
  }

  if (visibilityState === "internal_review") {
    return {
      ok: false as const,
      status: 409,
      error: "social_distribution_review_only_source",
      message:
        "Review-only- oder interne Inhalte erzeugen keinen produktiven Social-Entwurf. Bitte zuerst Sichtbarkeit und Freigabe klären.",
    };
  }

  if (
    !requestScope ||
    !hasVerifiedMembershipWriteAccess({
      membershipStatus: requestScope.membershipStatus,
      organizationRole: requestScope.organizationRole,
      isOperatorMode: requestScope.isOperatorMode,
      sourceOfTruth: requestScope.sourceOfTruth,
    })
  ) {
    return {
      ok: false as const,
      status: 403,
      error: "social_distribution_membership_required",
      message:
        "Für produktive Verteilentwürfe braucht es verifizierte Membership mit Schreibrechten im bestätigten Org-Scope.",
    };
  }

  const dashboard = await resolveSocialDistributionDashboard(access);
  if (!dashboard) {
    return {
      ok: false as const,
      status: 409,
      error: "social_distribution_contract_pending",
      message:
        "Vertrag, Billing-Status und Freischaltung sind noch nicht sauber aufgelöst. Produktive Distribution bleibt blockiert.",
    };
  }

  const contractStatus = dashboard.contractSummary.currentContractStatus;
  const billingStatus = dashboard.contractSummary.billingStatus;
  if (
    contractStatus === "none" ||
    contractStatus === "draft" ||
    contractStatus === "offered" ||
    contractStatus === "accepted" ||
    contractStatus === "limited" ||
    billingStatus === "none" ||
    billingStatus === "billing_pending" ||
    billingStatus === "grace_period"
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "social_distribution_contract_limited",
      message:
        "Verteilentwürfe bleiben bis zu aktiver Vertrags- und Billing-Lage im sicheren Review-/Pending-Status.",
    };
  }

  if (
    contractStatus === "suspended" ||
    contractStatus === "cancelled" ||
    contractStatus === "expired" ||
    billingStatus === "overdue" ||
    billingStatus === "suspended" ||
    billingStatus === "cancelled" ||
    billingStatus === "expired"
  ) {
    return {
      ok: false as const,
      status: 403,
      error: "social_distribution_contract_blocked",
      message:
        "Vertrag oder Billing-Status blockieren produktive Distribution. Der Entwurf bleibt nicht aktiv.",
    };
  }

  if (
    !organizationEntitlementAllowsScope(dashboard.entitlementSummary, "review_queue") ||
    !organizationEntitlementAllowsScope(dashboard.entitlementSummary, "content_release") ||
    !organizationEntitlementAllowsScope(dashboard.entitlementSummary, "public_share")
  ) {
    return {
      ok: false as const,
      status: 403,
      error: "social_distribution_entitlement_missing",
      message:
        "Freigegebene Distribution braucht Review-, Content-Release- und Public-Share-Scopes. Diese Freischaltung fehlt noch.",
    };
  }

  return { ok: true as const };
}

export async function GET(req: NextRequest, params: RouteParams) {
  const access = await resolveStudioAccess(req, params);
  if (access instanceof Response) return access;
  if (!canReadWorkspace(access) && !access.accessContext?.isAdmin) {
    return readDeniedResponse();
  }
  return NextResponse.json(workspaceResponseBody(access.workspace, access), {
    status: 200,
  });
}

export async function POST(req: NextRequest, params: RouteParams) {
  const access = await resolveStudioAccess(req, params);
  if (access instanceof Response) return access;
  if (!canWriteWorkspace(access)) return writeDeniedResponse();

  try {
    const body = WorkspaceMutationSchema.parse(await req.json().catch(() => ({})));
    const repo = getDossierStudioWorkspaceRepo();
    const workspace = await repo.createOrGetDossierStudioWorkspace({
      dossierId: access.dossierId,
      regionId: access.regionId,
      organizationId: access.organizationId,
      unitId: access.unitId,
      source: access.source,
      title: body.title ?? access.title,
      createdBy: access.accessContext?.userId ?? "unknown",
      updatedBy: access.accessContext?.userId ?? "unknown",
      provenance: access.provenance,
      seed: {
        masterPostDraft: body.masterPostDraft,
        distributionDraft: body.distributionDraft,
        carouselDraft: body.carouselDraft,
        audienceNotes: body.audienceNotes ?? undefined,
        reviewNotes: body.reviewNotes ?? undefined,
        status: body.status ?? "draft",
      },
    });
    return NextResponse.json(workspaceResponseBody(workspace, access), {
      status: 201,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "studio_workspace_create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, params: RouteParams) {
  const access = await resolveStudioAccess(req, params);
  if (access instanceof Response) return access;

  try {
    const rawBody = await req.json();
    const officialAction = WorkspaceOfficialApprovalSchema.safeParse(rawBody);
    if (officialAction.success) {
      if (!canApproveWorkspacePublication(access)) return writeDeniedResponse();
      const repo = getDossierStudioWorkspaceRepo();
      const workspace =
        officialAction.data.action === "approve_publication"
          ? await repo.approveDossierStudioWorkspaceOfficial({
              dossierId: access.dossierId,
              approvedBy: access.accessContext?.userId ?? "unknown",
              authority: access.accessContext?.isAdmin ? "admin_fallback" : "publication_approved",
              note: officialAction.data.note ?? null,
            })
          : await repo.revokeDossierStudioWorkspaceOfficial(
              access.dossierId,
              access.accessContext?.userId ?? "unknown",
              officialAction.data.note ?? null,
            );
      if (!workspace) {
        return NextResponse.json(
          { ok: false, error: "studio_workspace_official_publication_blocked" },
          { status: 400 },
        );
      }

      let voxyStudioIntake:
        | {
            status: "draft_created_or_existing";
            draftId: string;
            draftRevision: number;
            storyPlanRevision: number;
            briefingId: string;
            locale: string;
            autoRender: false;
            autoPublish: false;
          }
        | { status: "blocked"; error: string; autoRender: false; autoPublish: false }
        | null = null;
      if (officialAction.data.action === "approve_publication") {
        try {
          const intake = await createOrGetVoxyStudioDraftFromApprovedDossierWorkspace(workspace);
          voxyStudioIntake = {
            status: "draft_created_or_existing",
            draftId: intake.draft.draftId,
            draftRevision: intake.draft.revision,
            storyPlanRevision: intake.draft.storyPlan.revision,
            briefingId: intake.seed.briefingId,
            locale: intake.seed.locale,
            autoRender: false,
            autoPublish: false,
          };
        } catch (error) {
          voxyStudioIntake = {
            status: "blocked",
            error:
              error instanceof Error
                ? error.message.split(":", 1)[0] || "voxy_studio_dossier_auto_intake_failed"
                : "voxy_studio_dossier_auto_intake_failed",
            autoRender: false,
            autoPublish: false,
          };
        }
      }

      return NextResponse.json(
        { ...workspaceResponseBody(workspace, access), voxyStudioIntake },
        { status: 200 },
      );
    }

    const socialCreate = SocialDistributionCreateSchema.safeParse(rawBody);
    if (socialCreate.success) {
      const gate = await assertSocialDistributionAccess({
        access,
        visibilityState: socialCreate.data.plan.visibilityState,
      });
      if (!gate.ok) {
        return NextResponse.json(
          { ok: false, error: gate.error, message: gate.message },
          { status: gate.status },
        );
      }

      const repo = getSocialDistributionRepo();
      const post = await repo.createOrReplaceDraft({
        organizationId: access.organizationId ?? access.requestScopeSummary?.organizationId ?? "",
        regionId: access.regionId,
        dossierId: access.dossierId,
        sourceContextType: "dossier",
        sourceContextId: access.dossierId,
        sourceVisibilityState: socialCreate.data.plan.visibilityState,
        title: socialCreate.data.plan.suggestedPostText.slice(0, 120) || access.title,
        channels: socialCreate.data.selectedChannels,
        scheduleMode: socialCreate.data.plan.scheduleMode,
        channelTexts: channelTextMapFromPlan(socialCreate.data.plan),
        sourceSummary: [
          socialCreate.data.plan.regionalContext,
          socialCreate.data.plan.participationQuestion,
        ]
          .filter(Boolean)
          .join(" · "),
        backlinkHref: socialCreate.data.plan.backlinkTarget,
        embedHref: socialCreate.data.plan.backlinkTarget,
        qrHref: socialCreate.data.plan.backlinkTarget,
        reviewRequired: true,
        createdByUserId: access.accessContext?.userId ?? "unknown",
        initialStatus: socialCreate.data.initialStatus ?? "draft_created",
        note: socialCreate.data.note ?? null,
      });
      return NextResponse.json({ ok: true, post }, { status: 200 });
    }

    const socialStatus = SocialDistributionStatusSchema.safeParse(rawBody);
    if (socialStatus.success) {
      const repo = getSocialDistributionRepo();
      const existingPost = await repo.getPost(socialStatus.data.postId);
      if (!existingPost) {
        return NextResponse.json(
          { ok: false, error: "social_distribution_post_not_found" },
          { status: 404 },
        );
      }

      const gate = await assertSocialDistributionAccess({
        access,
        visibilityState: existingPost.sourceVisibilityState,
      });
      if (!gate.ok) {
        return NextResponse.json(
          { ok: false, error: gate.error, message: gate.message },
          { status: gate.status },
        );
      }

      const post = await repo.updateStatus({
        postId: socialStatus.data.postId,
        organizationId: access.organizationId ?? access.requestScopeSummary?.organizationId ?? "",
        nextStatus: socialDistributionStatusFromAction(socialStatus.data.socialDistributionAction),
        updatedByUserId: access.accessContext?.userId ?? "unknown",
        note: socialStatus.data.note ?? null,
      });
      return NextResponse.json({ ok: true, post }, { status: 200 });
    }

    const socialScheduler = SocialDistributionSchedulerSchema.safeParse(rawBody);
    if (socialScheduler.success) {
      const repo = getSocialDistributionRepo();
      const existingPost = await repo.getPost(socialScheduler.data.postId);
      if (!existingPost) {
        return NextResponse.json(
          { ok: false, error: "social_distribution_post_not_found" },
          { status: 404 },
        );
      }

      const gate = await assertSocialDistributionAccess({
        access,
        visibilityState: existingPost.sourceVisibilityState,
      });
      if (!gate.ok) {
        return NextResponse.json(
          { ok: false, error: gate.error, message: gate.message },
          { status: gate.status },
        );
      }

      const post = await repo.updateScheduler({
        postId: socialScheduler.data.postId,
        organizationId: access.organizationId ?? access.requestScopeSummary?.organizationId ?? "",
        channel: socialScheduler.data.channel,
        nextStatus: schedulerStatusFromAction(socialScheduler.data.socialSchedulerAction),
        updatedByUserId: access.accessContext?.userId ?? "unknown",
        scheduledAt: socialScheduler.data.scheduledAt ?? null,
        note: socialScheduler.data.note ?? null,
      });
      return NextResponse.json({ ok: true, post }, { status: 200 });
    }

    if (!canWriteWorkspace(access)) return writeDeniedResponse();
    const body = WorkspaceMutationSchema.parse(rawBody);
    const repo = getDossierStudioWorkspaceRepo();
    const existing =
      access.workspace ??
      (await repo.createOrGetDossierStudioWorkspace({
        dossierId: access.dossierId,
        regionId: access.regionId,
        organizationId: access.organizationId,
        unitId: access.unitId,
        source: access.source,
        title: body.title ?? access.title,
        createdBy: access.accessContext?.userId ?? "unknown",
        updatedBy: access.accessContext?.userId ?? "unknown",
        provenance: access.provenance,
      }));
    const workspace = await repo.updateDossierStudioWorkspace({
      dossierId: existing.dossierId,
      updatedBy: access.accessContext?.userId ?? "unknown",
      patch: body,
    });
    return NextResponse.json(workspaceResponseBody(workspace, access), {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "studio_workspace_update_failed";
    const status = message === "studio_workspace_locked" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}