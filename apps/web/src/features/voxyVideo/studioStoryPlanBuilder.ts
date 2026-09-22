import "server-only";

import { stableHash } from "@core/utils/hash";
import type { SupportedLocale } from "@/config/locales";
import type { DossierClaimDoc, DossierFindingDoc } from "@features/dossier/schemas";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialClaimPresentation,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryChapter,
  type VoxyEditorialStoryPlan,
} from "./editorialStoryPlan";

function presentationForClaim(
  claim: DossierClaimDoc,
): VoxyEditorialClaimPresentation {
  if (claim.kind === "question") return "open_question";
  if (claim.kind === "fact") {
    return claim.status === "supported" ? "confirmed_fact" : "uncertainty";
  }
  return "interpretation";
}

function supportingFindingForClaim(
  claimId: string,
  findings: DossierFindingDoc[],
): DossierFindingDoc | null {
  return (
    findings.find(
      (finding) => finding.claimId === claimId && finding.verdict === "supports",
    ) ??
    findings.find((finding) => finding.claimId === claimId) ??
    null
  );
}

function refsForFinding(finding: DossierFindingDoc | null) {
  return Array.from(
    new Set(
      (finding?.citations ?? [])
        .map((citation) => citation.sourceId.trim())
        .filter(Boolean),
    ),
  );
}

function chapterForClaim(input: {
  chapterId: string;
  role: VoxyEditorialStoryChapter["role"];
  headline: string;
  claim: DossierClaimDoc;
  finding: DossierFindingDoc | null;
  motion: VoxyEditorialStoryChapter["motion"];
}): VoxyEditorialStoryChapter {
  const sourceIds = refsForFinding(input.finding);
  const findingIds = input.finding ? [input.finding.findingId] : [];
  return {
    chapterId: input.chapterId,
    role: input.role,
    headline: input.headline,
    narration: input.claim.text,
    claimBindings: [
      {
        claimId: input.claim.claimId,
        presentation: presentationForClaim(input.claim),
      },
    ],
    sourceIds,
    findingIds,
    openQuestionIds: [],
    evidenceWindow: sourceIds[0]
      ? {
          kind: "source",
          sourceIds: [sourceIds[0]],
          findingIds,
        }
      : { kind: "none", sourceIds: [], findingIds: [] },
    consequences: [],
    motion: input.motion,
  };
}

/**
 * Produces a conservative editable first draft from existing Dossier truth.
 * It never upgrades Dossier sources to canonical approval. That remains the
 * EvidenceAuthority's job, so this plan can be edited/reviewed while render
 * approval stays fail-closed until source review truth exists.
 */
export function buildVoxyStudioStoryPlanFromDossier(input: {
  dossierId: string;
  briefingId: string;
  title: string;
  locale: SupportedLocale;
  evidence: VoxyEditorialEvidenceContext;
}): VoxyEditorialStoryPlan {
  const claims = [...input.evidence.claims].sort((a, b) => {
    const score = (claim: DossierClaimDoc) => {
      if (claim.kind === "fact" && claim.status === "supported") return 0;
      if (claim.kind === "fact") return 1;
      if (claim.kind === "interpretation") return 2;
      if (claim.kind === "value") return 3;
      return 4;
    };
    return score(a) - score(b) || a.claimId.localeCompare(b.claimId);
  });
  const unresolvedQuestions = input.evidence.openQuestions.filter((question) =>
    ["open", "in_review"].includes(question.status),
  );

  if (claims.length === 0 && unresolvedQuestions.length === 0) {
    throw new Error("voxy_studio_dossier_has_no_editorial_claim_or_question");
  }

  const chapters: VoxyEditorialStoryChapter[] = [];
  const primaryClaim = claims[0] ?? null;
  if (primaryClaim) {
    const primaryFinding = supportingFindingForClaim(
      primaryClaim.claimId,
      input.evidence.findings,
    );
    chapters.push(
      chapterForClaim({
        chapterId: "what-happened",
        role: "what_happened",
        headline: "Was ist passiert?",
        claim: primaryClaim,
        finding: primaryFinding,
        motion: "explaining",
      }),
    );
    chapters.push(
      chapterForClaim({
        chapterId: "evidence",
        role: "source_evidence",
        headline: "Worauf stützt sich das?",
        claim: primaryClaim,
        finding: primaryFinding,
        motion: "highlighting_source",
      }),
    );
  } else {
    const question = unresolvedQuestions[0];
    chapters.push({
      chapterId: "what-happened",
      role: "what_happened",
      headline: "Worum geht es?",
      narration: question.text,
      claimBindings: [],
      sourceIds: question.links?.sourceIds ?? [],
      findingIds: question.links?.findingIds ?? [],
      openQuestionIds: [question.questionId],
      evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
      consequences: [],
      motion: "neutral_idle",
    });
    chapters.push({
      chapterId: "evidence",
      role: "source_evidence",
      headline: "Was ist belegt?",
      narration: "Die Quellen- und Evidenzlage muss vor einer Renderfreigabe geprüft werden.",
      claimBindings: [],
      sourceIds: [],
      findingIds: [],
      openQuestionIds: [question.questionId],
      evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
      consequences: [],
      motion: "highlighting_source",
    });
  }

  const secondaryClaim = claims[1] ?? null;
  if (secondaryClaim) {
    chapters.push(
      chapterForClaim({
        chapterId: "context",
        role: "what_is_supported",
        headline: "Was wissen wir außerdem?",
        claim: secondaryClaim,
        finding: supportingFindingForClaim(
          secondaryClaim.claimId,
          input.evidence.findings,
        ),
        motion: "showing_contrast",
      }),
    );
  }

  if (unresolvedQuestions.length > 0) {
    const question = unresolvedQuestions[0];
    chapters.push({
      chapterId: "uncertainty",
      role: "uncertainty_open_questions",
      headline: "Was ist noch offen?",
      narration: question.text,
      claimBindings: [],
      sourceIds: question.links?.sourceIds ?? [],
      findingIds: question.links?.findingIds ?? [],
      openQuestionIds: [question.questionId],
      evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
      consequences: [],
      motion: "listening",
    });
    chapters.push({
      chapterId: "watch-next",
      role: "what_to_watch_next",
      headline: "Worauf kommt es jetzt an?",
      narration: question.text,
      claimBindings: [],
      sourceIds: [],
      findingIds: [],
      openQuestionIds: [question.questionId],
      evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
      consequences: [],
      motion: "inviting_participation",
    });
  }

  const planKey = [
    input.dossierId,
    input.briefingId,
    input.locale,
    claims.map((claim) => `${claim.claimId}:${claim.updatedAt?.toISOString() ?? ""}`).join("|"),
    unresolvedQuestions.map((question) => question.questionId).join("|"),
  ].join(":");

  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: `voxy-story-${stableHash(planKey).slice(0, 24)}`,
    revision: 1,
    briefingId: input.briefingId,
    dossierId: input.dossierId,
    title: input.title.trim(),
    locale: input.locale,
    originalLanguage: input.locale,
    outputLanguage: input.locale,
    archetype: "explainer",
    durationClass: "explainer",
    chapters,
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
  };
}
