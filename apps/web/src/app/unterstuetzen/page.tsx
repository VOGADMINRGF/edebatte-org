"use client";

import Link from "next/link";
import { MembershipCalculator_VOG } from "@/modules/membership";
import { useLocale } from "@/context/LocaleContext";
import { SUPPORT_STRINGS, tSupport } from "./strings";

export default function UnterstuetzenPage() {
  const { locale } = useLocale();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-4xl px-4 pt-20 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h1 className="text-4xl font-extrabold text-slate-900 text-center">
            {tSupport(SUPPORT_STRINGS.heroTitle, locale)}
          </h1>
          <p className="mt-3 text-center text-lg text-slate-700">
            {tSupport(SUPPORT_STRINGS.heroIntro, locale)}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-emerald-50/80 p-4">
              <h2 className="text-base font-semibold text-emerald-700">
                {tSupport(SUPPORT_STRINGS.whyTitle, locale)}
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                {tSupport(SUPPORT_STRINGS.whyList, locale).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-rose-50/80 p-4">
              <h2 className="text-base font-semibold text-rose-700">
                {tSupport(SUPPORT_STRINGS.membershipTitle, locale)}
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                {tSupport(SUPPORT_STRINGS.membershipList, locale).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>

        <MembershipCalculator_VOG />

        <p className="text-center text-sm text-slate-600">
          {tSupport(SUPPORT_STRINGS.bundlesNotePrefix, locale)}{" "}
          <Link href="/nutzungsmodell" className="text-emerald-600 underline">
            /nutzungsmodell
          </Link>
          {tSupport(SUPPORT_STRINGS.bundlesNoteSuffix, locale)}
        </p>

        <div className="text-center">
          <a href="/mitglied-werden" className="btn bg-brand-grad text-white shadow-soft">
            {tSupport(SUPPORT_STRINGS.cta, locale)}
          </a>
        </div>
      </section>
    </main>
  );
}
