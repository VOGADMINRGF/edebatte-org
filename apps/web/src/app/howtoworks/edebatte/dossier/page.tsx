"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const CARD = "rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm";
const CONTRIBUTION_HREF = "/create?mode=source&intent=contribution&entryIntent=content_companion&entryMode=direct";

export default function DossierPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "howtoworks-dossier-simple" });
  const de = String(locale ?? "de").startsWith("de");
  const tr = (deText: string, enText: string, key: string) => t(de ? deText : enText, key);

  const questions = [
    ["Was wissen wir schon?", "What do we know already?", "Quellen, Erfahrungen und vorhandene Erkenntnisse werden an einem Ort zusammengeführt.", "Sources, experiences and existing findings are brought together in one place."],
    ["Woher wissen wir das?", "How do we know?", "Zu Aussagen soll sichtbar sein, worauf sie beruhen – und ob etwas nur eine Einschätzung oder Erfahrung ist.", "Claims should show what they are based on, and whether something is an assessment or experience."],
    ["Was ist noch offen?", "What is still open?", "Fehlende Quellen, Widersprüche und unbeantwortete Fragen werden nicht versteckt.", "Missing sources, contradictions and unanswered questions are not hidden."],
    ["Wie kannst du helfen?", "How can you help?", "Wenn etwas fehlt, sollst du eine Quelle, Erfahrung, Perspektive oder Korrektur möglichst direkt ergänzen können.", "If something is missing, you should be able to add a source, experience, perspective or correction as directly as possible."],
  ];

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] pb-16 text-[rgb(var(--fg))]">
      <section className="mx-auto max-w-5xl space-y-12 px-4 py-14 sm:px-6">
        <header className="max-w-3xl space-y-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            {tr("Wissen gemeinsam ordnen", "Organise knowledge together", "hero.kicker")}
          </p>
          <h1 className="headline-grad text-4xl font-extrabold tracking-tight sm:text-6xl">
            {tr("Was wissen wir – und was fehlt noch?", "What do we know — and what is still missing?", "hero.title")}
          </h1>
          <p className="text-lg leading-8 text-[rgb(var(--muted))]">
            {tr("Ein Dossier bündelt den aktuellen Stand zu einer Frage. Es zeigt Quellen, Erfahrungen, unterschiedliche Sichtweisen und offene Punkte, damit du nachvollziehen und gezielt ergänzen kannst.", "A dossier brings together the current state of a question. It shows sources, experiences, different perspectives and open points so you can understand and contribute where needed.", "hero.lead")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={CONTRIBUTION_HREF} className="btn btn-primary">{tr("Etwas beitragen", "Contribute", "cta.contribute")}</Link>
            <Link href="/howtoworks/edebatte" className="btn btn-ghost">{tr("So funktioniert eDebatte", "How eDebatte works", "cta.how")}</Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {questions.map(([titleDe, titleEn, bodyDe, bodyEn], index) => (
            <article key={titleDe} className={CARD}>
              <span className="text-xs font-black text-cyan-700 dark:text-cyan-300">0{index + 1}</span>
              <h2 className="mt-2 text-xl font-black">{tr(titleDe, titleEn, `questions.${index}.title`)}</h2>
              <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">{tr(bodyDe, bodyEn, `questions.${index}.body`)}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
          <h2 className="text-3xl font-black">{tr("Kein Wahrheitsurteil.", "Not a truth verdict.", "truth.title")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {tr("eDebatte soll nicht darüber abstimmen lassen, ob eine Tatsache wahr ist. Stattdessen wird sichtbar gemacht, welche Quellen vorliegen, wo sie sich widersprechen, was gesichert erscheint und wo noch Unsicherheit besteht.", "eDebatte should not vote on whether a fact is true. Instead it should show which sources exist, where they conflict, what appears established and where uncertainty remains.", "truth.body")}
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <article className={CARD}>
            <h2 className="text-2xl font-black">{tr("Du siehst eine Lücke?", "See a gap?", "gap.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
              {tr("Dann soll die nächste Handlung klar sein: Quelle hinzufügen, Erfahrung beitragen, offene Frage beantworten, Alternative ergänzen oder auf einen möglichen Fehler hinweisen. Dafür brauchst du keine Fachsprache über interne Prozesse.", "Then the next action should be clear: add a source, share experience, answer an open question, add an alternative or flag a possible error. You should not need internal process jargon to do that.", "gap.body")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={CONTRIBUTION_HREF} className="btn btn-primary">{tr("Quelle oder Beitrag ergänzen", "Add source or contribution", "gap.cta")}</Link>
              <Link href={`/login?next=${encodeURIComponent(CONTRIBUTION_HREF)}`} className="btn btn-ghost">{tr("Anmelden & hier weitermachen", "Sign in and continue here", "gap.login")}</Link>
            </div>
          </article>
          <article className={CARD}>
            <h2 className="text-xl font-black">{tr("Mehr Details?", "Need more detail?", "details.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
              {tr("Im Hintergrund kann eDebatte Herkunft, Versionen, Änderungen und Beziehungen zwischen Quellen und Aussagen genauer dokumentieren. Diese Tiefe gehört in die Detail- und Transparenzebene – nicht vor die erste Handlung.", "Under the hood, eDebatte can document origin, versions, changes and relationships between sources and claims in more detail. That depth belongs in the transparency layer, not before the first action.", "details.body")}
            </p>
            <Link href="/transparenz" className="mt-4 inline-block text-sm font-bold text-cyan-700 hover:underline dark:text-cyan-300">{tr("Zur Transparenz", "Transparency", "details.cta")} →</Link>
          </article>
        </section>

        <section className="border-t border-[rgb(var(--border))] pt-9">
          <h2 className="text-2xl font-black">{tr("Das Ziel", "The goal", "goal.title")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
            {tr("Nicht möglichst viele Informationen sammeln, sondern den Stand so verständlich machen, dass Menschen erkennen: Was trägt? Was ist strittig? Was fehlt? Und was können wir als Nächstes sinnvoll tun?", "Not to collect as much information as possible, but to make the current state understandable: what holds up, what is disputed, what is missing, and what should we sensibly do next?", "goal.body")}
          </p>
        </section>
      </section>
    </main>
  );
}