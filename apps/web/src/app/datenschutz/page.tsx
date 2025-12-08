"use client";

import { useLocale } from "@/context/LocaleContext";
import { getPrivacyStrings } from "./strings";

export default function DatenschutzPage() {
  const { locale } = useLocale();
  const strings = getPrivacyStrings(locale);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Datenschutz
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              {strings.title}
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              {strings.intro}
            </p>
          </header>

          <div className="mt-8 grid gap-4">
            <InfoCard title={strings.controllerTitle} body={strings.controllerBody} />

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {strings.dataTitle}
              </p>
              <ul className="mt-2 space-y-2">
                {strings.dataPoints.map((item) => (
                  <li key={item.label}>
                    <span className="font-semibold">{item.label}:</span> {item.description}
                  </li>
                ))}
              </ul>
            </div>

            <InfoCard title={strings.cookiesTitle} body={strings.cookiesBody} />
            <InfoCard title={strings.aiTitle} body={strings.aiBody} />

            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {strings.rightsTitle}
              </p>
              <p className="mt-1">{strings.rightsIntro}</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                {strings.rightsPoints.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 whitespace-pre-line text-slate-700">
                {strings.rightsComplaintHint}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {strings.contactTitle}
              </p>
              <p className="whitespace-pre-line">{strings.contactBody}</p>
              <p className="pt-2">
                Kontakt-E-Mail:{" "}
                <a
                  className="font-semibold text-sky-700 underline underline-offset-4"
                  href={`mailto:${strings.contactEmail}`}
                >
                  {strings.contactEmail}
                </a>
              </p>
              <p className="mt-1 text-slate-700">
                Diese Hinweise werden laufend aktualisiert und rechtlich überprüft, sobald sich unser
                Angebot oder die Rechtslage ändert.
              </p>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 whitespace-pre-line">{body}</p>
    </div>
  );
}
