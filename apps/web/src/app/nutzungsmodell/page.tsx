"use client";

import Link from "next/link";
import { PricingWidget_eDbtt } from "@/features/pricing";
import { useLocale } from "@/context/LocaleContext";
import { getNutzungsStrings } from "./strings";

export default function NutzungsmodellPage() {
  const { locale } = useLocale();
  const strings = getNutzungsStrings(locale);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-slate-900">{strings.heroTitle}</h1>
          <p className="text-slate-600">{strings.heroIntro}</p>
        </header>

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
          <ul className="list-disc space-y-1 pl-5">
            {strings.infoList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <PricingWidget_eDbtt />

        <section className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">{strings.earnedTitle}</h2>
          <p className="mt-2">{strings.earnedIntro}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {strings.earnedList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <div className="text-center text-sm text-slate-500">
          {strings.membershipNote}{" "}
          <Link href={strings.membershipLink} className="text-emerald-600 underline">
            {strings.membershipLink}
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
