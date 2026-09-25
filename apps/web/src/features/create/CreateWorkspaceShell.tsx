"use client";

import * as React from "react";
import type { CreateAnalysisState } from "@/features/create/intelligentFollowupContract";

export type CreateWorkspaceStageId =
  | "input"
  | "understanding"
  | "topics"
  | "sources"
  | "draft";

export type CreateWorkspaceShellPhase =
  | "initial"
  | "loading"
  | "result"
  | "continuation";

type CreateWorkspaceShellProps = {
  locale: "de" | "en";
  activeStage: CreateWorkspaceStageId;
  stages?: CreateWorkspaceStage[];
  phase?: CreateWorkspaceShellPhase;
  isBusy?: boolean;
  notice?: React.ReactNode;
  chatThread: React.ReactNode;
  composer: React.ReactNode;
  footer?: React.ReactNode;
  renderSidecar?: (density: "compact" | "expanded") => React.ReactNode;
  renderMobileSidecarSummary?: (onOpen: () => void) => React.ReactNode;
  structureOverview?: {
    prioritiesCount: number;
    clustersCount: number;
    questionsCount: number;
    nextStepsCount: number;
    nextStepLabel?: string;
  };
};

export type CreateWorkspaceStageStatus = "done" | "active" | "planned" | "error" | "locked";

export type CreateWorkspaceStage = {
  id: CreateWorkspaceStageId;
  title: string;
  lead: string;
  status: CreateWorkspaceStageStatus;
};

export function buildCreateWorkspaceStages(params: {
  activeStage: CreateWorkspaceStageId;
  isBusy: boolean;
  analysisState?: CreateAnalysisState | null;
  hasValidatedTopics?: boolean;
  locale?: "de" | "en";
}): CreateWorkspaceStage[] {
  const stageOrder: CreateWorkspaceStageId[] = [
    "input",
    "understanding",
    "topics",
    "sources",
    "draft",
  ];
  const analysisFailed =
    params.analysisState === "ai_failed" || params.analysisState === "fetch_failed";
  const isEnglish = params.locale === "en";
  if (analysisFailed) {
    return [
      {
        id: "input",
        title: isEnglish ? "1 · Contribution received" : "1 · Beitrag aufgenommen",
        lead: isEnglish ? "The text is available in the workspace." : "Text liegt im Workspace.",
        status: "done",
      },
      {
        id: "understanding",
        title: isEnglish ? "2 · Analysis blocked" : "2 · Analyse blockiert",
        lead: isEnglish
          ? "No validated topics are available yet."
          : "Es liegen noch keine validierten Themen vor.",
        status: "error",
      },
      {
        id: "topics",
        title: isEnglish ? "3 · Decision pending" : "3 · Entscheidung offen",
        lead: isEnglish
          ? "Available after a successful analysis."
          : "Wird nach erfolgreicher Analyse freigeschaltet.",
        status: "locked",
      },
      {
        id: "sources",
        title: isEnglish ? "4 · Sources optional" : "4 · Quellen optional",
        lead: isEnglish
          ? "Locked until the analysis has been validated."
          : "Bleibt bis zur validierten Analyse gesperrt.",
        status: "locked",
      },
      {
        id: "draft",
        title: isEnglish ? "5 · Draft" : "5 · Entwurf",
        lead: isEnglish
          ? "Available only after a successful analysis."
          : "Wird erst nach erfolgreicher Analyse freigeschaltet.",
        status: "locked",
      },
    ];
  }
  const labels: Record<CreateWorkspaceStageId, { title: string; lead: string }> = {
    input: {
      title: isEnglish ? "1 · Contribution received" : "1 · Beitrag aufgenommen",
      lead: isEnglish ? "The text is available in the workspace." : "Text liegt im Workspace.",
    },
    understanding: {
      title: params.hasValidatedTopics
        ? isEnglish
          ? "2 · Topics detected"
          : "2 · Themen erkannt"
        : isEnglish
          ? "2 · Analysis in progress"
          : "2 · Analyse läuft",
      lead: params.hasValidatedTopics
        ? isEnglish
          ? "Initial topics are visible."
          : "Erste Themen sind sichtbar."
        : params.isBusy
          ? isEnglish
            ? "Classification is in progress."
            : "Einordnung läuft."
          : isEnglish
            ? "Classification is being prepared."
            : "Die Einordnung wird vorbereitet.",
    },
    topics: {
      title: isEnglish ? "3 · Decision pending" : "3 · Entscheidung offen",
      lead: isEnglish
        ? "You choose the focus or topic structure."
        : "Du wählst Fokus oder Themenstruktur.",
    },
    sources: {
      title: isEnglish ? "4 · Sources optional" : "4 · Quellen optional",
      lead: isEnglish
        ? "Source mode remains optional."
        : "Quellenmodus bleibt bewusst optional.",
    },
    draft: {
      title: isEnglish ? "5 · Draft" : "5 · Entwurf",
      lead: isEnglish
        ? "Then refine, save, or continue."
        : "Danach schärfen, speichern oder weiterführen.",
    },
  };

  const activeIndex = stageOrder.indexOf(params.activeStage);
  return stageOrder.map((stageId, index) => ({
    id: stageId,
    title: labels[stageId].title,
    lead: labels[stageId].lead,
    status: index < activeIndex ? "done" : index === activeIndex ? "active" : "planned",
  }));
}

type DesktopSidecarMode = "collapsed" | "compact";

export default function CreateWorkspaceShell({
  locale,
  phase = "initial",
  notice,
  chatThread,
  composer,
  footer,
  renderSidecar,
  renderMobileSidecarSummary,
}: CreateWorkspaceShellProps) {
  const [desktopSidecarMode, setDesktopSidecarMode] =
    React.useState<DesktopSidecarMode>("compact");
  const [mobileSidecarOpen, setMobileSidecarOpen] = React.useState(false);
  const mobileDialogCloseRef = React.useRef<React.ElementRef<"button"> | null>(null);
  const mobileDialogRef = React.useRef<React.ElementRef<"div"> | null>(null);
  const mobileDialogTriggerRef = React.useRef<HTMLElement | null>(null);
  const workspaceContentRef = React.useRef<React.ElementRef<"div"> | null>(null);

  const openMobileSidecar = React.useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      mobileDialogTriggerRef.current = document.activeElement;
    }
    setMobileSidecarOpen(true);
  }, []);

  const closeMobileSidecar = React.useCallback(() => {
    setMobileSidecarOpen(false);
  }, []);
  const isInitialPhase = phase === "initial";
  const isLoadingPhase = phase === "loading";
  const threadClassName = isInitialPhase
    ? "flex min-h-[13rem] flex-none flex-col overflow-y-auto px-4 py-3.5 md:min-h-[15rem] md:px-6 md:py-4 xl:px-7"
    : isLoadingPhase
      ? "flex min-h-[24rem] flex-1 flex-col overflow-y-auto px-5 py-5 md:min-h-[32rem] md:px-7 xl:px-8"
      : "flex min-h-[26rem] flex-1 flex-col overflow-y-auto px-5 py-5 md:min-h-[40rem] md:px-7 xl:px-8";
  const showDebattenstand = Boolean(renderSidecar) && !isInitialPhase;

  React.useEffect(() => {
    if (!mobileSidecarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const workspaceContent = workspaceContentRef.current;

    document.body.style.overflow = "hidden";
    workspaceContent?.setAttribute("inert", "");
    workspaceContent?.setAttribute("aria-hidden", "true");
    mobileDialogCloseRef.current?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileSidecar();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = mobileDialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          !element.hasAttribute("disabled"),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!activeElement || !dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      workspaceContent?.removeAttribute("inert");
      workspaceContent?.removeAttribute("aria-hidden");
      mobileDialogTriggerRef.current?.focus();
    };
  }, [closeMobileSidecar, mobileSidecarOpen]);

  return (
    <section
      data-create-workspace-shell
      data-create-shell-layout="wide"
      data-create-workspace-size="wide-screen"
      data-create-workspace-phase={phase}
      className={`mx-auto flex w-full max-w-[min(92vw,96rem)] flex-col rounded-[2.4rem] border border-[rgb(var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,rgb(var(--card))_96%,white_4%),color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%))] px-3 py-3 shadow-[0_36px_96px_rgba(2,6,23,0.18)] sm:px-4 md:px-5 md:py-5 xl:px-7 ${
        isInitialPhase
          ? "min-h-0"
          : "min-h-[calc(100vh-7.5rem)] md:min-h-[calc(100vh-6rem)]"
      }`}
    >
      <div
        ref={workspaceContentRef}
        className={`flex min-h-0 flex-1 flex-col ${isInitialPhase ? "gap-3 md:gap-3.5" : "gap-4"}`}
      >
        {showDebattenstand && renderMobileSidecarSummary
          ? renderMobileSidecarSummary(openMobileSidecar)
          : null}
        <div className={`flex min-h-0 flex-1 gap-4 ${showDebattenstand ? "xl:grid xl:grid-cols-[minmax(0,1fr)_19rem]" : ""}`}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
            <div
              data-create-shell-thread
              data-create-thread-phase={phase}
              className={threadClassName}
            >
              {chatThread}
            </div>
            <div
              data-create-shell-composer
              className="sticky bottom-0 z-10 border-t border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_74%,rgb(var(--bg))_26%)] supports-[backdrop-filter]:backdrop-blur"
            >
              {notice ? (
                <div className="border-b border-cyan-500/15 bg-cyan-500/[0.05] px-4 py-2.5 text-sm leading-relaxed text-cyan-950 dark:border-cyan-300/15 dark:text-cyan-100 md:px-6">
                  {notice}
                </div>
              ) : null}
              {composer}
            </div>
            <div
              data-create-shell-footer
              className="border-t border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_78%,rgb(var(--bg))_22%)] px-4 py-2 md:px-6"
            >
              <div
                data-create-no-auto-publish
                className="mb-1.5 text-[11px] font-semibold text-[rgb(var(--muted))]"
              >
                {locale === "en" ? "No auto-publishing" : "Kein Auto-Publish"}
              </div>
              {footer}
            </div>
          </div>
          {showDebattenstand ? (
            <aside
              data-create-shell-sidecar
              data-create-shell-sidecar-mode={desktopSidecarMode}
              className={`hidden min-h-0 overflow-hidden rounded-[30px] border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] xl:flex xl:flex-col ${
                desktopSidecarMode === "collapsed" ? "xl:w-[4.5rem]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[rgb(var(--border))] px-4 py-3">
                <div className={`${desktopSidecarMode === "collapsed" ? "sr-only" : "min-w-0"}`}>
                  <p className="text-sm font-semibold text-[rgb(var(--fg))]">Dein Überblick</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--muted))]"
                    onClick={() =>
                      setDesktopSidecarMode((current) =>
                        current === "collapsed" ? "compact" : "collapsed",
                      )
                    }
                    aria-label={
                      desktopSidecarMode === "collapsed"
                        ? "Debattenstand öffnen"
                        : "Debattenstand einklappen"
                    }
                  >
                    {desktopSidecarMode === "collapsed" ? ">" : "<"}
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {desktopSidecarMode === "collapsed" ? (
                  <div className="flex h-full items-center justify-center">
                    <button
                      type="button"
                      className="rounded-full border border-[rgb(var(--border))] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]"
                      onClick={() => setDesktopSidecarMode("compact")}
                      aria-label="Debattenstand öffnen"
                    >
                      DS
                    </button>
                  </div>
                ) : (
                  renderSidecar?.("compact")
                )}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
      {showDebattenstand && renderSidecar && mobileSidecarOpen ? (
        <div
          className="fixed inset-0 z-40 xl:hidden"
          aria-hidden={false}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35"
            aria-label="Debattenstand schließen"
            onClick={closeMobileSidecar}
          />
          <div
            ref={mobileDialogRef}
            id="create-debattenstand-sheet"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="create-debattenstand-sheet-title"
            data-create-debattenstand-sheet
            data-create-debattenstand-sheet-mode="expanded"
            className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-hidden rounded-t-[1.9rem] border border-b-0 border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_-18px_48px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3">
              <div className="min-w-0">
                <p
                  id="create-debattenstand-sheet-title"
                  className="text-sm font-semibold text-[rgb(var(--fg))]"
                >
                  Debattenstand
                </p>
                <p className="text-[12px] text-[rgb(var(--muted))]">
                  Entscheidung, Themen und Details
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  ref={mobileDialogCloseRef}
                  type="button"
                  className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-[11px] font-medium text-[rgb(var(--muted))]"
                  onClick={closeMobileSidecar}
                >
                  Schließen
                </button>
              </div>
            </div>
            <div className="max-h-[calc(78vh-4.25rem)] overflow-y-auto p-4">
              {renderSidecar("expanded")}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
