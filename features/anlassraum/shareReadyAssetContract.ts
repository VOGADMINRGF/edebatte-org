import { z } from "zod";

export const SHARE_READY_TARGET_KINDS = [
  "anlass_public_target",
  "round_operating_target",
  "round_results_target",
  "dossier_public_target",
  "companion_public_target",
] as const;

export type ShareReadyTargetKind = (typeof SHARE_READY_TARGET_KINDS)[number];

export const SHARE_SOCIAL_QUALIFICATIONS = [
  "none",
  "qualified_context",
  "review_ready_candidate",
] as const;

export type ShareSocialQualification = (typeof SHARE_SOCIAL_QUALIFICATIONS)[number];

const ShareReadyAssetSchema = z
  .object({
    targetKinds: z.array(z.enum(SHARE_READY_TARGET_KINDS)).min(1),
    primaryTargetKind: z.enum(SHARE_READY_TARGET_KINDS),
    canonicalPublicTarget: z.string().trim().min(1).max(600),
    qrTarget: z.string().trim().min(1).max(600),
    targets: z
      .object({
        anlassPublicTarget: z.string().trim().min(1).max(600).nullable(),
        roundOperatingTarget: z.string().trim().min(1).max(600).nullable(),
        roundResultsTarget: z.string().trim().min(1).max(600).nullable(),
        dossierPublicTarget: z.string().trim().min(1).max(600).nullable(),
        companionPublicTarget: z.string().trim().min(1).max(600).nullable(),
      })
      .strict(),
    shareMeta: z
      .object({
        shareTitle: z.string().trim().min(1).max(120),
        sharePrompt: z.string().trim().min(1).max(220),
        shareSummary: z.string().trim().min(1).max(280),
      })
      .strict(),
    socialPublication: z
      .object({
        shareReady: z.literal(true),
        socialCandidate: z.boolean(),
        autoPostEligible: z.literal(false),
        needsReviewBeforeOfficialSocial: z.literal(true),
        qualification: z.enum(SHARE_SOCIAL_QUALIFICATIONS),
      })
      .strict(),
    qualityHints: z
      .object({
        factcheckOptional: z.literal(true),
        factcheckSuggested: z.boolean(),
        existingContextHint: z.string().trim().min(1).max(280).nullable(),
        allowsNonBlockingContextSuggestion: z.literal(true),
      })
      .strict(),
    guardrails: z
      .object({
        forbidsTruthPrivilege: z.literal(true),
        forbidsPriorityPrivilege: z.literal(true),
        forbidsVotingPrivilege: z.literal(true),
        forbidsFactStatusPrivilege: z.literal(true),
        forbidsAutoOfficialPosting: z.literal(true),
        keepsOfficialSocialCuratedOrQualified: z.literal(true),
        keepsTargetContextSeparatedFromTruth: z.literal(true),
        keepsCreateAndRundenSeparated: z.literal(true),
      })
      .strict(),
    forbiddenInferences: z.tuple([
      z.literal("share_ready_is_not_truth"),
      z.literal("social_candidate_is_not_priority"),
      z.literal("qr_target_is_not_vote_weight"),
      z.literal("official_social_requires_review"),
      z.literal("context_hint_is_not_auto_merge"),
    ]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.targetKinds.includes(value.primaryTargetKind)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetKinds"],
        message: "primary_target_kind_must_be_listed_in_target_kinds",
      });
    }

    if (value.socialPublication.socialCandidate && value.socialPublication.qualification === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["socialPublication", "qualification"],
        message: "social_candidate_requires_qualified_or_review_ready_status",
      });
    }
  });

export type ShareReadyAssetContract = z.infer<typeof ShareReadyAssetSchema>;
export type ShareReadyAssetParseResult =
  | { ok: true; value: ShareReadyAssetContract }
  | { ok: false; error: string; issues: string[] };

export type ShareReadyAssetConsistency = {
  ok: boolean;
  issues: string[];
};

type ResolveShareReadyAssetContractInput = {
  anlassraumId?: string | null;
  publishTarget?: string | null;
  dossierId?: string | null;
  companionSlug?: string | null;
  title?: string | null;
  summary?: string | null;
  lifecycleStatus?: string | null;
  outputStatus?: string | null;
  isPublic?: boolean | null;
  factcheckSuggested?: boolean;
  existingContextHint?: string | null;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function appendRoomIdToTarget(target: string, anlassraumId: string): string | null {
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  try {
    const base = "https://edebatte.local";
    const parsed = new URL(target, base);
    if (parsed.origin !== base) return null;
    parsed.searchParams.set("anlassraumId", anlassraumId);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function normalizeHint(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, 280) : null;
}

function buildTargets(input: {
  anlassraumId: string | null;
  publishTarget: string | null;
  dossierId: string | null;
  companionSlug: string | null;
  isPublic: boolean;
  closedLifecycle: boolean;
}): {
  anlassPublicTarget: string | null;
  roundOperatingTarget: string | null;
  roundResultsTarget: string | null;
  dossierPublicTarget: string | null;
  companionPublicTarget: string | null;
} {
  const anlassPublicTarget = input.anlassraumId
    ? `/anlassraum?anlassraumId=${encodeURIComponent(input.anlassraumId)}`
    : null;

  const roundOperatingTarget =
    input.isPublic && input.anlassraumId && input.publishTarget
      ? appendRoomIdToTarget(input.publishTarget, input.anlassraumId) ?? anlassPublicTarget
      : anlassPublicTarget;

  const roundResultsTarget =
    input.closedLifecycle && input.isPublic && input.anlassraumId && input.publishTarget
      ? appendRoomIdToTarget(input.publishTarget, input.anlassraumId)
      : null;

  const dossierPublicTarget = input.dossierId
    ? `/dossier/${encodeURIComponent(input.dossierId)}`
    : null;

  const companionPublicTarget = input.companionSlug
    ? `/companion/${encodeURIComponent(input.companionSlug)}`
    : null;

  return {
    anlassPublicTarget,
    roundOperatingTarget,
    roundResultsTarget,
    dossierPublicTarget,
    companionPublicTarget,
  };
}

function resolvePrimaryTargetKind(targets: {
  anlassPublicTarget: string | null;
  roundOperatingTarget: string | null;
  roundResultsTarget: string | null;
  dossierPublicTarget: string | null;
  companionPublicTarget: string | null;
}): ShareReadyTargetKind {
  if (targets.roundResultsTarget) return "round_results_target";
  if (targets.companionPublicTarget) return "companion_public_target";
  if (targets.dossierPublicTarget) return "dossier_public_target";
  if (targets.roundOperatingTarget) return "round_operating_target";
  return "anlass_public_target";
}

function resolveCanonicalTarget(params: {
  primaryTargetKind: ShareReadyTargetKind;
  targets: {
    anlassPublicTarget: string | null;
    roundOperatingTarget: string | null;
    roundResultsTarget: string | null;
    dossierPublicTarget: string | null;
    companionPublicTarget: string | null;
  };
}): string {
  switch (params.primaryTargetKind) {
    case "round_results_target":
      return params.targets.roundResultsTarget ?? params.targets.roundOperatingTarget ?? params.targets.anlassPublicTarget ?? "/runden";
    case "companion_public_target":
      return params.targets.companionPublicTarget ?? params.targets.anlassPublicTarget ?? "/runden";
    case "dossier_public_target":
      return params.targets.dossierPublicTarget ?? params.targets.anlassPublicTarget ?? "/runden";
    case "round_operating_target":
      return params.targets.roundOperatingTarget ?? params.targets.anlassPublicTarget ?? "/runden";
    case "anlass_public_target":
      return params.targets.anlassPublicTarget ?? "/runden";
  }
}

function resolveQrTarget(params: {
  primaryTargetKind: ShareReadyTargetKind;
  canonicalPublicTarget: string;
  roundOperatingTarget: string | null;
}): string {
  if (params.primaryTargetKind === "round_results_target" && params.roundOperatingTarget) {
    return params.roundOperatingTarget;
  }
  return params.canonicalPublicTarget;
}

function resolveSharePrompt(primaryTargetKind: ShareReadyTargetKind): string {
  if (primaryTargetKind === "round_results_target") {
    return "Ergebnisstand ansehen und zur Fortsetzung einordnen.";
  }
  if (primaryTargetKind === "companion_public_target") {
    return "Begleitformat ansehen und offene Anschlussfragen verfolgen.";
  }
  if (primaryTargetKind === "dossier_public_target") {
    return "Dossierkontext ansehen und offene Fragen weiterfuehren.";
  }
  if (primaryTargetKind === "round_operating_target") {
    return "Laufenden Anlass verfolgen und im Kontext weiterarbeiten.";
  }
  return "Anlass ansehen und den offenen Kontext nachvollziehen.";
}

function resolveSocialQualification(input: {
  socialCandidate: boolean;
  primaryTargetKind: ShareReadyTargetKind;
}): ShareSocialQualification {
  if (!input.socialCandidate) return "none";
  if (input.primaryTargetKind === "round_results_target" || input.primaryTargetKind === "dossier_public_target") {
    return "review_ready_candidate";
  }
  return "qualified_context";
}

export function resolveShareReadyAssetContract(
  input: ResolveShareReadyAssetContractInput,
): ShareReadyAssetContract {
  const anlassraumId = normalizeText(input.anlassraumId) || null;
  const publishTargetRaw = normalizeText(input.publishTarget);
  const publishTarget = publishTargetRaw.startsWith("/") ? publishTargetRaw : null;
  const dossierId = normalizeText(input.dossierId) || null;
  const companionSlug = normalizeText(input.companionSlug) || null;
  const lifecycleStatus = normalizeText(input.lifecycleStatus);
  const outputStatus = normalizeText(input.outputStatus);
  const isPublic = input.isPublic !== false;
  const closedLifecycle =
    lifecycleStatus === "closed_context" ||
    lifecycleStatus === "archived" ||
    outputStatus === "published" ||
    outputStatus === "discarded";

  const targets = buildTargets({
    anlassraumId,
    publishTarget,
    dossierId,
    companionSlug,
    isPublic,
    closedLifecycle,
  });

  const primaryTargetKind = resolvePrimaryTargetKind(targets);
  const canonicalPublicTarget = resolveCanonicalTarget({
    primaryTargetKind,
    targets,
  });
  const qrTarget = resolveQrTarget({
    primaryTargetKind,
    canonicalPublicTarget,
    roundOperatingTarget: targets.roundOperatingTarget,
  });

  const shareTitleBase = normalizeText(input.title) || "Neuer Anlass";
  const shareSummaryBase =
    normalizeText(input.summary) || "Offener Kontext mit nachvollziehbarer Weiterarbeit.";

  const socialCandidate =
    isPublic &&
    primaryTargetKind !== "round_operating_target" &&
    primaryTargetKind !== "anlass_public_target";

  const targetKinds: ShareReadyTargetKind[] = [];
  if (targets.anlassPublicTarget) targetKinds.push("anlass_public_target");
  if (targets.roundOperatingTarget) targetKinds.push("round_operating_target");
  if (targets.roundResultsTarget) targetKinds.push("round_results_target");
  if (targets.dossierPublicTarget) targetKinds.push("dossier_public_target");
  if (targets.companionPublicTarget) targetKinds.push("companion_public_target");
  if (!targetKinds.includes(primaryTargetKind)) {
    targetKinds.push(primaryTargetKind);
  }

  return ShareReadyAssetSchema.parse({
    targetKinds,
    primaryTargetKind,
    canonicalPublicTarget,
    qrTarget,
    targets,
    shareMeta: {
      shareTitle: shareTitleBase.slice(0, 120),
      sharePrompt: resolveSharePrompt(primaryTargetKind),
      shareSummary: shareSummaryBase.slice(0, 280),
    },
    socialPublication: {
      shareReady: true,
      socialCandidate,
      autoPostEligible: false,
      needsReviewBeforeOfficialSocial: true,
      qualification: resolveSocialQualification({
        socialCandidate,
        primaryTargetKind,
      }),
    },
    qualityHints: {
      factcheckOptional: true,
      factcheckSuggested:
        input.factcheckSuggested === true ||
        primaryTargetKind === "round_results_target" ||
        primaryTargetKind === "dossier_public_target",
      existingContextHint: normalizeHint(input.existingContextHint),
      allowsNonBlockingContextSuggestion: true,
    },
    guardrails: {
      forbidsTruthPrivilege: true,
      forbidsPriorityPrivilege: true,
      forbidsVotingPrivilege: true,
      forbidsFactStatusPrivilege: true,
      forbidsAutoOfficialPosting: true,
      keepsOfficialSocialCuratedOrQualified: true,
      keepsTargetContextSeparatedFromTruth: true,
      keepsCreateAndRundenSeparated: true,
    },
    forbiddenInferences: [
      "share_ready_is_not_truth",
      "social_candidate_is_not_priority",
      "qr_target_is_not_vote_weight",
      "official_social_requires_review",
      "context_hint_is_not_auto_merge",
    ],
  });
}

export function parseShareReadyAssetContract(input: unknown): ShareReadyAssetParseResult {
  const parsed = ShareReadyAssetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_share_ready_asset_contract",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "root"}:${issue.message}`,
      ),
    };
  }
  return { ok: true, value: parsed.data };
}

export function validateShareReadyAssetConsistency(input: {
  contract: ShareReadyAssetContract;
}): ShareReadyAssetConsistency {
  const issues: string[] = [];
  const { contract } = input;

  if (contract.socialPublication.autoPostEligible) {
    issues.push("auto_post_eligible_must_stay_false_in_start_canon");
  }
  if (!contract.socialPublication.needsReviewBeforeOfficialSocial) {
    issues.push("official_social_requires_review_flag");
  }
  if (
    contract.socialPublication.socialCandidate &&
    contract.socialPublication.qualification === "none"
  ) {
    issues.push("social_candidate_must_not_be_unqualified");
  }
  if (contract.qrTarget.length === 0 || contract.canonicalPublicTarget.length === 0) {
    issues.push("canonical_and_qr_targets_must_be_non_empty");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
