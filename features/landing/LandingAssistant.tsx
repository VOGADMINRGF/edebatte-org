"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { LandingScope, LandingTile } from "./landingSeeds";
import { LANDING_COPY, type Lang } from "./landingCopy";

const MIN_TEXT_LENGTH = 20;

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
    value.includes("region") ||
    value.includes("local") ||
    value.includes("municipality")
  ) {
    return "region";
  }
  if (lang === "en" && value.includes("state")) return "region";
  return "country";
}

function AccentWord({
  scheme,
  children,
}: {
  scheme: "opinion" | "voice" | "weight";
  children: string;
}) {
  const gradient = useMemo(() => {
    if (scheme === "opinion")
      return "linear-gradient(90deg, rgba(26,140,255,1), rgba(24,207,200,1))";
    if (scheme === "voice")
      return "linear-gradient(90deg, rgba(139,92,246,1), rgba(236,72,153,1), rgba(56,189,248,1))";
    return "linear-gradient(90deg, rgba(20,184,166,1), rgba(24,207,200,1), rgba(26,140,255,1))";
  }, [scheme]);

  // Robust: keine Tailwind-arbitrary classes nötig → verhindert “unsichtbare Wörter”
  return (
    <span
      className="font-extrabold"
      style={{
        backgroundImage: gradient,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  );
}

function focusableElements(container: HTMLElement | null) {
  if (!container) return [] as HTMLElement[];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])",
    ),
  ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
}

export default function LandingAssistant({
  onIngest,
  prefillText,
  onAnalyzeRequest,
  lang,
}: {
  onIngest: (scope: LandingScope, tiles: LandingTile[]) => void;
  prefillText?: string;
  // (Legacy name in codebase) – hier als “Submit-Gate Hook” genutzt.
  onAnalyzeRequest?: (actions: { submit: () => void; refine: () => void }) => void;
  lang: Lang;
}) {
  const t = LANDING_COPY[lang];

  const [text, setText] = useState("");
  const [showContext, setShowContext] = useState(false);

  const [role, setRole] = useState("");
  const [roleOther, setRoleOther] = useState("");
  const [level, setLevel] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [botTrap, setBotTrap] = useState("");

  const [human, setHuman] = useState(() => createHumanChallenge());
  const [humanAnswer, setHumanAnswer] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const inputId = useId();
  const fileInputId = useId();
  const humanInputId = useId();
  const errorId = useId();
  const statusId = useId();
  const modalTitleId = useId();
  const modalDescId = useId();

  const modalRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!prefillText || !prefillText.trim()) return;
    setText((prev) => (prev === prefillText ? prev : prefillText));
  }, [prefillText]);

  useEffect(() => {
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

  const trimmed = text.trim();
  const hasText = trimmed.length > 0;

  const botBlocked = botTrap.trim().length > 0;
  const canSubmit =
    !loading && !botBlocked && trimmed.length >= MIN_TEXT_LENGTH && humanAnswer.trim().length > 0;

  const describedBy = ([
    error ? errorId : null,
    statusId,
  ].filter((v): v is string => Boolean(v)) as string[]).join(" ") || undefined;

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

  const closeModal = () => setModalOpen(false);

  const handleModalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  const handleSubmit = async () => {
    if (loading) return;
    setError(null);

    if (botBlocked) {
      setError(t.errors.botBlocked);
      return;
    }
    if (trimmed.length < MIN_TEXT_LENGTH) {
      setError(t.errors.textTooShort);
      return;
    }

    const answerValue = Number(humanAnswer.trim());
    if (!Number.isFinite(answerValue)) {
      setError(t.errors.humanInvalid);
      return;
    }
    if (answerValue !== human.a + human.b) {
      setError(t.errors.humanInvalid);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      const roleValue = role === "other" ? roleOther.trim() : role.trim();
      const levelValue = level.trim();

      formData.append("source", "landing_demo");
      formData.append("text", trimmed);
      formData.append("locale", lang);

      if (roleValue) formData.append("role", roleValue);
      if (levelValue) formData.append("level", levelValue);

      formData.append("humanA", String(human.a));
      formData.append("humanB", String(human.b));
      formData.append("humanAnswer", humanAnswer.trim());

      files.forEach((file) => formData.append("files[]", file));

      const res = await fetch("/api/contributions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || t.errors.submitFailed);
      }

      submitTile(trimmed);

      setModalOpen(true);
      setText("");
      setRole("");
      setRoleOther("");
      setLevel("");
      setShowContext(false);
      setFiles([]);
      setHumanAnswer("");
      setHuman(createHumanChallenge());
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.errors.submitFailed;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = () => {
    if (onAnalyzeRequest) {
      onAnalyzeRequest({
        submit: () => void handleSubmit(),
        refine: () => setShowContext(true),
      });
      return;
    }
    void handleSubmit();
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <p className="text-[12px] font-semibold tracking-[0.18em] text-slate-500">{t.brand}</p>

        <h1 className="mt-2 text-3xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl">
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

        <p className="mt-3 text-sm text-slate-600 sm:text-base">{t.subline}</p>

        {/* Honeypot */}
        <div className="sr-only" aria-hidden="true">
          <label>
            Leave empty
            <input value={botTrap} onChange={(e) => setBotTrap(e.target.value)} />
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
          <label htmlFor={inputId} className="sr-only">
            {t.inputLabel}
          </label>

          <textarea
            id={inputId}
            className="w-full resize-none border-0 bg-transparent px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-200"
            rows={4}
            placeholder={t.placeholder}
            value={text}
            onChange={(e) => {
              if (error) setError(null);
              setText(e.target.value);
            }}
            disabled={loading}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />

          <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/howtoworks/edebatte"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.buttons.howItWorks}
              </a>
              <a
                href="/howtoworks/bewegung"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.buttons.origin}
              </a>
              <a
                href="/howtoworks/edebatte/dossier"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.buttons.dossier}
              </a>

              {hasText && (
                <button
                  type="button"
                  onClick={() => setShowContext((v) => !v)}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showContext ? t.buttons.contextLess : t.buttons.contextMore}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmitRequest}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-60"
            >
              {loading ? t.buttons.starting : t.buttons.start}
            </button>

            <span id={statusId} className="sr-only" role="status" aria-live="polite">
              {loading ? t.buttons.starting : ""}
            </span>
          </div>
        </div>

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
              className="mt-2 block w-full text-xs text-slate-600"
              onChange={(e) => {
                if (error) setError(null);
                setFiles(Array.from(e.target.files ?? []));
              }}
            />
            {t.form.attachmentsHint ? (
              <p className="mt-2 text-[11px] text-slate-500">{t.form.attachmentsHint}</p>
            ) : null}
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                {files.map((f) => (
                  <li key={`${f.name}-${f.size}`}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <label htmlFor={humanInputId} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t.form.humanLabel}
            </label>
            <p className="mt-2 text-xs font-semibold text-slate-700">{t.form.humanQuestion(human.a, human.b)}</p>
            <input
              id={humanInputId}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={t.form.humanPlaceholder}
              value={humanAnswer}
              onChange={(e) => {
                if (error) setError(null);
                setHumanAnswer(e.target.value);
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        {hasText && showContext && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t.context.title}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {t.context.description}
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-slate-700" htmlFor={`${inputId}-role`}>
                  {t.context.roleLabel}
                </label>
                <select
                  id={`${inputId}-role`}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
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
                    onChange={(e) => setRoleOther(e.target.value)}
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
                  onChange={(e) => setLevel(e.target.value)}
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80]" onKeyDown={handleModalKeyDown}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
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
                  <p className="mt-3 text-sm text-slate-700">
                    {t.modal.discountHint}
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
                  className="sm:col-span-2 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:opacity-95"
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
