import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDefaultConsent } from "@/lib/privacy/consent";
import { buildPersonalVoxyProfileConsentOnboardingContract } from "@/features/agenticRuntime/personalVoxyProfileConsentOnboardingContract";
import {
  PERSONAL_VOXY_MEMORY_GUARDRAILS,
  applyPersonalVoxyMemoryClearDoNotRemember,
  applyPersonalVoxyMemoryDelete,
  applyPersonalVoxyMemoryFullReset,
  applyPersonalVoxyMemoryScopeRevoke,
  applyPersonalVoxyMemoryWrite,
  buildPersonalVoxyMemoryRuntimeView,
  createEmptyPersonalVoxyMemoryState,
  listPersonalVoxyMemoryForUserControl,
  type PersonalVoxyMemoryAuthorization,
  type PersonalVoxyMemoryState,
} from "@/features/agenticRuntime/personalVoxyConsentedMemoryContract";

const T0 = "2026-09-25T16:00:00.000Z";
const T1 = "2026-09-25T16:01:00.000Z";
const T2 = "2026-09-25T16:02:00.000Z";

function authorization(consentRevision: number): PersonalVoxyMemoryAuthorization {
  return {
    consentRevision,
    contract: buildPersonalVoxyProfileConsentOnboardingContract({
      requestedMode: "active_companion",
      requestedRelevanceDepth: "balanced",
      requestedNotificationPolicy: "off",
      privacyConsent: buildDefaultConsent({
        requiredNoticeAcknowledged: true,
        timestamp: T0,
        source: "account",
      }),
      explicitPersonalVoxyConsent: true,
    }),
  };
}

function blockedAuthorization(consentRevision = 1): PersonalVoxyMemoryAuthorization {
  return {
    consentRevision,
    contract: buildPersonalVoxyProfileConsentOnboardingContract({
      requestedMode: "active_companion",
      privacyConsent: null,
      explicitPersonalVoxyConsent: false,
    }),
  };
}

function writeRegion(state: PersonalVoxyMemoryState | null, revision = 1) {
  return applyPersonalVoxyMemoryWrite({
    state,
    authorization: authorization(revision),
    request: {
      key: "region_context",
      value: { city: "Berlin", region: "Brandenburg", countryCode: "de" },
      source: "explicit_user_input",
      conversationRef: "conversation-123",
    },
    now: T0,
  });
}

describe("Personal Voxy consented memory contract", () => {
  it("fails closed without current Personal-Voxy consent", () => {
    const result = applyPersonalVoxyMemoryWrite({
      state: createEmptyPersonalVoxyMemoryState(T0),
      authorization: blockedAuthorization(),
      request: {
        key: "preferred_language",
        value: "de-DE",
        source: "explicit_user_input",
      },
      now: T0,
    });

    expect(result.accepted).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe("profile_persistence_not_consented");
    expect(result.state.entries).toEqual({});
    expect(result.safeTrace.status).toBe("blocked");
  });

  it("stores only allowlisted typed companion context with consent revision and provenance", () => {
    const result = writeRegion(null, 3);

    expect(result.accepted).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.state.entries.region_context).toMatchObject({
      key: "region_context",
      scope: "regional_context",
      consentRevision: 3,
      value: {
        city: "Berlin",
        region: "Brandenburg",
        countryCode: "DE",
      },
      provenance: {
        source: "explicit_user_input",
        reason: null,
        confidence: null,
        conversationRef: "conversation-123",
      },
    });
    expect(result.safeTrace.evidenceRefs).toContain("target:region_context");
    expect(JSON.stringify(result.safeTrace)).not.toContain("Berlin");
  });

  it("does not persist an inference until the user has explicitly confirmed it", () => {
    const unconfirmed = applyPersonalVoxyMemoryWrite({
      state: createEmptyPersonalVoxyMemoryState(T0),
      authorization: authorization(1),
      request: {
        key: "relevance_depth",
        value: "full_context",
        source: "confirmed_inference",
        reason: "Nutzer bittet regelmaessig um ausfuehrlichen Kontext.",
        confidence: 0.8,
        confirmedAt: T0,
        confirmedByUser: false,
      },
      now: T0,
    });

    expect(unconfirmed.accepted).toBe(false);
    expect(unconfirmed.reason).toBe(
      "confirmed_inference_requires_user_confirmation_reason_confidence",
    );

    const confirmed = applyPersonalVoxyMemoryWrite({
      state: unconfirmed.state,
      authorization: authorization(1),
      request: {
        key: "relevance_depth",
        value: "full_context",
        source: "confirmed_inference",
        reason: "Nutzer bittet regelmaessig um ausfuehrlichen Kontext.",
        confidence: 0.8,
        confirmedAt: T0,
        confirmedByUser: true,
      },
      now: T0,
    });

    expect(confirmed.accepted).toBe(true);
    expect(confirmed.state.entries.relevance_depth?.provenance).toMatchObject({
      source: "confirmed_inference",
      confidence: 0.8,
      confirmedAt: T0,
    });
  });

  it("limits topic memory to the existing canonical topic vocabulary", () => {
    const invalid = applyPersonalVoxyMemoryWrite({
      state: createEmptyPersonalVoxyMemoryState(T0),
      authorization: authorization(1),
      request: {
        key: "topic_interests",
        value: ["climate", "party_preference:example"],
        source: "explicit_user_input",
      },
      now: T0,
    });
    expect(invalid.accepted).toBe(false);
    expect(invalid.reason).toBe("invalid_memory_value");

    const valid = applyPersonalVoxyMemoryWrite({
      state: invalid.state,
      authorization: authorization(1),
      request: {
        key: "topic_interests",
        value: ["climate", "digital", "climate"],
        source: "explicit_user_input",
      },
      now: T0,
    });
    expect(valid.accepted).toBe(true);
    expect(valid.state.entries.topic_interests?.value).toEqual(["climate", "digital"]);
  });

  it("makes do_not_remember idempotent and prevents silent rehydration", () => {
    const written = writeRegion(null, 1);
    const suppressed = applyPersonalVoxyMemoryDelete({
      state: written.state,
      key: "region_context",
      doNotRemember: true,
      now: T1,
    });
    const repeated = applyPersonalVoxyMemoryDelete({
      state: suppressed.state,
      key: "region_context",
      doNotRemember: true,
      now: T1,
    });

    expect(suppressed.state.entries.region_context).toBeUndefined();
    expect(suppressed.state.suppressedKeys).toEqual(["region_context"]);
    expect(repeated.accepted).toBe(true);
    expect(repeated.changed).toBe(false);

    const rehydrateAttempt = writeRegion(repeated.state, 2);
    expect(rehydrateAttempt.accepted).toBe(false);
    expect(rehydrateAttempt.reason).toBe("do_not_remember_active");

    const cleared = applyPersonalVoxyMemoryClearDoNotRemember({
      state: rehydrateAttempt.state,
      authorization: authorization(2),
      key: "region_context",
      now: T2,
    });
    expect(cleared.accepted).toBe(true);
    expect(cleared.state.suppressedKeys).toEqual([]);

    const rewritten = writeRegion(cleared.state, 2);
    expect(rewritten.accepted).toBe(true);
  });

  it("revocation deletes the affected scope and blocks the revoked consent revision", () => {
    const written = writeRegion(null, 4);
    const revoked = applyPersonalVoxyMemoryScopeRevoke({
      state: written.state,
      scope: "regional_context",
      consentRevision: 4,
      now: T1,
    });

    expect(revoked.accepted).toBe(true);
    expect(revoked.state.entries.region_context).toBeUndefined();
    expect(revoked.state.revokedScopes.regional_context).toMatchObject({
      consentRevision: 4,
      at: T1,
    });

    const sameRevision = writeRegion(revoked.state, 4);
    expect(sameRevision.accepted).toBe(false);
    expect(sameRevision.reason).toBe("consent_revision_not_newer_than_revoke");

    const newConsent = writeRegion(revoked.state, 5);
    expect(newConsent.accepted).toBe(true);
  });

  it("full reset removes all entries and requires a newer consent revision before reuse", () => {
    const region = writeRegion(null, 7);
    const language = applyPersonalVoxyMemoryWrite({
      state: region.state,
      authorization: authorization(7),
      request: {
        key: "preferred_language",
        value: "de-DE",
        source: "explicit_user_input",
      },
      now: T0,
    });

    const reset = applyPersonalVoxyMemoryFullReset({
      state: language.state,
      consentRevision: 7,
      now: T1,
    });
    expect(reset.accepted).toBe(true);
    expect(reset.state.entries).toEqual({});
    expect(reset.state.resetBarrier?.consentRevision).toBe(7);

    const staleRewrite = writeRegion(reset.state, 7);
    expect(staleRewrite.accepted).toBe(false);
    expect(staleRewrite.reason).toBe("consent_revision_not_newer_than_reset");

    const freshRewrite = writeRegion(reset.state, 8);
    expect(freshRewrite.accepted).toBe(true);
  });

  it("uses only memory from the exact current consent revision at runtime while keeping stale values user-visible", () => {
    const written = writeRegion(null, 2);
    const runtimeOld = buildPersonalVoxyMemoryRuntimeView({
      state: written.state,
      authorization: authorization(3),
    });

    expect(runtimeOld.usableEntries).toEqual([]);
    expect(runtimeOld.staleKeys).toEqual(["region_context"]);
    expect(listPersonalVoxyMemoryForUserControl(written.state)).toHaveLength(1);

    const runtimeCurrent = buildPersonalVoxyMemoryRuntimeView({
      state: written.state,
      authorization: authorization(2),
    });
    expect(runtimeCurrent.usableEntries.map((entry) => entry.key)).toEqual(["region_context"]);
  });

  it("keeps personalization outside evidence, truth, persuasion and action authority", () => {
    expect(PERSONAL_VOXY_MEMORY_GUARDRAILS).toMatchObject({
      hiddenPoliticalProfilingAllowed: false,
      partyPreferenceStorageAllowed: false,
      voteIntentStorageAllowed: false,
      ideologyStorageAllowed: false,
      persuadabilityStorageAllowed: false,
      evidenceWeightingMayChange: false,
      truthStatusMayChange: false,
      materialFactsMayBeHidden: false,
      strongCounterargumentsMayBeHidden: false,
      autoPublishAllowed: false,
      actingOnBehalfOfUserAllowed: false,
    });
  });

  it("adapts the existing users.profile owner instead of creating a second memory collection", () => {
    const persistencePath = fileURLToPath(
      new URL(
        "../src/features/agenticRuntime/personalVoxyConsentedMemoryPersistence.ts",
        import.meta.url,
      ),
    );
    const source = readFileSync(persistencePath, "utf8");

    expect(source).toContain('getCol<PersonalVoxyMemoryUserDoc>("users")');
    expect(source).toContain('"profile.personalVoxyMemory"');
    expect(source).not.toMatch(/getCol<[^>]*>\(["']personal[_-]voxy/i);
    expect(source).not.toMatch(/getCol<[^>]*>\(["']memory/i);
  });
});
