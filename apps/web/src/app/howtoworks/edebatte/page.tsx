"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const CARD = "rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm";

const hero = {
  id: "hero",
  kicker_de: "So funktioniert eDebatte",
  kicker_en: "How eDebatte works",
  title_de: "Mitmachen, etwas ergänzen oder selbst eine Frage starten.",
  title_en: "Take part, add something useful or start your own question.",
  lead_de:
    "Du musst das System nicht erst verstehen. Wenn du über einen Link, eine Nachricht oder einen QR-Code kommst, landest du direkt beim Thema. Dort kannst du abstimmen, etwas ergänzen oder sehen, was noch offen ist.",
  lead_en:
    "You do not need to understand the system first. If you arrive through a link, message or QR code, you go straight to the topic. There you can vote, add something useful or see what is still open.",
};

const actions = [
  {
    id: "take-part",
    title_de: "Mitmachen",
    title_en: "Take part",
    body_de: "Position wählen, einen Vorschlag ergänzen oder auf eine offene Frage antworten.",
    body_en: "Choose a position, add a proposal or answer an open question.",
    cta_de: "Jetzt mitmachen",
    cta_en: "Take part now",
    href: "/swipes",
  },
  {
    id: "contribute",
    title_de: "Etwas beitragen",
    title_en: "Contribute something",
    body_de: "Eine Quelle, Erfahrung, Korrektur oder Perspektive ergänzen, wenn du etwas beitragen kannst.",
    body_en: "Add a source, experience, correction or perspective when you can help.",
    cta_de: "Beitrag starten",
    cta_en: "Start a contribution",
    href: "/create?mode=source&intent=contribution&entryIntent=content_companion&entryMode=direct",
  },
  {
    id: "start",
    title_de: "Etwas starten",
    title_en: "Start something",
    body_de: "Eine eigene Frage öffnen, Menschen einladen und gemeinsam herausfinden, was trägt oder noch fehlt.",
    body_en: "Open your own question, invite people and find out what holds up or is still missing.",
    cta_de: "Eigene Frage starten",
    cta_en: "Start your own question",
    href: "/runden/new?gtm=1",
  },
];

const deeper = {
  id: "deeper",
  title_de: "Wenn du tiefer einsteigen willst",
  title_en: "When you want to go deeper",
  lead_de:
    "eDebatte verbindet Beiträge mit Gründen, Quellen, offenen Punkten und späteren Ergebnissen. Du siehst nicht nur, wie abgestimmt wurde, sondern auch, was dahinterliegt und was noch geklärt werden sollte.",
  lead_en:
    "eDebatte connects contributions with reasons, sources, open points and later results. You see not only how people voted, but what sits behind it and what still needs clarification.",
};

const deeperCards = [
  {
    id: "knowledge",
    title_de: "Was wissen wir schon?",
    title_en: "What do we already know?",
    body_de: "Quellen, Hinweise und Gegenpositionen werden am Thema zusammengeführt. Unsicherheiten dürfen sichtbar bleiben.",
    body_en: "Sources, notes and opposing views are brought together around the topic. Uncertainty can remain visible.",
    href: "/howtoworks/edebatte/dossier",
    cta_de: "Mehr zu Quellen und Wissensstand",
    cta_en: "More about sources and current knowledge",
  },
  {
    id: "decision",
    title_de: "Was wollen Menschen?",
    title_en: "What do people want?",
    body_de: "Abstimmungen zeigen Positionen. Eigene Vorschläge, Gründe und Erfahrungen helfen zu verstehen, warum sie entstehen.",
    body_en: "Votes show positions. Proposals, reasons and experiences help explain why they exist.",
    href: "/howtoworks/edebatte/abstimmen",
    cta_de: "Mehr zum Mitmachen",
    cta_en: "More about taking part",
  },
  {
    id: "next",
    title_de: "Was ist der nächste Schritt?",
    title_en: "What is the next step?",
    body_de: "Offene Punkte bleiben sichtbar. Daraus kann eine weitere Frage, eine Ergänzung oder ein neuer gemeinsamer Schritt entstehen.",
    body_en: "Open points remain visible. They can lead to another question, an addition or a new shared next step.",
    href: "/runden",
    cta_de: "Laufende Fragen ansehen",
    cta_en: "See current questions",
  },
];

const principles = {
  id: "principles",
  title_de: "Wichtig dabei",
  title_en: "Important principles",
  items_de: [
    "Fakten werden nicht durch Mehrheiten wahr oder falsch.",
    "Fehlende Quellen und offene Fragen dürfen sichtbar bleiben.",
    "Voxy kann helfen, entscheidet aber nicht an deiner Stelle.",
    "Nichts wird allein durch einen KI-Vorschlag automatisch veröffentlicht.",
  ],
  items_en: [
    "Facts do not become true or false through majority votes.",
    "Missing sources and open questions can remain visible.",
    "Voxy can help but does not decide for you.",
    "Nothing is published automatically merely because AI suggested it.",
  ],
};

export default function HowToWorksEdebattePage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "howtoworks-edebatte" });

  const text = React.useCallback(
    (entry: Record<string, unknown>, key: string) => {
      const base = resolveLocalizedField(entry, key, locale);
      const hint = entry?.id ? `${entry.id}.${key}` : key;
      return t(base, hint);
    },
    [locale, t],
  );

  const isEnglish = String(locale ?? "de").startsWith("en");

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] pb-16">
      <section className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:py-16">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{text(hero, "kicker")}</p>
          <h1 className="headline-grad max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">{text(hero, "title")}</h1>
          <p className="max-w-3xl text-base leading-relaxed text-[rgb(var(--muted))] sm:text-lg">{text(hero, "lead")}</p>
        </header>

        <section aria-labelledby="actions-title" className="space-y-4">
          <h2 id="actions-title" className="text-2xl font-bold tracking-tight text-[rgb(var(--fg))]">
            {isEnglish ? "What would you like to do?" : "Was möchtest du tun?"}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {actions.map((action) => (
              <article key={action.id} className={`${CARD} flex flex-col`}>
                <h3 className="text-xl font-bold text-[rgb(var(--fg))]">{text(action, "title")}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[rgb(var(--muted))]">{text(action, "body")}</p>
                <Link href={action.href} className="mt-5 inline-flex font-semibold text-sky-700 hover:underline dark:text-sky-300">
                  {text(action, "cta")} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="deeper-title" className="space-y-4">
          <div>
            <h2 id="deeper-title" className="text-2xl font-bold tracking-tight text-[rgb(var(--fg))]">{text(deeper, "title")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">{text(deeper, "lead")}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {deeperCards.map((item) => (
              <article key={item.id} className={CARD}>
                <h3 className="text-base font-semibold text-[rgb(var(--fg))]">{text(item, "title")}</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{text(item, "body")}</p>
                <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
                  {text(item, "cta")} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={CARD} aria-labelledby="principles-title">
          <h2 id="principles-title" className="text-2xl font-bold tracking-tight text-[rgb(var(--fg))]">{text(principles, "title")}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[rgb(var(--muted))]">
            {(isEnglish ? principles.items_en : principles.items_de).map((item, index) => (
              <li key={item}>{t(item, `principles.items.${index}`)}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}