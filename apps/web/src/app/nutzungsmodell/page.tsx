"use client";

import Link from "next/link";
import { PricingWidget_eDbtt } from "@/features/pricing";

export default function NutzungsmodellPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Nutzungsmodell eDbtt</h1>
          <p className="text-slate-600">
            Lesen und Swipen bleiben kostenlos. Beiträge sind unsere begrenzte Ressource – deshalb
            steuern wir sie über Kontingente, Bundles und Earned Credits.
          </p>
        </header>

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
          <ul className="list-disc space-y-1 pl-5">
            <li>Swipe: unbegrenzt und kostenlos – egal welches Tier.</li>
            <li>Pro Monat gibt es inkludierte Beiträge (Level 1 & 2) je nach Tier.</li>
            <li>Zusätzliche Beiträge kannst du durch Swipes freischalten oder via Bundles/Abo buchen.</li>
          </ul>
        </section>

        <PricingWidget_eDbtt />

        <section className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Earned Credits</h2>
          <p className="mt-2">
            Bei jedem Swipe trägst du zur Qualität bei. Dafür gibt es automatisch Credits:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>100 Swipes → 1 zusätzlicher Level‑1-Beitrag</li>
            <li>500 Swipes → 1 zusätzlicher Level‑2-Beitrag</li>
          </ul>
        </section>

        <div className="text-center text-sm text-slate-500">
          VoiceOpenGov-Mitglied werden? Das ist der ideelle Teil der Bewegung – erfahre mehr unter{" "}
          <Link href="/mitglied-werden" className="text-emerald-600 underline">
            /mitglied-werden
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
