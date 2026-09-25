"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import type { StartExperienceModel } from "@/features/start/startExperience";
import { buildFreeBallotStartHref, GO_TO_MARKET_PACKAGING } from "@features/pricing/goToMarketPackaging";

type Props = { experience: StartExperienceModel };

type Step = {
  number: string;
  title: string;
  body: string;
};

export default function HomeGoToMarketLanding({ experience }: Props) {
  const { locale } = useLocale();
  const de = locale === "de";

  const steps: Step[] = de
    ? [
        {
          number: "01",
          title: "Sag, was dich bewegt",
          body: "Ein Satz reicht zum Start. Problem, Vorschlag, Frage, Beobachtung oder Quelle – du musst kein Formular verstehen.",
        },
        {
          number: "02",
          title: "Kontext statt Bürokratie",
          body: "Ort, Thema, Zuständigkeit, Quellen und ähnliche Anliegen werden nur so weit geklärt, wie es für den nächsten sinnvollen Schritt nötig ist.",
        },
        {
          number: "03",
          title: "Andere können sich beteiligen",
          body: "Menschen können zustimmen, widersprechen, ergänzen oder tiefer einsteigen. Unterschiede bleiben sichtbar statt still zusammengeführt zu werden.",
        },
      ]
    : [
        {
          number: "01",
          title: "Say what matters to you",
          body: "One sentence is enough to begin. Problem, proposal, question, observation or source – no form knowledge required.",
        },
        {
          number: "02",
          title: "Context instead of bureaucracy",
          body: "Place, topic, responsibility, sources and related concerns are clarified only as far as the next useful step requires.",
        },
        {
          number: "03",
          title: "Others can take part",
          body: "People can support, disagree, add nuance or go deeper. Differences remain visible instead of being silently merged.",
        },
      ];

  return (
    <div className="overflow-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
      <section className="relative border-b border-[color:var(--border)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(34,211,238,0.2),transparent_32%)]"
        />
        <div className="relative mx-auto max-w-[76rem] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              {de ? "Dein Anliegen zählt." : "Your concern matters."}
            </p>
            <h1 className="mt-5 text-balance text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {de ? "Was sollte sich ändern?" : "What should change?"}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
              {de
                ? "Bring ein, was dich beschäftigt – lokal, regional oder überregional. eDebatte hilft, Anliegen nachvollziehbar zu strukturieren und gemeinsam weiterzubringen."
                : "Bring what matters to you – locally, regionally or beyond. eDebatte helps structure concerns transparently and move them forward together."}
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/create"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-cyan-500 px-8 py-3.5 text-base font-black text-slate-950 shadow-[0_14px_35px_rgba(6,182,212,0.22)] transition hover:-translate-y-0.5"
              >
                {de ? "Anliegen einbringen" : "Bring a concern"} →
              </Link>
              <Link
                href="/swipes"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-cyan-500/60 bg-[color:var(--background)] px-8 py-3.5 text-base font-black text-cyan-700 transition hover:-translate-y-0.5 dark:text-cyan-300"
              >
                {de ? "Schnell mitentscheiden" : "Take part quickly"}
              </Link>
            </div>

            <p className="mt-5 text-sm font-semibold text-[color:var(--muted)]">
              {de
                ? "Ein Satz reicht zum Start. Nichts wird automatisch veröffentlicht."
                : "One sentence is enough to begin. Nothing is published automatically."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            {de ? "Vom Gedanken zur Beteiligung" : "From thought to participation"}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            {de ? "So einfach beginnt es." : "This is how simply it starts."}
          </h2>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="rounded-[1.6rem] border border-[color:var(--border)] bg-[color:var(--background)] p-6">
              <span className="text-xs font-black text-cyan-700 dark:text-cyan-300">{step.number}</span>
              <h3 className="mt-3 text-xl font-black">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-[76rem] gap-8 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              {de ? "Dein Anliegen hat einen Kontext" : "Your concern has a context"}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              {de ? "Straße, Stadt, Bundesland, Bund oder EU." : "Street, city, state, country or EU."}
            </h2>
          </div>
          <div className="border-l-2 border-cyan-400 pl-6">
            <p className="text-base leading-7 text-slate-300">
              {de
                ? "Nicht jedes Anliegen gehört an denselben Ort. Regionale Fragen bleiben regional, überregionale Themen werden nicht künstlich in eine Kommune gedrückt. Entscheidend ist der Kontext des Anliegens – nicht einfach dein Wohnort."
                : "Not every concern belongs at the same level. Regional issues remain regional, while broader topics are not forced into a municipality. The concern's context matters – not simply where you live."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-2">
          <Link
            href="/swipes"
            className="group rounded-[1.75rem] border border-cyan-500/45 bg-cyan-500/6 p-7 transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              {de ? "Mitentscheiden" : "Take part"}
            </p>
            <h2 className="mt-3 text-3xl font-black">{de ? "Thema lesen. Entscheiden. Weiter." : "Read. Decide. Continue."}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
              {de
                ? "Mit Swipes kannst du schnell Position beziehen. Details und Quellen sind erreichbar, ohne den normalen Beteiligungsfluss zu unterbrechen."
                : "Swipes lets you take a position quickly. Details and sources remain available without interrupting the normal participation flow."}
            </p>
            <span className="mt-6 inline-block font-black text-cyan-700 dark:text-cyan-300">
              {de ? "Zu den Swipes" : "Open swipes"} →
            </span>
          </Link>

          <Link
            href="/create"
            className="group rounded-[1.75rem] border border-[color:var(--border)] p-7 transition hover:-translate-y-0.5 hover:border-cyan-500/45"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              {de ? "Eigenes Anliegen" : "Your own concern"}
            </p>
            <h2 className="mt-3 text-3xl font-black">{de ? "Sag einfach, worum es geht." : "Simply say what it is about."}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
              {de
                ? "Problem, Veränderungswunsch, Vorschlag, Frage oder Quelle: Du startest frei und ergänzt nur das, was wirklich gebraucht wird."
                : "Problem, desired change, proposal, question or source: start freely and add only what is actually needed."}
            </p>
            <span className="mt-6 inline-block font-black text-cyan-700 dark:text-cyan-300">
              {de ? "Anliegen einbringen" : "Bring a concern"} →
            </span>
          </Link>
        </div>
      </section>

      <section className="border-y border-[color:var(--border)] bg-[color:var(--surface)]/35">
        <div className="mx-auto grid max-w-[76rem] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {de ? "Professionelle Nutzung" : "Professional use"}
            </p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">
              {de ? "Auch für Initiativen, Vereine, Kommunen und Organisationen." : "Also for initiatives, associations, municipalities and organisations."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              {de
                ? "Professionelle Beteiligung baut auf derselben Bürgerperspektive auf. Organisationen können Fragen und Runden vorbereiten – sie ersetzen aber nicht den Menschen als Ausgangspunkt der öffentlichen Beteiligung."
                : "Professional participation builds on the same citizen perspective. Organisations can prepare questions and sessions, but they do not replace people as the starting point of public participation."}
            </p>
            <p className="mt-3 text-xs font-semibold text-[color:var(--muted)]">
              {de
                ? `Für einfache eigene Fragen gilt weiterhin die kostenlose Orientierung bis ${GO_TO_MARKET_PACKAGING.freeParticipantGuideline} Teilnehmende.`
                : `For simple questions, the free guideline remains up to ${GO_TO_MARKET_PACKAGING.freeParticipantGuideline} participants.`}
            </p>
          </div>
          <Link
            href={buildFreeBallotStartHref(undefined, "homepage-professional")}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 text-sm font-black transition hover:border-cyan-500/50"
          >
            {de ? "Eigene Frage oder Runde starten" : "Start a question or session"}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              {de ? "Verständlich und kontrollierbar" : "Understandable and controllable"}
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              {de ? "Du behältst die Kontrolle." : "You stay in control."}
            </h2>
          </div>
          <ul className="space-y-4 border-l-2 border-cyan-400 pl-6 text-sm leading-6 text-[color:var(--muted)]">
            <li>{de ? "Nichts geht automatisch online. Veröffentlichung bleibt eine bewusste Entscheidung." : "Nothing goes online automatically. Publication remains an explicit decision."}</li>
            <li>{de ? "Voxy bleibt optional und unterstützt beim Verstehen und Strukturieren." : "Voxy remains optional and helps with understanding and structuring."}</li>
            <li>{de ? "Aussagen, Quellen, Positionen und offene Fragen bleiben voneinander unterscheidbar." : "Claims, sources, positions and open questions remain distinguishable."}</li>
            <li>{de ? "eDebatte ordnet Menschen nicht in politische oder persönliche Schubladen ein." : "eDebatte does not place people into political or personal boxes."}</li>
          </ul>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] px-5 py-14 text-center sm:py-16">
        <h2 className="mx-auto max-w-4xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
          {de ? "Was möchtest du einbringen?" : "What would you like to bring in?"}
        </h2>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/create" className="inline-flex min-h-14 items-center justify-center rounded-full bg-cyan-500 px-8 py-3.5 font-black text-slate-950">
            {de ? "Anliegen einbringen" : "Bring a concern"} →
          </Link>
          <Link href="/swipes" className="inline-flex min-h-14 items-center justify-center rounded-full border border-cyan-500 px-8 py-3.5 font-black text-cyan-700 dark:text-cyan-300">
            {de ? "Mitentscheiden" : "Take part"}
          </Link>
        </div>
        {experience.workspaceHref && experience.workspaceLabel ? (
          <div className="mt-5">
            <Link href={experience.workspaceHref} className="text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
              {experience.workspaceLabel}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
