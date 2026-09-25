import { describe, expect, it } from "vitest";
import { buildMarketingAgentPipeline } from "@/features/marketing/multibrand/marketingAgentPipelineContract";

describe("marketing agent pipeline", () => {
  it("keeps external publishing approval-gated for every brand", () => {
    for (const brand of ["edebatte", "voiceopengov", "vote4gov"] as const) {
      const pipeline = buildMarketingAgentPipeline(brand);
      expect(pipeline.externalPublishRequiresApproval).toBe(true);
      expect(pipeline.steps.every((step) => step.canPublishExternally === false)).toBe(true);
    }
  });

  it("adds Membership and Community only to the VoiceOpenGov content loop", () => {
    const vog = buildMarketingAgentPipeline("voiceopengov");
    expect(vog.steps.map((step) => step.role)).toContain("membership_agent");
    expect(vog.steps.map((step) => step.role)).toContain("community_agent");

    const edebatte = buildMarketingAgentPipeline("edebatte");
    expect(edebatte.steps.map((step) => step.role)).not.toContain("membership_agent");
  });

  it("adds governance comparison and system challenge to Vote4Gov", () => {
    const vote4gov = buildMarketingAgentPipeline("vote4gov");
    expect(vote4gov.steps.map((step) => step.role)).toContain("global_governance_agent");
    expect(vote4gov.steps.map((step) => step.role)).toContain("system_challenger");
  });

  it("always includes evidence, editorial, trust, neutrality, distribution and analytics", () => {
    for (const brand of ["edebatte", "voiceopengov", "vote4gov"] as const) {
      const roles = buildMarketingAgentPipeline(brand).steps.map((step) => step.role);
      expect(roles).toEqual(expect.arrayContaining([
        "research_agent",
        "evidence_agent",
        "editorial_agent",
        "brand_trust_agent",
        "neutrality_red_team",
        "distribution_agent",
        "analytics_agent",
        "growth_agent",
      ]));
    }
  });
});
