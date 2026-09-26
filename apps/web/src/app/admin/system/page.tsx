import Link from "next/link";
import { buildAgenticBootstrapReadiness } from "@/features/agenticRuntime/agentRegistryBootstrapContract";
import {
  buildAgenticCivicE2EAdminHint,
  buildAgenticCivicE2EPilotContract,
  buildAgenticCivicE2EPilotSummaryCards,
} from "@/features/agenticRuntime/agenticCivicE2EPilotContract";
import {
  buildAgenticCivicE2EStatusHint,
  buildB2GFirstLoginJurisdictionCockpitContract,
  buildB2GFirstLoginSummaryCards,
} from "@/features/agenticRuntime/b2gFirstLoginJurisdictionCockpitContract";
import {
  buildMunicipalHandoffThreeAdoptionTrialContract,
  buildMunicipalHandoffThreeAdoptionTrialSummaryCards,
  buildMunicipalHandoffTrialAdminHint,
} from "@/features/agenticRuntime/municipalHandoffThreeAdoptionTrialContract";
import {
  buildAdminSegmentHint,
  listSegmentedAgentExperiences,
} from "@/features/agenticRuntime/segmentedAgentExperienceContract";
import {
  buildVoxyExperienceShellContract,
  buildVoxyExperienceShellModeHint,
  buildVoxyExperienceShellSummaryCards,
} from "@/features/voxy/voxyExperienceShellContract";
import {
  getOperatorWorkbenchSurface,
  type OperatorWorkbenchSurfaceKey,
} from "@/features/admin/operatorWorkbenchSurfaces";

type HubItem = {
  title: string;
  description: string;
  href: string;
};

const NEXT_STEP_SURFACES: OperatorWorkbenchSurfaceKey[] = [
  "reviewQueue",
  "accessCenter",
  "entitlements",
  "pricingOrders",
  "organizationDashboard",
];

const SECTIONS: Array<{ title: string; items: HubItem[] }> = [
  {
    title: "Operations",
    items: [
      {
        title: "Alpha2 Mission Control",
        description: "Durable Runs, Human Gates und validiertes Learning – read-only",
        href: "/admin/system/alpha2",
      },
      {
        title: "Telemetry Hub",
        description: "AI Usage, Health, Logs",
        href: "/admin/telemetry",
      },
      {
        title: "Audit Logs",
        description: "Mutationen und Zugriffspfad",
        href: "/admin/audit",
      },
      {
        title: "Error Logs",
        description: "Systemfehler & Trace IDs",
        href: "/admin/errors",
      },
      {
        title: "Analytics (Legacy)",
        description: "Registrierungen, Rollen, Pakete",
        href: "/admin/analytics",
      },
    ],
  },
  {
    title: "Konfiguration",
    items: [
      {
        title: "Admin Settings",
        description: "Pricing und Systemwerte",
        href: "/admin/settings",
      },
    ],
  },
];

export default async function AdminSystemHubPage() {
  const systemSurface = getOperatorWorkbenchSurface("systemHub");
  const agenticReadiness = buildAgenticBootstrapReadiness();
  const segmentedExperiences = listSegmentedAgentExperiences();
  const b2gFirstLoginContract = buildB2GFirstLoginJurisdictionCockpitContract({
    municipalHandoffStatus: "done",
  });
  const agenticCivicE2EPilotContract = buildAgenticCivicE2EPilotContract();
  const municipalHandoffTrialContract = buildMunicipalHandoffThreeAdoptionTrialContract();
  const voxyExperienceShell = buildVoxyExperienceShellContract();
  const voxyNextTaskLabel =
    agenticCivicE2EPilotContract.statusInOpenTasks === "done"
      ? "kein Folgepfad"
      : voxyExperienceShell.nextCodexReadyTaskId ?? "kein Folgepfad";
  const materializedFollowups =
    agenticReadiness.bootstrap.followupTaskCount - agenticReadiness.bootstrap.missingFollowupTaskIds.length;
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
          {systemSurface.eyebrow}
        </p>
        <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">{systemSurface.title}</h1>
        <p className="text-sm text-[rgb(var(--muted))]">{systemSurface.summary}</p>
      </header>

      <section className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Häufige nächste Schritte</h2>
          <span className="text-xs text-[rgb(var(--muted))]">{NEXT_STEP_SURFACES.length} Wege</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {NEXT_STEP_SURFACES.map((key) => {
            const surface = getOperatorWorkbenchSurface(key);
            return <HubCard key={surface.href} title={surface.title} description={surface.summary} href={surface.href} />;
          })}
        </div>
      </section>

      <section
        data-testid="agentic-bootstrap-readiness-card"
        className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Controlled Agentic Runtime
            </p>
            <h2 className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
              Registry Bootstrap Readiness
            </h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Validiert Registry, denied actions, shared rules und Task-Mapping ohne Runtime-Aktivierung,
              Parallel-Agenten oder externe Provider.
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{buildAdminSegmentHint()}</p>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--soft))] px-3 py-2 text-right text-xs text-[rgb(var(--muted))]">
            <p>Bootstrap-Task</p>
            <p className="font-semibold text-[rgb(var(--fg))]">
              {agenticReadiness.bootstrap.bootstrapStatusInOpenTasks === "done"
                ? "done"
                : agenticReadiness.bootstrap.bootstrapStatusInOpenTasks}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReadinessMetric
            label="Validierte Rollen"
            value={String(agenticReadiness.registry.roleCount)}
            detail={agenticReadiness.registry.validatedRoleIds.join(", ")}
          />
          <ReadinessMetric
            label="Follow-up-Tasks materialisiert"
            value={`${materializedFollowups}/${agenticReadiness.bootstrap.followupTaskCount}`}
            detail="OpenTasks-Sync"
          />
          <ReadinessMetric
            label="Shared Rules"
            value={String(agenticReadiness.registry.sharedRuleKeys.length)}
            detail="alle erzwungen"
          />
          <ReadinessMetric
            label="Denied Actions"
            value={String(agenticReadiness.registry.deniedActionCount)}
            detail="keine stille Freigabe"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Segmentgrenzen</h3>
            <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
              {segmentedExperiences.map((segment) => (
                <li key={segment.id}>
                  <span className="font-medium text-[rgb(var(--fg))]">{segment.title}:</span>{" "}
                  {segment.primaryExperience}, geführte Hilfe {segment.guidedAssistance === "optional" ? "optional" : "nicht primär"}, benannter Kontakt{" "}
                  {segment.namedHumanContact === "optional" ? "optional" : "nicht primär"}, erzwungener Companion nein.
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Pflichtgrenzen</h3>
            <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
              <li>Runtime bleibt deaktiviert: {agenticReadiness.runtimeActivationAllowed ? "nein" : "ja"}.</li>
              <li>Keine Parallelarchitektur: {agenticReadiness.noParallelArchitecture ? "erzwungen" : "offen"}.</li>
              <li>
                Daily Civic Impulses bleiben optional, maximal {agenticReadiness.dailyCivicImpulses.maxPerDay} pro
                Tag.
              </li>
              <li>
                Screenshot-Intake trennt {agenticReadiness.screenshotIntakeStages.join(" -> ")}.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Nächste codex_ready Tasks</h3>
            {agenticReadiness.bootstrap.codexReadyTaskIds.length > 0 ? (
              <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
                {agenticReadiness.bootstrap.codexReadyTaskIds.map((taskId) => (
                  <li key={taskId}>{taskId}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                Keine weiteren codex_ready Controlled-Agentic-Folgepfade.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Blocked / needs_decision</h3>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Blocked: {agenticReadiness.bootstrap.blockedTaskIds.length}. Needs decision:{" "}
              {agenticReadiness.bootstrap.needsDecisionTaskIds.length}.
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Personal Voxy, B2B Workbench und B2G Cockpit bleiben getrennt; Übersetzung bleibt keine Evidenz;
              Public Debattenstand bleibt frei lesbar.
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              {buildAgenticCivicE2EStatusHint(b2gFirstLoginContract)}
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{buildMunicipalHandoffTrialAdminHint()}</p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{buildAgenticCivicE2EAdminHint()}</p>
          </div>
        </div>
      </section>

      <section
        data-testid="voxy-experience-shell-card"
        className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Voxy Experience Shell
            </p>
            <h2 className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
              Page, Mobile und Agentic Integration bleiben lesbar und sicher
            </h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              {voxyExperienceShell.surfaces.find((surface) => surface.id === "admin_system")?.pageHint}
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              {buildVoxyExperienceShellModeHint()}
            </p>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--soft))] px-3 py-2 text-right text-xs text-[rgb(var(--muted))]">
            <p>Next codex_ready</p>
            <p className="font-semibold text-[rgb(var(--fg))]">
              {voxyNextTaskLabel}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {buildVoxyExperienceShellSummaryCards(voxyExperienceShell).map((card) => (
            <ReadinessMetric key={card.id} label={card.title} value="contract" detail={card.body} />
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Voxy Modi</h3>
            <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
              {voxyExperienceShell.modes.map((mode) => (
                <li key={mode.id}>
                  <span className="font-medium text-[rgb(var(--fg))]">{mode.label}:</span> {mode.summary}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Grenzen</h3>
            <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
              <li>Keine Runtime-Aktivierung, keine Provider-Leaks und keine Prompt- oder Chain-of-Thought-Leaks.</li>
              <li>Mobil bleibt Voxy sticky, safe-area-aware und chip-first statt dialogerzwungen.</li>
              <li>B2C Personal Voxy bleibt consent-gated; B2B und B2G werden nicht in einen persönlichen Companion gezwungen.</li>
              <li>V3-AGENTIC-CIVIC-E2E-PILOT-01 bleibt nach diesem Shell-Slice der nächste codex_ready Folgepfad.</li>
            </ul>
          </div>
        </div>
      </section>

      <section
        data-testid="b2g-first-login-readiness-card"
        className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              B2G Authority Cockpit
            </p>
            <h2 className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
              First Login / Jurisdiktion / Response Boundaries
            </h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Verified authority first login bleibt getrennt von Aktivierung, externem Handoff und Entitlement.
            </p>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--soft))] px-3 py-2 text-right text-xs text-[rgb(var(--muted))]">
            <p>Agentic Civic E2E</p>
            <p className="font-semibold text-[rgb(var(--fg))]">
              {b2gFirstLoginContract.agenticCivicE2E.status}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {buildB2GFirstLoginSummaryCards(b2gFirstLoginContract).map((card) => (
            <ReadinessMetric key={card.id} label={card.title} value="review-first" detail={card.body} />
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {buildMunicipalHandoffThreeAdoptionTrialSummaryCards(
            municipalHandoffTrialContract,
          ).map((card) => (
            <ReadinessMetric key={card.id} label={card.title} value="contract" detail={card.body} />
          ))}
        </div>
      </section>

      <section
        data-testid="agentic-civic-e2e-pilot-card"
        className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Agentic Civic E2E Pilot
            </p>
            <h2 className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
              Review-first End-to-End Status
            </h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{buildAgenticCivicE2EAdminHint()}</p>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--soft))] px-3 py-2 text-right text-xs text-[rgb(var(--muted))]">
            <p>Pilot-Task</p>
            <p className="font-semibold text-[rgb(var(--fg))]">
              {agenticCivicE2EPilotContract.statusInOpenTasks}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {buildAgenticCivicE2EPilotSummaryCards(agenticCivicE2EPilotContract).map((card) => (
            <ReadinessMetric key={card.id} label={card.title} value="review-first" detail={card.body} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">E2E Stages</h3>
            <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
              {agenticCivicE2EPilotContract.stages.map((stage) => (
                <li key={stage.id}>
                  <span className="font-medium text-[rgb(var(--fg))]">{stage.title}:</span>{" "}
                  {stage.summary}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Pilot-Grenzen</h3>
            <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--muted))]">
              <li>Review-first bleibt Pflicht: {agenticCivicE2EPilotContract.reviewPipeline.reviewFirst ? "ja" : "nein"}.</li>
              <li>Öffentliche Debattenstände bleiben frei lesbar: {agenticCivicE2EPilotContract.publicDebattenstandRemainsFree ? "ja" : "nein"}.</li>
              <li>GOV-light nutzt {agenticCivicE2EPilotContract.govLight.slotLimit} aktive Themen-Slots.</li>
              <li>Verified Publisher Preflight bleibt bewusster Publish-Pfad ohne Agent-Auto-Publish.</li>
            </ul>
          </div>
        </div>
      </section>

      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">{section.title}</h2>
            <span className="text-xs text-[rgb(var(--muted))]">{section.items.length} Bereiche</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <HubCard key={item.href} {...item} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function HubCard({ title, description, href }: HubItem) {
  return (
    <Link
      href={href}
      className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))] transition hover:-translate-y-0.5 hover:ring-sky-200"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
        {title}
      </p>
      <p className="mt-2 text-sm text-[rgb(var(--muted))]">{description}</p>
    </Link>
  );
}

function ReadinessMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--soft))] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[rgb(var(--fg))]">{value}</p>
      <p className="mt-1 text-xs text-[rgb(var(--muted))]">{detail}</p>
    </div>
  );
}
