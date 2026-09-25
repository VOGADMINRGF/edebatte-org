import { z } from "zod";
import { MarketingPublicBrandSchema } from "./brandRoutingContract";

export const MarketingAgentRoleSchema = z.enum([
  "alpha_orchestrator",
  "research_agent",
  "evidence_agent",
  "editorial_agent",
  "voxy_agent",
  "brand_trust_agent",
  "neutrality_red_team",
  "distribution_agent",
  "analytics_agent",
  "growth_agent",
  "membership_agent",
  "community_agent",
  "global_governance_agent",
  "system_challenger",
]);

export const MarketingPipelineStageSchema = z.enum([
  "prioritize",
  "research",
  "evidence",
  "governance_compare",
  "system_challenge",
  "editorial",
  "membership_context",
  "community_context",
  "media_asset",
  "brand_trust",
  "neutrality_review",
  "approval",
  "distribution_prepare",
  "analytics",
  "growth_learning",
]);

export type MarketingAgentRole = z.infer<typeof MarketingAgentRoleSchema>;
export type MarketingPipelineStage = z.infer<typeof MarketingPipelineStageSchema>;

export const MarketingPipelineStepSchema = z
  .object({
    stage: MarketingPipelineStageSchema,
    role: MarketingAgentRoleSchema,
    autonomousDraftAllowed: z.boolean(),
    canPublishExternally: z.literal(false),
    requiresEvidenceInput: z.boolean(),
  })
  .strict();

export const MarketingAgentPipelineSchema = z
  .object({
    brand: MarketingPublicBrandSchema,
    steps: z.array(MarketingPipelineStepSchema).min(1),
    externalPublishRequiresApproval: z.literal(true),
    syntheticSupportForbidden: z.literal(true),
    sensitivePoliticalMicrotargetingForbidden: z.literal(true),
  })
  .strict();

const sharedStart = [
  step("prioritize", "alpha_orchestrator", true, false),
  step("research", "research_agent", true, false),
  step("evidence", "evidence_agent", true, true),
] as const;

const sharedFinish = [
  step("media_asset", "voxy_agent", true, true),
  step("brand_trust", "brand_trust_agent", true, true),
  step("neutrality_review", "neutrality_red_team", true, true),
  step("distribution_prepare", "distribution_agent", true, true),
  step("analytics", "analytics_agent", true, false),
  step("growth_learning", "growth_agent", true, false),
] as const;

function step(
  stage: MarketingPipelineStage,
  role: MarketingAgentRole,
  autonomousDraftAllowed: boolean,
  requiresEvidenceInput: boolean,
) {
  return {
    stage,
    role,
    autonomousDraftAllowed,
    canPublishExternally: false as const,
    requiresEvidenceInput,
  };
}

export function buildMarketingAgentPipeline(brand: z.infer<typeof MarketingPublicBrandSchema>) {
  const brandSpecific =
    brand === "voiceopengov"
      ? [
          step("editorial", "editorial_agent", true, true),
          step("membership_context", "membership_agent", true, true),
          step("community_context", "community_agent", true, true),
        ]
      : brand === "vote4gov"
        ? [
            step("governance_compare", "global_governance_agent", true, true),
            step("system_challenge", "system_challenger", true, true),
            step("editorial", "editorial_agent", true, true),
          ]
        : [step("editorial", "editorial_agent", true, true)];

  return MarketingAgentPipelineSchema.parse({
    brand,
    steps: [...sharedStart, ...brandSpecific, ...sharedFinish],
    externalPublishRequiresApproval: true,
    syntheticSupportForbidden: true,
    sensitivePoliticalMicrotargetingForbidden: true,
  });
}
