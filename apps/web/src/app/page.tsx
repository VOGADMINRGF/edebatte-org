"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { getHomeStrings } from "./homeStrings";

export default function Home() {
  const { locale } = useLocale();
  const strings = getHomeStrings(locale);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] to-[var(--brand-to)] pb-16">
      <section
        id="hero"
        className="border-b border-slate-200/60 bg-gradient-to-b from-[var(--brand-from)] to-[var(--brand-to)]"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-14 pt-14 lg:flex-row lg:items-start">
          <div className="flex-1">
            <div className="mb-4 flex flex-wrap gap-2">
              {strings.heroChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    border: `1px solid ${"var(--chip-border)"}`,
                    background: "var(--chip-bg)",
                    color: "var(--chip-text)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
              {strings.heroHeadline.lines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
              <span className="bg-brand-grad bg-clip-text text-transparent">{strings.heroHeadline.accent}</span>{" "}
              {strings.heroHeadline.suffix}
            </h1>
            <p
              className="mt-5 text-lg text-slate-700 md:text-xl"
              dangerouslySetInnerHTML={{ __html: strings.heroIntro }}
            />
            <ul className="mt-4 list-disc pl-5 text-base text-slate-700 space-y-1">
              {strings.heroBullets.map((item) => (
                <li key={item} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/statements/new" className="btn btn-primary bg-brand-grad text-white">
                {strings.heroCtas.primary}
              </Link>
              <Link
                href="/contributions/new"
                className="btn border border-slate-300 bg-white/80 hover:bg-white"
              >
                {strings.heroCtas.secondary}
              </Link>
              <Link
                href="/mitglied-werden"
                className="btn border border-slate-300 bg-white/70 hover:bg-white"
              >
                {strings.heroCtas.tertiary}
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {strings.heroCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{card.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-brand-grad p-4 text-white shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <h3 className="text-base font-semibold">
                    {strings.membershipHighlight.title}
                  </h3>
                  <p className="opacity-90 text-sm">
                    {strings.membershipHighlight.body}
                  </p>
                </div>
                <Link
                  href="/mitglied-werden"
                  className="btn border border-white/60 bg-black/30 text-white hover:bg-black/40"
                >
                  {strings.membershipHighlight.button}
                </Link>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[38%]">
            <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div
                className="grid h-full w-full place-items-center"
                style={{
                  background: "linear-gradient(135deg,var(--panel-from),var(--panel-to))",
                }}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/85 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur"
                >
                  ▶︎ Video (90s)
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{strings.heroVideoNote}</span>
              <Link href="/faq" className="font-medium text-slate-700 underline">
                {strings.heroVideoLink}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {strings.uspItems.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
            >
              <div
                className="mb-3 h-0.5 w-16 rounded-full"
                style={{ background: "linear-gradient(90deg,var(--brand-accent-1),var(--brand-accent-2))" }}
              />
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">{strings.qualitySection.title}</h2>
          <p className="mt-3 text-sm text-slate-700">{strings.qualitySection.body}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="btn border border-slate-300 bg-white/80 hover:bg-white"
            >
              {strings.qualitySection.ctaReports}
            </Link>
            <Link href="/mitglied-werden" className="btn btn-primary bg-brand-grad text-white">
              {strings.qualitySection.ctaMembers}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
