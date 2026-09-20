import {
  deriveTruthGuardContract,
  type ResearchUsed,
  type VerificationMode,
} from "@features/ai/e150/verificationContract";
import type {
  E150ConfidenceMeta,
  E150DisagreementMeta,
} from "@features/ai/e150/disagreementConfidence";
import {
  getFactcheckWorkflowRepo,
  type FactcheckJobDoc,
  type FactcheckProviderMatrix,
  type FactcheckResult,
} from "./db";
import {
  deriveFactcheckSealEligibility,
  deriveFactcheckVerificationMode,
  factcheckVerificationModeToCompatibilityMode,
} from "./workflow";
import {
  deriveFactcheckExecutionGrounding,
  type FactcheckExecutionGrounding,
} from "./executionEvidence";

function normalizeText(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:/.-]/gu, " ")
    .replace(/\s+/g, " ");
}

function groundingFor(job: FactcheckJobDoc) {
  return deriveFactcheckExecutionGrounding({
    claims: job.claims ?? [],
    sourceRefs: job.sourceRefs ?? [],
    executionEvidence: job.executionEvidence ?? null,
  });
}

function buildProviderMatrix(
  job: FactcheckJobDoc,
  grounding = groundingFor(job),
): FactcheckProviderMatrix {
  const requestedAction = job.requestedAction ?? "factcheck";
  const deepResearchRequested = requestedAction === "deep_research";
  const searchRequested =
    requestedAction === "source_check" ||
    requestedAction === "deep_research" ||
    requestedAction === "sealed_factcheck";
  const providerRunAllowed =
    Boolean(job.gate?.entitlementConfirmed) && Boolean(job.gate?.userConfirmed);
  const deepResearchAllowed =
    deepResearchRequested &&
    providerRunAllowed &&
    Boolean(job.gate?.pricingConfirmed);
  const usedProviders = grounding.executionObserved
    ? Array.from(
        new Set(
          (job.executionEvidence?.providerRuns ?? [])
            .map((entry) => String(entry.provider ?? "").trim())
            .filter(Boolean),
        ),
      )
    : [];

  const notes = [
    providerRunAllowed
      ? "Kein Auto-Publish und kein Auto-Graph-Merge."
      : "Provider-Lauf ist nicht freigeschaltet.",
  ];
  if (deepResearchRequested && !deepResearchAllowed) {
    notes.push("Deep Research bleibt ohne bestätigtes Gate deaktiviert.");
  }
  if (!grounding.executionObserved) {
    notes.push("Keine Execution Evidence: angefragte oder erlaubte Provider gelten nicht als ausgeführt.");
  }

  return {
    requestedAction,
    searchRequested,
    deepResearchRequested,
    providerRunAllowed,
    deepResearchAllowed,
    usedProviders,
    notes,
  };
}

function deriveResearchUsed(
  job: FactcheckJobDoc,
  grounding = groundingFor(job),
): ResearchUsed {
  if (!grounding.executionObserved) return "none";
  return job.executionEvidence?.researchUsed ?? "none";
}

function deriveConfidence(
  job: FactcheckJobDoc,
  grounding = groundingFor(job),
): E150ConfidenceMeta {
  if (job.orchestrationConfidence && grounding.complete) return job.orchestrationConfidence;
  const noDeclaredSources = (job.sourceRefs ?? []).length === 0;
  const disagreementPresent = job.disagreement?.present === true;
  const fallbackUsed = job.fallbackUsed === true;
  const score = !grounding.executionObserved
    ? 0.25
    : !grounding.complete
      ? 0.38
      : disagreementPresent || fallbackUsed
        ? 0.44
        : 0.68;
  const bucket = score >= 0.75 ? "high" : score >= 0.45 ? "medium" : "low";
  return {
    score,
    bucket,
    reasons: noDeclaredSources
      ? ["missing_sources"]
      : !grounding.executionObserved
        ? ["missing_execution_evidence"]
        : !grounding.complete
          ? ["incomplete_claim_grounding"]
          : disagreementPresent
            ? ["provider_disagreement"]
            : fallbackUsed
              ? ["fallback_used"]
              : ["review_first_factcheck"],
  };
}

function deriveDisagreement(job: FactcheckJobDoc): E150DisagreementMeta | null {
  if (job.disagreement) return job.disagreement;
  return null;
}

function sourceStatusFor(input: {
  job: FactcheckJobDoc;
  grounding: FactcheckExecutionGrounding;
  reviewRecommended: boolean;
}) {
  if (!input.grounding.executionObserved) {
    return (input.job.sourceRefs ?? []).length > 0
      ? "Quellenhinweise vorhanden, inhaltliche Prüfung offen"
      : "Quellenprüfung offen";
  }
  if (!input.grounding.complete) {
    return "Quellen wurden abgerufen, Claim-Zuordnung ist noch unvollständig";
  }
  return input.reviewRecommended
    ? "Quellenprüfung erfolgt, manuelle Prüfung bleibt erforderlich"
    : "Quellenprüfung mit Claim-Zuordnung vorhanden";
}

function buildResult(job: FactcheckJobDoc): FactcheckResult {
  const sources = job.sourceRefs ?? [];
  const claims = job.claims ?? [];
  const grounding = groundingFor(job);
  const disagreement = deriveDisagreement(job);
  const confidence = deriveConfidence(job, grounding);
  const requestedAction = job.requestedAction ?? "factcheck";
  const effectiveSeal =
    requestedAction === "sealed_factcheck" &&
    job.sealGranted === true &&
    grounding.complete;
  const verificationMode: VerificationMode = effectiveSeal ? "sealed" : "precheck";
  const sourceGrounding = {
    sourceInventory: { total: grounding.retrievedSourceRefIds.length },
    synthesis: {
      documentGroundedClaims: grounding.documentGroundedClaimIds.length,
      webGroundedClaims: grounding.webGroundedClaimIds.length,
      inferredClaims: 0,
      openClaims: grounding.complete
        ? 0
        : Math.max(1, grounding.openClaimIds.length),
    },
    requiresManualReview: !grounding.complete,
    noSourceBluffing: { passed: true },
  };
  const truthView = deriveTruthGuardContract({
    lane: requestedAction === "sealed_factcheck" ? "sealed_factcheck" : "material_grounding",
    verificationMode,
    sealGranted: effectiveSeal,
    fallbackUsed: job.fallbackUsed === true,
    disagreement,
    confidence,
    reviewRecommended:
      !grounding.complete ||
      disagreement?.present === true ||
      job.status === "needs_manual_review" ||
      confidence.bucket === "low",
    sourceGrounding,
  });
  const reviewRecommended =
    truthView.reviewRecommended ||
    !grounding.complete ||
    disagreement?.present === true ||
    job.status === "needs_manual_review";
  const sourceStatus = sourceStatusFor({ job, grounding, reviewRecommended });
  const summary = !grounding.executionObserved
    ? sources.length === 0
      ? "Quellenprüfung als Arbeitsstand angelegt. Belastbare Quellen fehlen noch."
      : "Quellenhinweise sind erfasst, wurden aber noch nicht als Claim-Evidence ausgeführt und geprüft."
    : !grounding.complete
      ? "Quellen wurden abgerufen, aber nicht alle Claims sind belastbar mit Evidence verknüpft."
      : reviewRecommended
        ? "Quellenprüfung mit Claim-Zuordnung liegt vor. Das Ergebnis bleibt review-first."
        : "Quellenprüfung mit Claim-Zuordnung abgeschlossen. Das Ergebnis ist noch nicht veröffentlicht.";
  const openQuestions = !grounding.executionObserved
    ? sources.length === 0
      ? ["Welche belastbaren Quellen oder Dokumente stützen den Beitrag?"]
      : ["Welche Claims werden durch den tatsächlich abgerufenen Inhalt dieser Quellen gestützt oder widerlegt?"]
    : grounding.openClaimIds.length > 0
      ? ["Welche Evidence schließt die noch offenen Claim-Zuordnungen?"]
      : disagreement?.present === true
        ? ["Welche Quelle soll für die manuelle Prüfung priorisiert werden?"]
        : [];

  return {
    jobId: job.jobId,
    claims,
    sources,
    sourceSupport: truthView.sourceSupport,
    sourceStatus,
    truthStatus: truthView.truthStatus,
    verificationLabel: effectiveSeal
      ? "verifiziert"
      : reviewRecommended
        ? "analysiert"
        : truthView.verificationLabel,
    researchUsed: deriveResearchUsed(job, grounding),
    providerMatrix: buildProviderMatrix(job, grounding),
    disagreement,
    confidence,
    reviewRecommended,
    summary,
    openQuestions,
    limitations: job.limitations ?? [],
    noTruthPromotion: true,
    noAutoGraphPromotion: true,
  };
}

export function refreshFactcheckJobState(job: FactcheckJobDoc): FactcheckJobDoc {
  const next = { ...job };
  if (!next.normalizedText) {
    next.normalizedText = normalizeText(next.inputText);
  }
  const grounding = groundingFor(next);

  // Historical jobs may already say completed/sealed even though they only carry URLs.
  // Downgrade those states before deriving any user-facing truth or seal metadata.
  if ((next.status === "completed" || next.status === "sealed") && !grounding.complete) {
    next.status = "needs_manual_review";
    next.publicSealVisible = false;
  }
  next.providerMatrix = buildProviderMatrix(next, grounding);

  if (
    next.status === "completed" ||
    next.status === "needs_manual_review" ||
    next.status === "sealed"
  ) {
    next.sealGranted = next.factcheckSealDecision === "granted" && grounding.complete;
    next.result = buildResult(next);
    next.truthStatus = next.result.truthStatus;
    next.sourceSupport = next.result.sourceSupport;
    next.sourceStatus = next.result.sourceStatus;
    next.verificationLabel = next.result.verificationLabel;
    next.confidenceScore = next.result.confidence?.score ?? next.confidenceScore ?? 0;
    next.verdict =
      next.requestedAction === "sealed_factcheck" && next.sealGranted === true
        ? "LIKELY_TRUE"
        : next.verdict ?? "UNDETERMINED";
  } else if (next.status === "queued" || next.status === "running") {
    next.result = null;
    next.truthStatus = "factcheck_requested";
    next.sourceSupport = grounding.complete ? "sourced" : "open";
    next.sourceStatus =
      next.status === "running" ? "Quellenprüfung läuft" : "Quellenprüfung angefragt";
    next.verificationLabel = "analysiert";
  } else if (next.status === "failed" || next.status === "cancelled") {
    next.result = null;
    next.truthStatus = "review_required";
    next.sourceSupport = grounding.complete ? "sourced" : "open";
    next.sourceStatus =
      next.status === "failed" ? "Quellenprüfung fehlgeschlagen" : "Quellenprüfung abgebrochen";
    next.verificationLabel = "analysiert";
  }

  next.factcheckSealEligibility = deriveFactcheckSealEligibility({
    status: next.status,
    hasSourceRefs: grounding.complete,
    hasClaims: (next.claims ?? []).length > 0,
  });
  next.factcheckVerificationMode = deriveFactcheckVerificationMode({
    status: next.status,
    researchMode: next.factcheckResearchMode,
    hasSourceRefs: grounding.complete,
    sealDecision: next.sealGranted === true ? next.factcheckSealDecision : "none",
  });
  next.verificationMode = factcheckVerificationModeToCompatibilityMode(
    next.factcheckVerificationMode,
  );
  next.researchUsed = deriveResearchUsed(next, grounding);
  next.sealEligible =
    grounding.complete &&
    (next.factcheckSealEligibility === "eligible" ||
      next.factcheckSealEligibility === "needs_review");
  next.sealGranted = next.factcheckSealDecision === "granted" && grounding.complete;
  if (!next.sealGranted) next.publicSealVisible = false;
  next.noAutoPublish = true;
  next.noAutoGraphPromotion = true;
  next.noAutoDossier = true;
  next.noAutoAnlassraum = true;
  next.noAutoVote = true;
  return next;
}

export async function runFactcheckJob(jobId: string) {
  const repo = getFactcheckWorkflowRepo();
  const current = await repo.get(jobId);
  if (!current) {
    throw new Error("factcheck_job_not_found");
  }
  if (current.status === "cancelled" || current.status === "archived") {
    return refreshFactcheckJobState(current);
  }

  const startedAt = new Date();
  const running = refreshFactcheckJobState({
    ...current,
    status: "running",
    updatedAt: startedAt,
  });
  await repo.save(running);

  const grounding = groundingFor(running);
  const disagreementPresent = running.disagreement?.present === true;
  const completedAt = new Date();
  const completed = refreshFactcheckJobState({
    ...running,
    status:
      disagreementPresent || running.fallbackUsed === true || !grounding.complete
        ? "needs_manual_review"
        : "completed",
    updatedAt: completedAt,
    completedAt,
    finishedAt: completedAt,
    error: null,
  });
  await repo.save(completed);
  return completed;
}
