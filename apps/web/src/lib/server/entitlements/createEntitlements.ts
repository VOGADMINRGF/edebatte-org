import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCol, ObjectId } from "@core/db/triMongo";
import { getAccountOverview, getCreateAccountContext } from "@features/account/service";
import type { CreateAccountContext } from "@features/account/types";
import {
  getAccessTierConfigForUser,
  getUserAccessTier,
  type AccessTier,
} from "@core/access/accessTiers";

export type CreateIntent = "statement" | "contribution";

export type CreateEntitlements = {
  userId: string | null;
  isAuthenticated: boolean;
  tier: string;
  edebattePackage: string;
  roles: string[];
  maxVisibleAiProposals: number;
  maxFinalizeClaimsPerInput: number;
  monthlyContributionLimit: number | null;
  canSubmitStatement: boolean;
  canSubmitContribution: boolean;
  canUseAttachments: boolean;
  canUseExternalExtraction: boolean;
  canDeepResearch: boolean;
  swipesPerCredit: number;
  contributionCredits: number;
  nextCreditIn: number | null;
  creditRequiredForContribution: boolean;
  reasons: Record<string, string>;
  serverTimeIso: string;
};

type DraftDoc = {
  _id: ObjectId;
  authorId: string;
  status?: "draft" | "finalized";
  finalizedAt?: Date;
};

const MAX_VISIBLE_BY_TIER: Partial<Record<AccessTier, number>> = {
  public: 3,
  citizenBasic: 3,
  citizenPremium: 8,
  citizenPro: 12,
  citizenUltra: 20,
  institutionBasic: 6,
  institutionPremium: 12,
  staff: 30,
};

const MAX_FINALIZE_BY_TIER: Partial<Record<AccessTier, number>> = {
  public: 1,
  citizenBasic: 3,
  citizenPremium: 3,
  citizenPro: 5,
  citizenUltra: 8,
  institutionBasic: 3,
  institutionPremium: 5,
  staff: 12,
};

function normalizeRoleList(roles?: string[] | null) {
  if (!Array.isArray(roles)) return [];
  return roles.map((r) => String(r).toLowerCase());
}

function isPrivilegedRole(roles: string[]) {
  return roles.some((r) => ["admin", "superadmin", "staff"].includes(r));
}

async function resolveUserId(req?: NextRequest): Promise<string | null> {
  if (req) {
    const value = req.cookies.get("u_id")?.value;
    return value && ObjectId.isValid(value) ? value : null;
  }
  try {
    const jar = await cookies();
    const value = jar.get("u_id")?.value;
    return value && ObjectId.isValid(value) ? value : null;
  } catch {
    return null;
  }
}

async function countMonthlyContributions(userId: string) {
  const Drafts = await getCol<DraftDoc>("contribution_drafts");
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  return Drafts.countDocuments({
    authorId: userId,
    status: "finalized",
    finalizedAt: { $gte: from },
  });
}

async function buildCreateEntitlements(
  userId: string | null,
  overview: CreateAccountContext | null,
): Promise<CreateEntitlements> {
  const roles = normalizeRoleList(overview?.roles);
  const isAuthenticated = Boolean(userId && overview);
  const tier = overview ? getUserAccessTier(overview) : ("public" as AccessTier);
  const tierConfig = overview
    ? getAccessTierConfigForUser(overview)
    : getAccessTierConfigForUser({ accessTier: tier });

  const maxVisibleAiProposals = MAX_VISIBLE_BY_TIER[tier] ?? 3;
  const maxFinalizeClaimsPerInput = MAX_FINALIZE_BY_TIER[tier] ?? 3;

  const monthlyContributionLimit = tierConfig.monthlyContributionLimit;
  const contributionCredits = overview?.stats?.contributionCredits ?? 0;
  const nextCreditIn = overview?.stats?.nextCreditIn ?? null;
  const swipesPerCredit = tierConfig.swipeToCreditRatio ?? 100;
  const creditRequiredForContribution = tier === "citizenBasic" || tier === "public";
  const privileged = isPrivilegedRole(roles);

  const reasons: Record<string, string> = {};

  let monthlyCount = 0;
  if (isAuthenticated && userId && monthlyContributionLimit !== null) {
    monthlyCount = await countMonthlyContributions(userId);
    if (monthlyCount >= monthlyContributionLimit) {
      reasons.monthly_limit = "Monatslimit erreicht.";
    }
  }

  if (creditRequiredForContribution && contributionCredits < 1) {
    reasons.credits = "Keine Contribution-Credits verfügbar.";
  }

  const canSubmitStatement = isAuthenticated;
  const canSubmitContribution =
    isAuthenticated &&
    (monthlyContributionLimit === null || monthlyCount < monthlyContributionLimit) &&
    (!creditRequiredForContribution || contributionCredits > 0);

  const canUseAttachments = privileged || ["citizenPro", "citizenUltra", "institutionPremium"].includes(tier);
  const canUseExternalExtraction =
    privileged || ["citizenPro", "citizenUltra", "institutionPremium"].includes(tier);
  const canDeepResearch = privileged;

  return {
    userId,
    isAuthenticated,
    tier,
    edebattePackage: overview?.edebatte?.package ?? tierConfig.edebattePackage ?? "none",
    roles,
    maxVisibleAiProposals,
    maxFinalizeClaimsPerInput,
    monthlyContributionLimit,
    canSubmitStatement,
    canSubmitContribution,
    canUseAttachments,
    canUseExternalExtraction,
    canDeepResearch,
    swipesPerCredit,
    contributionCredits,
    nextCreditIn,
    creditRequiredForContribution,
    reasons,
    serverTimeIso: new Date().toISOString(),
  };
}

export async function getCreateEntitlementsForRequest(
  req?: NextRequest,
): Promise<CreateEntitlements> {
  const userId = await resolveUserId(req);
  const overview = userId ? await getAccountOverview(userId).catch(() => null) : null;
  return buildCreateEntitlements(userId, overview);
}

export async function getCreatePageBootstrapForRequest(req?: NextRequest): Promise<{
  entitlements: CreateEntitlements;
  accountContext: CreateAccountContext | null;
}> {
  const userId = await resolveUserId(req);
  const accountContext = userId
    ? await getCreateAccountContext(userId).catch(() => null)
    : null;
  const entitlements = await buildCreateEntitlements(userId, accountContext);
  return { entitlements, accountContext };
}
