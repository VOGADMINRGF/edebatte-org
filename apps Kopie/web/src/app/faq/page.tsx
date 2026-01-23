"use client";

import Link from "next/link";
import { useState } from "react";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type FaqCategory = {
  id: string;
  label: string;
  faqs: FaqItem[];
};

const howItWorksSteps = [
  {
    title: "Thema & Vorlage",
    subtitle: "Worum geht es genau?",
    description:
      "Themen werden als klar strukturierte Vorlage vorbereitet: Kurztext, Hintergrund, Pro & Contra, Quellen und offene Fragen. Alles ist verlinkt und später nachvollziehbar.",
    badge: "Schritt 1",
  },
  {
    title: "Prüfen & diskutieren",
    subtitle: "Argumente sichtbar machen",
    description:
      "Im Evidenz-Graph werden Aussagen mit Belegen, Gegenpositionen und Unsicherheiten verknüpft. So siehst du, worauf sich eine vorgeschlagene Entscheidung stützt – und wo offene Punkte liegen.",
    badge: "Schritt 2",
  },
  {
    title: "Abstimmen & entscheiden",
    subtitle: "Eine Person, eine Stimme",
    description:
      "Wer berechtigt ist, gibt eine geheime Stimme ab. Quorum, Mehrheiten und Minderheitenbericht werden automatisch berechnet. Ergebnis, Beteiligung und Prüfprotokoll sind von Beginn an öffentlich dokumentiert.",
    badge: "Schritt 3",
  },
];

const faqCategories: FaqCategory[] = [
  {
    id: "grundlagen",
    label: "Grundlagen",
    faqs: [
      {
        id: "grundlagen-1",
        question: "Was ist eDebatte?",
        answer:
          "eDebatte ist die direktdemokratische Bewegung. Wir heißen alle willkommen, die das Mehrheitsprinzip stärken und an eine gerechtere Welt glauben. Mit eDebatte, unserem eigens entwickelten Werkzeug, bauen wir eine digitale Infrastruktur für nachvollziehbare Entscheidungen.",
      },
      {
        id: "grundlagen-1b",
        question: "Was ist eDebatte?",
        answer:
          "eDebatte ist unser eigens entwickeltes Werkzeug. Dort werden Themen vorbereitet, Quellen gesammelt, Pro & Contra sichtbar gemacht und Abstimmungen durchgeführt. So bleibt der Prozess transparent, fair und überprüfbar.",
      },
      {
        id: "grundlagen-2",
        question: "Ist eDebatte eine Partei?",
        answer:
          "Nein. eDebatte ist keine Partei, sondern eine unabhängige Bewegung und Infrastruktur. Mit eDebatte stellen wir Werkzeuge bereit, mit denen Bürger:innen, Initiativen, Parteien oder Kommunen Themen einbringen, diskutieren und abstimmen können. Niemand erhält Sonderstimmrechte aufgrund von Rolle oder finanziellen Beiträgen.",
      },
      {
        id: "grundlagen-3",
        question: "Warum spricht ihr von Infrastruktur?",
        answer:
          "Weil wir digitale Teilhabe als dauerhaftes Fundament sehen. Mit eDebatte und eDebatte machen wir Entscheidungsprozesse sichtbar: Wer schlägt was vor, welche Belege gibt es, wie wurde abgestimmt – und warum. Diese Infrastruktur soll überall funktionieren, wo Menschen gemeinsam entscheiden.",
      },
    ],
  },
  {
    id: "abstimmung",
    label: "Abstimmen",
    faqs: [
      {
        id: "abstimmung-1",
        question: "Wie läuft eine Abstimmung ab?",
        answer:
          "1. Vorlage lesen: Du siehst Kurztext, Begründung, Pro & Contra, Quellen und Unsicherheiten.\n2. Berechtigung prüfen: Je nach Thema kann es Kriterien geben (z. B. Region, Alter). Grundsatz bleibt: eine Person, eine Stimme.\n3. Stimme abgeben: Du stimmst digital, die Identität ist technisch vom Stimmzettel getrennt.\n4. Zählen & prüfen: Quorum, definierte Mehrheiten (z. B. 2/3 bei Grundsatzfragen) und Minderheitenbericht werden ermittelt.\n5. Veröffentlichen: Ergebnis, Beteiligung, Minderheitenbericht und Prüfprotokoll sind öffentlich einsehbar.",
      },
      {
        id: "abstimmung-2",
        question: "Was ist der Evidenz-Graph?",
        answer:
          "Der Evidenz-Graph verknüpft Aussagen mit Belegen und Gegenbelegen. Jede Aussage kann auf Quellen, Studien oder Erfahrungsberichte verweisen. Gegenpositionen und Unsicherheiten werden nicht versteckt, sondern sichtbar gemacht. So kannst du nachvollziehen, warum eine Entscheidung inhaltlich sinnvoll erscheint – oder wo du selbst noch Kritik siehst.",
      },
      {
        id: "abstimmung-3",
        question: "Sind meine Stimmen anonym?",
        answer:
          "Ja. Die technische Architektur trennt Identität und Stimmzettel. Überprüfungen wie Berechtigung oder Region laufen getrennt von der eigentlichen Stimmabgabe. Für Auswertungen nutzen wir aggregierte Daten, nicht deine persönliche Stimmhistorie mit Klarnamen.",
      },
      {
        id: "abstimmung-4",
        question: "Wer legt die Regeln für Quorum und Mehrheiten fest?",
        answer:
          "Regeln hängen vom Abstimmungstyp ab. Für einfache Stimmungsbilder reicht oft eine einfache Mehrheit. Für Grundsatzfragen kann ein höheres Quorum und eine 2/3-Mehrheit notwendig sein. Die jeweils geltenden Regeln werden vor jeder Abstimmung klar angezeigt und sind Teil des Prüfprotokolls.",
      },
    ],
  },
  {
    id: "mitmachen",
    label: "Mitmachen",
    faqs: [
      {
        id: "mitmachen-1",
        question: "Wer kann teilnehmen?",
        answer:
          "Grundsätzlich kann jeder ab 16 Jahre mitmachen. Bürger:innen können außerdem Themen, Streams oder Regionen als Creator begleiten. Bei bestimmten Abstimmungen – zum Beispiel zu kommunalen Fragen – kann es Einschränkungen nach Region oder Zielgruppe geben. Diese werden jeweils klar gekennzeichnet.",
      },
      {
        id: "mitmachen-2",
        question: "Brauche ich eine Mitgliedschaft?",
        answer:
          "Viele Funktionen, insbesondere offene Abstimmungen und das Lesen von Inhalten, sollen ohne kostenpflichtige Mitgliedschaft möglich sein. Eine Mitgliedschaft stärkt die Bewegung und finanziert die Infrastruktur. Zusätzlich ermöglicht sie neue Funktionen oder Meta-Mitbestimmung, zum Beispiel bei der Priorisierung von Features.",
      },
      {
        id: "mitmachen-3",
        question: "Wie können Politik, Verwaltung oder Kommunen eDebatte nutzen?",
        answer:
          "Parteien, Fraktionen, Initiativen und Kommunen können eDebatte unabhängig ihrer Politischen oder religiösen gesinnung. nutzen, um Stimmungsbilder einzuholen, Vorschläge zu testen oder verbindliche Mitglieder- bzw. Bürgerentscheide durchzuführen. Wir stellen aufbereitete Entscheidungsgrundlagen, Datenpakete und Dossiers bereit, damit Beschlüsse nachvollziehbar bleiben. Die Regeln bleiben dabei für alle gleich: eine Person, eine Stimme – keine Zusatzstimmen für Organisationen.",
      },
      {
        id: "mitmachen-3b",
        question: "Wie können Verbände und Vereine eDebatte nutzen?",
        answer:
          "Verbände und Vereine können Mitgliederbefragungen, interne Abstimmungen und Arbeitsgruppen in eDebatte aufsetzen. Dossiers bündeln Quellen und Argumente; Ergebnisse liefern Mandate für Mitgliederkommunikation und Beschlüsse.",
      },
      {
        id: "mitmachen-3c",
        question: "Wie können Journalist:innen mitmachen?",
        answer:
          "Journalist:innen können redaktionell mitgestalten: offene Fragen präzisieren, Faktenchecks ergänzen und Dossiers als Grundlage für Beiträge nutzen. eDebatte liefert Quellen, Minderheitenberichte und exportierbare Daten für Artikel, Podcasts oder Streams.",
      },
      {
        id: "mitmachen-4",
        question: "Wie kann ich in der Aufbauphase unterstützen?",
        answer:
          "Du kannst dich registrieren, Mitglied werden, eine einmalige Gutschrift geben oder die eDebatte-Pakete vorbestellen. Ebenso wichtig sind Tests, Feedback und Weiterempfehlungen. Jede Form von Unterstützung hilft, die Bewegung und die Infrastruktur stabil aufzubauen.",
      },
    ],
  },
  {
    id: "datenschutz",
    label: "Datenschutz & Finanzierung",
    faqs: [
      {
        id: "datenschutz-1",
        question: "Wie geht ihr mit meinen Daten um?",
        answer:
          "Wir verarbeiten nur die Daten, die für Registrierung, Sicherheit und Teilnahme nötig sind – etwa deine E-Mail-Adresse und optionale Profilangaben. Welche Daten genau verarbeitet werden, dokumentieren wir in der Datenschutzerklärung, sobald die Gesellschaft eingetragen ist. Datenverkauf ist nicht Teil des Geschäftsmodells.",
      },
      {
        id: "datenschutz-2",
        question: "Wie finanziert sich eDebatte?",
        answer:
          "eDebatte soll sich langfristig über viele kleine Beiträge tragen: Mitgliedschaften, einmalige Gutschriften und Nutzung der Plattform durch Organisationen. So bleibt die Bewegung unabhängig. Details zur aktuellen Finanzierungslogik findest du im Transparenzbericht.",
      },
      {
        id: "datenschutz-3",
        question: "Wo finde ich den Transparenzbericht?",
        answer:
          "Schau im Footer (im Unteren rechten Rand nach Transparenzbericht - dort veröffentlichen wir regelmäßig eine Übersicht über Einnahmen, Ausgaben, offene Punkte und Risiken. In der Aufbauphase beschreiben wir dort außerdem das geschätzte Entwicklungs-Minus und die Prioritäten für den Einsatz der ersten Gelder.",
      },
    ],
  },
];

export default function FaqPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("grundlagen");
  const activeCategory =
    faqCategories.find((cat) => cat.id === activeCategoryId) ?? faqCategories[0];

  const [openQuestionId, setOpenQuestionId] = useState<string>(
    activeCategory.faqs[0]?.id,
  );

  function handleCategoryChange(id: string) {
    setActiveCategoryId(id);
    const cat = faqCategories.find((c) => c.id === id);
    if (cat && cat.faqs.length > 0) {
      setOpenQuestionId(cat.faqs[0].id);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          {/* Hero */}
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              FAQ & How it works
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              eDebatte – kurz erklärt
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              Hier erfährst du, was eDebatte als Bewegung ist, wie eDebatte als Werkzeug
              funktioniert, wer mitmachen kann und wie wir mit Daten und Finanzierung umgehen.
            </p>
          </header>

          {/* How it works – 3 Schritte */}
          <section className="mt-8 space-y-4">
            <div className="rounded-2xl bg-sky-50/70 p-4 text-sm text-slate-800 md:p-6">
              <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                In drei Schritten von der Idee zur Entscheidung
              </h2>
              <p className="mt-1 text-xs text-slate-700 md:text-sm">
                Die Idee hinter eDebatte und eDebatte: Themen werden strukturiert vorbereitet,
                inhaltlich geprüft und anschließend fair, nachvollziehbar und datenschutzfreundlich
                entschieden.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {howItWorksSteps.map((step) => (
                  <div
                    key={step.title}
                    className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-sky-600">
                      <span className="inline-flex h-5 items-center rounded-full bg-sky-50 px-2">
                        {step.badge}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-700">
                      {step.subtitle}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700 md:text-sm">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini-Evidenz-Graph-Erklärung im Stil von /vote */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-[0_16px_40px_rgba(15,23,42,0.06)] md:p-6">
              <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                Evidenz-Graph – so liest du ihn
              </h2>
              <p className="mt-1 text-xs text-slate-700 md:text-sm">
                Aussagen werden mit Belegen gestützt, Gegenbelege zeigen Grenzen. Daraus entsteht
                eine begründete Entscheidung – nicht nur eine Zahl am Ende der Abstimmung.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
                  Aussage
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  Beleg / Gegenbeleg
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                  Entscheidung
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-700 md:text-sm">
                Jede Aussage verweist auf Quellen. Belege sammeln heißt: Studien, Daten,
                Erfahrungsberichte – alles mit nachvollziehbarer Herkunft. Gegenpositionen markieren
                Widersprüche, offene Fragen oder Unsicherheiten. Die Entscheidung am Ende verweist
                sichtbar auf diese Grundlage – und kann später erneut überprüft werden.
              </p>
            </div>
          </section>

          {/* FAQ-Bereich */}
          <section className="mt-10">
            <div className="flex flex-wrap justify-center gap-3">
              {faqCategories.map((cat) => {
                const isActive = cat.id === activeCategoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={[
                      "rounded-full border px-4 py-2 text-xs font-semibold transition",
                      isActive
                        ? "border-slate-900 bg-white text-slate-900 shadow-sm"
                        : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:text-slate-800",
                    ].join(" ")}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
              <ul className="space-y-3">
                {activeCategory.faqs.map((item) => {
                  const isOpen = item.id === openQuestionId;
                  return (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm text-slate-800 md:p-4"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenQuestionId(isOpen ? "" : item.id)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="font-semibold text-slate-900">
                          {item.question}
                        </span>
                        <span
                          className={[
                            "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition",
                            isOpen
                              ? "rotate-90 border-sky-500 text-sky-600"
                              : "border-slate-300 text-slate-500",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          &gt;
                        </span>
                      </button>

                      {isOpen && (
                        <div className="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-800 md:text-sm">
                          {item.answer.split("\n").map((line, idx) => (
                            <p key={idx} className={idx > 0 ? "mt-1" : ""}>
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Footer-CTA */}
          <section className="mt-10 flex flex-col gap-3 text-center text-xs text-slate-600 md:text-sm">
            <p>
              Noch eine Frage offen? Melde dich jederzeit über das{" "}
              <Link
                href="/kontakt"
                className="font-semibold text-sky-700 underline underline-offset-4"
              >
                Kontaktformular
              </Link>{" "}
              oder trag dich in den Newsletter dort ein. 
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
