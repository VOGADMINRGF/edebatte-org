"use client";

import Link from "next/link";
import { useState } from "react";
import {
  formatPackageBillingModeLabel,
  formatPackagePriceLabel,
  type EDebattePackageDefinition,
  type PricingLocale,
} from "@features/pricing";

type PackagesGridProps = {
  packages?: EDebattePackageDefinition[];
  tone?: "default" | "journalism";
  locale?: PricingLocale;
  compact?: boolean;
  labels?: {
    forWhom: string;
    intendedFor: string;
    differenceToNext: string;
    included: string;
  };
};

const DEFAULT_LABELS = {
  de: {
    forWhom: "Für wen?",
    intendedFor: "Wofür gedacht?",
    differenceToNext: "Unterschied zur nächsten Stufe",
    included: "Was ist enthalten?",
  },
  en: {
    forWhom: "For whom?",
    intendedFor: "Intended for",
    differenceToNext: "Difference to the next tier",
    included: "What is included?",
  },
} as const;

function withLocaleHref(href: string, locale: PricingLocale) {
  if (locale !== "en") return href;
  if (/^[a-z]+:/i.test(href)) return href;

  const [pathAndQuery, hash = ""] = href.split("#");
  const [path, query = ""] = pathAndQuery.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", "en");
  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ""}${hash ? `#${hash}` : ""}`;
}

function isDirectPaidB2c(pkg: EDebattePackageDefinition) {
  return pkg.typ === "buerger" && (pkg.id === "start" || pkg.id === "pro") && (pkg.preisMonat ?? 0) > 0;
}

function PackagesGrid({ packages = [], tone = "default", locale = "de", compact = false, labels }: PackagesGridProps) {
  const items = packages;
  const text = labels || DEFAULT_LABELS[locale];
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null);
  const [pendingVogPackageId, setPendingVogPackageId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const gridColsClass =
    items.length === 1 ? "lg:grid-cols-1" : items.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  async function startCheckout(pkg: EDebattePackageDefinition) {
    if (pkg.id !== "start" && pkg.id !== "pro") return;
    setPendingPackageId(pkg.id);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/billing/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: pkg.id }),
      });
      if (response.status === 401) {
        const next = `/pricing?checkout=${pkg.id}${locale === "en" ? "&lang=en" : ""}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url || !String(data.url).startsWith("https://checkout.stripe.com/")) {
        throw new Error("checkout_unavailable");
      }
      window.location.assign(data.url);
    } catch {
      setCheckoutError(
        locale === "en"
          ? "Checkout is currently unavailable. Please try again shortly."
          : "Der Checkout ist gerade nicht verfügbar. Bitte versuche es gleich noch einmal.",
      );
      setPendingPackageId(null);
    }
  }

  async function startVogSupport(pkg: EDebattePackageDefinition) {
    if (pkg.id !== "start" && pkg.id !== "pro") return;
    setPendingVogPackageId(pkg.id);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/billing/vog/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: pkg.id }),
      });
      if (response.status === 401) {
        const next = `/pricing?via=vog&plan=${pkg.id}${locale === "en" ? "&lang=en" : ""}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const data = await response.json().catch(() => null);
      const target = typeof data?.url === "string" ? new URL(data.url) : null;
      if (!response.ok || !target || !["voiceopengov.org", "www.voiceopengov.org", "localhost", "127.0.0.1"].includes(target.hostname)) {
        throw new Error("vog_handoff_unavailable");
      }
      window.location.assign(target.toString());
    } catch {
      setCheckoutError(
        locale === "en"
          ? "The VoiceOpenGov support path is currently unavailable. You can still choose the eDebatte package directly."
          : "Der VoiceOpenGov-Unterstützungspfad ist gerade nicht verfügbar. Du kannst das eDebatte-Paket weiterhin direkt wählen.",
      );
      setPendingVogPackageId(null);
    }
  }

  return (
    <div>
      {checkoutError ? (
        <p role="alert" className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
          {checkoutError}
        </p>
      ) : null}
      <div className={`grid items-stretch gap-6 ${gridColsClass}`}>
        {items.map((pkg) => {
          const isAccent = tone === "journalism";
          const directCheckout = isDirectPaidB2c(pkg);
          const pending = pendingPackageId === pkg.id;
          const vogPending = pendingVogPackageId === pkg.id;
          return (
            <article
              key={pkg.id}
              className={[
                "flex h-full flex-col rounded-3xl border bg-[rgb(var(--card))] p-7 shadow-sm sm:p-8",
                isAccent ? "border-amber-200/80" : "border-[rgb(var(--border))]",
                pkg.hervorgehoben ? "ring-1 ring-sky-200/80" : "",
              ].filter(Boolean).join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{pkg.zielgruppe}</p>
              <h3 className="mt-2 min-h-[3.7rem] text-2xl font-semibold leading-tight text-[rgb(var(--fg))]">{pkg.titel}</h3>

              <p className="mt-6 text-[1.65rem] font-bold tracking-tight text-[rgb(var(--fg))]">{formatPackagePriceLabel(pkg, locale)}</p>
              <p className="mt-1 text-xs font-medium text-[rgb(var(--muted))]">
                {locale === "en" ? "Billing mode:" : "Abrechnungsmodus:"} {formatPackageBillingModeLabel(pkg, locale)}
              </p>
              {!compact ? <p className="mt-4 min-h-[5rem] text-base leading-relaxed text-[rgb(var(--muted))]">{pkg.beschreibungKurz}</p> : null}

              <dl className="mt-6 space-y-3 text-xs leading-relaxed text-[rgb(var(--muted))]">
                {compact ? (
                  <>
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3">
                      <dt className="font-semibold uppercase tracking-wide text-sky-800">{text.included}</dt>
                      <dd className="mt-1">
                        <ul className="space-y-1 text-sm leading-relaxed text-sky-900">
                          {pkg.leistungen.slice(0, 6).map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </dd>
                    </div>
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3.5 py-3">
                      <dt className="font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{text.forWhom} · {text.intendedFor}</dt>
                      <dd className="mt-1 text-sm leading-relaxed"><p>{pkg.fuerWen}</p><p className="mt-1">{pkg.wofuerGedacht}</p></dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3.5 py-3">
                      <dt className="font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{text.forWhom}</dt>
                      <dd className="mt-1 text-sm leading-relaxed">{pkg.fuerWen}</dd>
                    </div>
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3.5 py-3">
                      <dt className="font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{text.intendedFor}</dt>
                      <dd className="mt-1 text-sm leading-relaxed">{pkg.wofuerGedacht}</dd>
                    </div>
                  </>
                )}
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3.5 py-3">
                  <dt className="font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{text.differenceToNext}</dt>
                  <dd className="mt-1 text-sm leading-relaxed">{pkg.unterschiedZurNaechstenStufe}</dd>
                </div>
              </dl>

              {!compact ? (
                <ul className="mt-6 space-y-2.5 text-sm text-[rgb(var(--muted))]">
                  {pkg.leistungen.slice(0, 4).map((item) => (
                    <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /><span>{item}</span></li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-auto space-y-2 pt-8">
                {directCheckout ? (
                  <button
                    type="button"
                    disabled={pendingPackageId !== null || pendingVogPackageId !== null}
                    onClick={() => void startCheckout(pkg)}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.25)] hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                  >
                    {pending ? (locale === "en" ? "Opening checkout…" : "Checkout wird geöffnet …") : pkg.ctaText}
                  </button>
                ) : (
                  <Link
                    href={withLocaleHref(pkg.ctaHref, locale)}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.25)] hover:opacity-90"
                  >
                    {pkg.ctaText}
                  </Link>
                )}

                {directCheckout && pkg.sekundarCtaText ? (
                  <button
                    type="button"
                    disabled={pendingPackageId !== null || pendingVogPackageId !== null}
                    onClick={() => void startVogSupport(pkg)}
                    className="inline-flex w-full items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-950 hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    {vogPending ? (locale === "en" ? "Opening VoiceOpenGov…" : "VoiceOpenGov wird geöffnet …") : pkg.sekundarCtaText}
                  </button>
                ) : pkg.sekundarCtaHref && pkg.sekundarCtaText ? (
                  pkg.sekundarCtaHref.startsWith("http") ? (
                    <a href={pkg.sekundarCtaHref} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-3 text-sm font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--bg))]">{pkg.sekundarCtaText}</a>
                  ) : (
                    <Link href={withLocaleHref(pkg.sekundarCtaHref, locale)} className="inline-flex w-full items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-3 text-sm font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--bg))]">{pkg.sekundarCtaText}</Link>
                  )
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export { PackagesGrid };
export default PackagesGrid;
