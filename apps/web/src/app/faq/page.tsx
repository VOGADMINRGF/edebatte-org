"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { mapTranslatableStrings, useAutoTranslateText } from "@/lib/i18n/autoTranslate";
import { FAQ_CATEGORIES, FAQ_HOW_IT_WORKS_STEPS } from "@/app/faq/faqContent";

export default function FaqPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "faq-simple" });
  const steps = useMemo(
    () => (locale === "de" ? FAQ_HOW_IT_WORKS_STEPS : mapTranslatableStrings(FAQ_HOW_IT_WORKS_STEPS, t, { namespace: "faq.steps" })),
    [locale, t],
  );
  const categories = useMemo(
    () => (locale === "de" ? FAQ_CATEGORIES : mapTranslatableStrings(FAQ_CATEGORIES, t, { namespace: "faq.categories" })),
    [locale, t],
  );
  const [activeCategoryId, setActiveCategoryId] = useState("grundlagen");
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const [openQuestionId, setOpenQuestionId] = useState(activeCategory?.faqs[0]?.id ?? "");

  function handleCategoryChange(id: string) {
    setActiveCategoryId(id);
    const category = categories.find((item) => item.id === id);
    setOpenQuestionId(category?.faqs[0]?.id ?? "");
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] pb-16 text-[rgb(var(--fg))]">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{t("Fragen & Antworten", "hero.kicker")}</p>
          <h1 className="headline-grad text-4xl font-extrabold tracking-tight sm:text-5xl">{t("eDebatte einfach erklärt", "hero.title")}</h1>
          <p className="text-base leading-7 text-[rgb(var(--muted))]">
            {t("Kein Technikhandbuch: Hier findest du die wichtigsten Antworten dazu, wie du mitmachen, etwas starten, Wissen ergänzen und die Kontrolle behalten kannst.", "hero.lead")}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/swipes" className="btn btn-primary">{t("Mitmachen", "hero.participate")}</Link>
            <Link href="/runden/new?gtm=1" className="btn btn-ghost">{t("Etwas starten", "hero.start")}</Link>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
              <span className="text-xs font-black text-cyan-700 dark:text-cyan-300">{step.badge}</span>
              <h2 className="mt-2 text-lg font-black">{step.title}</h2>
              <p className="mt-1 text-sm font-semibold text-[rgb(var(--muted))]">{step.subtitle}</p>
              <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">{step.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryChange(category.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${category.id === activeCategoryId ? "border-cyan-500 bg-cyan-500/10 text-[rgb(var(--fg))]" : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"}`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {activeCategory ? (
            <div className="mx-auto mt-6 max-w-3xl space-y-3">
              {activeCategory.faqs.map((item) => {
                const isOpen = item.id === openQuestionId;
                return (
                  <article key={item.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
                    <button type="button" onClick={() => setOpenQuestionId(isOpen ? "" : item.id)} className="flex w-full items-center justify-between gap-4 text-left">
                      <span className="font-bold">{item.question}</span>
                      <span aria-hidden="true" className="text-cyan-700 dark:text-cyan-300">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen ? <p className="mt-3 border-t border-[rgb(var(--border))] pt-3 text-sm leading-6 text-[rgb(var(--muted))]">{item.answer}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="mt-12 rounded-3xl bg-slate-950 p-7 text-center text-white">
          <h2 className="text-2xl font-black">{t("Noch etwas unklar?", "footer.title")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("Wenn eine Erklärung fehlt, ist das selbst eine Lücke. Sag uns, was du nicht verstanden hast oder wo dir eine Antwort fehlt.", "footer.lead")}</p>
          <Link href="/kontakt" className="mt-5 inline-flex rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950">{t("Frage stellen", "footer.cta")}</Link>
        </section>
      </section>
    </main>
  );
}
