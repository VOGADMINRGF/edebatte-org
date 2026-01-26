"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

export default function PrivatsphaerePage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "privatsphaere" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              {t("Privatsphaere", "kicker")}
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              {t("Privatsphaere & Datensicherheit", "title")}
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              {t(
                "Auf dieser Seite findest du die wichtigsten Wege zu Datenschutz, Widerspruch und Kontosicherheit. So gelangst du schnell dorthin, wo du Entscheidungen treffen oder Hilfe bekommen kannst.",
                "lead",
              )}
            </p>
          </header>

          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("Schnellzugriff", "quick.title")}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <LinkCard
                  href="/datenschutz"
                  label={t("Datenschutz", "quick.privacy")}
                  body={t("Verarbeitungszwecke, Rechte und Kontakt.", "quick.privacy.body")}
                />
                <LinkCard
                  href="/widerspruch"
                  label={t("Widerspruch & Kuendigung", "quick.objection")}
                  body={t(
                    "Widerspruch gegen Datenverarbeitung oder Kuendigung.",
                    "quick.objection.body",
                  )}
                />
                <LinkCard
                  href="/account/security"
                  label={t("Kontosicherheit", "quick.security")}
                  body={t("Sicherheitsoptionen fuer dein Konto.", "quick.security.body")}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("Transparenz & Kontrolle", "control.title")}
              </p>
              <p className="mt-2">
                {t(
                  "Wenn du noch Fragen hast oder einen konkreten Fall klaeren moechtest, melde dich jederzeit ueber das Kontaktformular.",
                  "control.body",
                )}
              </p>
              <Link
                href="/kontakt"
                className="mt-3 inline-flex font-semibold text-sky-700 underline underline-offset-4"
              >
                {t("Kontakt aufnehmen", "control.cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LinkCard({ href, label, body }: { href: string; label: string; body: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-200 hover:text-slate-900"
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </Link>
  );
}
