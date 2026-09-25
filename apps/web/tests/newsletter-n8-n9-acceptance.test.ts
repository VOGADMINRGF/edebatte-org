import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { resolveNewsletterBriefingPolicy } from "@features/notifications/newsletterBriefingPolicy";
import { resolveNewsletterDeliveryPolicy } from "@features/notifications/newsletterDeliveryPolicy";
import { buildNewsletterProfileSignal } from "@features/notifications/newsletterProfileSignalAdapter";
import { resolveNewsletterProfileRelevance } from "@features/notifications/newsletterProfileRelevance";
import { resolveNewsletterEligibility } from "@features/notifications/newsletterSubscriptionContract";
import { buildNewsletterDigestMail } from "@/features/newsletter/newsletterMail";

const now = new Date("2026-09-17T12:00:00.000Z");
const candidate = {
  id: "candidate-1",
  topicKeys: ["digital-policy"],
  regionKeys: ["DE-BE"],
  locale: "de",
  kind: "topic_update" as const,
  importance: "normal" as const,
};

function eligibility(status: "pending" | "active" | "unsubscribed" | "suppressed", consentVersion = "updates_v1") {
  return resolveNewsletterEligibility({
    email: "person@example.de",
    status,
    consentVersion,
    requiredConsentVersion: "updates_v1",
    channel: "email",
  });
}

describe("N8 personalized briefing acceptance", () => {
  it("1. public subscriber without profile can receive a general opted-in candidate", () => {
    const profile = buildNewsletterProfileSignal({ audienceTier: "public" });
    const decision = resolveNewsletterProfileRelevance({ profile, candidate, minimumScore: 0 });
    expect(decision.relevant).toBe(true);
    expect(decision.reasons).toEqual(["no_profile_match"]);
  });

  it("2. Plus uses explicit topics and region without a paid relevance boost", () => {
    const plus = buildNewsletterProfileSignal({
      audienceTier: "plus",
      preferences: { topicKeys: ["digital-policy"], regionKeys: ["DE-BE"] },
    });
    const member = buildNewsletterProfileSignal({
      audienceTier: "member",
      preferences: { topicKeys: ["digital-policy"], regionKeys: ["DE-BE"] },
    });
    const plusDecision = resolveNewsletterProfileRelevance({ profile: plus, candidate });
    const memberDecision = resolveNewsletterProfileRelevance({ profile: member, candidate });
    expect(plusDecision.score).toBe(50);
    expect(memberDecision.score).toBe(50);
    expect(plusDecision.reasons).toEqual(memberDecision.reasons);
  });

  it("3. Pro can use watchlist and own-work signals but tier itself changes no score", () => {
    const profile = buildNewsletterProfileSignal({
      audienceTier: "pro",
      activity: {
        watchlistTopicKeys: ["digital-policy"],
        ownWorkRegionKeys: ["DE-BE"],
      },
    });
    const decision = resolveNewsletterProfileRelevance({ profile, candidate });
    expect(decision.reasons).toContain("watchlist_topic");
    expect(decision.reasons).toContain("own_work_region");
    expect(decision.score).toBe(80);
  });

  it("4. disabling all enrichment sources removes account/activity personalization", () => {
    const profile = buildNewsletterProfileSignal({
      audienceTier: "pro",
      account: {
        regionKeys: ["DE-BE"],
        profile: { topTopics: ["digital-policy"] },
      },
      activity: {
        watchlistTopicKeys: ["digital-policy"],
        ownWorkRegionKeys: ["DE-BE"],
      },
      personalizationSources: {
        profileTopics: false,
        profileRegion: false,
        watchlistActivity: false,
        ownWorkActivity: false,
      },
    });
    expect(profile.topicKeys).toEqual([]);
    expect(profile.regionKeys).toEqual([]);
    expect(profile.watchlistTopicKeys).toEqual([]);
    expect(profile.ownWorkRegionKeys).toEqual([]);
  });

  it("5/6. unsubscribed, suppressed and stale-consent recipients fail closed", () => {
    expect(eligibility("unsubscribed")).toEqual({ eligible: false, reason: "not_active" });
    expect(eligibility("suppressed")).toEqual({ eligible: false, reason: "suppressed" });
    expect(eligibility("active", "updates_v0")).toEqual({ eligible: false, reason: "consent_version_mismatch" });
  });

  it("7. repeated delivery of the same digest is blocked", () => {
    expect(resolveNewsletterDeliveryPolicy({
      frequency: "daily",
      audienceTier: "pro",
      now,
      candidateId: "digest-key",
      lastCandidateIds: ["digest-key"],
    })).toEqual({ allowed: false, reason: "duplicate" });
  });

  it("8. quiet hours block normal delivery", () => {
    expect(resolveNewsletterDeliveryPolicy({
      frequency: "daily",
      audienceTier: "plus",
      now,
      candidateId: "digest-key-2",
      quietHours: { enabled: true, startHourLocal: 22, endHourLocal: 7, localHour: 23 },
    }).reason).toBe("quiet_hours");
  });

  it("9. important-only accepts critical updates and rejects normal ones", () => {
    expect(resolveNewsletterDeliveryPolicy({
      frequency: "important_only",
      audienceTier: "member",
      now,
      candidateId: "normal",
    }).reason).toBe("important_only");
    expect(resolveNewsletterDeliveryPolicy({
      frequency: "important_only",
      audienceTier: "member",
      now,
      candidateId: "critical",
      isCritical: true,
    }).allowed).toBe(true);
  });

  it("10. DE/EN shells are localized while reviewed content is not silently rewritten", () => {
    const item = {
      id: "1",
      title: "Geprüfter Titel",
      summary: "Geprüfte Zusammenfassung",
      href: "/dossier/test",
      relevanceReasons: ["passt zu einem ausdrücklich gewählten Thema"],
      verificationLabel: "analysiert",
    };
    const de = buildNewsletterDigestMail({
      locale: "de",
      audienceTier: "pro",
      items: [item],
      preferenceUrl: "/account/notifications",
      unsubscribeUrl: "/updates/unsubscribe?token=abc",
      generatedAt: now,
    });
    const en = buildNewsletterDigestMail({
      locale: "en",
      audienceTier: "pro",
      items: [item],
      preferenceUrl: "/account/notifications",
      unsubscribeUrl: "/updates/unsubscribe?token=abc",
      generatedAt: now,
    });
    expect(de.html).toContain("Warum für dich");
    expect(en.html).toContain("Why this is here");
    expect(en.html).toContain("matches a topic you explicitly selected");
    expect(en.html).toContain("Geprüfte Zusammenfassung");
  });

  it("gives paid tiers more depth/capacity, never a different relevance algorithm", () => {
    expect(resolveNewsletterBriefingPolicy("public")).toMatchObject({ depth: "compact", maxItems: 4, includeEvidencePointers: false });
    expect(resolveNewsletterBriefingPolicy("plus")).toMatchObject({ depth: "standard", maxItems: 6, includeEvidencePointers: false });
    expect(resolveNewsletterBriefingPolicy("pro")).toMatchObject({ depth: "deep", maxItems: 10, includeEvidencePointers: true });
  });
});

describe("N9 production red-team source contracts", () => {
  const runtime = readFileSync(new URL("../src/features/newsletter/newsletterRuntime.ts", import.meta.url), "utf8");
  const production = readFileSync(new URL("../src/features/newsletter/newsletterProductionRuntime.ts", import.meta.url), "utf8");
  const cron = readFileSync(new URL("../src/app/api/cron/newsletter-digest/route.ts", import.meta.url), "utf8");
  const preview = readFileSync(new URL("../src/app/api/admin/dashboard/newsletter/preview/route.ts", import.meta.url), "utf8");
  const unsubscribe = readFileSync(new URL("../src/app/api/public/updates/unsubscribe/route.ts", import.meta.url), "utf8");
  const mailer = readFileSync(new URL("../src/utils/mailer.ts", import.meta.url), "utf8");

  it("admits only reviewed newsletter_draft output into candidate selection", () => {
    expect(runtime).toContain('"post.channels": "newsletter_draft"');
    expect(runtime).toContain('post.sourceState !== "approved_context"');
    expect(runtime).toContain("post.approval?.approvedAt");
    expect(runtime).toContain("post.noAutoPublish !== true");
    expect(runtime).toContain("post.noAutoPublicationApproved !== true");
  });

  it("requires a strong cron bearer secret before delivery", () => {
    expect(cron).toContain("secret.length >= 16");
    expect(cron).toContain("authorization");
    expect(cron).toContain("Bearer ${secret}");
    expect(cron).toContain("runNewsletterProductionBatch");
  });

  it("keeps admin preview read-only and non-sending", () => {
    expect(preview).toContain("ignoreDeliveryPolicy: true");
    expect(preview).not.toContain("sendNewsletterDigestForSubscriber");
    expect(preview).toContain("sends: false");
  });

  it("bounds retries and preserves a single canonical subscriber truth", () => {
    expect(production).toContain('SUBSCRIBERS_COLLECTION = "public_updates_subscribers"');
    expect(production).toContain("resolveNewsletterRetryDecision");
    expect(production).toContain("NEWSLETTER_MAX_ATTEMPTS");
    expect(production).toContain("cleanupNewsletterDeliveryLedger");
    expect(production).not.toContain("users.newsletterOptIn");
  });

  it("revalidates canonical consent under the lease and never auto-replays ambiguous handoff", () => {
    expect(production).toContain("const lease = await acquireNewsletterDeliveryLease");
    expect(production).toContain("freshSubscriber = await subscribers.findOne");
    expect(production).toContain('reason: "subscriber_state_unavailable"');
    expect(production).toContain('reason: "subscriber_state_changed"');
    expect(runtime).toContain("reloadCanonicalSubscriberForSend");
    expect(runtime).toContain("expectedDigestKey");
    expect(runtime).toContain("expectedCandidateIds");
    expect(production).toContain("expectedDigestKey: freshPreview.digestKey");
    expect(runtime).toContain("externalAttemptBoundaryAt: input.now");
    expect(runtime).toContain("externalAttemptId: crypto.randomUUID()");
    expect(runtime).toContain('existing?.status === "sending"');
    expect(runtime).not.toContain('existing?.status === "sending" && now.getTime() - existing.updatedAt.getTime()');
    expect(runtime).toContain("newsletterFailureProvenBeforeExternalHandoff");
    expect(runtime).toContain('reason: provenPreHandoffFailure ? result.category : "ambiguous_delivery_state"');
  });

  it("supports scanner-safe human unsubscribe and RFC one-click POST", () => {
    expect(unsubscribe).toContain("GET is intentionally read-only");
    expect(unsubscribe).toContain('params.get("List-Unsubscribe") === "One-Click"');
    expect(unsubscribe).toContain('status: "unsubscribed"');
    expect(mailer).toContain('"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"');
    expect(mailer).toContain('tag !== "newsletter_personalized_digest"');
  });
});
