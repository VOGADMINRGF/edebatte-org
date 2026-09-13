import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createInMemoryParticipationSignalReviewRuntimeRepo,
  createInMemoryRegionDataRepo,
  createInMemoryRegionSourceConnectionRuntimeRepo,
  setParticipationSignalReviewRuntimeRepoForTests,
  setRegionDataRepoForTests,
  setRegionSourceConnectionRuntimeRepoForTests,
} from "@features/region";

const directoryCatalogMocks = vi.hoisted(() => ({
  status: "ready" as "ready" | "missing" | "error",
  errorCode: null as string | null,
}));

vi.mock("@features/region", async () => {
  const actual = await vi.importActual<typeof import("@features/region")>(
    "@features/region",
  );
  return {
    ...actual,
    getOperationalRegionCatalog: () => {
      const catalog = actual.getOperationalRegionCatalog();
      return {
        ...catalog,
        sources: {
          ...catalog.sources,
          officialDirectory: {
            ...catalog.sources.officialDirectory,
            status: directoryCatalogMocks.status,
            isConnected: directoryCatalogMocks.status === "ready",
            recordCount:
              directoryCatalogMocks.status === "ready"
                ? catalog.sources.officialDirectory.recordCount
                : 0,
            message:
              directoryCatalogMocks.status === "ready"
                ? catalog.sources.officialDirectory.message
                : "Amtliche Verwaltungsanschriften sind nicht verfügbar.",
            errorCode: directoryCatalogMocks.errorCode,
          },
        },
      };
    },
  };
});

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<object>("next/navigation");
  return {
    ...actual,
    redirect: (...args: unknown[]) => navigationMocks.redirect(...args),
    useRouter: () => ({
      refresh: vi.fn(),
    }),
  };
});

import AdminRegionPage from "@/app/admin/region/page";

describe("admin-region-page.render", () => {
  beforeEach(() => {
    navigationMocks.redirect.mockClear();
    directoryCatalogMocks.status = "ready";
    directoryCatalogMocks.errorCode = null;
  });

  it("renders a connected regional operator workspace with contextual handoffs", async () => {
    setRegionDataRepoForTests(createInMemoryRegionDataRepo());
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );
    setRegionSourceConnectionRuntimeRepoForTests(
      createInMemoryRegionSourceConnectionRuntimeRepo({
        connections: [
          {
            id: "source-1",
            regionId: "bezirk-berlin-reinickendorf",
            label: "Bezirksamt Reinickendorf News",
            sourceType: "municipal_news",
            adapterId: "productive_regional_source",
            url: "https://reinickendorf.example/aktuelles",
            notes: "Explizite Verwaltungsquelle",
            enabled: true,
            sampleItems: [
              {
                title: "Schulwege im Bezirk",
                summary: "Verwaltung informiert über Schulwegsicherheit.",
                url: "https://reinickendorf.example/aktuelles/schulwege",
                detectedTopics: ["Schule", "Verkehr"],
              },
            ],
            sourceSnapshotTemplate: {
              id: "region-source-snapshot-template-source-1",
              label: "Beispiel-Snapshot",
              mode: "template_plus_explicit_url",
              seedKind: "example_seed",
              seedKindLabel: "Beispiel-Seed",
              configuredUrl: "https://reinickendorf.example/aktuelles",
              isExampleSeed: true,
              reviewHint:
                "Explizite URL bleibt kontrolliert reviewpflichtig; hinterlegte Snapshot-Hinweise halten den Demo-/Pilotstand reproduzierbar, ohne Live-Crawler oder automatische Veröffentlichung.",
              noLiveCrawlerClaim: true,
              noScraping: true,
              noDeepSearchAutoCosts: true,
              noAutoPublish: true,
              noPublicOfficial: true,
            },
            createdAt: "2026-05-19T00:00:00.000Z",
            updatedAt: "2026-05-19T00:00:00.000Z",
            createdBy: "admin-1",
            updatedBy: "admin-1",
            reviewRequired: true,
            noLiveCrawlerClaim: true,
            noScraping: true,
            noDeepSearchAutoCosts: true,
          },
        ],
        results: [
          {
            id: "source-result-1",
            connectionId: "source-1",
            regionId: "bezirk-berlin-reinickendorf",
            connectionLabel: "Bezirksamt Reinickendorf News",
            sourceType: "municipal_news",
            adapterId: "productive_regional_source",
            resultMode: "dry_run",
            title: "Bezirksamt Reinickendorf News · Dry Run",
            summary: "Explizite URL vorbereitet und reviewpflichtig ausgewertet.",
            configuredUrl: "https://reinickendorf.example/aktuelles",
            detectedTopics: ["Schule", "Verkehr"],
            visibilityState: "internal_review",
            visibilityLabel: "reviewpflichtig",
            reviewStatus: "needs_review",
            confidence: 0.68,
            sourceSnapshotStatus: "fetched",
            sourceSnapshotTitle: "Schulsanierung in Reinickendorf",
            sourceSnapshotSummary:
              "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit und Sanierungsbedarf.",
            sourceSnapshotExcerpt:
              "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit an mehreren Standorten.",
            sourceSnapshotTemplate: {
              id: "region-source-snapshot-template-source-1",
              label: "Beispiel-Snapshot",
              mode: "template_plus_explicit_url",
              seedKind: "example_seed",
              seedKindLabel: "Beispiel-Seed",
              configuredUrl: "https://reinickendorf.example/aktuelles",
              isExampleSeed: true,
              reviewHint:
                "Explizite URL bleibt kontrolliert reviewpflichtig; hinterlegte Snapshot-Hinweise halten den Demo-/Pilotstand reproduzierbar, ohne Live-Crawler oder automatische Veröffentlichung.",
              noLiveCrawlerClaim: true,
              noScraping: true,
              noDeepSearchAutoCosts: true,
              noAutoPublish: true,
              noPublicOfficial: true,
              claimCandidates: [],
              topicCandidates: [],
              evidenceHints: [],
              openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
            },
            possibleClaims: [
              {
                text: "Schulsanierung in Reinickendorf",
                confidence: 0.74,
                basisLabel: "Titel",
                excerpt:
                  "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit an mehreren Standorten.",
                reviewRequired: true,
              },
            ],
            topicClusters: [
              {
                clusterKey: "bildung-schule",
                label: "Schule Reinickendorf",
                signalSeedIds: ["region-source-feed-signal-source-1-1"],
                openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
                confidence: 0.68,
                suggestedAction: "ask_clarifying_question",
                reviewStatus: "needs_review",
              },
            ],
            dossierSuggestions: [
              {
                title: "Berlin Reinickendorf: Schule",
                signalSeedIds: ["region-source-feed-signal-source-1-1"],
                openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
                confidence: 0.68,
                reviewStatus: "needs_review",
              },
            ],
            anlassraumSuggestions: [
              {
                title: "Schule Berlin Reinickendorf",
                signalSeedIds: ["region-source-feed-signal-source-1-1"],
                openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
                confidence: 0.68,
                reviewStatus: "needs_review",
              },
            ],
            evidenceReferences: [
              {
                label: "Seitenauszug · Schulsanierung in Reinickendorf",
                url: "https://reinickendorf.example/aktuelles",
                excerpt:
                  "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit an mehreren Standorten.",
              },
            ],
            openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
            affectedScope: {
              regionName: "Berlin Reinickendorf",
              detectedPlaces: ["Berlin Reinickendorf"],
              ortsteilHints: [],
              fachbereichHints: ["Schule/Bildung", "Schule", "Verkehr"],
            },
            reviewSuggestions: [],
            reviewTaskSummary: {
              claimCount: 1,
              topicClusterCount: 1,
              dossierSuggestionCount: 1,
              anlassraumSuggestionCount: 1,
              openQuestionCount: 1,
              evidenceCount: 1,
              label:
                "1 mögliche Aussagen · 1 Themencluster · 1 Dossier-Vorschläge · 1 Anlassraum-Vorschläge · 1 offene Fragen",
            },
            createdAt: "2026-05-19T00:00:00.000Z",
            updatedAt: "2026-05-19T00:00:00.000Z",
            testedBy: "admin-1",
            reviewRequired: true,
            noAutoPublish: true,
            noPublicOfficial: true,
          },
        ],
      }),
    );
    const html = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: {
          regionId: "berlin-reinickendorf",
        },
      }),
    );

    expect(html).toContain('data-testid="admin-region-page"');
    expect(html).toContain('data-testid="admin-region-selector"');
    expect(html).toContain('data-testid="admin-region-operational-summary"');
    expect(html).toContain('data-testid="admin-region-context"');
    expect(html).toContain('data-testid="admin-region-profile"');
    expect(html).toContain('data-testid="admin-region-experience"');
    expect(html).toContain('data-testid="admin-region-next-action"');
    expect(html).toContain('data-testid="admin-region-quick-actions"');
    expect(html).toContain('data-testid="admin-region-workspace-navigation"');
    expect(html).toContain('data-testid="admin-region-lagebild"');
    expect(html).toContain("Region wechseln");
    expect(html).toContain('type="search"');
    expect(html).toContain('name="regionQuery"');
    expect(html).toContain(">Region suchen</span>");
    expect(html).not.toContain("<datalist");
    expect(html).not.toContain("<option");
    expect(html).not.toContain('role="combobox"');
    expect(html).toContain("placeholder:text-[rgb(var(--muted))]");
    expect(html).toContain("focus:ring-2");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("dark:text-cyan-200");
    expect(html).toContain("dark:bg-amber-950/50");
    expect(html).toContain('class="no-grad ');
    expect(html).not.toContain("from-cyan-50");
    expect(html).not.toContain("bg-white");
    expect(html).toContain('action="/admin/region"');
    expect(html).toContain('method="get"');
    expect(html).toContain("Berlin Reinickendorf");
    expect(html).toContain("Operatives Lagebild");
    expect(html).toContain("Relevantestes regionales Signal");
    expect(html).toContain("Quellenbasis und Aktualität");
    expect(html).toContain("Belastbarkeit:");
    expect(html).toContain("Review- und Recherchebedarf");
    expect(html).toContain("Arbeitspriorität:");
    expect(html).toContain("offene Frage");
    expect(html).toContain("Bezirksamt Reinickendorf");
    expect(html).toContain("bereits erprobt");
    expect(html).toContain("teilweise vorbereitet");
    expect(html).toContain("noch ohne Erfahrung");
    expect(html).toContain("manuelle Freigabe erforderlich");
    expect(html).toContain("<strong");
    expect(html).toContain("Grundlage:");
    expect(html).toContain("Lücke:");
    expect(html).toContain("Pilot-/Fixture-Daten enthalten");
    expect(html).toContain("Genau eine nächste Aktion");
    expect(html.match(/data-testid="admin-region-primary-action"/g)).toHaveLength(1);
    expect(html).toContain(
      "min-h-11 items-center justify-center rounded-full bg-[rgb(var(--grad-from))]",
    );
    expect(html).toContain(
      "text-[rgb(var(--fg))] focus:outline-none focus-visible:ring-2",
    );
    expect(html).toContain("dark:text-[rgb(var(--bg))]");
    expect(
      html.match(/data-testid="admin-region-quick-action-[^"]+"/g),
    ).toHaveLength(5);
    expect(html).toContain("Quellen sammeln");
    expect(html).toContain("Recherche vertiefen");
    expect(html).toContain("Beitrag erstellen");
    expect(html).toContain("Dossier vorbereiten");
    expect(html).toContain("Kampagne planen");
    expect(html).toContain('data-testid="admin-region-quick-action-sources"');
    expect(html).toContain('data-testid="admin-region-quick-action-research"');
    expect(html).toContain('data-testid="admin-region-quick-action-create"');
    expect(html).toContain('data-testid="admin-region-quick-action-dossier"');
    expect(html).toContain('data-testid="admin-region-quick-action-marketing"');
    expect(html.indexOf('data-testid="admin-region-operational-summary"')).toBeLessThan(
      html.indexOf('data-testid="admin-region-profile"'),
    );
    expect(html.indexOf('data-testid="admin-region-operational-summary"')).toBeLessThan(
      html.indexOf('data-testid="admin-region-experience"'),
    );
    expect(html).toContain("Lagebild");
    expect(html).toContain("Quellen &amp; Feeds");
    expect(html).toContain("Recherche");
    expect(html).toContain("Claims &amp; Dossiers");
    expect(html).toContain("Beiträge &amp; Veröffentlichung");
    expect(html).toContain("Regionale Kampagnen");
    expect(html).toContain("Einstellungen &amp; Zugriff");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-w-max");
    expect(html).toContain(
      "inline-flex min-h-11 items-center rounded-full bg-[rgb(var(--fg))]",
    );
    expect(html).toContain("break-words");
    for (const view of [
      "lagebild",
      "quellen",
      "recherche",
      "claims",
      "beitraege",
      "kampagnen",
      "einstellungen",
    ]) {
      expect(html).toContain(
        `regionId=berlin-reinickendorf&amp;view=${view}`,
      );
    }
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain("Detailroute");
    expect(html).not.toContain("regionId=...");
    expect(html).not.toContain("Contract");
    expect(html).not.toContain("Auto-Publish aktiv");
    expect(html).not.toContain("Recherche startet automatisch");
    expect(html).not.toContain("wird automatisch veröffentlicht");
    expect(html).not.toContain("Draft wird automatisch erstellt");
    expect(html).not.toContain("Dossier wird automatisch erstellt");
    expect(html).not.toContain("Provider wird automatisch aktiviert");

    const sourcesHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "berlin-reinickendorf", view: "quellen" },
      }),
    );
    expect(sourcesHtml).toContain('data-testid="admin-region-quellen"');
    expect(sourcesHtml).toContain('data-testid="admin-region-source-connections"');
    expect(sourcesHtml).toContain("Eine konkrete regionale Quelle aufnehmen");
    expect(sourcesHtml).toContain("Quelle hinzufügen");
    expect(sourcesHtml).toContain("Quelle testen");
    expect(sourcesHtml).toContain("Claims, Themen und Übergaben prüfen");
    expect(sourcesHtml).toContain("Pilot-Snapshot und Grenzen");

    const researchHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "berlin-reinickendorf", view: "recherche" },
      }),
    );
    expect(researchHtml).toContain('data-testid="admin-region-recherche"');
    expect(researchHtml).toContain('data-testid="admin-region-research-handoff"');
    expect(researchHtml).toContain("es startet kein Provideraufruf, Crawling oder Scraping.");
    expect(researchHtml).toContain(
      'href="/admin/research/tasks?regionId=berlin-reinickendorf',
    );
    expect(researchHtml).toContain("origin=admin-region");
    expect(researchHtml).toContain("topic=");
    expect(researchHtml).toContain("source=Bezirksamt+Reinickendorf+News");

    const claimsHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "berlin-reinickendorf", view: "claims" },
      }),
    );
    expect(claimsHtml).toContain('data-testid="admin-region-claims"');
    expect(claimsHtml).toContain("Schulsanierung in Reinickendorf");
    expect(claimsHtml).toContain("Übersetzung ist keine Evidenz");
    expect(claimsHtml).toContain("Kein Vorschlag erzeugt automatisch ein Dossier.");
    expect(claimsHtml).toContain("regionId=bezirk-berlin-reinickendorf");

    const contributionsHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "berlin-reinickendorf", view: "beitraege" },
      }),
    );
    expect(contributionsHtml).toContain('data-testid="admin-region-beitraege"');
    expect(contributionsHtml).toContain('data-testid="admin-region-create-handoff"');
    expect(contributionsHtml).toContain("Interner Beitrag");
    expect(contributionsHtml).toContain("Externe Veröffentlichung");
    expect(contributionsHtml).toContain("/create?source=admin_region");
    expect(contributionsHtml).toContain("region=berlin-reinickendorf");
    expect(html).toContain('data-testid="admin-region-quick-action-dossier"');
    expect(html).toContain(
      "reason=Dossier+aus+regionalem+Quellen-+und+Themenkontext+vorbereiten",
    );

    const campaignsHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "berlin-reinickendorf", view: "kampagnen" },
      }),
    );
    expect(campaignsHtml).toContain('data-testid="admin-region-kampagnen"');
    expect(campaignsHtml).toContain('data-testid="admin-region-marketing-handoff"');
    expect(campaignsHtml).toContain("als gefahrlos ignorierbarer Kontext übergeben");
    expect(campaignsHtml).toContain("keine verifizierten Kampagnen- oder Performancewerte");
    expect(campaignsHtml).toContain("/admin/marketing?lang=de");
    expect(campaignsHtml).toContain("reach=regional");
    expect(campaignsHtml).toContain("segment=b2g");
    expect(campaignsHtml).toContain("region=berlin-reinickendorf");
    expect(campaignsHtml).toContain("origin=admin-region");

    const settingsHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "berlin-reinickendorf", view: "einstellungen" },
      }),
    );
    expect(settingsHtml).toContain('data-testid="admin-region-einstellungen"');
    expect(settingsHtml).toContain('data-testid="admin-region-access-summary"');
    expect(settingsHtml).toContain('data-testid="admin-region-guardrails"');
    expect(settingsHtml).toContain("Keine automatische Recherche");
    expect(settingsHtml).toContain("Leitlinienmatrix Berlin / Bürgerbeteiligung");

    const allViewsHtml = [
      html,
      sourcesHtml,
      researchHtml,
      claimsHtml,
      contributionsHtml,
      campaignsHtml,
      settingsHtml,
    ].join("");
    expect(allViewsHtml).not.toContain('href="#"');
    expect(allViewsHtml.match(/data-testid="admin-region-primary-action"/g)).toHaveLength(7);
  });

  it("changes the profile and experience truth when the selected region changes", async () => {
    setRegionDataRepoForTests(createInMemoryRegionDataRepo());
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );
    setRegionSourceConnectionRuntimeRepoForTests(
      createInMemoryRegionSourceConnectionRuntimeRepo(),
    );

    const reinickendorfHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "berlin-reinickendorf" },
      }),
    );
    const magdeburgHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionId: "magdeburg" },
      }),
    );

    expect(reinickendorfHtml).toContain("Berlin Reinickendorf");
    expect(magdeburgHtml).toContain("Magdeburg");
    expect(magdeburgHtml).toContain(">Magdeburg</h1>");
    expect(magdeburgHtml).toContain(
      'name="regionId" value="kommune-magdeburg"',
    );
    expect(magdeburgHtml).toContain("Erste regionale Quelle vorbereiten");
    expect(magdeburgHtml).toContain("noch ohne Erfahrung");
    expect(reinickendorfHtml).not.toEqual(magdeburgHtml);
  });

  it("renders an honest searchable entry state when regionId is missing", async () => {
    setRegionDataRepoForTests(createInMemoryRegionDataRepo());
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );

    const html = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: {},
      }),
    );

    expect(html).toContain('data-testid="admin-region-selector"');
    expect(html).toContain('data-testid="admin-region-empty-profile"');
    expect(html).toContain("Noch kein Regionsprofil ausgewählt");
    expect(html).toContain("Gib einen Namen, eine Regions-ID, AGS, ARS");
    expect(html).not.toContain('data-testid="admin-region-search-result"');
    expect(html).not.toContain("<datalist");
    expect(html).not.toContain("<option");
    expect(html).not.toContain('data-testid="admin-region-workspace-navigation"');
    expect(navigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("renders at most 40 accessible server-side results without catalog payload", async () => {
    setRegionDataRepoForTests(createInMemoryRegionDataRepo());
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );

    const noQueryHtml = renderToStaticMarkup(
      await AdminRegionPage({ searchParams: {} }),
    );
    const broadSearchHtml = renderToStaticMarkup(
      await AdminRegionPage({ searchParams: { regionQuery: "a" } }),
    );
    const hamburgNameHtml = renderToStaticMarkup(
      await AdminRegionPage({ searchParams: { regionQuery: "Hamburg" } }),
    );
    const hamburgAgsHtml = renderToStaticMarkup(
      await AdminRegionPage({ searchParams: { regionQuery: "02000000" } }),
    );
    const hamburgArsHtml = renderToStaticMarkup(
      await AdminRegionPage({ searchParams: { regionQuery: "020000000000" } }),
    );
    const longLabelHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionQuery: "Verwaltungsgemeinschaft" },
      }),
    );
    const resultCount = (
      broadSearchHtml.match(/data-testid="admin-region-search-result"/g) ?? []
    ).length;

    expect(noQueryHtml).not.toContain('data-testid="admin-region-search-result"');
    expect(noQueryHtml).not.toContain("Berlin Reinickendorf · Bezirk");
    expect(broadSearchHtml).toContain(
      "die ersten 40 Ergebnisse werden angezeigt",
    );
    expect(resultCount).toBe(40);
    expect(broadSearchHtml.length).toBeLessThan(250_000);
    for (const html of [
      noQueryHtml,
      broadSearchHtml,
      hamburgNameHtml,
      hamburgAgsHtml,
      hamburgArsHtml,
      longLabelHtml,
    ]) {
      expect(html).not.toContain("<datalist");
      expect(html).not.toContain("<option");
      expect(html).not.toContain('role="combobox"');
    }
    expect(broadSearchHtml).toContain('role="status"');
    expect(broadSearchHtml).toContain('aria-label="Gefundene Regionen"');
    expect(broadSearchHtml).toContain(">Region suchen</span>");
    expect(broadSearchHtml).toContain("min-w-0");
    expect(broadSearchHtml).toContain("break-words");
    expect(hamburgNameHtml).toContain("Hamburg");
    for (const html of [hamburgAgsHtml, hamburgArsHtml]) {
      expect(html).toContain("regionId=region-official-02000000");
      expect(html).toContain("Exakter Identitätstreffer");
    }
    expect(longLabelHtml).toContain('data-testid="admin-region-search-result"');
    expect(longLabelHtml).toContain("break-words");
  });

  it("opens an official directory region by its stable ID", async () => {
    setRegionDataRepoForTests(createInMemoryRegionDataRepo());
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );

    const html = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: {
          regionId: "region-official-01001000",
        },
      }),
    );

    expect(html).toContain("Flensburg, Stadt");
    expect(html).toContain(
      'name="regionId" value="region-official-01001000"',
    );
    expect(html).toContain("Amtlicher Verzeichniseintrag");
    expect(html).not.toContain('data-testid="admin-region-empty-profile"');
    expect(html).not.toContain('role="alert"');
  });

  it("shows an honest visible diagnostic when the official directory is unavailable", async () => {
    setRegionDataRepoForTests(createInMemoryRegionDataRepo());
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );
    directoryCatalogMocks.status = "missing";
    directoryCatalogMocks.errorCode = "official_directory_not_found";

    const missingHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionQuery: "Berlin Reinickendorf" },
      }),
    );

    expect(missingHtml).toContain(
      'data-testid="admin-region-directory-diagnostic"',
    );
    expect(missingHtml).toContain('data-directory-status="missing"');
    expect(missingHtml).toContain(
      "Amtliches Verwaltungsverzeichnis nicht verfügbar",
    );
    expect(missingHtml).toContain(
      "nicht als vollständiges amtliches Verzeichnis",
    );
    expect(missingHtml).toContain("Diagnose: official_directory_not_found");
    expect(missingHtml).toContain('data-testid="admin-region-search-result"');
    expect(missingHtml).toContain("Berlin Reinickendorf");

    directoryCatalogMocks.status = "error";
    directoryCatalogMocks.errorCode =
      "official_directory_sheet_missing:Anschriften_31_01_2023";
    const errorHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionQuery: "Berlin Reinickendorf" },
      }),
    );

    expect(errorHtml).toContain('data-directory-status="error"');
    expect(errorHtml).toContain(
      "Amtliches Verwaltungsverzeichnis konnte nicht geladen werden",
    );
    expect(errorHtml).toContain("official_directory_sheet_missing");

    directoryCatalogMocks.status = "ready";
    directoryCatalogMocks.errorCode = null;
    const recoveredHtml = renderToStaticMarkup(
      await AdminRegionPage({
        searchParams: { regionQuery: "Berlin Reinickendorf" },
      }),
    );
    expect(recoveredHtml).not.toContain(
      'data-testid="admin-region-directory-diagnostic"',
    );
    expect(recoveredHtml).toContain("Berlin Reinickendorf");
  });
});
