import { z } from "zod";
import {
  ALPHA2_RISK_CLASSES,
  type Alpha2RiskClass,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

export const ALPHA2_ACTION_KINDS = [
  "read_only",
  "write_reversible",
  "write_irreversible",
  "publish_external",
  "notify_external",
  "merge_code",
  "deploy",
  "spend_money",
  "enter_contract",
  "change_rights_or_entitlements",
  "destructive_infrastructure",
  "public_political_claim",
  "sensitive_personal_data",
  "security_or_secret",
] as const;

export const ALPHA2_ACTION_GATE_DECISIONS = [
  "automatic",
  "review_required",
  "human_only",
] as const;

export const ALPHA2_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export type Alpha2ActionKind = (typeof ALPHA2_ACTION_KINDS)[number];
export type Alpha2ActionGateDecision = (typeof ALPHA2_ACTION_GATE_DECISIONS)[number];
export type Alpha2ConfidenceLevel = (typeof ALPHA2_CONFIDENCE_LEVELS)[number];

const Alpha2ActionKindSchema = z.enum(ALPHA2_ACTION_KINDS);
const Alpha2ActionGateDecisionSchema = z.enum(ALPHA2_ACTION_GATE_DECISIONS);
const Alpha2ConfidenceLevelSchema = z.enum(ALPHA2_CONFIDENCE_LEVELS);
const Alpha2RiskClassSchema = z.enum(ALPHA2_RISK_CLASSES);
const Alpha2EvidenceRefsSchema = z.array(z.string().min(1)).min(1);

export const Alpha2ActionGateInputSchema = z
  .object({
    actionKind: Alpha2ActionKindSchema,
    riskClass: Alpha2RiskClassSchema,
    confidence: Alpha2ConfidenceLevelSchema,
    reversible: z.boolean(),
    explicitPolicyRef: z.string().min(1).optional(),
    evidenceRefs: Alpha2EvidenceRefsSchema,
  })
  .strict();

export const Alpha2ActionGateResultSchema = z
  .object({
    decision: Alpha2ActionGateDecisionSchema,
    autoExecutionAllowed: z.boolean(),
    reasonCodes: z.array(z.string().min(1)).min(1),
    requiresPolicyRef: z.boolean(),
    policyRef: z.string().min(1).optional(),
    evidenceRefs: Alpha2EvidenceRefsSchema,
  })
  .strict()
  .superRefine((result, ctx) => {
    if (result.decision === "automatic" && !result.autoExecutionAllowed) {
      ctx.addIssue({ code: "custom", message: "alpha2_automatic_gate_must_allow_execution" });
    }
    if (result.decision !== "automatic" && result.autoExecutionAllowed) {
      ctx.addIssue({ code: "custom", message: "alpha2_nonautomatic_gate_cannot_allow_execution" });
    }
    if (result.requiresPolicyRef && !result.policyRef) {
      ctx.addIssue({ code: "custom", message: "alpha2_gate_requires_policy_reference" });
    }
  });

export type Alpha2ActionGateInput = z.infer<typeof Alpha2ActionGateInputSchema>;
export type Alpha2ActionGateResult = z.infer<typeof Alpha2ActionGateResultSchema>;

const HUMAN_ONLY_ACTIONS = new Set<Alpha2ActionKind>([
  "notify_external",
  "merge_code",
  "deploy",
  "spend_money",
  "enter_contract",
  "change_rights_or_entitlements",
  "destructive_infrastructure",
  "security_or_secret",
]);

const ALWAYS_REVIEW_ACTIONS = new Set<Alpha2ActionKind>([
  "write_irreversible",
  "publish_external",
  "public_political_claim",
  "sensitive_personal_data",
]);

function result(input: {
  decision: Alpha2ActionGateDecision;
  reasonCodes: string[];
  evidenceRefs: string[];
  requiresPolicyRef?: boolean;
  policyRef?: string;
}): Alpha2ActionGateResult {
  return Alpha2ActionGateResultSchema.parse({
    decision: input.decision,
    autoExecutionAllowed: input.decision === "automatic",
    reasonCodes: input.reasonCodes,
    requiresPolicyRef: input.requiresPolicyRef ?? false,
    policyRef: input.policyRef,
    evidenceRefs: input.evidenceRefs,
  });
}

export function resolveAlpha2ActionGate(rawInput: Alpha2ActionGateInput): Alpha2ActionGateResult {
  const input = Alpha2ActionGateInputSchema.parse(rawInput);

  if (HUMAN_ONLY_ACTIONS.has(input.actionKind)) {
    return result({
      decision: "human_only",
      reasonCodes: [`human_sovereignty:${input.actionKind}`],
      evidenceRefs: input.evidenceRefs,
    });
  }

  if (input.riskClass === "red" || input.riskClass === "orange") {
    return result({
      decision: "human_only",
      reasonCodes: [`risk_class:${input.riskClass}`],
      evidenceRefs: input.evidenceRefs,
    });
  }

  if (ALWAYS_REVIEW_ACTIONS.has(input.actionKind)) {
    return result({
      decision: "review_required",
      reasonCodes: [`review_boundary:${input.actionKind}`],
      evidenceRefs: input.evidenceRefs,
    });
  }

  if (input.actionKind === "read_only") {
    return result({
      decision: "automatic",
      reasonCodes: ["read_only_no_external_effect"],
      evidenceRefs: input.evidenceRefs,
    });
  }

  if (input.actionKind === "write_reversible") {
    if (
      input.riskClass === "green" &&
      input.confidence === "high" &&
      input.reversible &&
      input.explicitPolicyRef
    ) {
      return result({
        decision: "automatic",
        reasonCodes: ["green_reversible_high_confidence_with_policy"],
        requiresPolicyRef: true,
        policyRef: input.explicitPolicyRef,
        evidenceRefs: input.evidenceRefs,
      });
    }

    return result({
      decision: "review_required",
      reasonCodes: [
        input.explicitPolicyRef ? "reversible_write_not_auto_eligible" : "missing_explicit_policy",
      ],
      evidenceRefs: input.evidenceRefs,
    });
  }

  return result({
    decision: "review_required",
    reasonCodes: ["fail_closed_unclassified_action"],
    evidenceRefs: input.evidenceRefs,
  });
}

export function isAlpha2HumanSovereigntyAction(actionKind: Alpha2ActionKind) {
  return HUMAN_ONLY_ACTIONS.has(actionKind);
}

export function isAlpha2AutomaticActionAllowed(input: {
  actionKind: Alpha2ActionKind;
  riskClass: Alpha2RiskClass;
  confidence: Alpha2ConfidenceLevel;
  reversible: boolean;
  explicitPolicyRef?: string;
  evidenceRefs: string[];
}) {
  return resolveAlpha2ActionGate(input).autoExecutionAllowed;
}
