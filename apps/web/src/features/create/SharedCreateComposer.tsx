"use client";

import * as React from "react";
import Link from "next/link";
import type { CreateProductMode } from "@/features/create/createProductModes";
import type { CreateIntent } from "@/features/create/intents";
import type {
  CreateComposerTexts,
  CreateComposerHeadlineText,
  CreateContextAnchorDefinition,
  CreateHelperLinkDefinition,
  CreateSurfaceModeDefinition,
} from "@/features/create/createSurfaceConfig";
import EntryHeroHeading from "@/components/surfaces/EntryHeroHeading";
import type { CreateCitizenIntakeContext } from "@/features/create/createContributionPackageContract";
import { buildCreateJurisdictionCandidateKey } from "@/features/create/createCitizenIntakeContext";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

const MAX_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const FILE_ACCEPT =
  ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.heic,.mp3,.m4a,.wav,.mp4,.mov";

function IconPaperclip() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
      <path
        d="M21.44 11.05 12.95 19.54a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.19 9.19a2 2 0 1 1-2.83-2.83l8.49-8.49"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMic() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 11a7 7 0 0 1-14 0" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18v3" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 21h8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
      <path
        d="M4 20h4l10-10a2 2 0 0 0-4-4L4 16v4Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5 17.5 10.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CREATE_COMPOSER_STAGES = [
  {
    title: "Eingabe",
    lead: "Du beschreibst den Kern.",
  },
  {
    title: "Einordnung",
    lead: "eDebatte erkennt Signale.",
  },
  {
    title: "Vorschlag",
    lead: "Ein Arbeitsstand wird gezeigt.",
  },
  {
    title: "Bestätigung",
    lead: "Du entscheidest den nächsten Schritt.",
  },
] as const;

function CreateComposerSceneRail() {
  return (
    <div className="public-process-line px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Geführter Ablauf</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">Vom ersten Signal bis zur nächsten Aktion</p>
        </div>
        <span className="vog-chip">
          Dialogisch geführt
        </span>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-3">
          {CREATE_COMPOSER_STAGES.map((stage, index) => (
            <React.Fragment key={stage.title}>
              <div className="flex min-w-[9rem] items-center gap-3 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5 transition-all duration-300 ease-out">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--grad-from))]/35 text-[11px] font-semibold text-[rgb(var(--fg))]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[rgb(var(--fg))]">{stage.title}</p>
                  <p className="text-[11px] leading-relaxed text-[rgb(var(--muted))]">{stage.lead}</p>
                </div>
              </div>
              {index < CREATE_COMPOSER_STAGES.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-gradient-to-r from-cyan-400/40 to-emerald-300/25"
                />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export type SharedCreateComposerProps = {
  badge: string;
  subline: string;
  texts: CreateComposerTexts;
  topMeta?: React.ReactNode;
  modeOrder: readonly CreateProductMode[];
  modeDefinitions: Record<CreateProductMode, CreateSurfaceModeDefinition>;
  activeMode: CreateProductMode;
  onModeChange: (mode: CreateProductMode) => void;
  helperText: string;
  inputId: string;
  inputLabel?: string;
  inputValue: string;
  inputPlaceholder: string;
  onInputChange: (value: string) => void;
  onStart: () => void;
  startLabel: string;
  startDisabled?: boolean;
  startBusy?: boolean;
  startBusyLabel?: string;
  secondaryAction: {
    href: string;
    label: string;
  };
  contextAnchors: readonly CreateContextAnchorDefinition[];
  activeContextAnchorId: CreateIntent | null;
  onContextAnchorSelect: (id: CreateIntent) => void;
  activeContextAnchorLead?: string | null;
  helperLinks: readonly CreateHelperLinkDefinition[];
  error?: string | null;
  errorRef?: React.Ref<React.ElementRef<"p">>;
  contextBanner?: React.ReactNode;
  citizenContext?: CreateCitizenIntakeContext | null;
  onEditCitizenRegion?: () => void;
  confirmedJurisdictionKey?: string | null;
  onConfirmCitizenJurisdiction?: (candidateKey: string) => void;
  onEditCitizenJurisdiction?: () => void;
  allowAttachments?: boolean;
  allowVoice?: boolean;
  onAttachmentsChange?: (files: File[]) => void;
  minRows?: number;
  inputAutoFocus?: boolean;
  heroTone?: "calm" | "lively";
  heroHeadlineOverride?: CreateComposerHeadlineText;
  heroSublineOverride?: string;
  heroBadgeOverride?: string;
  collapseModeSelector?: boolean;
  embeddedWorkspace?: boolean;
  experienceVariant?: "standard" | "create_minimal" | "workspace_shell";
  workspacePhase?: "initial" | "continuation";
  minimalHeading?: React.ReactNode;
  minimalLead?: string;
  hideAlternateModeDisclosure?: boolean;
  locale?: "de" | "en";
  showSceneRail?: boolean;
};

export default function SharedCreateComposer({
  badge,
  subline,
  texts,
  topMeta,
  modeOrder,
  modeDefinitions,
  activeMode,
  onModeChange,
  helperText,
  inputId,
  inputLabel,
  inputValue,
  inputPlaceholder,
  onInputChange,
  onStart,
  startLabel,
  startDisabled = false,
  startBusy = false,
  startBusyLabel,
  secondaryAction,
  error,
  errorRef,
  contextBanner,
  citizenContext,
  onEditCitizenRegion,
  confirmedJurisdictionKey = null,
  onConfirmCitizenJurisdiction,
  onEditCitizenJurisdiction,
  allowAttachments = true,
  allowVoice = true,
  onAttachmentsChange,
  minRows = 9,
  inputAutoFocus = false,
  heroTone = "calm",
  heroHeadlineOverride,
  heroSublineOverride,
  heroBadgeOverride,
  collapseModeSelector = false,
  embeddedWorkspace = false,
  experienceVariant = "standard",
  workspacePhase = "initial",
  minimalHeading,
  minimalLead,
  hideAlternateModeDisclosure = false,
  locale = "de",
  showSceneRail = true,
}: SharedCreateComposerProps) {
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = React.useState(false);
  const [voiceActive, setVoiceActive] = React.useState(false);
  const [voiceError, setVoiceError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<React.ElementRef<"input"> | null>(null);
  const textareaRef = React.useRef<React.ElementRef<"textarea"> | null>(null);
  const speechRef = React.useRef<SpeechRecognitionLike | null>(null);
  const compactMetaMode = embeddedWorkspace && collapseModeSelector;
  const isMinimalCreate = experienceVariant === "create_minimal";
  const isWorkspaceShell = experienceVariant === "workspace_shell";
  const isWorkspaceContinuation = isWorkspaceShell && workspacePhase === "continuation";
  const isEnglishMinimal = isMinimalCreate && locale === "en";
  const resolvedPlaceholder = isMinimalCreate
    ? isEnglishMinimal
      ? "Describe your topic, idea, or proposed solution..."
      : "Beschreibe dein Thema, deine Idee oder deinen Lösungsansatz..."
    : inputPlaceholder;
  const characterCount = inputValue.trim().length;

  React.useEffect(() => {
    if (!allowVoice) {
      setSpeechSupported(false);
      return;
    }
    try {
      const speechWindow = window as SpeechWindow;
      setSpeechSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    } catch {
      setSpeechSupported(false);
    }
  }, [allowVoice]);

  const setAttachmentState = React.useCallback(
    (nextFiles: File[], nextError: string | null) => {
      setAttachments(nextFiles);
      setAttachmentsError(nextError);
      onAttachmentsChange?.(nextFiles);
    },
    [onAttachmentsChange],
  );

  const handleFilesChange = React.useCallback(
    (event: React.ChangeEvent<React.ElementRef<"input">>) => {
      const nextFiles = Array.from(event.target.files ?? []);

      if (nextFiles.length > MAX_FILES) {
        setAttachmentState([], texts.attachmentsTooMany(MAX_FILES));
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const totalBytes = nextFiles.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        setAttachmentState([], texts.attachmentsTooLarge);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const tooLarge = nextFiles.find((file) => file.size > MAX_FILE_BYTES);
      if (tooLarge) {
        setAttachmentState([], texts.attachmentFileTooLarge(tooLarge.name));
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setAttachmentState(nextFiles, null);
    },
    [
      setAttachmentState,
      texts.attachmentFileTooLarge,
      texts.attachmentsTooLarge,
      texts.attachmentsTooMany,
    ],
  );

  const stopVoice = React.useCallback(() => {
    try {
      speechRef.current?.stop();
    } catch {
      // ignore stop errors
    }
    speechRef.current = null;
    setVoiceActive(false);
  }, []);

  const toggleVoice = React.useCallback(() => {
    if (!speechSupported) {
      setVoiceError(texts.voiceUnsupported);
      return;
    }

    if (voiceActive) {
      stopVoice();
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Ctor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError(texts.voiceUnsupported);
      return;
    }

    setVoiceError(null);
    const recognizer = new Ctor();
    recognizer.lang = locale === "en" ? "en-US" : "de-DE";
    recognizer.interimResults = true;
    recognizer.continuous = false;

    recognizer.onresult = (event: unknown) => {
      try {
        const results = (
          event as {
            results?: ArrayLike<{ isFinal?: boolean; 0?: { transcript?: string } }>;
          }
        )?.results;
        if (!results) return;
        let transcript = "";
        for (let idx = 0; idx < results.length; idx += 1) {
          const result = results[idx];
          if (result?.isFinal && result?.[0]?.transcript) {
            transcript += String(result[0].transcript);
          }
        }
        const normalized = transcript.trim();
        if (!normalized) return;
        const base = inputValue.trim();
        onInputChange(base ? `${base} ${normalized}` : normalized);
      } catch {
        // ignore transcription parsing errors
      }
    };

    recognizer.onerror = () => {
      setVoiceError(texts.voiceFailed);
      setVoiceActive(false);
      speechRef.current = null;
    };

    recognizer.onend = () => {
      setVoiceActive(false);
      speechRef.current = null;
    };

    try {
      speechRef.current = recognizer;
      setVoiceActive(true);
      recognizer.start();
    } catch {
      setVoiceError(texts.voiceFailed);
      setVoiceActive(false);
      speechRef.current = null;
    }
  }, [inputValue, locale, onInputChange, speechSupported, stopVoice, texts.voiceFailed, texts.voiceUnsupported, voiceActive]);

  React.useEffect(() => {
    return () => {
      stopVoice();
    };
  }, [stopVoice]);

  React.useEffect(() => {
    if (!inputAutoFocus) return;
    textareaRef.current?.focus();
  }, [inputAutoFocus]);

  const renderModeChip = React.useCallback(
    (modeOption: CreateProductMode) => {
      const modeConfig = modeDefinitions[modeOption];
      const isActive = modeOption === activeMode;
      return (
        <button
          key={modeOption}
          type="button"
          onClick={() => onModeChange(modeOption)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            isActive
              ? "border-[rgb(var(--grad-from))]/45 bg-[rgb(var(--card))] text-[rgb(var(--fg))]"
              : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--muted))] hover:border-[rgb(var(--grad-from))]/35 hover:text-[rgb(var(--fg))]"
          }`}
          aria-pressed={isActive}
          aria-selected={isActive}
          title={modeConfig.description}
        >
          {modeConfig.label}
        </button>
      );
    },
    [activeMode, modeDefinitions, onModeChange],
  );

  if (isWorkspaceShell) {
    return (
      <section
        data-create-composer-bar="true"
        className="space-y-3 px-4 py-3 md:px-6"
      >
        <div className="space-y-3">
          {topMeta ? <div className="space-y-2">{topMeta}</div> : null}

          {contextBanner}

          {citizenContext?.regionChipLabel ? (
            <div
              className="flex flex-wrap items-center gap-2"
              data-create-region-context={citizenContext.regionSource}
            >
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-300/45 bg-cyan-500/[0.08] px-3.5 py-2 text-sm font-medium text-cyan-950 transition hover:bg-cyan-500/[0.13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-cyan-300/25 dark:bg-cyan-500/[0.12] dark:text-cyan-50"
                onClick={() => {
                  onEditCitizenRegion?.();
                  textareaRef.current?.focus();
                }}
                aria-label={`${citizenContext.regionChipLabel}. Region bearbeiten`}
              >
                <span aria-hidden="true" className="mr-1.5">📍</span>
                {citizenContext.regionChipLabel}
              </button>
            </div>
          ) : null}

          {citizenContext && citizenContext.jurisdictionCandidates.length > 0 ? (
            <div
              className="rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-300/25 dark:bg-amber-950/25 dark:text-amber-50"
              data-create-jurisdiction-confirmation
            >
              <p className="font-semibold">
                {citizenContext.jurisdictionCandidates.length === 1
                  ? `Vermutlich zuständig: ${citizenContext.jurisdictionCandidates[0]?.label}`
                  : "Mehrere Zuständigkeiten kommen infrage"}
              </p>
              <p className="mt-1 leading-relaxed">
                {citizenContext.jurisdictionCandidates.length === 1
                  ? "Passt das? Die Zuständigkeit bleibt ein Vorschlag, bis du sie bestätigst."
                  : "Bitte bestätige genau den Vorschlag, der zu deinem Anliegen passt."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {citizenContext.jurisdictionCandidates.map((candidate) => {
                  const candidateKey = buildCreateJurisdictionCandidateKey(candidate);
                  const selected = confirmedJurisdictionKey === candidateKey;
                  const canConfirm = candidate.level !== "unknown";
                  return (
                    <button
                      key={candidateKey}
                      type="button"
                      className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        selected
                          ? "border-emerald-600 bg-emerald-100 text-emerald-950 dark:border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-50"
                          : "border-amber-500/50 bg-white/70 text-amber-950 hover:border-amber-600 dark:bg-amber-950/20 dark:text-amber-50"
                      }`}
                      aria-pressed={selected}
                      disabled={!canConfirm || !onConfirmCitizenJurisdiction}
                      onClick={() => onConfirmCitizenJurisdiction?.(candidateKey)}
                    >
                      {selected
                        ? `${candidate.label} · bestätigt`
                        : citizenContext.jurisdictionCandidates.length === 1
                          ? "Ja, das passt"
                          : candidate.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-amber-500/50 px-3 py-2 text-xs font-semibold text-amber-950 transition hover:border-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-amber-50"
                  onClick={() => {
                    onEditCitizenJurisdiction?.();
                    textareaRef.current?.focus();
                  }}
                >
                  {confirmedJurisdictionKey ? "Zuständigkeit ändern" : "Im Beitrag präzisieren"}
                </button>
              </div>
            </div>
          ) : null}

          {citizenContext?.safety.emergencyNoticeRequired ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-950 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-50"
              data-create-emergency-notice
            >
              Bei akuter Gefahr ist eDebatte nicht der richtige Notfallkanal. Ruf 112 oder wende dich direkt an Polizei beziehungsweise Rettungsdienst.
            </div>
          ) : null}

          <label className="sr-only" htmlFor={inputId}>
            {inputLabel ?? texts.inputLabel}
          </label>
          <div className="rounded-[2rem] border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--bg))_95%,white_5%)] shadow-[0_16px_36px_rgba(15,23,42,0.07)]">
            <textarea
              ref={textareaRef}
              id={inputId}
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              rows={isWorkspaceContinuation ? 3 : Math.max(5, minRows - 2)}
              autoFocus={inputAutoFocus}
              className={`w-full resize-y border-0 bg-transparent px-5 py-4 text-[15px] leading-relaxed text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--grad-from))] md:px-6 md:text-base ${isWorkspaceContinuation ? "min-h-[96px]" : "min-h-[124px]"}`}
              placeholder={resolvedPlaceholder}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] px-5 py-3 text-[13px] text-[rgb(var(--muted))] md:px-6">
              <div className="flex flex-wrap items-center gap-2.5" data-create-input-methods="shared-intake">
                <span className="text-[12px] font-medium text-[rgb(var(--muted))]">
                  {locale === "en" ? "Write or speak" : "Schreiben oder sprechen"}
                </span>
                {allowAttachments ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3.5 py-1.5 text-[13px] font-medium text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={texts.attachAria}
                    title={texts.attachAria}
                  >
                    <IconPaperclip />
                    <span>{texts.attachLabel}</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className={[
                    "inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
                    voiceActive
                      ? "border-[rgb(var(--grad-from))] bg-[color-mix(in_oklab,rgb(var(--grad-from))_18%,transparent)] text-[rgb(var(--grad-from))]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]",
                    !speechSupported ? "opacity-50" : "",
                  ].join(" ")}
                  onClick={toggleVoice}
                  aria-pressed={voiceActive}
                  aria-label={voiceActive ? texts.voiceStopAria : texts.voiceStartAria}
                  title={voiceActive ? texts.voiceStopAria : texts.voiceStartAria}
                  disabled={!speechSupported}
                >
                  <IconMic />
                  <span>{voiceActive ? texts.voiceStopLabel : texts.voiceStartLabel}</span>
                </button>

                <span>{characterCount} / 2.000</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {secondaryAction.label ? (
                  <Link
                    href={secondaryAction.href}
                    className="text-[13px] text-[rgb(var(--muted))] underline underline-offset-4"
                  >
                    {secondaryAction.label}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-500/[0.07] px-5 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-500/[0.11] disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-300/25 dark:bg-cyan-500/[0.12] dark:text-cyan-50"
                  disabled={startBusy || startDisabled}
                  aria-busy={startBusy}
                >
                  {startBusy ? startBusyLabel ?? startLabel : startLabel}
                </button>
              </div>
            </div>
          </div>

          {allowAttachments ? (
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="sr-only"
              onChange={handleFilesChange}
            />
          ) : null}

          {attachments.length > 0 ? (
            <details className="rounded-[1.3rem] border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3">
              <summary className="cursor-pointer text-[15px] font-medium text-[rgb(var(--fg))]">
                {texts.attachmentsDisclosureLabel(attachments.length)}
              </summary>
              <p className="mt-2 text-[13px] text-[rgb(var(--muted))]">{texts.attachmentsSelected(attachments)}</p>
            </details>
          ) : null}

          {attachmentsError ? <p className="text-[13px] text-[rgb(var(--fg))]" role="alert">{attachmentsError}</p> : null}
          {voiceError ? <p className="text-[13px] text-[rgb(var(--fg))]" role="alert">{voiceError}</p> : null}
          {error ? (
            <p
              ref={errorRef}
              className="break-words rounded-lg text-[15px] text-[rgb(var(--fg))] [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              role="alert"
              aria-atomic="true"
              tabIndex={-1}
            >
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className={
        embeddedWorkspace
          ? "rounded-2xl bg-transparent p-0"
          : "public-dialog-surface rounded-[2rem] p-4 sm:p-6 md:p-8 lg:p-10"
      }
    >
      <div
        className={
          embeddedWorkspace
            ? `mx-auto w-full ${isMinimalCreate ? "create-public-composer max-w-[42rem] md:max-w-[64rem] xl:max-w-[72rem]" : "max-w-5xl"} ${compactMetaMode ? "space-y-4 md:space-y-6" : "space-y-6 md:space-y-7"}`
            : "mx-auto w-full max-w-5xl space-y-6 md:space-y-7"
        }
      >
        {isMinimalCreate ? (
          <div className="space-y-3">
            {topMeta}
            {minimalLead ? (
              <p className="max-w-2xl text-sm leading-relaxed text-[rgb(var(--muted))]">{minimalLead}</p>
            ) : null}
          </div>
        ) : (
          <>
            <EntryHeroHeading
              badge={heroBadgeOverride ?? badge}
              headline={heroHeadlineOverride ?? texts.headline}
              subline={heroSublineOverride ?? subline}
              tone={heroTone}
              topMeta={topMeta}
              headingTag="h2"
            />

            {showSceneRail ? <CreateComposerSceneRail /> : null}

            <div className="public-flow-line space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  {collapseModeSelector ? "Arbeitsweg optional" : texts.modeSwitchAriaLabel}
                </p>
                <p className={`max-w-3xl leading-relaxed text-[rgb(var(--muted))] ${compactMetaMode ? "text-xs sm:text-sm" : "text-sm"}`}>{helperText}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2" aria-label={texts.modeSwitchAriaLabel}>
                {modeOrder.map(renderModeChip)}
              </div>
            </div>
          </>
        )}

        {contextBanner}

        <div className={`space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] ${isMinimalCreate ? "overflow-x-hidden" : ""}`}>
          <div className={`${isMinimalCreate ? "rounded-[30px] bg-[linear-gradient(135deg,color-mix(in_oklab,rgb(var(--grad-from))_18%,transparent),color-mix(in_oklab,rgb(var(--grad-to))_12%,transparent),color-mix(in_oklab,rgb(var(--border))_52%,transparent))] p-[1px]" : "rounded-2xl bg-[linear-gradient(135deg,rgba(26,140,255,0.36),rgba(139,92,246,0.24),rgba(24,207,200,0.34))] p-[1px]"}`}>
            <div
              data-create-focus-stage={isMinimalCreate ? "true" : "false"}
              className={`${isMinimalCreate ? "vog-focus-stage rounded-[30px]" : "rounded-2xl bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)]"}`}
            >
              <div className={`flex items-start justify-between gap-3 ${isMinimalCreate ? "border-b border-[rgb(var(--focus-panel-border))] px-4 py-4 sm:px-5" : "border-b border-[rgb(var(--border))] px-4 py-3 sm:px-5"}`}>
                {isMinimalCreate ? (
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgb(var(--focus-panel-border))] bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_80%,white_20%)] text-[rgb(var(--focus-panel-fg))]">
                      <IconCompose />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full border border-[rgb(var(--focus-panel-border))] bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_72%,white_28%)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--focus-panel-fg))]"
                          data-voxy-inline-guide="true"
                          data-voxy-appearance="inline"
                        >
                          {isEnglishMinimal ? "Assistant" : "Assistent"}
                        </span>
                        <span className="vog-focus-stage-muted text-xs">
                          {isEnglishMinimal ? "Composer-first" : "Kurzer Einstieg"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-[rgb(var(--focus-panel-fg))] sm:text-[15px]">
                        {minimalHeading ?? "Schreib frei. Ich sortiere Thema, Kontext und nächste Schritte."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                      Dein Arbeitsraum
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                      Beschreibe, was geklärt werden soll
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${isMinimalCreate ? "vog-focus-stage-chip" : "border border-[rgb(var(--border))] text-[rgb(var(--muted))]"}`}>
                    {isEnglishMinimal ? "Not published yet" : "Noch nicht veröffentlicht"}
                  </span>
                  {isMinimalCreate ? (
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="vog-focus-stage-muted mt-1 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M7 4.5 13 10l-6 5.5" />
                    </svg>
                  ) : null}
                </div>
              </div>
              <label className="sr-only" htmlFor={inputId}>
                {inputLabel ?? texts.inputLabel}
              </label>
              {isMinimalCreate ? (
                <div className="px-4 pt-4 sm:px-5">
                  <div className="rounded-[24px] border border-[rgb(var(--focus-panel-border))] bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_82%,white_18%)]">
                    <textarea
                      ref={textareaRef}
                      id={inputId}
                      value={inputValue}
                      onChange={(event) => onInputChange(event.target.value)}
                      rows={minRows}
                      autoFocus={inputAutoFocus}
                      className="min-h-[168px] w-full resize-y border-0 bg-transparent px-4 py-4 text-base leading-relaxed text-[rgb(var(--focus-panel-fg))] outline-none placeholder:text-[rgb(var(--focus-panel-muted))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--grad-from))] sm:min-h-[192px] sm:px-5 sm:py-5"
                      placeholder={resolvedPlaceholder}
                    />
                    <div className="vog-focus-stage-muted border-t border-[rgb(var(--focus-panel-border))] px-4 py-2 text-xs sm:px-5">
                      {characterCount} / 2.000
                    </div>
                  </div>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  id={inputId}
                  value={inputValue}
                  onChange={(event) => onInputChange(event.target.value)}
                  rows={minRows}
                  autoFocus={inputAutoFocus}
                  className={`w-full resize-y border-0 bg-transparent px-4 py-4 text-base leading-relaxed text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--grad-from))] sm:px-5 sm:py-5 ${compactMetaMode ? "min-h-[148px] sm:min-h-[190px]" : "min-h-[170px] sm:min-h-[220px]"}`}
                  placeholder={resolvedPlaceholder}
                />
              )}

                <div
                  className={`flex flex-col px-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pb-5 ${compactMetaMode ? "gap-2.5" : "gap-3"} ${isMinimalCreate ? "pt-4" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${isMinimalCreate ? "border-[rgb(var(--focus-panel-border))] bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_80%,white_20%)] text-[rgb(var(--focus-panel-muted))] hover:bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_72%,white_28%)] hover:text-[rgb(var(--focus-panel-fg))]" : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:bg-[color-mix(in_oklab,rgb(var(--card))_85%,rgb(var(--bg))_15%)] hover:text-[rgb(var(--fg))]"}`}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={texts.attachAria}
                      title={texts.attachAria}
                    >
                      <IconPaperclip />
                      <span className="hidden sm:inline">{texts.attachLabel}</span>
                    </button>

                    <button
                      type="button"
                      className={[
                        "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                        voiceActive
                          ? "border-[rgb(var(--grad-from))] bg-[color-mix(in_oklab,rgb(var(--grad-from))_18%,transparent)] text-[rgb(var(--grad-from))]"
                          : isMinimalCreate
                            ? "border-[rgb(var(--focus-panel-border))] bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_80%,white_20%)] text-[rgb(var(--focus-panel-muted))] hover:bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_72%,white_28%)] hover:text-[rgb(var(--focus-panel-fg))]"
                            : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:bg-[color-mix(in_oklab,rgb(var(--card))_85%,rgb(var(--bg))_15%)] hover:text-[rgb(var(--fg))]",
                        !speechSupported ? "opacity-50" : "",
                      ].join(" ")}
                      onClick={toggleVoice}
                      aria-pressed={voiceActive}
                      aria-label={voiceActive ? texts.voiceStopAria : texts.voiceStartAria}
                      title={voiceActive ? texts.voiceStopAria : texts.voiceStartAria}
                      disabled={!speechSupported}
                    >
                      <IconMic />
                      <span className="hidden sm:inline">
                        {voiceActive ? texts.voiceStopLabel : texts.voiceStartLabel}
                      </span>
                    </button>
                  </div>

                  <div className={`flex flex-wrap items-center ${isMinimalCreate ? "gap-2 pt-1 sm:justify-end" : "gap-3.5"}`}>
                    <button
                      type="button"
                      onClick={onStart}
                      className={`btn-primary ${isMinimalCreate ? "min-h-[50px] w-full px-4 text-sm sm:w-auto" : ""}`}
                      disabled={startBusy || startDisabled}
                      aria-busy={startBusy}
                    >
                      {startBusy ? startBusyLabel ?? startLabel : startLabel}
                    </button>
                    {secondaryAction.label ? (
                      <Link
                        href={secondaryAction.href}
                        className="text-sm text-[rgb(var(--muted))] underline underline-offset-4"
                      >
                        {secondaryAction.label}
                      </Link>
                    ) : null}
                  </div>
                </div>
              {isMinimalCreate ? (
                <div className="border-t border-[rgb(var(--focus-panel-border))] px-4 py-3 sm:px-5">
                  <p className="text-xs leading-relaxed text-[rgb(var(--focus-panel-muted))]">
                    {isEnglishMinimal
                      ? "Nothing is published automatically. The assistant suggests, you decide."
                      : "Nichts wird automatisch veröffentlicht. Die Assistenz macht Vorschläge, du entscheidest."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_ACCEPT}
            className="sr-only"
            onChange={handleFilesChange}
          />

          {attachments.length > 0 ? (
            <details className="rounded-2xl border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-[rgb(var(--fg))]">
                {texts.attachmentsDisclosureLabel(attachments.length)}
              </summary>
              <p className="mt-2 text-xs text-[rgb(var(--muted))]">{texts.attachmentsSelected(attachments)}</p>
              <div className="mt-3 overflow-x-auto pb-1">
                <ul className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
                  {attachments.map((file) => (
                    <li
                      key={`${file.name}-${file.size}`}
                      className={`max-w-[15rem] shrink-0 rounded-xl border px-3 py-2 sm:max-w-full ${isMinimalCreate ? "border-[rgb(var(--focus-panel-border))] bg-[color-mix(in_oklab,rgb(var(--focus-panel-top))_80%,white_20%)]" : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"}`}
                    >
                      <p className={`break-all text-xs ${isMinimalCreate ? "text-[rgb(var(--focus-panel-fg))]" : "text-[rgb(var(--fg))]"}`}>{file.name}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}

          {isMinimalCreate && !hideAlternateModeDisclosure ? (
            <details
              data-create-alternate-mode-disclosure
              className="hidden rounded-2xl border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-3 md:block"
            >
              <summary className="cursor-pointer text-sm font-medium text-[rgb(var(--fg))]">
                {texts.alternateModeLabel}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">{texts.alternateModeLead}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={texts.modeSwitchAriaLabel}>
                {modeOrder.map(renderModeChip)}
              </div>
            </details>
          ) : null}

          {attachmentsError ? <p className="text-xs text-[rgb(var(--fg))]" role="alert">{attachmentsError}</p> : null}

          {voiceError ? <p className="text-xs text-[rgb(var(--fg))]" role="alert">{voiceError}</p> : null}

          {error ? (
            <p
              ref={errorRef}
              className="break-words rounded-lg text-sm text-[rgb(var(--fg))] [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              role="alert"
              aria-atomic="true"
              tabIndex={-1}
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
