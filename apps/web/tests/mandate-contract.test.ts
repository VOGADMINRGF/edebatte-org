import { describe, expect, it } from "vitest";
import {
  getMandateById,
  isBindingVoiceOpenGovRepresentationMandate,
  listMandates,
  normalizeConsentStatus,
  normalizeMandateStatus,
  normalizeMandateVisibility,
  normalizeVerificationStatus,
  parseMandate,
  supportsAutomaticAssignment,
  supportsAutomaticBindingFromDraftOrOpenProcess,
  supportsMandateEditInPublicSurface,
  supportsMembershipHandoff,
} from "@features/mandate";

describe("mandate domain contract", () => {
  it("exposes eDebatte decision mandates with stable decision references", () => {
    const fixtures = listMandates();

    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((entry) => entry.id.startsWith("decision-mandate-"))).toBe(true);
    expect(fixtures.every((entry) => entry.decision.snapshotId.length > 0)).toBe(true);
    expect(fixtures.every((entry) => entry.decision.scopeKey.length > 0)).toBe(true);
    expect(fixtures.some((entry) => entry.sourceDossierId !== null)).toBe(true);
    expect(fixtures.some((entry) => entry.sourceRoundId !== null)).toBe(true);
    expect(fixtures.every((entry) => entry.isReadOnlyPublic)).toBe(true);
  });

  it("normalizes status, visibility, consent and verification safely", () => {
    expect(normalizeMandateStatus("IN_UMSETZUNG")).toBe("in_umsetzung");
    expect(normalizeMandateStatus("unbekannt")).toBe("entwurf");

    expect(normalizeMandateVisibility("PUBLIC_READONLY")).toBe("public_readonly");
    expect(normalizeMandateVisibility("invalid")).toBe("restricted");

    expect(normalizeConsentStatus("GRANTED")).toBe("granted");
    expect(normalizeConsentStatus("invalid")).toBe("pending");

    expect(normalizeVerificationStatus("VERIFIED")).toBe("verified");
    expect(normalizeVerificationStatus("invalid")).toBe("unverified");
  });

  it("binds VoiceOpenGov only to a valid closed eDebatte decision mandate", () => {
    const mandate = getMandateById("decision-mandate-001");

    expect(mandate).not.toBeNull();
    expect(mandate?.decision.status).toBe("valid");
    expect(mandate?.provenance.origin).toBe("dossier_round_outcome");
    expect(mandate && isBindingVoiceOpenGovRepresentationMandate(mandate)).toBe(true);
    expect(supportsAutomaticBindingFromDraftOrOpenProcess()).toBe(false);
  });

  it("keeps read-only/public boundaries and avoids implicit account or assignment behavior", () => {
    const mandate = getMandateById("decision-mandate-001");

    expect(mandate).not.toBeNull();
    expect(mandate?.visibility).toBe("public_readonly");
    expect(mandate?.isReadOnlyPublic).toBe(true);
    expect(supportsMembershipHandoff()).toBe(false);
    expect(supportsAutomaticAssignment()).toBe(false);
    expect(supportsMandateEditInPublicSurface()).toBe(false);
  });

  it("keeps majority, minority, scope and version provenance explicit", () => {
    const fixtures = listMandates();

    fixtures.forEach((entry) => {
      const parsed = parseMandate(entry);
      expect(parsed.provenance.registerLabel).toBe("eDebatte Entscheidungsmandat");
      expect(parsed.provenance.origin).toBe("dossier_round_outcome");
      expect(parsed.decision.majorityPosition.length).toBeGreaterThan(0);
      expect(parsed.decision.ruleId.length).toBeGreaterThan(0);
      expect(parsed.decision.scopeKey.length).toBeGreaterThan(0);
      expect(parsed.decision.decidedAt).not.toBeNull();

      const corpus = [
        parsed.title,
        parsed.subject,
        parsed.publicSummary,
        parsed.provenance.registerLabel,
        parsed.provenance.sourceLabel,
        parsed.transparency.scopeNote,
      ]
        .join(" ")
        .toLowerCase();

      expect(corpus).not.toContain("voiceopengov mandatsregister");
      expect(corpus).not.toContain("parteienbuch");
      expect(corpus).not.toContain("fraktion");
    });
  });

  it("keeps legacy VOG mandate ids as aliases to one canonical decision record", () => {
    expect(getMandateById("vog-mandat-001")?.id).toBe("decision-mandate-001");
    expect(getMandateById("vog-mandat-002")?.id).toBe("decision-mandate-002");
  });
});
