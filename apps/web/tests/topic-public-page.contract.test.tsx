import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TopicPage from "@/app/topic/[slug]/page";
import { createInMemoryContentReleaseWorkbenchRepo, setContentReleaseWorkbenchRepoForTests } from "@features/contentReleaseWorkbench";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  userIsAdminDashboard: vi.fn(),
}));

vi.mock("@/lib/server/auth/sessionUser", () => ({
  getSessionUser: (...args: unknown[]) => mocks.getSessionUser(...args),
}));

vi.mock("@/lib/server/auth/admin", () => ({
  userIsAdminDashboard: (...args: unknown[]) => mocks.userIsAdminDashboard(...args),
}));

describe("/topic/[slug] public topic page target", () => {
  beforeEach(() => {
    mocks.getSessionUser.mockResolvedValue(null);
    mocks.userIsAdminDashboard.mockReturnValue(false);
    setContentReleaseWorkbenchRepoForTests(
      createInMemoryContentReleaseWorkbenchRepo({
        records: [
          {
            id: "topic-page-visible-1",
            sourceKind: "region_source_result",
            sourceResultId: "source-result-1",
            sourceReviewItemId: "region_source_result:source-result-1",
            regionId: "bezirk-berlin-reinickendorf",
            organizationId: "org-reinickendorf-1",
            targetType: "topic_page",
            targetId: "schulsanierung-im-bezirk-a1b2c3",
            title: "Schulsanierung im Bezirk",
            summary: "Leichter öffentlicher Themenpfad für den geprüften Arbeitsstand.",
            previewHref: "/topic/schulsanierung-im-bezirk-a1b2c3?previewTopicPage=1",
            publicHref: "/topic/schulsanierung-im-bezirk-a1b2c3",
            topicPageData: {
              title: "Schulsanierung im Bezirk",
              summary: "Leichter öffentlicher Themenpfad für den geprüften Arbeitsstand.",
              claimCandidates: [
                {
                  text: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
                  excerpt: "Mehrere Standorte melden Sanierungsbedarf.",
                },
              ],
              evidenceHints: [
                {
                  label: "Reinickendorf Quelle",
                  url: "https://reinickendorf.example/aktuelles",
                  excerpt: "Mehrere Standorte melden Sanierungsbedarf.",
                },
              ],
              openQuestions: ["Welche Standorte haben Priorität?"],
              reviewStatus: "review_required",
            },
            visibilityState: "public_reviewed",
            createdByUserId: "user-1",
            createdAt: "2026-05-20T08:00:00.000Z",
            updatedByUserId: "user-1",
            updatedAt: "2026-05-20T08:05:00.000Z",
            reviewRequired: true,
            noAutoPublish: true,
            noPublicOfficial: true,
            noSocialPublishing: true,
            noAutomaticOfficialResponse: true,
            noAutoFinalization: true,
            revokable: true,
            archivable: true,
          },
          {
            id: "topic-page-dossier-1",
            sourceKind: "region_source_result",
            sourceResultId: "source-result-1",
            sourceReviewItemId: "region_source_result:source-result-1",
            regionId: "bezirk-berlin-reinickendorf",
            organizationId: "org-reinickendorf-1",
            targetType: "dossier",
            targetId: "dossier-topic-1",
            title: "Dossier Schulsanierung",
            summary: "Vertiefendes Dossier.",
            previewHref: "/dossier/dossier-topic-1/studio",
            publicHref: "/dossier/dossier-topic-1",
            topicPageData: null,
            visibilityState: "public_unverified",
            createdByUserId: "user-1",
            createdAt: "2026-05-20T08:00:00.000Z",
            updatedByUserId: "user-1",
            updatedAt: "2026-05-20T08:05:00.000Z",
            reviewRequired: true,
            noAutoPublish: true,
            noPublicOfficial: true,
            noSocialPublishing: true,
            noAutomaticOfficialResponse: true,
            noAutoFinalization: true,
            revokable: true,
            archivable: true,
          },
          {
            id: "topic-page-anlass-1",
            sourceKind: "region_source_result",
            sourceResultId: "source-result-1",
            sourceReviewItemId: "region_source_result:source-result-1",
            regionId: "bezirk-berlin-reinickendorf",
            organizationId: "org-reinickendorf-1",
            targetType: "anlassraum",
            targetId: "65f000000000000000000321",
            title: "Anlassraum Schulsanierung",
            summary: "Öffentlicher Gesprächsraum.",
            previewHref: "/runden?view=active&anlassraumId=65f000000000000000000321",
            publicHref: "/anlassraum?anlassraumId=65f000000000000000000321",
            topicPageData: null,
            visibilityState: "internal_review",
            createdByUserId: "user-1",
            createdAt: "2026-05-20T08:00:00.000Z",
            updatedByUserId: "user-1",
            updatedAt: "2026-05-20T08:05:00.000Z",
            reviewRequired: true,
            noAutoPublish: true,
            noPublicOfficial: true,
            noSocialPublishing: true,
            noAutomaticOfficialResponse: true,
            noAutoFinalization: true,
            revokable: true,
            archivable: true,
          },
          {
            id: "topic-page-hidden-1",
            sourceKind: "create_handoff",
            sourceResultId: "create-handoff-hidden-1",
            sourceReviewItemId: "create_handoff:create-handoff-hidden-1",
            regionId: "bezirk-berlin-reinickendorf",
            organizationId: "org-reinickendorf-1",
            targetType: "topic_page",
            targetId: "verdeckte-themenseite-d4e5f6",
            title: "Verdeckte Themenseite",
            summary: "Nur als interne Vorschau sichtbar.",
            previewHref: "/topic/verdeckte-themenseite-d4e5f6?previewTopicPage=1",
            publicHref: "/topic/verdeckte-themenseite-d4e5f6",
            topicPageData: {
              title: "Verdeckte Themenseite",
              summary: "Nur als interne Vorschau sichtbar.",
              claimCandidates: [],
              evidenceHints: [],
              openQuestions: ["Was muss vor Sichtbarkeit noch geprüft werden?"],
              reviewStatus: "review_required",
            },
            visibilityState: "internal_review",
            createdByUserId: "user-1",
            createdAt: "2026-05-20T08:10:00.000Z",
            updatedByUserId: "user-1",
            updatedAt: "2026-05-20T08:11:00.000Z",
            reviewRequired: true,
            noAutoPublish: true,
            noPublicOfficial: true,
            noSocialPublishing: true,
            noAutomaticOfficialResponse: true,
            noAutoFinalization: true,
            revokable: true,
            archivable: true,
          },
          {
            id: "topic-page-archived-1",
            sourceKind: "region_source_result",
            sourceResultId: "source-result-archived-1",
            sourceReviewItemId: "region_source_result:source-result-archived-1",
            regionId: "bezirk-berlin-reinickendorf",
            organizationId: "org-reinickendorf-1",
            targetType: "topic_page",
            targetId: "archivierte-themenseite-a7b8c9",
            title: "Archivierte Themenseite",
            summary: "War sichtbar und ist nun archiviert.",
            previewHref: "/topic/archivierte-themenseite-a7b8c9?previewTopicPage=1",
            publicHref: "/topic/archivierte-themenseite-a7b8c9",
            topicPageData: {
              title: "Archivierte Themenseite",
              summary: "War sichtbar und ist nun archiviert.",
              claimCandidates: [],
              evidenceHints: [],
              openQuestions: [],
              reviewStatus: "reviewed",
            },
            visibilityState: "archived",
            createdByUserId: "user-1",
            createdAt: "2026-05-20T08:12:00.000Z",
            updatedByUserId: "user-1",
            updatedAt: "2026-05-20T08:13:00.000Z",
            reviewRequired: true,
            noAutoPublish: true,
            noPublicOfficial: true,
            noSocialPublishing: true,
            noAutomaticOfficialResponse: true,
            noAutoFinalization: true,
            revokable: true,
            archivable: true,
          },
          {
            id: "topic-page-blocked-1",
            sourceKind: "region_source_result",
            sourceResultId: "source-result-blocked-1",
            sourceReviewItemId: "region_source_result:source-result-blocked-1",
            regionId: "bezirk-berlin-reinickendorf",
            organizationId: "org-reinickendorf-1",
            targetType: "topic_page",
            targetId: "blockierte-themenseite-g1h2i3",
            title: "Blockierte Themenseite",
            summary: "Nicht öffentlich verfügbar.",
            previewHref: "/topic/blockierte-themenseite-g1h2i3?previewTopicPage=1",
            publicHref: "/topic/blockierte-themenseite-g1h2i3",
            topicPageData: {
              title: "Blockierte Themenseite",
              summary: "Nicht öffentlich verfügbar.",
              claimCandidates: [],
              evidenceHints: [],
              openQuestions: [],
              reviewStatus: "review_required",
            },
            visibilityState: "blocked",
            createdByUserId: "user-1",
            createdAt: "2026-05-20T08:14:00.000Z",
            updatedByUserId: "user-1",
            updatedAt: "2026-05-20T08:15:00.000Z",
            reviewRequired: true,
            noAutoPublish: true,
            noPublicOfficial: true,
            noSocialPublishing: true,
            noAutomaticOfficialResponse: true,
            noAutoFinalization: true,
            revokable: true,
            archivable: true,
          },
        ],
      }),
    );
  });

  it("renders the visible public topic page with status, claims, questions and related content", async () => {
    const html = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ slug: "schulsanierung-im-bezirk-a1b2c3" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Öffentliche Themenseite");
    expect(html).toContain("Schulsanierung im Bezirk");
    expect(html).toContain("geprüft");
    expect(html).toContain("Sichtbar heißt nicht automatisch amtlich.");
    expect(html).toContain("Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.");
    expect(html).toContain("Welche Standorte haben Priorität?");
    expect(html).toContain("Reinickendorf Quelle");
    expect(html).toContain("Dossier Schulsanierung");
    expect(html).toContain("Anlassraum Schulsanierung");
    expect(html).toContain("Vertiefung ist vorbereitet, aber noch nicht öffentlich sichtbar.");
    expect(html).toContain("Hinweis ergänzen");
    expect(html).toContain("Quelle ergänzen");
    expect(html).toContain("Share-Link");
    expect(html).toContain("QR-Link");
    expect(html).toContain("/qr-studio?caller=public_topic_page&amp;target=");
  });

  it("allows an internal preview for a hidden topic page only with explicit preview access", async () => {
    mocks.getSessionUser.mockResolvedValue({
      _id: { toHexString: () => "admin-1" },
      roles: ["admin"],
      sessionValid: true,
    });
    mocks.userIsAdminDashboard.mockReturnValue(true);

    const html = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ slug: "verdeckte-themenseite-d4e5f6" }),
        searchParams: Promise.resolve({ previewTopicPage: "1" }),
      }),
    );

    expect(html).toContain("Vorschau");
    expect(html).toContain("Verdeckte Themenseite");
    expect(html).toContain("Was muss vor Sichtbarkeit noch geprüft werden?");
    expect(html).not.toContain("QR-Link");
  });

  it("shows a public holding state for hidden topic pages without preview access", async () => {
    const html = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ slug: "verdeckte-themenseite-d4e5f6" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Themenseite in Vorbereitung");
    expect(html).toContain("Verdeckte Themenseite");
    expect(html).toContain("noch nicht öffentlich sichtbar");
    expect(html).not.toContain("/qr-studio?target=");
    expect(html).not.toContain(">Öffentliche URL<");
    expect(html).not.toContain("Was muss vor Sichtbarkeit noch geprüft werden?");
  });

  it("renders archived and blocked topic states without public share affordances", async () => {
    const archivedHtml = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ slug: "archivierte-themenseite-a7b8c9" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const blockedHtml = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ slug: "blockierte-themenseite-g1h2i3" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(archivedHtml).toContain("Themenseite archiviert");
    expect(archivedHtml).toContain("Öffentliche URL, Share-Link und QR bleiben deshalb deaktiviert.");
    expect(archivedHtml).not.toContain("/qr-studio?target=");
    expect(blockedHtml).toContain("Themenseite derzeit nicht öffentlich verfügbar");
    expect(blockedHtml).toContain("Dieser Themenstand ist aktuell blockiert.");
    expect(blockedHtml).not.toContain(">Öffentliche URL<");
  });

  it("returns not found for unknown slugs without topic target or legacy topic", async () => {
    await expect(
      TopicPage({
        params: Promise.resolve({ slug: "unbekanntes-thema-ohne-zielpfad" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toBeTruthy();
  });
});
