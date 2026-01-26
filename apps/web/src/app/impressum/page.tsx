"use client";

import { useLocale } from "@/context/LocaleContext";
import { getImpressumStrings } from "./strings";
import { mapTranslatableStrings, useAutoTranslateText } from "@/lib/i18n/autoTranslate";

export default function ImpressumPage() {
  const { locale } = useLocale();
  const baseStrings = getImpressumStrings(locale);
  const sourceStrings = getImpressumStrings("de");
  const t = useAutoTranslateText({ locale, namespace: "impressum" });
  const strings =
    locale === "de" || locale === "en"
      ? baseStrings
      : mapTranslatableStrings(sourceStrings, t, { namespace: "impressum" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Rechtliches
            </p>
            <h1 className="headline-grad text-3xl font-extrabold leading-tight md:text-4xl">
              {strings.title}
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              {strings.intro}
            </p>
          </header>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {strings.responsibleTitle}
              </p>
              <p className="whitespace-pre-line">{strings.responsibleBody}</p>
              <p className="pt-2">
                <span className="font-semibold">E-Mail:</span>{" "}
                <a
                  href={`mailto:${strings.emailLabel}`}
                  className="font-semibold text-sky-700 underline underline-offset-4"
                >
                  {strings.emailLabel}
                </a>
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {strings.legalTitle}
              </p>
              <p className="whitespace-pre-line">{strings.legalBody}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-800 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {strings.disclaimerTitle}
            </p>
            <p className="mt-2 whitespace-pre-line">{strings.disclaimerBody}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
