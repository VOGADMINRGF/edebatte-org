"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const CONTACT_EMAIL = "kontakt@edebatte.org";

export default function WiderrufPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "widerruf" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              {t("Rechtliches", "kicker")}
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              {t("Widerrufsbelehrung", "title")}
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              {t(
                "Hier findest du die Widerrufsbelehrung fuer entgeltliche Leistungen, sofern sie anwendbar ist. Wir finalisieren die rechtsverbindliche Fassung und stellen sie hier bereit.",
                "lead",
              )}
            </p>
          </header>

          <div className="mt-8 grid gap-4">
            <InfoCard
              title={t("Aktueller Stand", "status.title")}
              body={t(
                "Die Widerrufsbelehrung wird derzeit rechtlich finalisiert. Sobald sie vorliegt, veroeffentlichen wir sie an dieser Stelle.",
                "status.body",
              )}
            />

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("Hilfe & Kontakt", "help.title")}
              </p>
              <p className="mt-2">
                {t("Wenn du Fragen zum Widerruf hast, melde dich direkt bei uns:", "help.body")}
              </p>
              <a
                className="mt-2 inline-flex font-semibold text-sky-700 underline underline-offset-4"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <LinkCard href="/agb" label={t("AGB", "links.agb")} />
              <LinkCard href="/datenschutz" label={t("Datenschutz", "links.privacy")} />
              <LinkCard href="/widerspruch" label={t("Widerspruch & Kuendigung", "links.objection")} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 whitespace-pre-line">{body}</p>
    </div>
  );
}

function LinkCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-200 hover:text-slate-900"
    >
      {label}
    </Link>
  );
}
