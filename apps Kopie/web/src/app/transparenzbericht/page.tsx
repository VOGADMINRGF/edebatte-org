// apps/web/src/app/transparenz/page.tsx

"use client";

import { useLocale } from "@/context/LocaleContext";
import { getTransparenzberichtStrings } from "./strings";

export default function TransparenzberichtPage() {
  const { locale } = useLocale();
  const strings = getTransparenzberichtStrings(locale);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          {/* Header */}
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Transparenzbericht
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              {strings.title}
            </h1>
            <p className="text-base text-slate-600 md:text-lg">
              {strings.subtitle}
            </p>
          </header>

          {/* Meta-Block */}
          <section className="mt-8 grid gap-4 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 md:grid-cols-2 md:p-6">
            <div className="space-y-1">
              <p>{strings.meta.stand}</p>
              <p>{strings.meta.projekt}</p>
              <p>{strings.meta.produkt}</p>
              <p>{strings.meta.rechtsform}</p>
            </div>
            <div className="space-y-2 md:border-l md:border-slate-200 md:pl-6">
              <p className="font-medium">Verantwortung</p>
              <p>{strings.meta.verantwortung}</p>
              <p className="text-xs text-slate-500">
                Hinweis: Dies ist ein Transparenzbericht zur aktuellen
                Aufbauphase und eine Vorschau darauf, wie künftige Jahresberichte
                (z. B. ab 2026) gestaltet sein werden.
              </p>
            </div>
          </section>

          {/* Intro Note */}
          <section className="mt-8 rounded-2xl bg-sky-50/80 p-4 text-sm text-slate-800 md:p-5">
            <p>{strings.introNote}</p>
          </section>

          {/* Sections */}
          <div className="mt-10 space-y-10">
            {strings.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
                  {section.title}
                </h2>

                <div className="space-y-3 text-sm leading-relaxed text-slate-800 md:text-base">
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {section.bullets &&
                  section.bullets.map((group, idx) => (
                    <div
                      key={idx}
                      className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 md:p-4"
                    >
                      {group.map((line, lineIdx) => {
                        // Einfache Heuristik: Zeilen, die mit "•" beginnen, als Bullet;
                        // leere Zeilen als Spacer; sonst normaler Absatz.
                        const trimmed = line.trim();
                        if (!trimmed) {
                          return <div key={lineIdx} className="h-2" />;
                        }
                        if (trimmed.startsWith("•")) {
                          return (
                            <div key={lineIdx} className="flex gap-2">
                              <span className="mt-[6px] h-1.5 w-1.5 flex-none rounded-full bg-sky-500" />
                              <p>{trimmed.replace(/^•\s*/, "")}</p>
                            </div>
                          );
                        }
                        return <p key={lineIdx} className="font-medium">{line}</p>;
                      })}
                    </div>
                  ))}
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
