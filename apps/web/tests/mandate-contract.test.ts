import { describe, expect, it } from "vitest";
import {
  getMandateById,
  listMandates,
  normalizeConsentStatus,
  normalizeMandateStatus,
  normalizeMandateVisibility,
  normalizeVerificationStatus,
  parseMandate,
  supportsAuthorityDerivationFromEDebatte,
  supportsAutomaticAssignment,
  supportsMandateEditInPublicSurface,
  supportsMembershipHandoff,
} from "@features/mandate";

describe("mandate domain contract", () => {
  it("exposes neutral responsibility records with stable source references", () => {
    const fixtures = listMandates();

    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((entry) => entry.id.startsWith("responsibility-record-"))).toBe(true);
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

  it("keeps read-only/public boundaries and refuses implicit authority", () => {
    const mandate = getMandateById("responsibility-record-001");

    expect(mandate).not.toBeNull();
    expect(mandate?.visibility).toBe("public_readonly");
    expect(mandate?.isReadOnlyPublic).toBe(true);
    expect(supportsMembershipHandoff()).toBe(false);
    expect(supportsAutomaticAssignment()).toBe(false);
    expect(supportsAuthorityDerivationFromEDebatte()).toBe(false);
    expect(supportsMandateEditInPublicSurface()).toBe(false);
  });

  it("requires external authority and prevents VoiceOpenGov-owned provenance", () => {
    const fixtures = listMandates();

    fixtures.forEach((entry) => {
      const parsed = parseMandate(entry);
      expect(parsed.provenance.registerLabel).toBe("eDebatte Verantwortungsregister");
      expect(parsed.provenance.origin).not.toBe("dossier_round_outcome");
      expect(parsed.authority.issuerId.length).toBeGreaterThan(0);
      expect(parsed.authority.decisionReference.length).toBeGreaterThan(0);

      const corpus = [
        parsed.id,
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
      expect(corpus).not.toContain("vog-mandat-");
      expect(corpus).not.toContain("parteienbuch");
      expect(corpus).not.toContain("fraktion");
    });
  });
});
