import { describe, expect, it } from "vitest";
import {
  parseShareReadyAssetContract,
  resolveShareReadyAssetContract,
  validateShareReadyAssetConsistency,
} from "@features/anlassraum/shareReadyAssetContract";

describe("share ready asset contract", () => {
  it("resolves a running anlass as share-ready with non-auto social publication", () => {
    const contract = resolveShareReadyAssetContract({
      anlassraumId: "65f000000000000000000001",
      publishTarget: "/round/mobilitaet-innenstadt",
      title: "Mobilitaet Innenstadt",
      summary: "Laufender Anlass mit offenem Beteiligungskontext.",
      lifecycleStatus: "accompanied",
      outputStatus: "review",
      isPublic: true,
    });

    expect(contract.primaryTargetKind).toBe("round_operating_target");
    expect(contract.canonicalPublicTarget).toContain("/round/mobilitaet-innenstadt");
    expect(contract.qrTarget).toContain("/round/mobilitaet-innenstadt");
    expect(contract.socialPublication.shareReady).toBe(true);
    expect(contract.socialPublication.socialCandidate).toBe(false);
    expect(contract.socialPublication.autoPostEligible).toBe(false);
    expect(contract.socialPublication.needsReviewBeforeOfficialSocial).toBe(true);
  });

  it("prefers results target for closed contexts and keeps official social review-gated", () => {
    const contract = resolveShareReadyAssetContract({
      anlassraumId: "65f000000000000000000002",
      publishTarget: "/round/fernwaerme-ausbau",
      title: "Fernwaerme Ausbau",
      summary: "Abschluss mit Ergebnisdokumentation.",
      lifecycleStatus: "closed_context",
      outputStatus: "published",
      isPublic: true,
      factcheckSuggested: true,
    });

    expect(contract.primaryTargetKind).toBe("round_results_target");
    expect(contract.targets.roundResultsTarget).toContain("/round/fernwaerme-ausbau");
    expect(contract.socialPublication.socialCandidate).toBe(true);
    expect(contract.socialPublication.qualification).toBe("review_ready_candidate");
    expect(contract.socialPublication.autoPostEligible).toBe(false);
    expect(contract.qualityHints.factcheckSuggested).toBe(true);
  });

  it("supports dossier and companion targets without turning them into truth or priority privilege", () => {
    const contract = resolveShareReadyAssetContract({
      anlassraumId: "65f000000000000000000003",
      dossierId: "waermewende-berlin",
      companionSlug: "waermewende-livestream-teil1",
      title: "Waermewende Livestream",
      summary: "Companion-Format mit offenem Dossier-Anschluss.",
      isPublic: true,
      existingContextHint: "Aehnlicher Kontext vorhanden: Dossier waermewende-berlin",
    });

    expect(contract.primaryTargetKind).toBe("companion_public_target");
    expect(contract.targets.dossierPublicTarget).toBe("/dossier/waermewende-berlin");
    expect(contract.targets.companionPublicTarget).toBe(
      "/companion/waermewende-livestream-teil1",
    );
    expect(contract.guardrails.forbidsTruthPrivilege).toBe(true);
    expect(contract.guardrails.forbidsPriorityPrivilege).toBe(true);
    expect(contract.qualityHints.existingContextHint).toContain("Aehnlicher Kontext");
  });

  it("keeps non-public contexts share-ready while blocking official social candidacy", () => {
    const contract = resolveShareReadyAssetContract({
      anlassraumId: "65f000000000000000000004",
      publishTarget: "/round/interner-abgleich",
      title: "Interner Abgleich",
      summary: "Nicht oeffentlicher Abstimmungskontext.",
      isPublic: false,
    });

    expect(contract.socialPublication.shareReady).toBe(true);
    expect(contract.socialPublication.socialCandidate).toBe(false);
    expect(contract.socialPublication.qualification).toBe("none");
    expect(contract.socialPublication.autoPostEligible).toBe(false);
  });

  it("provides parse and consistency helpers for contract hardening", () => {
    const contract = resolveShareReadyAssetContract({
      anlassraumId: "65f000000000000000000005",
      title: "Hinweis auf Schulweg-Sicherheit",
      summary: "Offener Kontext mit Follow-up.",
      isPublic: true,
    });

    const parsed = parseShareReadyAssetContract(contract);
    expect(parsed.ok).toBe(true);

    const consistency = validateShareReadyAssetConsistency({ contract });
    expect(consistency.ok).toBe(true);
    expect(consistency.issues).toEqual([]);
  });
});
