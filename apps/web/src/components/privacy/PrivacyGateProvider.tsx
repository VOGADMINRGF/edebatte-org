"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_LOCALSTORAGE_KEY,
  LEGACY_CONSENT_COOKIE_NAME,
  PRIVACY_NOTICE_VERSION,
  buildConsentCookie,
  buildDefaultConsent,
  buildDefaultOptionalConsent,
  hasRequiredPrivacyAcknowledgement,
  normalizeConsent,
  parseConsentCookie,
  serializeConsent,
  type Consent,
  type PrivacyOptionalConsent,
} from "@/lib/privacy/consent";

type PrivacyGateContextValue = {
  consent: Consent | null;
  gateOpen: boolean;
  hasRequiredAcknowledgement: boolean;
  openGate: (mode?: "notice" | "options") => void;
  ensureActiveProcessingAllowed: (source?: string, mode?: "notice" | "options") => boolean;
};

const PrivacyGateContext = React.createContext<PrivacyGateContextValue | null>(null);

function readConsentFromBrowser(): Consent | null {
  if (typeof document === "undefined") return null;
  const entries = document.cookie.split("; ");
  const primaryRaw = entries.find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))?.split("=")[1];
  if (primaryRaw) return parseConsentCookie(primaryRaw);

  const legacyRaw = entries.find((entry) => entry.startsWith(`${LEGACY_CONSENT_COOKIE_NAME}=`))?.split("=")[1];
  if (legacyRaw) return parseConsentCookie(legacyRaw);

  if (typeof window !== "undefined") {
    return parseConsentCookie(window.localStorage.getItem(CONSENT_LOCALSTORAGE_KEY));
  }

  return null;
}

function persistConsentLocally(consent: Consent) {
  if (typeof document !== "undefined") {
    document.cookie = buildConsentCookie(consent);
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONSENT_LOCALSTORAGE_KEY, serializeConsent(consent));
  }
}

async function persistConsentServer(consent: Consent) {
  try {
    await fetch("/api/account/consent", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(consent),
      keepalive: true,
    });
  } catch {
    // Best-effort sync. Cookie/localStorage remain the browser SSOT for guests.
  }
}

function buildAcknowledgedConsent(params: {
  previous: Consent | null;
  optional: PrivacyOptionalConsent;
  source: string;
}): Consent {
  return buildDefaultConsent({
    ...(params.previous ?? {}),
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    requiredNoticeAcknowledged: true,
    optional: params.optional,
    timestamp: new Date().toISOString(),
    source: params.source,
  });
}

function DialogShield() {
  return (
    <>
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_50%_0%,rgba(6,182,212,0.18),transparent_62%)]" />
    </>
  );
}

const DIALOG_VIEWPORT_STYLE = {
  paddingTop: "max(env(safe-area-inset-top, 0px), 0.75rem)",
  paddingRight: "max(env(safe-area-inset-right, 0px), 0.75rem)",
  paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
  paddingLeft: "max(env(safe-area-inset-left, 0px), 0.75rem)",
} satisfies React.CSSProperties;

const DIALOG_PANEL_STYLE = {
  maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem)",
} satisfies React.CSSProperties;

export function PrivacyGateProvider(props: {
  initialConsent?: Consent | null;
  initiallyOpen?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [consent, setConsent] = React.useState<Consent | null>(() => normalizeConsent(props.initialConsent));
  const [gateOpen, setGateOpen] = React.useState(() => Boolean(props.initiallyOpen));
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = React.useState<string | null>(null);
  const [optionalDraft, setOptionalDraft] = React.useState<PrivacyOptionalConsent>(
    () => normalizeConsent(props.initialConsent)?.optional ?? buildDefaultOptionalConsent(),
  );

  const shellRef = React.useRef<HTMLDivElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const primaryActionRef = React.useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const browserConsent = readConsentFromBrowser();
    if (!browserConsent) return;
    setConsent(browserConsent);
    setOptionalDraft(browserConsent.optional);
  }, []);

  React.useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (gateOpen) {
      shell.setAttribute("aria-hidden", "true");
      shell.setAttribute("inert", "");
    } else {
      shell.removeAttribute("aria-hidden");
      shell.removeAttribute("inert");
    }
  }, [gateOpen]);

  React.useEffect(() => {
    if (!gateOpen) return;
    const previousOverflow = document.body.style.overflow;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => primaryActionRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (restoreFocusRef.current?.isConnected) {
        restoreFocusRef.current.focus();
      }
    };
  }, [gateOpen]);

  const closeWithoutAcknowledgement = React.useCallback(() => {
    setGateOpen(false);
    setOptionsOpen(false);
    setPendingNavigationHref(null);
  }, []);

  React.useEffect(() => {
    if (!gateOpen) return;
    if (pathname !== "/datenschutz-dossier" && pathname !== "/datenschutz") return;
    closeWithoutAcknowledgement();
  }, [closeWithoutAcknowledgement, gateOpen, pathname]);

  React.useEffect(() => {
    if (!gateOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (optionsOpen) {
          setOptionsOpen(false);
        } else {
          closeWithoutAcknowledgement();
        }
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeWithoutAcknowledgement, gateOpen, optionsOpen]);

  const openGate = React.useCallback((mode: "notice" | "options" = "notice") => {
    setGateOpen(true);
    setOptionsOpen(mode === "options");
  }, []);

  React.useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (hasRequiredPrivacyAcknowledgement(consent)) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[data-requires-privacy-gate='true']") as HTMLAnchorElement | null;
      if (!anchor?.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigationHref(anchor.href);
      openGate("notice");
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [consent, openGate]);

  const commitAcknowledgement = React.useCallback(
    async (optional: PrivacyOptionalConsent, source: string) => {
      const next = buildAcknowledgedConsent({ previous: consent, optional, source });
      persistConsentLocally(next);
      setConsent(next);
      setOptionalDraft(next.optional);
      setGateOpen(false);
      setOptionsOpen(false);
      await persistConsentServer(next);
      if (pendingNavigationHref) {
        const href = pendingNavigationHref;
        setPendingNavigationHref(null);
        router.push(href as Parameters<typeof router.push>[0]);
      }
    },
    [consent, pendingNavigationHref, router],
  );

  const ensureActiveProcessingAllowed = React.useCallback(
    (_source = "interactive-action", mode: "notice" | "options" = "notice") => {
      if (hasRequiredPrivacyAcknowledgement(consent)) return true;
      openGate(mode);
      return false;
    },
    [consent, openGate],
  );

  const value = React.useMemo<PrivacyGateContextValue>(
    () => ({
      consent,
      gateOpen,
      hasRequiredAcknowledgement: hasRequiredPrivacyAcknowledgement(consent),
      openGate,
      ensureActiveProcessingAllowed,
    }),
    [consent, ensureActiveProcessingAllowed, gateOpen, openGate],
  );

  const openPrivacyDossier = React.useCallback(() => {
    setGateOpen(false);
    setOptionsOpen(false);
    setPendingNavigationHref(null);
    router.push("/datenschutz-dossier");
  }, [router]);

  return (
    <PrivacyGateContext.Provider value={value}>
      <div ref={shellRef}>{props.children}</div>

      {gateOpen ? (
        <div className="fixed inset-0 z-[120]">
          <DialogShield />
          <div className="absolute inset-0 flex items-end justify-center sm:items-center" style={DIALOG_VIEWPORT_STYLE}>
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-gate-title"
              aria-describedby="privacy-gate-description"
              style={DIALOG_PANEL_STYLE}
              className={`relative flex w-full flex-col overflow-hidden rounded-[1.75rem] border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_96%,rgb(var(--bg))_4%)] shadow-[0_28px_80px_rgba(2,6,23,0.48)] transition-[max-width] ${
                optionsOpen ? "max-w-2xl" : "max-w-xl"
              }`}
            >
              <div className="h-1.5 bg-[linear-gradient(90deg,rgba(34,211,238,0.86),rgba(16,185,129,0.78))]" />
              <div data-nosnippet="true" className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <div className="space-y-5 p-5 pb-24 sm:p-6 sm:pb-24">
                    <header className="space-y-3">
                      <div className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200 dark:text-cyan-100">
                        Datenschutz
                      </div>
                      <div className="space-y-2">
                        <h2 id="privacy-gate-title" className="text-2xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                          Datenschutz kurz bestätigen
                        </h2>
                        <p id="privacy-gate-description" className="text-sm leading-6 text-[rgb(var(--muted))]">
                          Damit eDebatte deinen Swipe oder deine Eingabe ausführen kann, werden die dafür notwendigen
                          Eingabe-, Sitzungs- und Sicherheitsdaten verarbeitet. Freiwillige Funktionen bleiben aus,
                          solange du sie nicht selbst aktivierst.
                        </p>
                      </div>
                    </header>

                    <section className="rounded-[1.35rem] border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                        Notwendig für den gewünschten Dienst
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-5 text-[rgb(var(--fg))]">
                        <li>• deinen Swipe oder deine Eingabe technisch verarbeiten</li>
                        <li>• Sitzung, Missbrauchsschutz und Sicherheitsereignisse verwalten</li>
                        <li>• Arbeitsstände nur speichern, wenn du das ausdrücklich auslöst</li>
                      </ul>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" className="btn btn-ghost text-sm" onClick={openPrivacyDossier}>
                          Datenschutz-Dossier
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost text-sm"
                          onClick={() => setOptionsOpen((current) => !current)}
                        >
                          {optionsOpen ? "Einstellungen schließen" : "Einstellungen"}
                        </button>
                      </div>
                    </section>

                    {optionsOpen ? (
                      <section className="space-y-3 rounded-[1.35rem] border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                            Freiwillige Funktionen
                          </p>
                          <p className="mt-1 text-sm leading-5 text-[rgb(var(--muted))]">
                            Diese Optionen sind nicht nötig, um eDebatte zu verwenden, und bleiben standardmäßig aus.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <OptionalToggle
                            label="Komfortfunktionen erlauben"
                            checked={optionalDraft.comfort}
                            onChange={(checked) => setOptionalDraft((current) => ({ ...current, comfort: checked }))}
                          />
                          <OptionalToggle
                            label="Anonyme Nutzungsstatistik erlauben"
                            checked={optionalDraft.analytics}
                            onChange={(checked) => setOptionalDraft((current) => ({ ...current, analytics: checked }))}
                          />
                          <OptionalToggle
                            label="Externe Medien nach Freigabe laden"
                            checked={optionalDraft.externalMedia}
                            onChange={(checked) => setOptionalDraft((current) => ({ ...current, externalMedia: checked }))}
                          />
                          <OptionalToggle
                            label="Produktverbesserung mit anonymisierten Signalen erlauben"
                            checked={optionalDraft.productImprovement}
                            onChange={(checked) => setOptionalDraft((current) => ({ ...current, productImprovement: checked }))}
                          />
                        </div>
                      </section>
                    ) : null}
                  </div>
                </div>

                <div className="sticky bottom-0 shrink-0 border-t border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_96%,rgb(var(--bg))_4%)] px-5 py-4 shadow-[0_-16px_32px_rgba(2,6,23,0.18)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,rgb(var(--card))_88%,transparent)] sm:px-6">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" className="btn btn-ghost text-sm" onClick={closeWithoutAcknowledgement}>
                      Nicht fortfahren
                    </button>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      {optionsOpen ? (
                        <button
                          type="button"
                          className="btn btn-ghost text-sm"
                          onClick={() => void commitAcknowledgement(optionalDraft, "privacy-gate-custom")}
                        >
                          Auswahl speichern &amp; weiter
                        </button>
                      ) : null}
                      <button
                        ref={primaryActionRef}
                        type="button"
                        className="btn btn-primary text-sm"
                        onClick={() =>
                          void commitAcknowledgement(
                            optionsOpen ? optionalDraft : buildDefaultOptionalConsent(),
                            optionsOpen ? "privacy-gate-custom" : "privacy-gate-necessary-only",
                          )
                        }
                      >
                        Verstanden &amp; weiter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PrivacyGateContext.Provider>
  );
}

function OptionalToggle(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[1.15rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
      <span className="text-sm leading-relaxed text-[rgb(var(--fg))]">{props.label}</span>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-[rgb(var(--border))] transition peer-focus-visible:ring-2 peer-focus-visible:ring-sky-200 peer-checked:bg-[linear-gradient(90deg,rgba(34,211,238,0.86),rgba(16,185,129,0.78))]" />
        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-[rgb(var(--card))] shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function usePrivacyGate() {
  const context = React.useContext(PrivacyGateContext);
  if (!context) {
    return {
      consent: null,
      gateOpen: false,
      hasRequiredAcknowledgement: false,
      openGate: () => {},
      ensureActiveProcessingAllowed: () => false,
    } satisfies PrivacyGateContextValue;
  }
  return context;
}
