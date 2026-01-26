"use client";

import Link from "next/link";
import { MembershipCalculator_VOG } from "@/features/membership";
import { useLocale } from "@/context/LocaleContext";
import { SUPPORT_STRINGS, tSupport } from "./strings";
import { mapTranslatableStrings, useAutoTranslateText } from "@/lib/i18n/autoTranslate";

export default function UnterstuetzenPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "unterstuetzen" });
  const baseStrings = {
    heroTitle: tSupport(SUPPORT_STRINGS.heroTitle, locale),
    heroIntro: tSupport(SUPPORT_STRINGS.heroIntro, locale),
    whyTitle: tSupport(SUPPORT_STRINGS.whyTitle, locale),
    whyList: tSupport(SUPPORT_STRINGS.whyList, locale),
    membershipTitle: tSupport(SUPPORT_STRINGS.membershipTitle, locale),
    membershipList: tSupport(SUPPORT_STRINGS.membershipList, locale),
    bundlesNotePrefix: tSupport(SUPPORT_STRINGS.bundlesNotePrefix, locale),
    bundlesNoteSuffix: tSupport(SUPPORT_STRINGS.bundlesNoteSuffix, locale),
    cta: tSupport(SUPPORT_STRINGS.cta, locale),
  };
  const sourceStrings = {
    heroTitle: tSupport(SUPPORT_STRINGS.heroTitle, "de"),
    heroIntro: tSupport(SUPPORT_STRINGS.heroIntro, "de"),
    whyTitle: tSupport(SUPPORT_STRINGS.whyTitle, "de"),
    whyList: tSupport(SUPPORT_STRINGS.whyList, "de"),
    membershipTitle: tSupport(SUPPORT_STRINGS.membershipTitle, "de"),
    membershipList: tSupport(SUPPORT_STRINGS.membershipList, "de"),
    bundlesNotePrefix: tSupport(SUPPORT_STRINGS.bundlesNotePrefix, "de"),
    bundlesNoteSuffix: tSupport(SUPPORT_STRINGS.bundlesNoteSuffix, "de"),
    cta: tSupport(SUPPORT_STRINGS.cta, "de"),
  };
  const strings =
    locale === "de" || locale === "en"
      ? baseStrings
      : mapTranslatableStrings(sourceStrings, t, { namespace: "unterstuetzen" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-4xl px-4 pt-20 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h1 className="text-4xl font-extrabold text-slate-900 text-center">
            {strings.heroTitle}
          </h1>
          <p className="mt-3 text-center text-lg text-slate-700">
            {strings.heroIntro}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-emerald-50/80 p-4">
              <h2 className="text-base font-semibold text-emerald-700">
                {strings.whyTitle}
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                {strings.whyList.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-rose-50/80 p-4">
              <h2 className="text-base font-semibold text-rose-700">
                {strings.membershipTitle}
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                {strings.membershipList.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>

        <MembershipCalculator_VOG />

        <p className="text-center text-sm text-slate-600">
          {strings.bundlesNotePrefix}{" "}
          <Link href="/pricing" className="text-emerald-600 underline">
            /pricing
          </Link>
          {strings.bundlesNoteSuffix}
        </p>

        <div className="text-center">
          <a href="/mitglied-werden" className="btn bg-brand-grad text-white shadow-soft">
            {strings.cta}
          </a>
        </div>
      </section>
    </main>
  );
}
