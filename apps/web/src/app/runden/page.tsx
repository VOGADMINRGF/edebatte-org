import type { Metadata } from "next";
import Link from "next/link";
import { listRundenEntryItems, type RundenEntryItem } from "@features/topicRound/entrySource";
import {
  buildOrganizationDashboardReadModel,
  organizationEntitlementAllowsScope,
  organizationContractAllowsProvisionedScope,
} from "@features/region";
import { readSession } from "@/utils/session";
import {
  resolveCurrentRequestScopeContext,
  requestScopeCanManageOrganizationVisibility,
  requestScopeCanWriteOrganizationRoutes,
  type RequestScopeContext,
} from "@/lib/server/auth/requestScope";
import RundenShareActions from "./RundenShareActions";
import RundenGuidedQuestionBuilder from "./RundenGuidedQuestionBuilder";
import RundenCreateHandoffBanner from "./RundenCreateHandoffBanner";
import RundenPublicSharingGuide from "./RundenPublicSharingGuide";
import MotionReveal from "@/components/motion/MotionReveal";
import VoxyGuide from "@/components/voxy/VoxyGuide";
import { RUNDEN_VOXY_COPY } from "@/features/voxy/rundenVoxyCopy";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

export const metadata: Metadata = buildPublicPageMetadata({
  path: "/runden",
  title: "Fragen gemeinsam klären - eDebatte",
  description: "Öffne eine Frage für andere, sammle Perspektiven und Quellen und halte den gemeinsamen Stand an einem Ort zusammen.",
});

type RoundEntryView = "active" | "mine" | "results";
const VIEW_ORDER: RoundEntryView[] = ["active", "mine", "results"];
const VIEW_LABELS: Record<RoundEntryView, string> = {
  active: "Laufend",
  mine: "Meine Fragen",
  results: "Ergebnisse",
};

function readStringParam(val?: string | string[]): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

function decodeMaybe(value?: string): string | undefined {
  if (!value) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseView(val?: string): RoundEntryView {
  if (val === "mine" || val === "results") return val;
  return "active";
}

function viewHref(view: RoundEntryView): string {
  return `/runden?view=${view}`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "–";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function normalizeAnlassraumId(value?: string | null): string | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return /^[a-f0-9]{24}$/.test(normalized) ? normalized : null;
}

function buildRundenReturnHref(anlassraumId?: string | null) {
  const params = new URLSearchParams();
  params.set("view", "active");
  const normalized = normalizeAnlassraumId(anlassraumId);
  if (normalized) params.set("anlassraumId", normalized);
  return `/runden?${params.toString()}`;
}

function buildContributionStartHref(entry: RundenEntryItem) {
  const params = new URLSearchParams();
  params.set("mode", "source");
  params.set("intent", "contribution");
  params.set("entryIntent", "content_companion");
  params.set("entryMode", "direct");
  params.set("source", "runden");
  params.set("reason", "round_inline_contribution");
  params.set("signalTitle", entry.title.slice(0, 160));
  if (entry.anlassraumId) params.set("anlassraumId", entry.anlassraumId);
  params.set("returnTo", buildRundenReturnHref(entry.anlassraumId));
  return `/create?${params.toString()}`;
}

function roundOpenHref(entry: RundenEntryItem) {
  return entry.operatingHref ?? entry.entryHref ?? entry.intakeHref ?? "/runden";
}

function roundResultsHref(entry: RundenEntryItem) {
  return entry.resultsHref ?? roundOpenHref(entry);
}

function deriveLastActivity(entry: RundenEntryItem): string {
  return formatDate(entry.lastActionAt ?? entry.updatedAt ?? entry.createdAt);
}

function participationState(entry: RundenEntryItem): string {
  if (entry.publicShareState === "share_active") return "Mitmachen möglich";
  if (entry.publicShareState === "ready_for_visibility_decision") return "Bereit zum Teilen";
  if (entry.publicShareState === "closed" || entry.publicShareState === "archived") return "Abgeschlossen";
  return "Noch nicht öffentlich";
}

function RoundJourneyMeta({ entry }: { entry: RundenEntryItem }) {
  return (
    <details className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-[rgb(var(--fg))]">
        Hintergrund & aktueller Stand <span className="ml-2 text-[rgb(var(--muted))]">▾</span>
      </summary>
      <div className="grid gap-3 border-t border-[rgb(var(--border))] p-3 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold text-[rgb(var(--muted))]">Stand</p>
          <p className="mt-1 text-sm text-[rgb(var(--fg))]">{entry.productionStateLabel || entry.anlassraumStatus || "In Vorbereitung"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[rgb(var(--muted))]">Hintergründe & Quellen</p>
          {entry.relatedDossierHref ? (
            <Link href={entry.relatedDossierHref} className="mt-1 inline-flex text-sm font-semibold text-[rgb(var(--fg))] hover:text-[rgb(var(--grad-from))]">
              Mehr erfahren
            </Link>
          ) : entry.resultsHref ? (
            <Link href={entry.resultsHref} className="mt-1 inline-flex text-sm font-semibold text-[rgb(var(--fg))] hover:text-[rgb(var(--grad-from))]">
              Aktuellen Stand ansehen
            </Link>
          ) : (
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">Wird hier weiter ergänzt.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-[rgb(var(--muted))]">Live dabei</p>
          {entry.relatedStreamHref ? (
            <Link href={entry.relatedStreamHref} className="mt-1 inline-flex text-sm font-semibold text-[rgb(var(--fg))] hover:text-[rgb(var(--grad-from))]">
              {entry.relatedStreamTitle ?? "Zum Live-Format"}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">Kein Live-Format aktiv.</p>
          )}
        </div>
      </div>
    </details>
  );
}

function RoundQuickActions(props: {
  entry: RundenEntryItem;
  isSignedIn: boolean;
  canManageEntry: boolean;
  canQrActions: boolean;
}) {
  const createHref = buildContributionStartHref(props.entry);
  const openHref = roundOpenHref(props.entry);

  if (!props.isSignedIn) {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={openHref} className="vog-btn-brand">Mitmachen</Link>
        <Link href={`/login?next=${encodeURIComponent(createHref)}`} className="vog-btn-secondary">Etwas ergänzen</Link>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link href={openHref} className="vog-btn-brand">Öffnen</Link>
      <a href={`#compose-${props.entry.id}`} className="vog-btn-secondary">Etwas ergänzen</a>
      {props.canManageEntry && props.entry.intakeHref ? (
        <Link href={props.entry.intakeHref} className="vog-btn-secondary">Weiterführen</Link>
      ) : null}
      {props.entry.resultsHref ? (
        <Link href={props.entry.resultsHref} className="vog-btn-secondary">Ergebnisse</Link>
      ) : null}
      {props.canQrActions && props.entry.shareActions ? (
        <a href={`#share-${props.entry.id}`} className="vog-btn-secondary">Link & QR</a>
      ) : null}
    </div>
  );
}

function RoundInlineContributionModule({ entry, isSignedIn }: { entry: RundenEntryItem; isSignedIn: boolean }) {
  if (!isSignedIn) return null;
  const createHref = buildContributionStartHref(entry);
  return (
    <section id={`compose-${entry.id}`} className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
      <p className="text-sm font-semibold text-[rgb(var(--fg))]">Was fehlt noch?</p>
      <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">Ergänze eine Frage, Quelle, Perspektive oder Korrektur direkt zu diesem Thema.</p>
      <form action="/create" method="get" className="mt-3 space-y-2">
        <input type="hidden" name="mode" value="source" />
        <input type="hidden" name="intent" value="contribution" />
        <input type="hidden" name="entryIntent" value="content_companion" />
        <input type="hidden" name="entryMode" value="direct" />
        <input type="hidden" name="source" value="runden" />
        <input type="hidden" name="reason" value="round_inline_contribution" />
        <input type="hidden" name="signalTitle" value={entry.title.slice(0, 160)} />
        {entry.anlassraumId ? <input type="hidden" name="anlassraumId" value={entry.anlassraumId} /> : null}
        <input type="hidden" name="returnTo" value={buildRundenReturnHref(entry.anlassraumId)} />
        <textarea name="prefill" className="min-h-[96px] w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" placeholder="Was möchtest du ergänzen?" />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="vog-btn-brand">Weiter</button>
          <Link href={createHref} className="vog-btn-secondary">Ohne Text starten</Link>
        </div>
      </form>
    </section>
  );
}

function RoundParticipationModule({ entry, canQrActions }: { entry: RundenEntryItem; canQrActions: boolean }) {
  if (!canQrActions || !entry.shareActions) return null;
  return (
    <section id={`share-${entry.id}`} className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
      <h4 className="text-sm font-semibold text-[rgb(var(--fg))]">Menschen direkt hierher einladen</h4>
      <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">Link oder QR führen direkt zu dieser Frage und zur passenden Beteiligung.</p>
      <RundenShareActions share={entry.shareActions} />
    </section>
  );
}

function hasEntryOwnership(entry: RundenEntryItem, sessionUid: string | null): boolean {
  if (!sessionUid) return false;
  return entry.stewardUserId === sessionUid || entry.createdBy === sessionUid || entry.ownerId === sessionUid;
}

function entryBelongsToManagedScope(params: {
  entry: RundenEntryItem;
  sessionUid: string | null;
  requestScope: RequestScopeContext | null;
}) {
  if (params.requestScope?.isOperatorMode) return true;
  if (hasEntryOwnership(params.entry, params.sessionUid)) return true;
  const ownerId = String(params.entry.ownerId ?? "").trim();
  if (!ownerId) return false;
  return params.requestScope?.organizationMembership.organizationIds.includes(ownerId) ?? false;
}

function resolveRundenManagementCapabilities(input: {
  requestScope: RequestScopeContext | null;
  dashboardReadModel: Awaited<ReturnType<typeof buildOrganizationDashboardReadModel>> | null;
}) {
  if (input.requestScope?.isOperatorMode) {
    return { canManageProductiveRounds: true, canActivatePublicShare: true } as const;
  }
  if (!input.requestScope || !input.dashboardReadModel) {
    return { canManageProductiveRounds: false, canActivatePublicShare: false } as const;
  }

  const scopeAllowsWrites = requestScopeCanWriteOrganizationRoutes(input.requestScope);
  const scopeAllowsVisibility = requestScopeCanManageOrganizationVisibility(input.requestScope);
  const reviewQueueEntitled = organizationEntitlementAllowsScope(input.dashboardReadModel.entitlementSummary, "review_queue");
  const reviewQueueContracted = organizationContractAllowsProvisionedScope(input.dashboardReadModel.contractSummary, "review_queue");
  const publicShareEntitled = organizationEntitlementAllowsScope(input.dashboardReadModel.entitlementSummary, "public_share");
  const publicShareContracted = organizationContractAllowsProvisionedScope(input.dashboardReadModel.contractSummary, "public_share");
  const canPrepareRounds = input.dashboardReadModel.allowedActions.includes("create_anlassraum_draft") || input.dashboardReadModel.allowedActions.includes("submit_for_review");
  const canActivatePublicShare = scopeAllowsVisibility && publicShareEntitled && publicShareContracted && input.dashboardReadModel.allowedActions.includes("approve_publication");

  return {
    canManageProductiveRounds: scopeAllowsWrites && reviewQueueEntitled && reviewQueueContracted && canPrepareRounds,
    canActivatePublicShare,
  } as const;
}

export default async function RundenPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const handoffId = readStringParam(resolvedSearchParams.handoffId) ?? null;
  const createAction = readStringParam(resolvedSearchParams.createAction) ?? null;
  const createPrefillRaw = decodeMaybe(readStringParam(resolvedSearchParams.prefill) ?? readStringParam(resolvedSearchParams.text));
  const createPrefill = createPrefillRaw ? createPrefillRaw.trim().slice(0, 2000) : null;
  const createIntent = readStringParam(resolvedSearchParams.intent) === "create" || readStringParam(resolvedSearchParams.entry) === "create";

  const session = await readSession().catch(() => null);
  const isSignedIn = Boolean(session?.uid);
  const sessionUid = session?.uid ?? null;
  const requestScope = isSignedIn ? await resolveCurrentRequestScopeContext({ allowOperatorFallback: true }).catch(() => null) : null;
  const dashboardReadModel = requestScope?.actorId
    ? await buildOrganizationDashboardReadModel({
        userId: requestScope.actorId,
        roles: requestScope.actor.roles,
        isAdmin: requestScope.isOperatorMode,
        actorRole: requestScope.actor.governanceRole,
      }).catch(() => null)
    : null;
  const capabilitySummary = resolveRundenManagementCapabilities({ requestScope, dashboardReadModel });

  const requestedView = parseView(readStringParam(resolvedSearchParams.view));
  const view: RoundEntryView = isSignedIn && VIEW_ORDER.includes(requestedView) ? requestedView : "active";
  const queryAnlassraumId = normalizeAnlassraumId(readStringParam(resolvedSearchParams.anlassraumId) ?? null);

  let entries: RundenEntryItem[] = [];
  let sourceError: string | null = null;
  try {
    entries = await listRundenEntryItems({ limit: 80 });
  } catch {
    sourceError = "round_entry_source_unavailable";
  }

  const activeEntries = entries.filter((entry) => entry.lifecycle === "active");
  const closedEntries = entries.filter((entry) => entry.lifecycle === "closed");
  const featured = (queryAnlassraumId ? activeEntries.find((entry) => entry.anlassraumId === queryAnlassraumId) : null) ?? activeEntries[0] ?? null;
  const remainingActive = featured ? activeEntries.filter((entry) => entry.id !== featured.id) : activeEntries;
  const existingHref = activeEntries.find((entry) => entry.operatingHref)?.operatingHref ?? activeEntries.find((entry) => entry.entryHref)?.entryHref ?? featured?.operatingHref ?? featured?.entryHref ?? "/swipes";
  const participationCtaLabel = activeEntries.length > 0 ? "Bei laufenden Fragen mitmachen" : "Mitmachen";

  const featuredOwned = featured ? entryBelongsToManagedScope({ entry: featured, sessionUid, requestScope }) : false;
  const canManageFeatured = featured ? featuredOwned && capabilitySummary.canManageProductiveRounds : false;
  const canQrFeatured = featured ? canManageFeatured && capabilitySummary.canActivatePublicShare && Boolean(featured.shareActions) : false;
  const quickStartParticipationHref = featured ? roundOpenHref(featured) : existingHref;
  const quickStartParticipationAnchorId = featured && canQrFeatured ? `share-${featured.id}` : null;

  const guideCards = [
    { title: "Eine klare Frage", body: "Aus einem Thema wird eine Frage, die andere sofort verstehen und beantworten können." },
    { title: "Direkt mitmachen", body: "Menschen stimmen ab, ergänzen Perspektiven oder liefern Quellen – genau dort, wo etwas fehlt." },
    { title: "Gemeinsamer Stand", body: "Antworten, offene Punkte und Hintergründe bleiben zusammen, damit man damit weiterarbeiten kann." },
  ] as const;

  return (
    <section className="public-canvas vog-page-stage min-h-screen">
      <main className="public-shell vog-main-shell min-h-screen space-y-6 md:space-y-8">
        <header className="public-dialog-surface relative overflow-hidden p-5 md:p-6 lg:p-8" data-runden-hero="true">
          <div className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--grad-from))]/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[rgb(var(--grad-to))]/10 blur-3xl" />
          <div className="public-reader-grid relative lg:min-h-[24rem]">
            <MotionReveal delay={0.04}>
              <div className="public-voxy-rail order-2 lg:order-1">
                <VoxyGuide appearance="hero" title="Voxy hilft beim Formulieren" variant="open">
                  <p>{RUNDEN_VOXY_COPY.rundenHero}</p>
                </VoxyGuide>
              </div>
            </MotionReveal>
            <div className="public-dialog-area order-1 space-y-5 lg:order-2">
              <div className="public-color-rail space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Gemeinsam klären</p>
                <h1 className="no-grad public-hero-title runden-hero-title font-semibold leading-tight">Was möchtest du gemeinsam zur Diskussion stellen?</h1>
                <p className="public-hero-lead max-w-3xl text-[rgb(var(--fg))]">Öffne eine Frage für andere, sammle Antworten und Quellen und halte fest, was noch offen ist.</p>
              </div>
              <div className="public-action-row pt-1">
                <Link href="/runden/new?gtm=1" className="vog-btn-brand">Etwas starten</Link>
                <Link href={existingHref} className="vog-btn-secondary">{participationCtaLabel}</Link>
              </div>
              {closedEntries.length > 0 ? <Link href={viewHref("results")} className="text-sm font-semibold text-[rgb(var(--muted))] underline underline-offset-4 hover:text-[rgb(var(--fg))]">Ergebnisse ansehen</Link> : null}
              {createIntent ? (
                <div className="public-flow-line p-4">
                  <p className="text-sm font-semibold text-[rgb(var(--fg))]">Für den Anfang reicht die Frage.</p>
                  <p className="mt-2 text-sm text-[rgb(var(--muted))]">Details, Sichtbarkeit und weitere Einstellungen kannst du später ergänzen. Nichts wird automatisch veröffentlicht.</p>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3" data-runden-primary-modules="true">
          {guideCards.map((card) => (
            <section key={card.title} className="runden-step-line p-4 md:p-5">
              <p className="public-section-title text-sm font-semibold text-[rgb(var(--fg))]">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{card.body}</p>
            </section>
          ))}
        </section>

        {isSignedIn && !capabilitySummary.canManageProductiveRounds ? (
          <section className="rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Mitmachen bleibt möglich.</p>
            <p className="mt-1">Einige Organisationsfunktionen sind für dieses Konto noch nicht freigeschaltet. Persönliche Beiträge und öffentliche Fragen kannst du trotzdem weiter nutzen.</p>
          </section>
        ) : null}

        {handoffId ? <RundenCreateHandoffBanner handoffId={handoffId} createAction={createAction} /> : null}

        {createPrefill ? (
          <section className="public-proof-zone space-y-3 p-4 md:p-5" data-runden-prefill="true">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Dein Beitrag</p>
            <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Das hast du bereits vorbereitet.</h2>
            <p className="text-sm leading-6 text-[rgb(var(--muted))]">Ordne den Beitrag einer laufenden Frage zu oder starte daraus eine neue.</p>
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 text-sm leading-6 text-[rgb(var(--fg))]">{createPrefill}</div>
          </section>
        ) : null}

        {isSignedIn ? (
          <nav aria-label="Fragenbereiche" className="overflow-x-auto pb-1">
            <div className="inline-flex min-w-full gap-1 rounded-lg border bg-[rgb(var(--card))] p-1">
              {VIEW_ORDER.map((entryView) => {
                const isActive = view === entryView;
                return <Link key={entryView} href={viewHref(entryView)} aria-current={isActive ? "page" : undefined} className={"flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition " + (isActive ? "bg-[rgb(var(--bg))] text-[rgb(var(--fg))]" : "text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]")}>{VIEW_LABELS[entryView]}</Link>;
              })}
            </div>
          </nav>
        ) : null}

        {sourceError ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">Die laufenden Fragen sind gerade nicht verfügbar. Bitte versuche es später erneut.</section>
        ) : null}

        {!sourceError && entries.length === 0 ? (
          <section className="rounded-2xl border bg-[rgb(var(--card))] p-6 text-sm text-[rgb(var(--muted))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Noch keine Frage geöffnet</h2>
            <p className="mt-2">Starte mit einem Thema oder einer konkreten Frage. Danach können andere per Link oder QR direkt mitmachen.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/runden/new?gtm=1" className="vog-btn-brand">Erste Frage starten</Link>
              <Link href="/swipes" className="vog-btn-secondary">Stattdessen mitmachen</Link>
            </div>
          </section>
        ) : null}

        {!sourceError && view === "active" && entries.length > 0 ? (
          <section id="aktive-runden" className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[rgb(var(--fg))]">Laufende Fragen</h2>
                <p className="text-sm text-[rgb(var(--muted))]">Mitmachen, etwas ergänzen oder den aktuellen Stand ansehen.</p>
              </div>
              <Link href="/runden/new?gtm=1" className="vog-btn-secondary">Neue Frage starten</Link>
            </div>

            {activeEntries.length === 0 ? (
              <div className="rounded-2xl border bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">Aktuell ist keine laufende Frage sichtbar.</div>
            ) : (
              <>
                {featured ? (
                  <article className="public-proof-zone rounded-2xl border border-[rgb(var(--grad-from))]/40 bg-[rgb(var(--card))] p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--muted))]"><span>{participationState(featured)}</span><span>·</span><span>Letzte Aktivität: {deriveLastActivity(featured)}</span></div>
                    <h3 className="mt-2 text-xl font-semibold text-[rgb(var(--fg))] md:text-2xl">{featured.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">Öffne die Frage, um abzustimmen, Hintergründe anzusehen oder etwas zu ergänzen.</p>
                    <RoundQuickActions entry={featured} isSignedIn={isSignedIn} canManageEntry={canManageFeatured} canQrActions={canQrFeatured} />
                    <RoundJourneyMeta entry={featured} />
                    <RoundInlineContributionModule entry={featured} isSignedIn={isSignedIn} />
                    <RoundParticipationModule entry={featured} canQrActions={canQrFeatured} />
                  </article>
                ) : null}

                {remainingActive.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {remainingActive.map((entry) => {
                      const entryOwned = entryBelongsToManagedScope({ entry, sessionUid, requestScope });
                      const canManageEntry = entryOwned && capabilitySummary.canManageProductiveRounds;
                      const canQrActions = canManageEntry && capabilitySummary.canActivatePublicShare && Boolean(entry.shareActions);
                      return (
                        <article key={entry.id} className="public-proof-zone rounded-2xl border bg-[rgb(var(--card))] p-5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--muted))]"><span>{participationState(entry)}</span><span>·</span><span>{deriveLastActivity(entry)}</span></div>
                          <h3 className="mt-2 text-lg font-semibold text-[rgb(var(--fg))]">{entry.title}</h3>
                          <RoundQuickActions entry={entry} isSignedIn={isSignedIn} canManageEntry={canManageEntry} canQrActions={canQrActions} />
                          <RoundJourneyMeta entry={entry} />
                          <RoundParticipationModule entry={entry} canQrActions={canQrActions} />
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {!sourceError && isSignedIn && view === "mine" ? (
          <section className="space-y-4">
            <div><h2 className="text-2xl font-semibold text-[rgb(var(--fg))]">Meine Fragen</h2><p className="text-sm text-[rgb(var(--muted))]">Fragen, die du selbst gestartet oder übernommen hast.</p></div>
            <div className="rounded-2xl border bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">Persönliche Zuordnungen werden weiter ausgebaut. Laufende Fragen bleiben bis dahin vollständig unter „Laufend“ sichtbar.</div>
          </section>
        ) : null}

        {!sourceError && isSignedIn && view === "results" ? (
          <section className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-[rgb(var(--fg))]">Ergebnisse</h2><p className="text-sm text-[rgb(var(--muted))]">Abgeschlossene Fragen und der daraus entstandene Stand.</p></div>
            {closedEntries.length === 0 ? (
              <div className="rounded-2xl border bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">Noch keine abgeschlossenen Fragen vorhanden.</div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {closedEntries.map((entry) => (
                  <article key={entry.id} className="public-proof-zone rounded-2xl border bg-[rgb(var(--card))] p-5">
                    <p className="text-xs text-[rgb(var(--muted))]">Abgeschlossen: {formatDate(entry.finishedAt)}</p>
                    <h3 className="mt-2 text-lg font-semibold text-[rgb(var(--fg))]">{entry.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[rgb(var(--muted))]">Sieh dir an, welche Antworten, Quellen und offenen Punkte aus dieser Frage entstanden sind.</p>
                    <Link href={roundResultsHref(entry)} className="mt-3 inline-flex font-semibold text-[rgb(var(--grad-from))] hover:text-[rgb(var(--grad-to))]">Ergebnis ansehen →</Link>
                    <RoundJourneyMeta entry={entry} />
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <RundenGuidedQuestionBuilder
          returnTo={buildRundenReturnHref(featured?.anlassraumId)}
          featuredAnlassraumId={featured?.anlassraumId ?? null}
          participationHref={quickStartParticipationHref}
          participationAnchorId={quickStartParticipationAnchorId}
          initialInput={createPrefill}
        />

        <RundenPublicSharingGuide featuredAnlassraumId={featured?.anlassraumId ?? null} featuredAnlassraumTitle={featured?.title ?? null} />
      </main>
    </section>
  );
}