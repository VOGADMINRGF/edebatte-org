"use client";

import * as React from "react";
import type { LandingScope, LandingTile } from "./landingSeeds";
import { LANDING_COPY, type Lang } from "./landingCopy";

type SubmitResponse =
  | { ok: true; contributionId?: string; status?: string }
  | { ok: false; message?: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const MIN_TEXT_LENGTH = 20;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const FILE_ACCEPT =
  ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.heic,.mp3,.m4a,.wav,.mp4,.mov";

function createHumanChallenge() {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 8);
  return { a, b };
}

function scopeFromLevel(level: string | null, lang: Lang): LandingScope {
  const value = (level || "").toLowerCase();
  if (!value) return "country";
  if (value.includes("eu")) return "eu";
  if (value.includes("welt") || value.includes("world")) return "world";
  if (
    value.includes("kommune") ||
    value.includes("gemeinde") ||
    value.includes("kreis") ||
    value.includes("bezirk") ||
    value.includes("region") ||
    value.includes("local") ||
    value.includes("municipality") ||
    value.includes("district")
  ) {
    return "region";
  }
  if (lang === "en" && value.includes("state")) return "region";
  return "country";
}

/** Gradient-Text OHNE Balken/Underline (Bug: “Buzzword-Balken”) */
function AccentWord({
  scheme,
  children,
}: {
  scheme: "opinion" | "voice" | "weight";
  children: React.ReactNode;
}) {
  const gradient =
    scheme === "opinion"
      ? "linear-gradient(90deg, rgba(26,140,255,1), rgba(24,207,200,1))"
      : scheme === "voice"
        ? "linear-gradient(90deg, rgba(139,92,246,1), rgba(236,72,153,1), rgba(56,189,248,1))"
        : "linear-gradient(90deg, rgba(20,184,166,1), rgba(24,207,200,1), rgba(26,140,255,1))";

  return (
    <span
      className="font-extrabold text-slate-900 supports-[background-clip:text]:text-transparent supports-[background-clip:text]:bg-clip-text"
      style={{
        backgroundImage: gradient,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      }}
    >
      {children}
    </span>
  );
}

function IconPlay() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M8.2 5.6a1 1 0 0 1 1.5-.86l8 6a1 1 0 0 1 0 1.6l-8 6A1 1 0 0 1 8 17.54V6.46a1 1 0 0 1 .2-.86z" />
    </svg>
  );
}

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

function focusableElements(container: HTMLElement | null) {
  if (!container) return [] as HTMLElement[];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "a[href],button,textarea,input,select,[tabindex]:not([tabindex='-1'])",
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

export default function LandingAssistant({
  onIngest,
  prefillText,
  onAnalyzeRequest,
  lang,
}: {
  onIngest: (scope: LandingScope, tiles: LandingTile[]) => void;
  prefillText?: string;
  onAnalyzeRequest?: (actions: { submit: () => void; refine: () => void }) => void;
  lang: Lang;
}) {
  const t = LANDING_COPY[lang];

  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null);
  const [voiceError, setVoiceError] = React.useState<string | null>(null);
  const [voiceActive, setVoiceActive] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(false);

  const [showContext, setShowContext] = React.useState(false);
  const [role, setRole] = React.useState("");
  const [roleOther, setRoleOther] = React.useState("");
  const [level, setLevel] = React.useState("");

  const [files, setFiles] = React.useState<File[]>([]);
  const [botTrap, setBotTrap] = React.useState("");

  const [human, setHuman] = React.useState(() => createHumanChallenge());
  const [humanAnswer, setHumanAnswer] = React.useState("");

  const [modalOpen, setModalOpen] = React.useState(false);

  const inputId = React.useId();
  const fileInputId = React.useId();
  const attachmentsHintId = React.useId();
  const attachmentsRulesId = React.useId();
  const attachmentsErrorId = React.useId();
  const humanInputId = React.useId();
  const humanHintId = React.useId();
  const minCharsId = React.useId();
  const errorId = React.useId();
  const statusId = React.useId();
  const successId = React.useId();
  const modalTitleId = React.useId();
  const modalDescId = React.useId();

  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastActiveRef = React.useRef<HTMLElement | null>(null);
  const speechRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => {
    if (!prefillText || !prefillText.trim()) return;
    setText((prev) => (prev === prefillText ? prev : prefillText));
  }, [prefillText]);

  React.useEffect(() => {
    if (!modalOpen) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;

    const focusables = focusableElements(modalRef.current);
    focusables[0]?.focus();

    return () => {
      try {
        lastActiveRef.current?.focus();
      } catch {
        // ignore
      }
    };
  }, [modalOpen]);

  React.useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  React.useEffect(() => {
    try {
      const supported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
      setSpeechSupported(supported);
    } catch {
      setSpeechSupported(false);
    }
  }, []);

  const trimmed = text.trim();
  const hasText = trimmed.length > 0;
  const botBlocked = botTrap.trim().length > 0;

  const canSubmit =
    !loading && trimmed.length >= MIN_TEXT_LENGTH && humanAnswer.trim().length > 0 && !botBlocked;

  const remainingChars = Math.max(0, MIN_TEXT_LENGTH - trimmed.length);
  const describedBy = [error ? errorId : null, minCharsId, statusId]
    .filter(Boolean)
    .join(" ") || undefined;

  const stopVoice = () => {
    try {
      speechRef.current?.stop();
    } catch {
      // ignore
    }
    speechRef.current = null;
    setVoiceActive(false);
  };

  const toggleVoice = () => {
    if (!speechSupported) {
      setVoiceError(t.errors.voiceUnsupported);
      return;
    }
    if (voiceActive) {
      stopVoice();
      return;
    }

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError(t.errors.voiceUnsupported);
      return;
    }

    setVoiceError(null);
    const rec = new Ctor();
    rec.lang = lang === "en" ? "en-US" : "de-DE";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (ev: any) => {
      try {
        let transcript = "";
        const results = ev?.results ?? [];
        for (let i = 0; i < results.length; i += 1) {
          const r = results[i];
          if (r?.[0]?.transcript && r.isFinal) {
            transcript += String(r[0].transcript);
          }
        }
        if (transcript.trim()) {
          setText((prev) => {
            const base = prev.trim();
            return base ? `${base} ${transcript.trim()}` : transcript.trim();
          });
        }
      } catch {
        // ignore
      }
    };

    rec.onerror = () => {
      setVoiceError(t.errors.voiceFailed);
      setVoiceActive(false);
      speechRef.current = null;
    };

    rec.onend = () => {
      setVoiceActive(false);
      speechRef.current = null;
    };

    try {
      speechRef.current = rec;
      setVoiceActive(true);
      rec.start();
    } catch {
      setVoiceError(t.errors.voiceFailed);
      setVoiceActive(false);
      speechRef.current = null;
    }
  };

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError(null);
    setAttachmentsError(null);
    const nextFiles = Array.from(event.target.files ?? []);

    if (nextFiles.length > MAX_FILES) {
      setAttachmentsError(t.errors.attachmentsTooMany(MAX_FILES));
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const totalBytes = nextFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      setAttachmentsError(t.errors.attachmentsTooLarge);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const tooLarge = nextFiles.find((f) => f.size > MAX_FILE_BYTES);
    if (tooLarge) {
      setAttachmentsError(t.errors.attachmentsFileTooLarge(tooLarge.name));
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFiles(nextFiles);
  };

  const submitTile = (payload: string) => {
    const scope = scopeFromLevel(level || null, lang);
    const tile: LandingTile = {
      id: `u-${Date.now()}`,
      scope,
      text: payload,
      tag: lang === "en" ? "New" : "Neu",
      kind: "topic",
      freshUntil: Date.now() + 5 * 60 * 1000,
    };
    onIngest(scope, [tile]);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError(null);

    if (botBlocked) {
      setError(t.errors.botBlocked);
      return;
    }
    if (trimmed.length < 20) {
      setError(t.errors.textTooShort);
      return;
    }
    if (attachmentsError) {
      setError(attachmentsError);
      return;
    }
    if (!humanAnswer.trim()) {
      setError(t.errors.humanMissing);
      return;
    }

    const answerValue = Number(humanAnswer.trim());
    if (!Number.isFinite(answerValue) || answerValue !== human.a + human.b) {
      setError(t.errors.humanInvalid);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      const roleValue = role === "other" ? roleOther.trim() : role.trim();
      const levelValue = level.trim();

      formData.append("source", "landing_demo");
      formData.append("honey", botTrap);
      formData.append("text", trimmed);
      if (lang) formData.append("locale", lang);
      if (roleValue) formData.append("role", roleValue);
      if (levelValue) formData.append("level", levelValue);

      formData.append("humanA", String(human.a));
      formData.append("humanB", String(human.b));
      formData.append("humanAnswer", humanAnswer.trim());

      files.forEach((file) => formData.append("files", file));

      // Save-only endpoint (Mongo) — NO analyze call here.
      const res = await fetch("/api/contributions", { method: "POST", body: formData });
      const data = (await res.json().catch(() => null)) as SubmitResponse | null;

      if (!res.ok || !data?.ok) {
        throw new Error((data as { message?: string } | null)?.message || t.errors.submitFailed);
      }

      submitTile(trimmed);

      // reset state
      setModalOpen(true);
      setText("");
      setRole("");
      setRoleOther("");
      setLevel("");
      setShowContext(false);
      setHumanAnswer("");
      setHuman(createHumanChallenge());
      setFiles([]);
      setAttachmentsError(null);
      stopVoice();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.submitFailed;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = () => {
    if (onAnalyzeRequest) {
      // kept as a gate hook (prelaunch modal), but still save-only
      onAnalyzeRequest({ submit: () => void handleSubmit(), refine: () => setShowContext(true) });
      return;
    }
    void handleSubmit();
  };

  const closeModal = () => setModalOpen(false);

  const handleModalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;

    const focusables = focusableElements(modalRef.current);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !focusables.includes(active as HTMLElement)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-md sm:p-8">
        <p className="text-[12px] font-semibold tracking-[0.18em] text-slate-500">{t.brand}</p>

        <h1 className="mt-2 text-balance text-3xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          <span className="block">
            {t.headline.line1Lead} <AccentWord scheme="opinion">{t.headline.line1Accent}</AccentWord>{" "}
            {t.headline.line1Tail}
          </span>
          <span className="block">
            {t.headline.line2Lead} <AccentWord scheme="voice">{t.headline.line2Accent}</AccentWord>{" "}
            {t.headline.line2Mid} <AccentWord scheme="weight">{t.headline.line2AccentB}</AccentWord>
            {t.headline.line2Tail}
          </span>
        </h1>

        <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-slate-600 sm:text-base">
          {t.subline}
        </p>

        {/* Honeypot */}
        <div className="sr-only" aria-hidden="true">
          <label>
            Leave empty
            <input value={botTrap} onChange={(event) => setBotTrap(event.target.value)} />
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-[linear-gradient(135deg,rgba(26,140,255,0.55),rgba(139,92,246,0.45),rgba(24,207,200,0.55))] p-[1px] shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div className="rounded-2xl bg-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <label htmlFor={inputId} className="sr-only">
              {t.inputLabel}
            </label>

            <textarea
              id={inputId}
              className="w-full min-h-[120px] resize-none border-0 bg-transparent px-4 py-3 text-[15px] text-slate-900 outline-none shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-200 sm:min-h-[150px]"
              rows={3}
              placeholder={t.placeholder}
              value={text}
              onChange={(event) => {
                if (error) setError(null);
                setText(event.target.value);
              }}
              disabled={loading}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
            />
            <p id={minCharsId} className="px-4 pb-2 text-[11px] text-slate-500" aria-live="polite">
              {remainingChars > 0 ? t.form.minCharsHint(remainingChars) : t.form.minCharsOk}
            </p>

            {/* action row: left icons + context; right primary */}
            <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {/* Attachments shortcut (WhatsApp-like) */}
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:translate-y-[0.5px]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  aria-label={t.form.attachmentsLabel}
                  title={t.form.attachmentsLabel}
                >
                  <IconPaperclip />
                  <span className="hidden sm:inline">{t.buttons.attach}</span>
                </button>

                <button
                  type="button"
                  className={[
                    "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition active:translate-y-[0.5px]",
                    voiceActive
                      ? "border-sky-200 bg-sky-100 text-sky-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    !speechSupported ? "opacity-50" : "",
                  ].join(" ")}
                  onClick={toggleVoice}
                  aria-pressed={voiceActive}
                  aria-label={voiceActive ? t.buttons.voiceStop : t.buttons.voiceStart}
                  title={voiceActive ? t.buttons.voiceStop : t.buttons.voiceStart}
                  disabled={!speechSupported}
                >
                  <IconMic />
                  <span className="hidden sm:inline">{voiceActive ? t.buttons.voiceStop : t.buttons.voiceStart}</span>
                </button>

                {hasText && (
                  <button
                    type="button"
                    onClick={() => setShowContext((v) => !v)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:translate-y-[0.5px]"
                  >
                    {showContext ? t.buttons.contextLess : t.buttons.contextMore}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 active:translate-y-[0.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-60"
                aria-label={loading ? t.buttons.starting : t.buttons.start}
              >
                <IconPlay />
                <span>{loading ? t.buttons.starting : t.buttons.start}</span>
              </button>

              <span id={statusId} className="sr-only" role="status" aria-live="polite">
                {loading ? t.buttons.starting : ""}
              </span>
              <span id={successId} className="sr-only" role="status" aria-live="polite">
                {modalOpen ? t.modal.title : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Attachments + HumanCheck row */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <label htmlFor={fileInputId} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t.form.attachmentsLabel}
            </label>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="mt-2 block w-full text-xs text-slate-600"
              aria-describedby={
                [
                  t.form.attachmentsHint ? attachmentsHintId : null,
                  attachmentsRulesId,
                  attachmentsError ? attachmentsErrorId : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onChange={handleFilesChange}
            />
            {t.form.attachmentsHint ? (
              <p id={attachmentsHintId} className="mt-2 text-[11px] text-slate-500">
                {t.form.attachmentsHint}
              </p>
            ) : null}
            <p id={attachmentsRulesId} className="mt-1 text-[11px] text-slate-500">
              {t.form.attachmentsRules}
            </p>
            {attachmentsError ? (
              <p id={attachmentsErrorId} className="mt-2 text-[11px] text-rose-600" role="alert">
                {attachmentsError}
              </p>
            ) : null}
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <label htmlFor={humanInputId} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t.form.humanLabel}
            </label>
            <p id={humanHintId} className="mt-2 text-xs font-semibold text-slate-700">
              {t.form.humanQuestion(human.a, human.b)}
            </p>
            <input
              id={humanInputId}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-describedby={humanHintId}
              placeholder={t.form.humanPlaceholder}
              value={humanAnswer}
              onChange={(event) => {
                if (error) setError(null);
                setHumanAnswer(event.target.value);
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <button
              type="button"
              onClick={() => {
                setHuman(createHumanChallenge());
                setHumanAnswer("");
              }}
              className="mt-2 inline-flex items-center text-[11px] font-semibold text-slate-600 hover:text-slate-800"
            >
              {t.form.humanRefresh}
            </button>
          </div>
        </div>

        {/* Context (only after user wrote text and opted in) */}
        {hasText && showContext && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t.context.title}</p>
            <p className="mt-1 text-sm text-slate-600">{t.context.description}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-slate-700" htmlFor={`${inputId}-role`}>
                  {t.context.roleLabel}
                </label>
                <select
                  id={`${inputId}-role`}
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">{t.form.contextAny}</option>
                  {t.context.roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="other">{t.context.roleOtherLabel}</option>
                </select>

                {role === "other" && (
                  <input
                    type="text"
                    value={roleOther}
                    onChange={(event) => setRoleOther(event.target.value)}
                    placeholder={t.context.roleOtherPlaceholder}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-slate-700" htmlFor={`${inputId}-level`}>
                  {t.context.levelLabel}
                </label>
                <select
                  id={`${inputId}-level`}
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">{t.form.contextAny}</option>
                  {t.context.levels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p id={errorId} className="mt-3 text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}
        {voiceError && (
          <p className="mt-2 text-[11px] text-rose-600" role="alert">
            {voiceError}
          </p>
        )}

        {/* Footer buttons - consistent pills */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a
            href="/howtoworks/edebatte"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:translate-y-[0.5px]"
          >
            {t.buttons.howItWorks}
          </a>
          <a
            href="/howtoworks/bewegung"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:translate-y-[0.5px]"
          >
            {t.buttons.origin}
          </a>
          <a
            href="/howtoworks/edebatte/dossier"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:translate-y-[0.5px]"
          >
            {t.buttons.dossier}
          </a>
        </div>
      </div>

      {/* Post-submit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80]" onKeyDown={handleModalKeyDown}>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm motion-reduce:backdrop-blur-none"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              ref={modalRef}
              className="w-full max-w-xl rounded-3xl border border-black/10 bg-white/95 p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby={modalTitleId}
              aria-describedby={modalDescId}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">{t.brand}</p>
                  <h2 id={modalTitleId} className="mt-2 text-xl font-extrabold text-slate-900">
                    {t.modal.title}
                  </h2>
                  <p id={modalDescId} className="mt-2 text-sm text-slate-600">
                    {t.modal.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                  aria-label={t.modal.closeLabel}
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    const input = document.getElementById(inputId) as HTMLTextAreaElement | null;
                    input?.focus();
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:opacity-95"
                >
                  {t.modal.ctaAnother}
                </button>

                <a
                  href="/mitglied-werden"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t.modal.ctaMember}
                </a>

                <a
                  href="/pricing"
                  className="sm:col-span-2 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(26,140,255,1),rgba(24,207,200,1))] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(24,165,255,0.25)] hover:opacity-95"
                >
                  {t.modal.ctaSupport}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
