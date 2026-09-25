import Link from "next/link";
import type {
  DirectorySourceStatus,
  OperationalRegionSearchResult,
  Region,
  RegionalAdminCockpitReadModel,
} from "@features/region";
import {
  getOperationalRegionCatalog,
  getRegionalAdminCockpitReadModel,
  organizationVerificationStatusLabel,
  regionEntitlementReasonLabel,
  regionEntitlementStatusLabel,
  regionFeedSignalOriginLabel,
  regionReviewStatusLabel,
  resolveOperationalRegion,
  searchOperationalRegions,
} from "@features/region";
import { RegionSourceConnectionsPanel } from "./RegionSourceConnectionsPanel";

type SearchParamsShape =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

const WORKSPACE_VIEWS = [
  { id: "lagebild", label: "Lagebild" },
  { id: "quellen", label: "Quellen & Feeds" },
  { id: "recherche", label: "Recherche" },
  { id: "claims", label: "Claims & Dossiers" },
  { id: "beitraege", label: "Beiträge & Veröffentlichung" },
  { id: "kampagnen", label: "Regionale Kampagnen" },
  { id: "einstellungen", label: "Einstellungen & Zugriff" },
] as const;

type WorkspaceView = (typeof WORKSPACE_VIEWS)[number]["id"];

type ExperienceStatus =
  | "bereits erprobt"
  | "teilweise vorbereitet"
  | "noch ohne Erfahrung"
  | "manuelle Freigabe erforderlich";

type ExperienceEntry = {
  label: string;
  status: ExperienceStatus;
  basis: string;
  gap: string;
};

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function firstParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function resolveView(value: string | null): WorkspaceView {
  return WORKSPACE_VIEWS.some((entry) => entry.id === value)
    ? (value as WorkspaceView)
    : "lagebild";
}

function withQuery(path: string, values: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return `${path}?${query.toString()}`;
}

function workspaceHref(region: string, view: WorkspaceView) {
  return withQuery("/admin/region", { regionId: region, view });
}

function researchHref(
  region: string,
  params: { topic?: string | null; source?: string | null },
) {
  return withQuery("/admin/research/tasks", {
    regionId: region,
    topic: params.topic,
    source: params.source,
    origin: "admin-region",
  });
}

function createHref(
  region: string,
  params: { signalTitle?: string | null; topic?: string | null; reason: string },
) {
  return withQuery("/create", {
    source: "admin_region",
    signalTitle: params.signalTitle,
    region,
    scope: "regional",
    clusterHint: params.topic,
    reviewState: "needs_review",
    reason: params.reason,
  });
}

function marketingHref(
  region: string,
  params: { topic?: string | null; content?: string | null },
) {
  return withQuery("/admin/marketing", {
    lang: "de",
    segment: "b2g",
    reach: "regional",
    region,
    topic: params.topic,
    content: params.content,
    origin: "admin-region",
  });
}

function reviewHref(region: string) {
  return withQuery("/admin/review", { regionId: region });
}

function latestDateLabel(values: Array<string | null | undefined>) {
  const latestTimestamp = values.reduce<number | null>((latest, value) => {
    if (!value) return latest;
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return latest;
    return latest == null || timestamp > latest ? timestamp : latest;
  }, null);

  if (latestTimestamp == null) return null;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(latestTimestamp));
}

function regionTypeLabel(value: string) {
  switch (value) {
    case "bezirk":
      return "Bezirk";
    case "kommune":
      return "Kommune";
    case "land":
      return "Land";
    case "landkreis":
      return "Landkreis";
    case "quartier":
      return "Quartier";
    case "region":
      return "Region";
    default:
      return value;
  }
}

function regionOptionLabel(region: Region) {
  const identifiers = [
    region.officialDirectoryEntry?.ags
      ? `AGS ${region.officialDirectoryEntry.ags}`
      : null,
    region.officialDirectoryEntry?.ars
      ? `ARS ${region.officialDirectoryEntry.ars}`
      : null,
  ].filter(Boolean);
  return [
    regionTypeLabel(region.type),
    region.officialBody?.label,
    ...identifiers,
    `ID ${region.id}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function experienceStatusClass(status: ExperienceStatus) {
  switch (status) {
    case "bereits erprobt":
      return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100";
    case "teilweise vorbereitet":
      return "border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-100";
    case "manuelle Freigabe erforderlich":
      return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100";
    default:
      return "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100";
  }
}

function sourceTypeLabel(value: string) {
  switch (value) {
    case "news":
      return "Nachrichtenhinweis";
    case "official_update":
      return "Verwaltungshinweis";
    case "community_signal":
      return "Community-Hinweis";
    case "feed_draft":
      return "Feed-Entwurf";
    case "public_claim":
      return "Öffentliche Aussage";
    case "public_contribution":
      return "Öffentlicher Beitrag";
    case "public_question":
      return "Öffentliche Frage";
    case "public_source_hint":
      return "Öffentlicher Quellenhinweis";
    default:
      return "Manueller Hinweis";
  }
}

function suggestedActionLabel(value: string) {
  switch (value) {
    case "create_anlassraum":
      return "Anlassraum-Vorschlag prüfen";
    case "attach_to_anlassraum":
      return "Anlassraum-Zuordnung prüfen";
    case "create_dossier":
      return "Dossier-Vorschlag prüfen";
    case "attach_source_to_dossier":
      return "Quelle einem Dossier zuordnen";
    case "ask_clarifying_question":
      return "Offene Frage klären";
    default:
      return "Im Review einordnen";
  }
}

function authoritySourceLabel(
  value: RegionalAdminCockpitReadModel["accessSummary"]["authoritySource"],
) {
  switch (value) {
    case "admin_fallback":
      return "Globale Adminsicht";
    case "verified_membership":
      return "Verifizierte Behördenzuordnung";
    default:
      return "Unverifizierter Regionshinweis";
  }
}

function RegionSelector(props: {
  selectedRegion: Region | null;
  directoryStatus: DirectorySourceStatus;
  search: OperationalRegionSearchResult;
  regionTypeCounts: Array<{ type: string; count: number }>;
  invalidSelection?: string | null;
}) {
  return (
    <section
      data-testid="admin-region-selector"
      className={
        props.selectedRegion
          ? "rounded-2xl border border-cyan-400/70 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--grad-from))_8%)] p-4 shadow-sm shadow-cyan-950/10 dark:border-cyan-500/60 dark:shadow-black/30"
          : "rounded-3xl border-2 border-cyan-400/80 bg-[linear-gradient(135deg,color-mix(in_oklab,rgb(var(--card))_86%,rgb(var(--grad-from))_14%),rgb(var(--card))_58%,rgb(var(--bg))_100%)] p-5 shadow-sm shadow-cyan-950/10 dark:border-cyan-500/60 dark:shadow-black/30 sm:p-7"
      }
    >
      <div
        className={
          props.selectedRegion
            ? "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-end"
            : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        }
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-900 dark:text-cyan-200">
            {props.selectedRegion ? "Region wechseln" : "Region zuerst"}
          </p>
          <h1
            className={
              props.selectedRegion
                ? "no-grad mt-1 break-words text-lg font-semibold text-[rgb(var(--fg))]"
                : "no-grad mt-2 break-words text-2xl font-semibold text-[rgb(var(--fg))] sm:text-3xl"
            }
          >
            {props.selectedRegion ? props.selectedRegion.name : "Region suchen und auswählen"}
          </h1>
          {!props.selectedRegion ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
              Suche in den vorhandenen Regionseinträgen. Erst danach zeigt der Arbeitsraum
              belegte Erfahrung, Lücken und die nächste sinnvolle Aktion für genau diese Region.
            </p>
          ) : null}
        </div>
        <form
          method="get"
          action="/admin/region"
          className={
            props.selectedRegion
              ? "flex min-w-0 flex-col gap-2 sm:flex-row"
              : "mt-5 flex flex-col gap-3 sm:flex-row lg:col-span-2"
          }
        >
            {props.selectedRegion ? (
              <input type="hidden" name="regionId" value={props.selectedRegion.id} />
            ) : null}
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-sm font-semibold text-[rgb(var(--fg))]">
                Region suchen
              </span>
              <input
                type="search"
                name="regionQuery"
                defaultValue={props.search.query}
                placeholder="z. B. Hamburg, 02000000 oder 020000000000"
                autoComplete="off"
                className="min-h-12 w-full rounded-2xl border border-cyan-500/80 bg-[rgb(var(--card))] px-4 text-base text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:border-cyan-500/70 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/40"
              />
            </label>
            <button
              type="submit"
              className={
                props.selectedRegion
                  ? "min-h-11 rounded-full border border-cyan-500 bg-[rgb(var(--card))] px-4 text-sm font-semibold text-[rgb(var(--fg))] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))]"
                  : "min-h-12 rounded-full bg-[rgb(var(--fg))] px-5 text-sm font-semibold text-[rgb(var(--bg))] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))]"
              }
            >
              Suchen
            </button>
        </form>
      </div>
      {props.directoryStatus.status !== "ready" ? (
        <div
          data-testid="admin-region-directory-diagnostic"
          data-directory-status={props.directoryStatus.status}
          role="status"
          className="mt-4 rounded-2xl border border-amber-400/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <p className="font-semibold">
            {props.directoryStatus.status === "missing"
              ? "Amtliches Verwaltungsverzeichnis nicht verfügbar"
              : "Amtliches Verwaltungsverzeichnis konnte nicht geladen werden"}
          </p>
          <p className="mt-1 leading-5">
            Registry und lokale Arbeitsregionen bleiben technisch verfügbar. Die Auswahl ist
            derzeit nicht als vollständiges amtliches Verzeichnis zu verstehen.
          </p>
          {props.directoryStatus.errorCode ? (
            <p className="mt-1 font-mono text-xs">
              Diagnose: {props.directoryStatus.errorCode}
            </p>
          ) : null}
        </div>
      ) : null}
      {props.search.query ? (
        <section
          aria-labelledby="admin-region-search-results-title"
          className="mt-5 min-w-0"
        >
          <p
            id="admin-region-search-results-title"
            role="status"
            className="text-sm font-semibold text-[rgb(var(--fg))]"
          >
            {props.search.totalMatches === 0
              ? `Keine Region für „${props.search.query}“ gefunden`
              : `${props.search.totalMatches} ${
                  props.search.totalMatches === 1 ? "Region" : "Regionen"
                } gefunden${
                  props.search.truncated
                    ? " – die ersten 40 Ergebnisse werden angezeigt"
                    : ""
                }`}
          </p>
          {props.search.results.length > 0 ? (
            <ul
              aria-label="Gefundene Regionen"
              className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2"
            >
              {props.search.results.map(({ region, matchKind }) => (
                <li
                  key={region.id}
                  data-testid="admin-region-search-result"
                  className="min-w-0"
                >
                  <Link
                    href={withQuery("/admin/region", {
                      regionId: region.id,
                      regionQuery: props.search.query,
                    })}
                    className="block min-w-0 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-[rgb(var(--fg))] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))]"
                  >
                    <span className="block break-words font-semibold">
                      {region.name}
                    </span>
                    <span className="mt-1 block break-words text-xs leading-5 text-[rgb(var(--muted))]">
                      {regionOptionLabel(region)}
                    </span>
                    {matchKind === "exact_identity" ? (
                      <span className="sr-only">Exakter Identitätstreffer</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted))]">
          Gib einen Namen, eine Regions-ID, AGS, ARS oder Verwaltungsbezeichnung ein.
          Es werden höchstens 40 Treffer angezeigt.
        </p>
      )}
      {!props.selectedRegion ? (
        <>
          {props.invalidSelection ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-amber-400/80 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100"
            >
              „{props.invalidSelection}“ ist kein vorhandener Regionseintrag. Bitte wähle einen
              Treffer aus der Suche.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-[rgb(var(--muted))]">
            {props.regionTypeCounts.map(({ type, count }) => (
                <span
                  key={type}
                  className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[rgb(var(--fg))]"
                >
                  {regionTypeLabel(type)} · {count}
                </span>
              ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function Card(props: {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <article
      data-testid={props.testId}
      className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"
    >
      {props.eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
          {props.eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-lg font-semibold text-[rgb(var(--fg))]">{props.title}</h2>
      {props.body ? <p className="mt-2 text-sm text-[rgb(var(--muted))]">{props.body}</p> : null}
      {props.children}
    </article>
  );
}

function ActionLink(props: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  testId?: string;
}) {
  return (
    <Link
      data-testid={props.testId}
      href={props.href}
      className={
        props.primary
          ? "inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--grad-from))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))] dark:text-[rgb(var(--bg))]"
          : "inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))]"
      }
    >
      {props.children}
    </Link>
  );
}

export default async function AdminRegionPage({
  searchParams,
}: {
  searchParams?: SearchParamsShape;
}) {
  const resolved = searchParams ? await searchParams : {};
  const selectedRegionId = firstParam(resolved.regionId);
  const regionQuery = firstParam(resolved.regionQuery) ?? "";
  const regionCatalog = getOperationalRegionCatalog();
  const search = searchOperationalRegions(regionCatalog, regionQuery);
  const typeCounts = new Map<string, number>();
  regionCatalog.regions.forEach((entry) => {
    typeCounts.set(entry.type, (typeCounts.get(entry.type) ?? 0) + 1);
  });
  const regionTypeCounts = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) =>
      regionTypeLabel(left.type).localeCompare(regionTypeLabel(right.type), "de"),
    );
  const region = selectedRegionId
    ? resolveOperationalRegion(regionCatalog, selectedRegionId)
    : null;

  if (!region) {
    return (
      <main
        data-testid="admin-region-page"
        className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8"
      >
        <RegionSelector
          selectedRegion={null}
          directoryStatus={regionCatalog.sources.officialDirectory}
          search={search}
          regionTypeCounts={regionTypeCounts}
          invalidSelection={selectedRegionId}
        />
        <section
          data-testid="admin-region-empty-profile"
          className="rounded-3xl border border-dashed border-[rgb(var(--border))] p-6"
        >
          <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">
            Noch kein Regionsprofil ausgewählt
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
            Ohne ausgewählte Region gibt es keine belastbare Aussage zu Erfahrung, Quellen,
            Themen oder Kampagnen. Wähle oben einen vorhandenen Eintrag aus.
          </p>
        </section>
      </main>
    );
  }

  const view = resolveView(firstParam(resolved.view));
  const cockpit = await getRegionalAdminCockpitReadModel(region.id);
  const regionContext = cockpit.region.slug || selectedRegionId;
  const feedSignals = toArray(cockpit.feedSignals);
  const topicClusters = toArray(cockpit.topicClusters);
  const openReviewItems = toArray(cockpit.openReviewItems);
  const sourceConnections = toArray(cockpit.sourceConnections);
  const sourceTestResults = toArray(cockpit.sourceTestResults);
  const communitySourceHints = toArray(cockpit.communitySourceHints);
  const suggestedDossiers = toArray(cockpit.suggestedDossiers);
  const suggestedAnlassraeume = toArray(cockpit.suggestedAnlassraeume);
  const activeDossiers = toArray(cockpit.activeDossiers);
  const activeAnlassraeume = toArray(cockpit.activeAnlassraeume);
  const participationSignals = toArray(cockpit.participationSignals);
  const communitySignals = toArray(cockpit.communitySignals);
  const activeSources = sourceConnections.filter((connection) => connection.enabled);
  const fixtureSignals = feedSignals.filter((signal) => signal.provenance.isFixture);
  const nonFixtureSignals = feedSignals.filter((signal) => !signal.provenance.isFixture);
  const topSignal = nonFixtureSignals[0] ?? feedSignals[0] ?? null;
  const topTopic = topSignal?.detectedTopics?.[0] ?? topicClusters[0]?.label ?? null;
  const topSource =
    sourceTestResults[0]?.connectionLabel ?? activeSources[0]?.label ?? null;
  const sourceAsOf = latestDateLabel([
    ...sourceConnections.map((connection) => connection.updatedAt),
    ...sourceTestResults.map((result) => result.updatedAt),
    ...feedSignals.map((signal) => signal.publishedAt),
  ]);
  const openQuestions = Array.from(
    new Set(
      [
        ...feedSignals.flatMap((signal) => signal.openQuestions),
        ...topicClusters.flatMap((cluster) => cluster.openQuestions),
        ...sourceTestResults.flatMap((result) => result.openQuestions),
      ].filter(Boolean),
    ),
  );
  const claimRows = sourceTestResults.flatMap((result) =>
    result.possibleClaims.map((claim) => ({ claim, result })),
  );
  const contributionCount = participationSignals.length + communitySignals.length;
  const experienceEntries: ExperienceEntry[] = [
    {
      label: "Quellen",
      status:
        sourceTestResults.length > 0
          ? "bereits erprobt"
          : sourceConnections.length > 0
            ? "teilweise vorbereitet"
            : "noch ohne Erfahrung",
      basis:
        sourceConnections.length > 0 || sourceTestResults.length > 0
          ? `${countLabel(sourceConnections.length, "hinterlegte Quellenverbindung", "hinterlegte Quellenverbindungen")}, ${countLabel(sourceTestResults.length, "kontrolliertes Prüfergebnis", "kontrollierte Prüfergebnisse")} im Regionsreadmodel.`
          : "Im Regionsreadmodel sind weder Quellenverbindungen noch Prüfergebnisse hinterlegt.",
      gap:
        sourceConnections.length === 0
          ? "Eine konkrete regionale Quelle fehlt."
          : sourceTestResults.length === 0
            ? "Die hinterlegte Quelle wurde noch nicht kontrolliert geprüft."
            : "Live-Anbindung und Veröffentlichung werden daraus nicht abgeleitet.",
    },
    {
      label: "Feeds & Themen",
      status:
        nonFixtureSignals.length > 0
          ? "bereits erprobt"
          : feedSignals.length > 0 || topicClusters.length > 0
            ? "teilweise vorbereitet"
            : "noch ohne Erfahrung",
      basis:
        feedSignals.length > 0
          ? `${countLabel(feedSignals.length, "Feed-Signal", "Feed-Signale")} und ${countLabel(topicClusters.length, "Themencluster", "Themencluster")}; davon ${fixtureSignals.length} als Pilot-/Fixture-Daten gekennzeichnet.`
          : "Keine Feed-Signale oder Themencluster für diese Region im Readmodel.",
      gap:
        fixtureSignals.length === feedSignals.length && feedSignals.length > 0
          ? "Es gibt noch kein nicht-fiktionales regionales Feed-Signal."
          : feedSignals.length === 0
            ? "Eine belegte regionale Themenlage fehlt."
            : "Offene Signale bleiben reviewpflichtig.",
    },
    {
      label: "Claims & Dossiers",
      status:
        activeDossiers.length > 0
          ? "bereits erprobt"
          : claimRows.length > 0 || suggestedDossiers.length > 0
            ? "teilweise vorbereitet"
            : "noch ohne Erfahrung",
      basis:
        activeDossiers.length > 0 || claimRows.length > 0 || suggestedDossiers.length > 0
          ? `${countLabel(claimRows.length, "Claim-Kandidat", "Claim-Kandidaten")}, ${countLabel(suggestedDossiers.length, "Dossier-Vorschlag", "Dossier-Vorschläge")} und ${countLabel(activeDossiers.length, "aktive Dossier-Referenz", "aktive Dossier-Referenzen")}.`
          : "Keine Claim-Kandidaten, Dossier-Vorschläge oder aktiven Dossier-Referenzen vorhanden.",
      gap:
        activeDossiers.length === 0
          ? "Noch kein regional belegtes Dossier im aktiven Referenzbestand."
          : "Aussagen und Zuordnungen benötigen weiterhin menschliches Review.",
    },
    {
      label: "Beiträge",
      status: contributionCount > 0 ? "teilweise vorbereitet" : "noch ohne Erfahrung",
      basis:
        contributionCount > 0
          ? `${countLabel(participationSignals.length, "Beteiligungssignal", "Beteiligungssignale")} und ${countLabel(communitySignals.length, "Community-Hinweis", "Community-Hinweise")} im regionalen Scope.`
          : "Keine regionalen Beteiligungssignale oder Community-Hinweise im Readmodel.",
      gap: "Interne Drafts und externe Veröffentlichungsstände sind hier nicht regional angebunden.",
    },
    {
      label: "Kampagnen",
      status: "manuelle Freigabe erforderlich",
      basis:
        "Das Regionsreadmodel enthält keine verifizierten Kampagnen- oder Performancewerte; nur die bestehende Marketing-Control-Plane ist erreichbar.",
      gap: "Der Regionenkontext wird als Filterhinweis übergeben; eine Kampagne entsteht erst im bestehenden Marketing-Review.",
    },
    {
      label: "Institutionen & Initiativen",
      status: cockpit.actorsSummary.total > 0 ? "teilweise vorbereitet" : "noch ohne Erfahrung",
      basis:
        cockpit.actorsSummary.total > 0
          ? `${countLabel(cockpit.actorsSummary.total, "Akteur", "Akteure")}, davon ${cockpit.actorsSummary.verified} verifiziert und ${cockpit.actorsSummary.officialDirectory} aus dem amtlichen Verzeichnis.`
          : "Keine Akteure für diese Region im vorhandenen Register.",
      gap: "Initiativen werden im Regionsreadmodel nicht als eigener belegter Bestand ausgewiesen.",
    },
    {
      label: "Sprachkontexte",
      status: "noch ohne Erfahrung",
      basis: `Das Regionsprofil belegt ${cockpit.region.country ?? "kein Land"}, enthält aber keine regionalen Sprachdaten.`,
      gap: "Ein belegter regionaler Sprachkontext ist noch nicht angebunden.",
    },
  ];
  const experienceCount = experienceEntries.filter(
    (entry) => entry.status === "bereits erprobt",
  ).length;
  const preparedCount = experienceEntries.filter(
    (entry) => entry.status === "teilweise vorbereitet",
  ).length;
  const emptyCount = experienceEntries.filter(
    (entry) => entry.status === "noch ohne Erfahrung",
  ).length;
  const nextAction =
    sourceConnections.length === 0
      ? {
          label: "Erste regionale Quelle vorbereiten",
          href: workspaceHref(regionContext, "quellen"),
          body: "Die größte belegte Lücke ist die fehlende Quellenbasis. Hinterlege zuerst genau eine nachvollziehbare regionale Quelle.",
        }
      : sourceTestResults.length === 0
        ? {
            label: "Hinterlegte Quelle kontrolliert prüfen",
            href: workspaceHref(regionContext, "quellen"),
            body: "Eine Verbindung ist vorbereitet, aber noch nicht geprüft. Führe den bestehenden kontrollierten Quellentest aus.",
          }
        : openReviewItems.length > 0
          ? {
              label: `${openReviewItems.length} regionale Hinweise im Lagebild prüfen`,
              href: `${workspaceHref(regionContext, "lagebild")}#region-signals`,
              body: "Quellenprüfung liegt vor. Als Nächstes müssen Herkunft, Regionbezug und Evidenz der offenen Hinweise lokal gesichtet werden.",
            }
          : claimRows.length > 0 && activeDossiers.length === 0
            ? {
                label: "Claim-Kandidaten für ein Dossier prüfen",
                href: workspaceHref(regionContext, "claims"),
                body: "Geprüfte Quellen liefern Claim-Kandidaten, aber noch kein aktives regionales Dossier.",
              }
            : {
                label: "Regionalen Beitrag bewusst vorbereiten",
                href: workspaceHref(regionContext, "beitraege"),
                body: "Die belegte Grundlage ist vorbereitet. Der nächste Schritt bleibt ein manueller interner Beitragsentwurf.",
              };
  const researchContextHref = researchHref(regionContext, {
    topic: topTopic,
    source: topSource,
  });
  const contributionHref = createHref(regionContext, {
    signalTitle: topSignal?.title,
    topic: topTopic,
    reason: "Internen regionalen Beitrag vorbereiten",
  });
  const dossierHref = createHref(regionContext, {
    signalTitle: claimRows[0]?.claim.text ?? topSignal?.title,
    topic: topTopic,
    reason: "Dossier aus regionalem Quellen- und Themenkontext vorbereiten",
  });
  const campaignHref = marketingHref(regionContext, {
    topic: topTopic,
    content: topSignal?.title,
  });

  return (
    <main
      data-testid="admin-region-page"
      className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8"
    >
      <RegionSelector
        selectedRegion={region}
        directoryStatus={regionCatalog.sources.officialDirectory}
        search={search}
        regionTypeCounts={regionTypeCounts}
      />

      <section
        data-testid="admin-region-operational-summary"
        className="rounded-3xl border-2 border-cyan-400/80 bg-[linear-gradient(135deg,color-mix(in_oklab,rgb(var(--card))_86%,rgb(var(--grad-from))_14%),rgb(var(--card))_58%,rgb(var(--bg))_100%)] p-4 shadow-sm shadow-cyan-950/10 dark:border-cyan-500/60 dark:shadow-black/30 sm:p-5"
      >
        <header data-testid="admin-region-context" className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-900 dark:text-cyan-200">
                Operatives Lagebild · ausgewählte Region
              </p>
              <h2 className="mt-1 break-words text-2xl font-semibold text-[rgb(var(--fg))] sm:text-3xl">
                {cockpit.region.name}
              </h2>
            </div>
            <div className="flex max-w-full flex-wrap gap-2 text-xs text-[rgb(var(--muted))]">
              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[rgb(var(--fg))]">
                {cockpit.region.administrativeUnitType ?? regionTypeLabel(cockpit.region.type)}
              </span>
              {fixtureSignals.length > 0 ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
                  Pilot-/Fixture-Daten enthalten
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <article className="min-w-0 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
              Relevantestes regionales Signal
            </p>
            {topSignal ? (
              <>
                <p className="mt-2 break-words text-base font-semibold text-[rgb(var(--fg))]">
                  {topSignal.title}
                </p>
                <p className="mt-1 break-words text-sm leading-5 text-[rgb(var(--muted))]">
                  {topSignal.summary}
                </p>
                <p className="mt-2 break-words text-xs text-[rgb(var(--muted))]">
                  Herkunft: {regionFeedSignalOriginLabel(topSignal.provenance.dataOrigin)}
                  {" · "}Review: {regionReviewStatusLabel(topSignal.reviewStatus)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-base font-semibold text-[rgb(var(--fg))]">
                  Noch kein regionales Signal belegt
                </p>
                <p className="mt-1 text-sm leading-5 text-[rgb(var(--muted))]">
                  Das vorhandene Readmodel enthält derzeit kein priorisierbares Signal.
                </p>
              </>
            )}
          </article>

          <article className="min-w-0 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
              Quellenbasis und Aktualität
            </p>
            <p className="mt-2 break-words text-base font-semibold text-[rgb(var(--fg))]">
              {activeSources.length} aktiv · {sourceTestResults.length} kontrolliert geprüft
            </p>
            <p className="mt-1 break-words text-sm leading-5 text-[rgb(var(--muted))]">
              Aktualität im Readmodel:{" "}
              {sourceAsOf
                ? `letzter hinterlegter Quellen-/Prüfstand ${sourceAsOf}`
                : "kein belastbarer Quellen-/Prüfstand hinterlegt"}
              .
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-[rgb(var(--muted))]">
              {sourceTestResults.length > 0
                ? "Belastbarkeit: kontrollierte Prüfergebnisse vorhanden; keine flächendeckende Live-Abdeckung abgeleitet."
                : activeSources.length > 0
                  ? "Belastbarkeit: Verbindung hinterlegt, aber noch ohne kontrolliertes Prüfergebnis."
                  : "Belastbarkeit: keine regionale Quellenverbindung belegt."}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
              Review- und Recherchebedarf
            </p>
            <p className="mt-2 break-words text-base font-semibold text-[rgb(var(--fg))]">
              {openReviewItems.length > 0
                ? `${countLabel(openReviewItems.length, "Hinweis", "Hinweise")} offen`
                : "Kein offener Reviewhinweis belegt"}
            </p>
            <p className="mt-1 break-words text-sm leading-5 text-[rgb(var(--muted))]">
              {openQuestions.length > 0
                ? `${countLabel(openQuestions.length, "offene Frage", "offene Fragen")}: ${openQuestions[0]}`
                : "Keine offene Frage im vorhandenen Readmodel."}
            </p>
            <p className="mt-1 break-words text-xs text-[rgb(var(--muted))]">
              Arbeitspriorität: {nextAction.label}
            </p>
          </article>
        </div>

        <div
          data-testid="admin-region-next-action"
          className="mt-4 grid gap-3 rounded-2xl border border-cyan-400/80 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--grad-from))_10%)] p-4 dark:border-cyan-600/70 lg:grid-cols-[1fr_auto] lg:items-center"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-900 dark:text-cyan-200">
              Genau eine nächste Aktion
            </p>
            <p className="mt-1 break-words text-lg font-semibold text-[rgb(var(--fg))]">
              {nextAction.label}
            </p>
            <p className="mt-1 max-w-3xl break-words text-sm leading-5 text-[rgb(var(--muted))]">
              {nextAction.body}
            </p>
          </div>
          <ActionLink href={nextAction.href} primary testId="admin-region-primary-action">
            {nextAction.label}
          </ActionLink>
        </div>

        <nav
          data-testid="admin-region-quick-actions"
          aria-label="Schnellaktionen für die ausgewählte Region"
          className="mt-4 flex flex-wrap gap-2"
        >
          <ActionLink
            href={workspaceHref(regionContext, "quellen")}
            testId="admin-region-quick-action-sources"
          >
            Quellen sammeln
          </ActionLink>
          <ActionLink
            href={researchContextHref}
            testId="admin-region-quick-action-research"
          >
            Recherche vertiefen
          </ActionLink>
          <ActionLink
            href={contributionHref}
            testId="admin-region-quick-action-create"
          >
            Beitrag erstellen
          </ActionLink>
          <ActionLink
            href={dossierHref}
            testId="admin-region-quick-action-dossier"
          >
            Dossier vorbereiten
          </ActionLink>
          <ActionLink
            href={campaignHref}
            testId="admin-region-quick-action-marketing"
          >
            Kampagne planen
          </ActionLink>
        </nav>
      </section>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
          Nachgeordnete Arbeitsbereiche
        </p>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Alle Bereiche bleiben im URL-Kontext von {cockpit.region.name}.
        </p>
      </div>

      <nav
        data-testid="admin-region-workspace-navigation"
        aria-label="Arbeitsbereiche der Region"
        className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-[rgb(var(--border))] bg-[rgb(var(--bg))]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border"
      >
        <div className="flex min-w-max gap-2">
          {WORKSPACE_VIEWS.map((entry) => (
            <Link
              key={entry.id}
              href={workspaceHref(regionContext, entry.id)}
              aria-current={view === entry.id ? "page" : undefined}
              className={
                view === entry.id
                  ? "inline-flex min-h-11 items-center rounded-full bg-[rgb(var(--fg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--bg))]"
                  : "inline-flex min-h-11 items-center rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
              }
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </nav>

      <section
        data-testid="admin-region-profile"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="min-w-0 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <p className="text-xs text-[rgb(var(--muted))]">Regionstyp</p>
          <p className="mt-1 break-words text-base font-semibold text-[rgb(var(--fg))]">
            {cockpit.region.administrativeUnitType ?? regionTypeLabel(cockpit.region.type)}
          </p>
          <p className="mt-2 break-words text-xs text-[rgb(var(--muted))]">
            {cockpit.region.federalState ?? "Kein Bundesland hinterlegt"} ·{" "}
            {cockpit.region.country ?? "Kein Land hinterlegt"}
          </p>
        </div>
        <div className="min-w-0 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <p className="text-xs text-[rgb(var(--muted))]">Zuständige Stelle</p>
          <p className="mt-1 break-words text-base font-semibold text-[rgb(var(--fg))]">
            {cockpit.region.officialBody?.label ?? "Keine amtliche Stelle hinterlegt"}
          </p>
          <p className="mt-2 break-words text-xs text-[rgb(var(--muted))]">
            {cockpit.region.officialDirectoryEntry
              ? `Amtlicher Verzeichniseintrag, Stand ${cockpit.region.officialDirectoryEntry.sourceAsOf}`
              : "Noch nicht mit einem amtlichen Verzeichniseintrag verbunden"}
          </p>
        </div>
        <div className="min-w-0 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <p className="text-xs text-[rgb(var(--muted))]">Regionale Erfahrung</p>
          <p className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
            {experienceCount} erprobt · {preparedCount} vorbereitet
          </p>
          <p className="mt-2 text-xs text-[rgb(var(--muted))]">
            {emptyCount} Bereiche noch ohne Erfahrung
          </p>
        </div>
        <div className="min-w-0 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <p className="text-xs text-[rgb(var(--muted))]">Belegte Arbeitsgrundlage</p>
          <p className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
            {countLabel(sourceTestResults.length, "Quellenprüfung", "Quellenprüfungen")} ·{" "}
            {countLabel(openReviewItems.length, "offener Hinweis", "offene Hinweise")}
          </p>
          <p className="mt-2 text-xs text-[rgb(var(--muted))]">
            {countLabel(activeAnlassraeume.length, "Anlassraum", "Anlassräume")} ·{" "}
            {countLabel(cockpit.actorsSummary.total, "Akteur", "Akteure")}
          </p>
        </div>
      </section>

      <details
        data-testid="admin-region-experience"
        className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"
      >
        <summary className="cursor-pointer list-none">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
            Fähigkeiten, Evidenzen und Lücken
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--fg))]">
            Ausführliche Diagnose anzeigen
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
            Jeder Status nennt seine Grundlage und die verbleibende Lücke. Pilotdaten,
            kontrollierte Tests und fehlende Anbindungen werden nicht gleichgesetzt.
          </p>
        </summary>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {experienceEntries.map((entry) => (
            <article
              key={entry.label}
              data-experience-status={entry.status}
              className="min-w-0 rounded-3xl border border-[rgb(var(--border))] p-5"
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <h3 className="break-words text-base font-semibold text-[rgb(var(--fg))]">
                  {entry.label}
                </h3>
                <span
                  className={`max-w-full rounded-full border px-3 py-1 text-xs font-semibold ${experienceStatusClass(entry.status)}`}
                >
                  {entry.status}
                </span>
              </div>
              <p className="mt-4 break-words text-sm leading-6 text-[rgb(var(--muted))]">
                <strong className="font-semibold text-[rgb(var(--fg))]">Grundlage:</strong>{" "}
                {entry.basis}
              </p>
              <p className="mt-2 break-words text-sm leading-6 text-[rgb(var(--muted))]">
                <strong className="font-semibold text-[rgb(var(--fg))]">Lücke:</strong>{" "}
                {entry.gap}
              </p>
            </article>
          ))}
        </div>
      </details>

      {view === "lagebild" ? (
        <>
          <section
            id="region-signals"
            data-testid="admin-region-lagebild"
            className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]"
          >
          <Card
            eyebrow="Lagebild"
            title="Regionale Signale"
            body="Signale bleiben nach Herkunft, Prüfstatus und Pilotwahrheit unterscheidbar."
          >
            <div className="mt-4 space-y-3">
              {feedSignals.length > 0 ? (
                feedSignals.slice(0, 6).map((signal) => (
                  <div key={signal.id} className="rounded-2xl border border-[rgb(var(--border))] p-4">
                    <div className="flex flex-wrap gap-2 text-xs text-[rgb(var(--muted))]">
                      <span>{sourceTypeLabel(signal.sourceType)}</span>
                      <span>·</span>
                      <span>{regionFeedSignalOriginLabel(signal.provenance.dataOrigin)}</span>
                      <span>·</span>
                      <span>{regionReviewStatusLabel(signal.reviewStatus)}</span>
                    </div>
                    <h3 className="mt-2 font-semibold text-[rgb(var(--fg))]">{signal.title}</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--muted))]">{signal.summary}</p>
                    <p className="mt-2 text-xs font-medium text-cyan-900 dark:text-cyan-200">
                      {suggestedActionLabel(signal.suggestedAction)}
                    </p>
                    <div className="mt-3">
                      <ActionLink href={workspaceHref(regionContext, "recherche")}>
                        Bewusste Recherche öffnen
                      </ActionLink>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[rgb(var(--muted))]">
                  Noch keine regionalen Signale im bestehenden Readmodel.
                </p>
              )}
            </div>
          </Card>

          <div className="grid content-start gap-4">
            <Card
              eyebrow="Quellenlage"
              title={countLabel(activeSources.length, "aktive Quelle", "aktive Quellen")}
              body={`${countLabel(sourceTestResults.length, "Prüfergebnis", "Prüfergebnisse")} · ${countLabel(communitySourceHints.length, "Community-Hinweis", "Community-Hinweise")}. Fehlende Verbindungen werden nicht als Live-Daten dargestellt.`}
            >
              <div className="mt-4">
                <ActionLink href={workspaceHref(regionContext, "quellen")}>
                  Quellenbasis öffnen
                </ActionLink>
              </div>
            </Card>
            <Card
              eyebrow="Themen"
              title={`${topicClusters.length} reviewpflichtige Cluster`}
              body={`${cockpit.publicQuestionsSummary.reviewPending} öffentliche Fragen und ${cockpit.publicClaimsSummary.reviewPending} Aussagen warten auf Prüfung.`}
            >
              <div className="mt-4 space-y-2">
                {topicClusters.slice(0, 4).map((cluster) => (
                  <div key={cluster.id} className="rounded-2xl border border-[rgb(var(--border))] p-3">
                    <p className="text-sm font-semibold text-[rgb(var(--fg))]">{cluster.label}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted))]">{cluster.summary}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          </section>

          <section
            data-testid="admin-region-participation-signals"
            className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"
          >
            <Card
              eyebrow="Öffentliche Beteiligungssignale"
              title="Ungeprüft, nicht amtlich, reviewpflichtig"
              body="Öffentliche Aussagen, Beiträge, Fragen, Quellenhinweise und Swipe-Signale erscheinen hier nur anonymisiert/aggregiert. Keine Personenlisten, keine politischen Profile, keine Repräsentativitätsbehauptung und keine automatische amtliche Übernahme."
            >
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[rgb(var(--muted))]">
                <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1">
                  Öffentlicher Claim · {cockpit.publicClaimsSummary.total}
                </span>
                <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1">
                  Öffentliche Frage · {cockpit.publicQuestionsSummary.total}
                </span>
                <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1">
                  Öffentlicher Quellenhinweis · {communitySourceHints.length}
                </span>
                <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1">
                  Aggregiertes Swipe-Interesse ·{" "}
                  {cockpit.swipeInterestSummary.totalSignals}
                </span>
                <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1">
                  Aggregierte Gegenposition ·{" "}
                  {cockpit.counterpointSummary.totalSignals}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {participationSignals.slice(0, 6).map((signal) => (
                  <article
                    key={signal.id}
                    className="rounded-2xl border border-[rgb(var(--border))] p-3"
                  >
                    <p className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {signal.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">
                      {sourceTypeLabel(signal.sourceType)} ·{" "}
                      {regionReviewStatusLabel(signal.reviewStatus)} · nicht amtlich · nicht
                      repräsentativ
                    </p>
                  </article>
                ))}
              </div>
            </Card>

            <Card
              eyebrow="Review für Beteiligungssignale"
              title="Regionzuordnung, Aggregation und Datenschutz"
              body="Swipe- und Community-Signale bleiben anonymisiert/aggregiert; individuelle Präferenzen werden nicht als Verwaltungssicht oder Personenprofil dargestellt."
            >
              <div className="mt-4 rounded-2xl border border-amber-400/80 bg-amber-50 p-3 text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100">
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Regionzuordnung offen
                </p>
                <p className="mt-2 text-sm">
                  {cockpit.needsRegionReviewSignals.length} öffentliche Signale bleiben bis
                  zur bestätigten Regionzuordnung außerhalb der aktiven Themenlage.
                </p>
                <div className="mt-3 space-y-2">
                  {cockpit.needsRegionReviewSignals.slice(0, 4).map((signal) => (
                    <p key={signal.id} className="text-xs">
                      {signal.title} · {regionReviewStatusLabel(signal.reviewStatus)}
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          </section>
        </>
      ) : null}

      {view === "quellen" ? (
        <section data-testid="admin-region-quellen" className="space-y-4">
          <Card
            eyebrow="Quellen & Feeds"
            title="Quellen nachvollziehbar ergänzen und prüfen"
            body="Verwende die bestehenden Quellenverbindungen und kontrollierten Tests. Es startet keine allgemeine Websuche und nichts wird veröffentlicht."
          />
          <RegionSourceConnectionsPanel
            regionId={cockpit.region.id}
            connections={sourceConnections}
            results={sourceTestResults}
          />
        </section>
      ) : null}

      {view === "recherche" ? (
        <section data-testid="admin-region-recherche" className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card
            eyebrow="Bewusste Recherche"
            title="Fragestellung und Scope zuerst festlegen"
            body="Dieser Regionsbereich ordnet vorhandene Prüfergebnisse ein. Die Recherche-Aufgabenliste erhält Region, Thema beziehungsweise Quelle und Herkunft als gefahrlos ignorierbaren Kontext; es startet kein Provideraufruf, Crawling oder Scraping."
          >
            <div className="mt-4">
              <ActionLink
                href={researchContextHref}
                testId="admin-region-research-handoff"
              >
                Bestehende Recherche-Aufgaben öffnen
              </ActionLink>
            </div>
          </Card>
          <Card
            eyebrow="Vorhandene Prüfergebnisse"
            title={`${countLabel(sourceTestResults.length, "Quellenprüfung", "Quellenprüfungen")} als Ausgangspunkt`}
          >
            <div className="mt-4 space-y-3">
              {sourceTestResults.length > 0 ? (
                sourceTestResults.map((result) => (
                  <div key={result.id} className="rounded-2xl border border-[rgb(var(--border))] p-4">
                    <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">{result.title}</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--muted))]">{result.summary}</p>
                    <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                      {result.openQuestions.length} offene Fragen · {result.evidenceReferences.length} Belege ·
                      Confidence {result.confidence.toFixed(2)}
                    </p>
                    <div className="mt-3">
                      <ActionLink href={workspaceHref(regionContext, "claims")}>
                        Claim-Kandidaten prüfen
                      </ActionLink>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[rgb(var(--muted))]">
                  Noch keine geprüften Quellen. Wähle zuerst eine Quelle im Bereich Quellen & Feeds.
                </p>
              )}
            </div>
          </Card>
        </section>
      ) : null}

      {view === "claims" ? (
        <section data-testid="admin-region-claims" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card
            eyebrow="Claims & Evidenz"
            title={`${claimRows.length} Aussagekandidaten aus geprüften Quellen`}
            body="Aussagen bleiben Kandidaten. Übersetzung ist keine Evidenz, und ein offizielles Urteil erfordert menschliches Review."
          >
            <div className="mt-4 space-y-3">
              {claimRows.length > 0 ? (
                claimRows.map(({ claim, result }, index) => (
                  <div
                    key={`${result.id}-${index}`}
                    className="rounded-2xl border border-[rgb(var(--border))] p-4"
                  >
                    <p className="text-sm font-semibold text-[rgb(var(--fg))]">{claim.text}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                      {claim.basisLabel} · Confidence {claim.confidence.toFixed(2)} ·{" "}
                      {result.evidenceReferences.length} Belege
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionLink href={reviewHref(cockpit.region.id)}>Claim prüfen</ActionLink>
                      <ActionLink
                        href={createHref(regionContext, {
                          signalTitle: claim.text,
                          topic: result.detectedTopics[0],
                          reason: "Dossier aus geprüftem Claim-Kontext vorbereiten",
                        })}
                      >
                        Dossier-Draft vorbereiten
                      </ActionLink>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[rgb(var(--muted))]">
                  Noch keine Aussagekandidaten aus geprüften Quellen.
                </p>
              )}
            </div>
          </Card>
          <div className="grid content-start gap-4">
            <Card
              eyebrow="Dossier-Vorschläge"
              title={`${suggestedDossiers.length} Vorschläge`}
              body="Kein Vorschlag erzeugt automatisch ein Dossier."
            >
              <div className="mt-4 space-y-2">
                {suggestedDossiers.slice(0, 4).map((suggestion) => (
                  <div key={suggestion.id} className="rounded-2xl border border-[rgb(var(--border))] p-3">
                    <p className="text-sm font-semibold text-[rgb(var(--fg))]">{suggestion.title}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted))]">{suggestion.summary}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card
              eyebrow="Anlassraum-Vorschläge"
              title={`${suggestedAnlassraeume.length} Vorschläge`}
              body="Ein Anlassraum wird erst nach bewusster Vorbereitung und Review angelegt."
            />
          </div>
        </section>
      ) : null}

      {view === "beitraege" ? (
        <section data-testid="admin-region-beitraege" className="grid gap-4 lg:grid-cols-2">
          <Card
            eyebrow="Interner Beitrag"
            title="Regionalen eDebatte-Beitrag vorbereiten"
            body="Der regionale Quellen- und Themenkontext wird an den bestehenden Create-Flow übergeben. Es entsteht kein automatischer Draft."
          >
            <div className="mt-4">
              <ActionLink
                href={contributionHref}
                testId="admin-region-create-handoff"
              >
                Internen Beitrag beginnen
              </ActionLink>
            </div>
          </Card>
          <Card
            eyebrow="Externe Veröffentlichung"
            title="Social-/Web-Beitrag getrennt reviewen"
            body="Für diese Region liegen in diesem Readmodel keine belegten externen Veröffentlichungsstände vor. Externe Varianten bleiben in der bestehenden Marketing-Review- und Publishing-Kette."
          >
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionLink href={withQuery("/admin/marketing/review", { lang: "de" })}>
                Externe Inhalte prüfen
              </ActionLink>
              <ActionLink href={reviewHref(cockpit.region.id)}>Freigaben öffnen</ActionLink>
            </div>
          </Card>
          <Card
            eyebrow="Statuswahrheit"
            title="Intern und extern bleiben verbunden, aber getrennt"
            body="Draft, Review, geplant, veröffentlicht oder archiviert wird erst angezeigt, wenn der jeweilige bestehende Flow diesen Status belegt."
          />
        </section>
      ) : null}

      {view === "kampagnen" ? (
        <section data-testid="admin-region-kampagnen" className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card
            eyebrow="Regionale Kampagnen"
            title="Marketing-Arbeitsbereich kontrolliert öffnen"
            body={`Die vorhandene Marketing-Control-Plane unterstützt B2G und regionale Reichweite. ${cockpit.region.name}, Thema beziehungsweise Inhalt und Herkunft werden als gefahrlos ignorierbarer Kontext übergeben; hier entsteht keine zweite Kampagne.`}
          >
            <div className="mt-4">
              <ActionLink
                href={campaignHref}
                testId="admin-region-marketing-handoff"
              >
                B2G-Kampagnen öffnen
              </ActionLink>
            </div>
          </Card>
          <Card
            eyebrow="Wirkung"
            title="Interne Wirkung und Plattform-Performance getrennt lesen"
            body="Das Region-Readmodel enthält keine verifizierten Kampagnen- oder Performancewerte. Geplante, laufende und gemessene Inhalte bleiben in Marketing und Insights nachvollziehbar."
          >
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionLink href={withQuery("/admin/marketing/insights", { lang: "de" })}>
                Ergebnisse öffnen
              </ActionLink>
            </div>
          </Card>
        </section>
      ) : null}

      {view === "einstellungen" ? (
        <section data-testid="admin-region-einstellungen" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              eyebrow="Zugriff"
              title="Verifizierung und Freischaltung"
              testId="admin-region-access-summary"
            >
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[rgb(var(--border))] p-3">
                  <dt className="text-xs text-[rgb(var(--muted))]">Zuordnung</dt>
                  <dd className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                    {authoritySourceLabel(cockpit.accessSummary.authoritySource)}
                  </dd>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--border))] p-3">
                  <dt className="text-xs text-[rgb(var(--muted))]">Verifizierung</dt>
                  <dd className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                    {organizationVerificationStatusLabel(cockpit.accessSummary.verificationStatus)}
                  </dd>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--border))] p-3">
                  <dt className="text-xs text-[rgb(var(--muted))]">Freischaltung</dt>
                  <dd className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                    {cockpit.accessSummary.entitlementStatus
                      ? regionEntitlementStatusLabel(cockpit.accessSummary.entitlementStatus)
                      : "Keine Freischaltung"}
                  </dd>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    {regionEntitlementReasonLabel(cockpit.accessSummary.entitlementReason)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--border))] p-3">
                  <dt className="text-xs text-[rgb(var(--muted))]">Plan</dt>
                  <dd className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                    {cockpit.accessSummary.entitlementPlanLabel ?? "Kein Plan"}
                  </dd>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    {cockpit.accessSummary.entitlementSource === "not_checked"
                      ? "Noch nicht geprüft"
                      : "Bestehende Freischaltungsquelle"}
                  </p>
                </div>
              </dl>
              <p className="mt-4 text-sm text-[rgb(var(--muted))]">
                Verifizierte Membership allein reicht nicht. Selbstauskunft ist nicht verifiziert.
                Publikationsfreigaben bleiben ein gesonderter menschlicher Schritt.
              </p>
            </Card>
            <Card
              eyebrow="Leitplanken"
              title="Review-first und fail-closed"
              testId="admin-region-guardrails"
              body="Keine automatische Recherche, kein Auto-Publish, kein Auto-Dossier und kein Auto-Anlassraum. Externe Sichtbarkeit erfordert weiterhin die bestehende Freigabe."
            >
              <details className="mt-4 rounded-2xl border border-[rgb(var(--border))] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">
                  Diagnose und Limits anzeigen
                </summary>
                <p className="mt-3 text-sm text-[rgb(var(--muted))]">
                  Regionen: {cockpit.accessSummary.entitlementUsage?.regionsUsed ?? 0}
                  {cockpit.accessSummary.entitlementLimits?.maxRegions != null
                    ? ` / ${cockpit.accessSummary.entitlementLimits.maxRegions}`
                    : " / offen"}
                  {" · "}Drafts: {cockpit.accessSummary.entitlementUsage?.draftsThisMonth ?? 0}
                  {cockpit.accessSummary.entitlementLimits?.maxDraftsPerMonth != null
                    ? ` / ${cockpit.accessSummary.entitlementLimits.maxDraftsPerMonth}`
                    : " / offen"}
                </p>
              </details>
            </Card>
          </div>
          {cockpit.guidelineMatrix ? (
            <Card
              eyebrow="Leitlinien"
              title={cockpit.guidelineMatrix.title}
              body="Die Leitlinien unterstützen die Prüfung, ersetzen aber weder Rechtsberatung noch menschliche Freigabe."
            >
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {cockpit.guidelineMatrix.criteria.map((criterion) => (
                  <div key={criterion.key} className="rounded-2xl border border-[rgb(var(--border))] p-3">
                    <p className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {criterion.workingRule}
                    </p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                      Prüffrage: {criterion.reviewQuestion}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
