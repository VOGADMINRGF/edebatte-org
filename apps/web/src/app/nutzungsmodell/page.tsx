"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { EDEBATTE_PLANS, MEMBER_DISCOUNT, calcDiscountedPrice } from "@/config/pricing";
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

        <section className="grid gap-4 md:grid-cols-2">
          {EDEBATTE_PLANS.map((plan) => {
            const memberPrice = calcDiscountedPrice(plan.listPrice.amount);
            return (
              <article
                key={plan.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-900">{plan.label}</h3>
                <p className="mt-1 text-sm text-slate-700">{plan.description}</p>
                <p className="mt-3 text-sm text-slate-700">
                  Listenpreis: {plan.listPrice.amount.toFixed(2)} € /{" "}
                  {plan.listPrice.interval === "month" ? "Monat" : "Jahr"}
                  <br />
                  <span className="font-medium text-emerald-700">
                    Mitgliedspreis: {memberPrice.toFixed(2)} € /{" "}
                    {plan.listPrice.interval === "month" ? "Monat" : "Jahr"} (−
                    {MEMBER_DISCOUNT.percent}%)
                  </span>
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Als VoiceOpenGov-Mitglied erhältst du auf dieses Paket {MEMBER_DISCOUNT.percent}% Nachlass (siehe
                  Mitgliedschaft unter <a href="/mitglied-werden" className="underline">/mitglied-werden</a>).
                </p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">{strings.earnedTitle}</h2>
          <p className="mt-2">{strings.earnedIntro}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {strings.earnedList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <p className="mt-4 text-xs text-slate-600 text-center">
          VoiceOpenGov-Mitglied werden? Das ist der einfachste Weg, die Bewegung zu unterstützen und gleichzeitig von
          Vergünstigungen bei eDebatte und unserem zukünftigen Merchandise-Shop zu profitieren – mehr unter{" "}
          <Link href="/mitglied-werden" className="underline">
            /mitglied-werden
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
