"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MotionStep from "@/components/motion/MotionStep";
import VoxyGuide from "@/components/voxy/VoxyGuide";
import StartDraftWorkspaceChooser from "@/features/start/StartDraftWorkspaceChooser";
import {
  clearStartDraftContext,
  createStartDraftContext,
  getStartDraftForTarget,
  saveStartDraftContext,
  updateStartDraftContext,
  type StartDraftContext,
} from "@/features/start/startDraftContext";
import { PUBLIC_TERMINOLOGY, publicTerminologyText } from "@/features/public/publicTerminology";
import { RUNDEN_VOXY_COPY } from "@/features/voxy/rundenVoxyCopy";
import { getGoToMarketTemplate } from "@features/pricing/goToMarketPackaging";
import {
  buildManualAnlassraumContinueCreateHref,
  buildManualAnlassraumServerDraftSavePayload,
  buildManualAnlassraumStartDraft,
  createEmptyManualAnlassraumSetup,
  resolveManualAnlassraumActionState,
  sanitizeManualAnlassraumSetup,
  type ManualAnlassraumAiSupportMode,
  type ManualAnlassraumCommunityOptionsMode,
  type ManualAnlassraumNextStep,
  type ManualAnlassraumScope,
  type ManualAnlassraumServerDraftSnapshot,
  type ManualAnlassraumSetup,
  type ManualAnlassraumVisibility,
} from "@/features/surfaces/runden/manualAnlassraumSetup";
import AnlassraumOptionEditor from "./AnlassraumOptionEditor";
import AnlassraumPrePublishCheck from "./AnlassraumPrePublishCheck";
import AnlassraumStartDraftPanel from "./AnlassraumStartDraftPanel";
import AnlassraumSupportSettings from "./AnlassraumSupportSettings";
import AnlassraumVisibilitySettings from "./AnlassraumVisibilitySettings";

const MANUAL_ANLASSRAUM_STORAGE_KEY = "manual-anlassraum-setup.v1";

const MANUAL_STEP_SUMMARY = [
  { id: "rahmen", label: "Rahmen", lead: "Titel, Leitfrage, Kurzbeschreibung" },
  { id: "optionen", label: "Antworten", lead: "Feste Antworten und Vorschläge aus der Community" },
  { id: "sichtbarkeit", label: "Sichtbarkeit", lead: "Intern behalten, später teilen oder prüfen lassen" },
  { id: "unterstuetzung", label: "Start", lead: `${PUBLIC_TERMINOLOGY.withoutVoxy} speichern oder ${PUBLIC_TERMINOLOGY.withVoxy} strukturieren` },
] as const;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function readStoredSetup(): ManualAnlassraumSetup | null {
  try {
    const raw = window.localStorage.getItem(MANUAL_ANLASSRAUM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManualAnlassraumSetup;
    return sanitizeManualAnlassraumSetup(parsed);
  } catch {
    return null;
  }
}

function persistSetup(setup: ManualAnlassraumSetup) {
  try {
    window.localStorage.setItem(
      MANUAL_ANLASSRAUM_STORAGE_KEY,
      JSON.stringify(sanitizeManualAnlassraumSetup(setup)),
    );
  } catch {
    // ignore local storage errors
  }
}

function clearStoredSetup() {
  try {
    window.localStorage.removeItem(MANUAL_ANLASSRAUM_STORAGE_KEY);
  } catch {
    // ignore local storage errors
  }
}

type StepGuideProps = {
  copy: string;
  stepId: string;
  label: string;
};

function StepMarker(props: StepGuideProps) {
  return (
    <div className="public-voxy-marker" data-manual-anlassraum-voxy-step={props.stepId}>
      <span aria-hidden="true" className="inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--grad-to))]" />
      <span>{props.label}: {publicTerminologyText(props.copy)}</span>
    </div>
  );
}

type AnlassraumSetupFormProps = {
  conversionMode?: boolean;
  initialServerDraft?: ManualAnlassraumServerDraftSnapshot | null;
  initialTemplateId?: string | null;
};

function syncDraftUrl(draftId: string) {
  if (typeof window === "undefined") return;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("draftId", draftId);
  window.history.replaceState(null, "", nextUrl.toString());
}

export default function AnlassraumSetupForm({
  conversionMode = false,
  initialServerDraft = null,
  initialTemplateId = null,
}: AnlassraumSetupFormProps) {
  const router = useRouter();
  const [setup, setSetup] = useState<ManualAnlassraumSetup>(createEmptyManualAnlassraumSetup);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [startDraft, setStartDraft] = useState<StartDraftContext | null>(null);
  const [serverDraftId, setServerDraftId] = useState<string | null>(
    initialServerDraft?.draftId ?? null,
  );
  const [isPersisting, setIsPersisting] = useState(false);

  useEffect(() => {
    const existingDraft = getStartDraftForTarget("rounds");
    if (existingDraft) {
      setStartDraft(existingDraft);
    }
    const restoredSetup = initialServerDraft?.setup ?? readStoredSetup();
    const selectedTemplate = getGoToMarketTemplate(initialTemplateId);
    const restoreText = restoredSetup
      ? "Dein lokal gesicherter Entwurf wurde wieder geöffnet."
      : null;
    if (initialServerDraft?.draftId) {
      setServerDraftId(initialServerDraft.draftId);
      syncDraftUrl(initialServerDraft.draftId);
    }
    if (!restoredSetup && selectedTemplate) {
      const templateSetup = sanitizeManualAnlassraumSetup({
        ...createEmptyManualAnlassraumSetup(),
        title: selectedTemplate.title.de,
        votingQuestion: selectedTemplate.question.de,
        description: selectedTemplate.description.de,
        options: [...selectedTemplate.options.de],
      });
      setSetup(templateSetup);
      persistSetup(templateSetup);
      setRestoreNotice(`Vorlage „${selectedTemplate.title.de}“ wurde geladen.`);
      return;
    }
    if (!restoredSetup) return;

    setSetup(restoredSetup);
    setRestoreNotice(restoreText);
    if (!existingDraft) {
      const restoredDraft = buildManualAnlassraumStartDraft(restoredSetup);
      if (restoredDraft) {
        const savedDraft = saveStartDraftContext(restoredDraft);
        if (savedDraft) {
          setStartDraft(savedDraft);
        }
      }
    }
  }, [initialServerDraft, initialTemplateId]);

  const actionState = useMemo(() => resolveManualAnlassraumActionState(setup), [setup]);
  const continueCreateHref = useMemo(
    () =>
      buildManualAnlassraumContinueCreateHref({
        setup,
        returnTo: "/runden/new",
        draftId: serverDraftId,
      }),
    [serverDraftId, setup],
  );

  function patchSetup(
    updater: (current: ManualAnlassraumSetup) => ManualAnlassraumSetup,
  ) {
    setActionNotice(null);
    setSetup((current) => updater(current));
  }

  function persistWithNextStep(nextStep: ManualAnlassraumNextStep): ManualAnlassraumSetup {
    const nextSetup = sanitizeManualAnlassraumSetup({
      ...setup,
      nextStep,
    });
    setSetup(nextSetup);
    persistSetup(nextSetup);
    return nextSetup;
  }

  function saveManualStartDraft(
    nextSetup: ManualAnlassraumSetup,
    targetHint: "create" | "rounds",
  ) {
    const nextDraft =
      buildManualAnlassraumStartDraft(nextSetup, startDraft) ??
      createStartDraftContext({
        text: nextSetup.title || nextSetup.votingQuestion || "Mitmachraum-Entwurf",
        origin: "round_handoff",
        intent: "round_suggestion",
        targetHint,
        id: startDraft?.id,
        createdAt: startDraft?.createdAt,
      });
    const savedDraft = saveStartDraftContext(
      nextDraft
        ? {
            ...nextDraft,
            targetHint,
          }
        : nextDraft,
    );
    if (savedDraft) {
      setStartDraft(savedDraft);
    }
  }

  async function persistServerDraft(nextSetup: ManualAnlassraumSetup) {
    const response = await fetch("/api/drafts/save", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(
        buildManualAnlassraumServerDraftSavePayload({
          setup: nextSetup,
          draftId: serverDraftId,
        }),
      ),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      return { ok: false as const, error: "not_authenticated" };
    }
    if (!response.ok || !body?.ok || typeof body?.draftId !== "string") {
      return {
        ok: false as const,
        error: String(body?.error ?? "server_draft_save_failed"),
      };
    }
    return {
      ok: true as const,
      draftId: body.draftId,
      updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
    };
  }

  async function persistManualDraftWithNotice(
    nextStep: ManualAnlassraumNextStep,
    notices: {
      saved: string;
      authRequired: string;
      failed: string;
    },
  ) {
    const nextSetup = persistWithNextStep(nextStep);
    saveManualStartDraft(nextSetup, "rounds");
    setRestoreNotice(null);
    setIsPersisting(true);
    try {
      const result = await persistServerDraft(nextSetup);
      if (result.ok) {
        setServerDraftId(result.draftId);
        syncDraftUrl(result.draftId);
        setActionNotice(notices.saved);
        return;
      }
      if (result.error === "not_authenticated") {
        setActionNotice(notices.authRequired);
        return;
      }
      setActionNotice(notices.failed);
    } catch {
      setActionNotice(notices.failed);
    } finally {
      setIsPersisting(false);
    }
  }

  async function continueManualDraftInCreate() {
    if (!actionState.canContinueCreate) return;

    const nextSetup = persistWithNextStep("continue_create");
    saveManualStartDraft(nextSetup, "create");

    setRestoreNotice(null);
    setIsPersisting(true);
    try {
      const result = await persistServerDraft(nextSetup);
      if (!result.ok) {
        if (result.error === "not_authenticated") {
          setActionNotice(
            "Zum Arbeiten mit Voxy bitte zuerst anmelden. Dein Entwurf bleibt lokal gespeichert; es wurde nichts veröffentlicht.",
          );
          return;
        }
        setActionNotice(
          "Der Entwurf konnte nicht gespeichert werden. Bitte speichere oder öffne ihn erneut, bevor du mit Voxy weiterarbeitest. Es wurde nichts veröffentlicht.",
        );
        return;
      }

      setServerDraftId(result.draftId);
      syncDraftUrl(result.draftId);
      router.push(
        buildManualAnlassraumContinueCreateHref({
          setup: nextSetup,
          returnTo: "/runden/new",
          draftId: result.draftId,
        }) as Parameters<typeof router.push>[0],
      );
    } catch {
      setActionNotice(
        "Der Entwurf konnte nicht gespeichert werden. Bitte speichere oder öffne ihn erneut, bevor du mit Voxy weiterarbeitest. Es wurde nichts veröffentlicht.",
      );
    } finally {
      setIsPersisting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[78rem] space-y-5">
      <section className="public-dialog-surface p-5 md:p-6 lg:p-8">
        <div className="public-reader-grid lg:gap-8">
          <aside className="public-voxy-rail order-2 lg:order-1">
            {conversionMode ? (
              <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm leading-6 text-[rgb(var(--muted))]">
                <p className="font-semibold text-[rgb(var(--fg))]">Optional unterstützen lassen</p>
                <p className="mt-1">Auf Wunsch hilft Voxy später beim Strukturieren. Vorschläge bleiben gekennzeichnet und unter deiner Kontrolle.</p>
              </section>
            ) : <VoxyGuide
              appearance="panel"
              title="Ich helfe dir, daraus einen verständlichen Mitmachraum zu machen."
              variant="welcome"
            >
              <p>{publicTerminologyText(RUNDEN_VOXY_COPY.manualFrame)}</p>
            </VoxyGuide>}
          </aside>

          <div className="public-dialog-area order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              {conversionMode ? "Deine kostenlose Abstimmung" : "eDebatte Mitmachraum"}
            </p>
            {conversionMode ? (
              <h2 className="mt-2 public-hero-title anlassraum-hero-title font-semibold tracking-tight text-[rgb(var(--fg))]">
                Frage stellen. <span className="public-gradient-text">Antworten festlegen.</span>{" "}<span className="public-gradient-text">Gemeinsam entscheiden.</span>
              </h2>
            ) : (
              <h1 className="mt-2 public-hero-title anlassraum-hero-title font-semibold tracking-tight text-[rgb(var(--fg))]">
                <>Bereite deinen <span className="public-gradient-text">Mitmachraum</span>{" "}<span className="public-gradient-text">Schritt für Schritt</span> vor.</>
              </h1>
            )}
            <p className="public-hero-lead mt-3 max-w-3xl">
              {conversionMode
                ? "Du kannst sofort beginnen. Der Arbeitsstand bleibt privat, bis du ihn selbst geprüft und bewusst freigegeben hast."
                : "Lege Thema, Frage, mögliche Antworten und Sichtbarkeit zuerst selbst fest. Danach kannst du ohne Voxy speichern oder mit Voxy strukturieren."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-[rgb(var(--muted))]">
              <span className="anlassraum-soft-signal">4 klare Schritte</span>
              <span className="anlassraum-soft-signal">{conversionMode ? "Kostenlos beginnen" : "Mit oder ohne Voxy"}</span>
              <span className="anlassraum-soft-signal">Nichts geht automatisch online</span>
            </div>
          </div>
        </div>

        <div className="runden-step-line mt-5" data-manual-anlassraum-stepper="true">
          <ol className="anlassraum-step-track">
            {MANUAL_STEP_SUMMARY.map((step, index) => (
              <li
                key={step.id}
                className={joinClasses(
                  "anlassraum-step-item",
                  index === 0 && "anlassraum-step-item--active",
                )}
              >
                <span className="anlassraum-step-count">0{index + 1}</span>
                <span className="anlassraum-step-body">
                  <span className="anlassraum-step-label">{step.label}</span>
                  <span className="anlassraum-step-lead">{step.lead}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {restoreNotice ? (
          <p className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 text-sm text-[rgb(var(--muted))]">
            {restoreNotice}
          </p>
        ) : null}
        <AnlassraumStartDraftPanel
          visible={Boolean(startDraft)}
          title={conversionMode ? "Abstimmung weiter vorbereiten" : "Runde aus deinem Entwurf vorbereiten"}
          statusLine="Noch nicht veröffentlicht"
          helperText="Du kannst Titel, Frage und Antworten weiterbearbeiten oder den Stand später fortsetzen."
        />
        {startDraft ? (
          <div className="mt-4">
            <StartDraftWorkspaceChooser
              activeKey="rounds"
              options={[
                {
                  key: "create",
                  title: "Beitrag ausarbeiten",
                  description: "Zum Beitragsmodus wechseln, ohne den Entwurf zu verlieren.",
                  href: "/create?startDraft=1",
                  onClick: () => updateStartDraftContext({ targetHint: "create" }),
                },
                {
                  key: "themes",
                  title: "Passende Themen finden",
                  description: "Mit demselben Anliegen in der Themensuche weiterarbeiten.",
                  href: "/themen?startDraft=1",
                  onClick: () => updateStartDraftContext({ targetHint: "themes" }),
                },
                {
                  key: "rounds",
                  title: "Runde vorbereiten",
                  description: "Antworten weiterbearbeiten und als Entwurf offen halten.",
                  href: serverDraftId
                    ? `/runden/new?draftId=${encodeURIComponent(serverDraftId)}&startDraft=1&from=rounds`
                    : "/runden/new?startDraft=1&from=rounds",
                  onClick: () => updateStartDraftContext({ targetHint: "rounds" }),
                },
                {
                  key: "editorial",
                  title: "Redaktionelle Prüfung anfragen",
                  description: "Denselben Entwurf prüfen lassen, ohne etwas zu veröffentlichen.",
                  href: "/start?review=editorial",
                  onClick: () => updateStartDraftContext({ origin: "start_relevance_review" }),
                },
                {
                  key: "later",
                  title: "Später weiterarbeiten",
                  description: "Als Arbeitsstand behalten und später im Konto fortsetzen.",
                  href: "/account",
                  onClick: () => updateStartDraftContext({ targetHint: "rounds" }),
                },
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className="vog-btn-secondary"
                onClick={() => {
                  clearStoredSetup();
                  clearStartDraftContext();
                  setSetup(createEmptyManualAnlassraumSetup());
                  setStartDraft(null);
                  setRestoreNotice(null);
                  setActionNotice("Entwurf verworfen. Es wurde nichts veröffentlicht.");
                }}
              >
                Entwurf verwerfen
              </button>
            </div>
          </div>
        ) : null}
        {actionNotice ? (
          <p className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 text-sm text-[rgb(var(--fg))]">
            {actionNotice}
          </p>
        ) : null}
      </section>

      <MotionStep stepIndex={0}>
        <section className="space-y-4">
          <div className="space-y-4">
            <StepMarker
              copy={conversionMode ? "Formuliere die Frage so, dass eure Gruppe sie ohne weitere Erklärung versteht." : RUNDEN_VOXY_COPY.manualFrame}
              stepId="rahmen"
              label="Schritt 1"
            />
            <section
              className="vog-surface-elevated p-4 md:p-5"
              data-manual-anlassraum-step="rahmen"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                Schritt 1
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">Rahmen</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
                Noch keine perfekte Formulierung nötig. Halte erst fest, worum es geht.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
                    Titel
                  </span>
                  <input
                    value={setup.title}
                    onChange={(event) =>
                      patchSetup((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60"
                    placeholder="Zum Beispiel: Schulwege rund um die Grundschule sicherer machen"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
                    Leitfrage
                  </span>
                  <input
                    value={setup.votingQuestion}
                    onChange={(event) =>
                      patchSetup((current) => ({
                        ...current,
                        votingQuestion: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60"
                    placeholder="Zum Beispiel: Welche Lösung soll zuerst umgesetzt werden?"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
                  Kurzbeschreibung
                </span>
                <textarea
                  value={setup.description}
                  onChange={(event) =>
                    patchSetup((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-[120px] w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60"
                  placeholder="Beschreibe kurz, worum es geht, wer betroffen ist und warum das Thema jetzt wichtig ist."
                />
              </label>
            </section>
          </div>
        </section>
      </MotionStep>

      <MotionStep stepIndex={1}>
        <section className="space-y-4">
          <div className="space-y-4">
            <StepMarker
              copy={conversionMode ? "Lege klare Antwortmöglichkeiten fest; weitere Vorschläge bleiben optional." : RUNDEN_VOXY_COPY.manualOptions}
              stepId="optionen"
              label="Schritt 2"
            />
            <AnlassraumOptionEditor
              conversionMode={conversionMode}
              communityOptionsMode={setup.communityOptionsMode}
              configuredOptionCount={actionState.optionCount}
              onAddOption={() =>
                patchSetup((current) => ({
                  ...current,
                  options: [...current.options, ""],
                }))
              }
              onCommunityOptionsModeChange={(value: ManualAnlassraumCommunityOptionsMode) =>
                patchSetup((current) => ({
                  ...current,
                  communityOptionsMode: value,
                }))
              }
              onOptionChange={(index, value) =>
                patchSetup((current) => ({
                  ...current,
                  options: current.options.map((option, optionIndex) =>
                    optionIndex === index ? value : option,
                  ),
                }))
              }
              onRemoveOption={(index) =>
                patchSetup((current) => ({
                  ...current,
                  options:
                    current.options.length <= 2
                      ? current.options
                      : current.options.filter((_, optionIndex) => optionIndex !== index),
                }))
              }
              options={setup.options}
            />
          </div>
        </section>
      </MotionStep>

      <MotionStep stepIndex={2}>
        <section className="space-y-4">
          <div className="space-y-4">
            <StepMarker
              copy={conversionMode ? "Der Entwurf bleibt privat, bis du ihn bewusst freigibst." : RUNDEN_VOXY_COPY.manualVisibility}
              stepId="sichtbarkeit"
              label="Schritt 3"
            />
            <AnlassraumVisibilitySettings
              conversionMode={conversionMode}
              onScopeChange={(value: ManualAnlassraumScope) =>
                patchSetup((current) => ({
                  ...current,
                  scope: value,
                }))
              }
              onVisibilityChange={(value: ManualAnlassraumVisibility) =>
                patchSetup((current) => ({
                  ...current,
                  visibility: value,
                }))
              }
              scope={setup.scope}
              visibility={setup.visibility}
            />
          </div>
        </section>
      </MotionStep>

      <MotionStep stepIndex={3}>
        <section className="space-y-4">
          <div className="space-y-4">
            <StepMarker
              copy={conversionMode ? "Speichere kostenlos oder nutze optionale, gekennzeichnete Unterstützung." : RUNDEN_VOXY_COPY.manualSupport}
              stepId="unterstuetzung"
              label="Schritt 4"
            />
            <div className="space-y-4">
              <AnlassraumSupportSettings
                aiSupportMode={setup.aiSupportMode}
                onAiSupportModeChange={(value: ManualAnlassraumAiSupportMode) =>
                  patchSetup((current) => ({
                    ...current,
                    aiSupportMode: value,
                  }))
                }
              />

              <AnlassraumPrePublishCheck
                actionState={actionState}
                conversionMode={conversionMode}
                continueCreateHref={continueCreateHref}
                isSaving={isPersisting}
                onContinueCreate={(event) => {
                  if (!actionState.canContinueCreate) return;
                  event.preventDefault();
                  void continueManualDraftInCreate();
                }}
                onSaveDraft={() => {
                  if (!actionState.canSaveDraft) return;
                  void persistManualDraftWithNotice(
                    "save_draft",
                    {
                      saved:
                        conversionMode
                          ? "Abstimmungsentwurf gespeichert. Es wurde nichts veröffentlicht. Du kannst später weiterarbeiten oder dir Unterstützung beim Strukturieren holen."
                          : "Mitmachraum-Entwurf gespeichert. Es wurde nichts veröffentlicht. Du kannst später ohne Voxy weiterarbeiten oder mit Voxy strukturieren.",
                      authRequired:
                        conversionMode
                          ? "Abstimmungsentwurf lokal gespeichert. Zum dauerhaften Speichern und späteren Teilen bitte anmelden. Es wurde nichts veröffentlicht."
                          : "Mitmachraum-Entwurf lokal gespeichert. Zum Speichern im Konto bitte anmelden. Es wurde nichts veröffentlicht.",
                      failed:
                        conversionMode
                          ? "Abstimmungsentwurf lokal gespeichert. Das Speichern im Konto ist fehlgeschlagen. Es wurde nichts veröffentlicht."
                          : "Mitmachraum-Entwurf lokal gespeichert. Das Speichern im Konto ist fehlgeschlagen. Es wurde nichts veröffentlicht.",
                    },
                  );
                }}
                onStartInternal={() => {
                  if (!actionState.canStartInternal) return;
                  void persistManualDraftWithNotice(
                    "start_internal",
                    {
                      saved:
                        conversionMode
                          ? "Abstimmung intern vorgemerkt. Sichtbarkeit, Prüfung und optionale Unterstützung bleiben bewusste nächste Schritte."
                          : "Mitmachraum intern vorgemerkt. Sichtbarkeit, Prüfung und Voxy bleiben bewusste nächste Schritte.",
                      authRequired:
                        conversionMode
                          ? "Abstimmung lokal vorgemerkt. Zum Speichern im Konto bitte anmelden. Es wurde nichts veröffentlicht."
                          : "Mitmachraum lokal vorgemerkt. Zum Speichern im Konto bitte anmelden. Sichtbarkeit, Prüfung und Voxy bleiben bewusste nächste Schritte.",
                      failed:
                        conversionMode
                          ? "Abstimmung lokal vorgemerkt. Das Speichern im Konto ist fehlgeschlagen. Es wurde nichts veröffentlicht."
                          : "Mitmachraum lokal vorgemerkt. Das Speichern im Konto ist fehlgeschlagen. Sichtbarkeit, Prüfung und Voxy bleiben bewusste nächste Schritte.",
                    },
                  );
                }}
                onSubmitPublicReview={() => {
                  if (!actionState.canSubmitPublicReview) return;
                  void persistManualDraftWithNotice(
                    "submit_public_review",
                    {
                      saved:
                        "Entwurf für spätere öffentliche Prüfung vorgemerkt. Es wurde nichts automatisch veröffentlicht.",
                      authRequired:
                        "Entwurf lokal für spätere öffentliche Prüfung vorgemerkt. Zum Speichern im Konto bitte anmelden. Es wurde nichts automatisch veröffentlicht.",
                      failed:
                        "Entwurf lokal für spätere öffentliche Prüfung vorgemerkt. Das Speichern im Konto ist fehlgeschlagen. Es wurde nichts automatisch veröffentlicht.",
                    },
                  );
                }}
                setup={setup}
              />
            </div>
          </div>
        </section>
      </MotionStep>

      <div className="flex flex-wrap gap-2 text-sm text-[rgb(var(--muted))]">
        <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1">
          Titel oder Frage: {actionState.hasFrameInput ? "gesetzt" : "noch offen"}
        </span>
        <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1">
          Antwortmöglichkeiten: {actionState.optionCount}
        </span>
        <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1">
          Voxy: {setup.aiSupportMode === "disabled" ? "ohne" : "mit"}
        </span>
      </div>
    </div>
  );
}
