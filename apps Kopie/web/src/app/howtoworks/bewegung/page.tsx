"use client";

import * as React from "react";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";

const heroCopy = {
  title_de: "So funktioniert eDebatte – die Bewegung",
  title_en: "How eDebatte Works – the Movement",
  lead_de:
    "eDebatte ist die Bewegung hinter der App eDebatte. Sie sorgt dafür, dass Beteiligung nicht nur als Schlagwort existiert, sondern als Alltag: Anliegen einreichen, Fakten prüfen, gemeinsam entscheiden, Umsetzung begleiten.",
  lead_en:
    "eDebatte is the movement behind the eDebatte app. Participation becomes everyday practice: submit a concern, check facts, decide together, accompany the implementation.",
  secondary_de:
    "Wir sind keine Partei, keine Liste und kein neues Lager. Wir verstehen uns als weltweites Bündnis für aktive Bürgerbeteiligung – offen für alle, die faire Verfahren wichtiger finden als Parteitaktik.",
  secondary_en:
    "We are not a party, not a list, and not a new faction. We are a global alliance for active civic participation – open to everyone who values fair procedures more than party tactics.",
};

const heroChips = [
  { id: "chip-1", label_de: "eine Person, eine Stimme", label_en: "one person, one vote" },
  { id: "chip-2", label_de: "Satzung schützt vor Fremdinteressen", label_en: "Statutes guard against outside interests" },
  { id: "chip-3", label_de: "Transparente Verfahren statt Hinterzimmer", label_en: "Transparent procedures instead of backroom deals" },
];

const heroButtons = [
  {
    id: "member",
    href: "/mitglied-werden",
    label_de: "Mitglied werden",
    label_en: "Become a member",
    variant: "primary" as const,
  },
  {
    id: "app",
    href: "/howtoworks/edebatte",
    label_de: "Mehr zur eDebatte-App",
    label_en: "More about the eDebatte app",
    variant: "secondary" as const,
  },
];

const independenceSection = {
  title_de: "Keine Partei. Kein Lager. Gesellschaft im Mittelpunkt.",
  title_en: "No party. No camp. Society at the center.",
  paragraphs: [
    {
      id: "ind-1",
      body_de:
        "Wir sind keine Partei und wollen es auch nicht werden. eDebatte versteht sich als unabhängige Bürgerbewegung und als weltweites Bündnis für aktive Beteiligung – jenseits von Schubladen wie „links“, „rechts“, „grün“, „liberal“ oder „Mitte“. Im Mittelpunkt steht nur eines: die Gesellschaft als Ganzes.",
      body_en:
        "We are not a party and we do not intend to become one. eDebatte is an independent civic movement and a worldwide alliance for participation – beyond labels like left, right, green, liberal, or center. The only focus is society as a whole.",
    },
    {
      id: "ind-2",
      body_de:
        "Unser Ziel ist, gemeinsam neue faire Strukturen zu schaffen – auf kommunaler, nationaler, europäischer und weltweiter Ebene. Wir glauben daran, dass gut vorbereitete Entscheidungen mit einer klaren Zwei-Drittel-Mehrheit stärker sind als kurzfristige Stimmungspolitik oder Fraktionszwang.",
      body_en:
        "Our goal is to build new fair structures together – locally, nationally, across Europe, and globally. Well-prepared decisions with a clear two-thirds majority are more resilient than short-term mood politics or caucus discipline.",
    },
    {
      id: "ind-3",
      body_de:
        "Damit das funktioniert, muss die Bewegung unabhängig bleiben. Unsere Satzung legt fest: keine Partei, kein Konzern, kein Lobbyverband und kein anonymer Geldgeber dürfen die Regeln nach ihren Interessen verbiegen.",
      body_en:
        "To make that possible, the movement has to remain independent. Our statutes guarantee that no party, corporation, lobby group, or anonymous donor can bend the rules to serve their interests.",
    },
  ],
};

const membershipSection = {
  title_de: "Mitglied werden – damit die Bewegung leben kann",
  title_en: "Become a member – keep the movement alive",
  intro_de:
    "eDebatte wird ausschließlich von Mitgliedern und privaten Unterstützer:innen getragen – typischerweise ab 5,63 € monatlich. Es gibt keine versteckte Konzernfinanzierung und keine Parteikasse im Hintergrund. Wenn wir Server, Weiterentwicklung, Moderation und Bildungsformate stemmen, dann nur durch freiwillige Beiträge und Zeitspenden.",
  intro_en:
    "eDebatte is funded solely by members and individual supporters – typically starting at €5.63 per month. There is no hidden corporate money and no party treasury. Servers, development, moderation, and education exist because people contribute money and time.",
  outro_de:
    "Mitgliedschaft bedeutet: Du hältst die Infrastruktur mit am Leben, kaufst dir damit aber kein zusätzliches Stimmrecht. Alle Abstimmungen folgen strikt dem Prinzip „eine Person, eine Stimme“ – unabhängig von Einkommen, Parteibuch oder Spendenhöhe.",
  outro_en:
    "Membership means you keep the infrastructure alive without buying more voting power. Every vote follows the strict rule of one person, one vote – regardless of income, party membership, or donation size.",
};

const membershipList = [
  {
    id: "mem-1",
    body_de: "Du hältst die Plattform technisch am Laufen – für dich und alle anderen.",
    body_en: "You keep the platform running – for yourself and everyone else.",
  },
  {
    id: "mem-2",
    body_de:
      "Du sicherst die Unabhängigkeit von Parteien, Lobbystrukturen und kurzfristigen Interessen.",
    body_en:
      "You protect the movement from parties, lobby structures, and short-lived interests.",
  },
  {
    id: "mem-3",
    body_de:
      "Du ermöglichst, dass Kommunen, Initiativen und Schulen das Werkzeug kostenfrei testen können.",
    body_en:
      "You enable municipalities, initiatives, and schools to test the toolkit free of charge.",
  },
];

const cooperationBlocks = [
  {
    id: "coop-politics",
    title_de: "Kooperationen mit Politik & Institutionen",
    title_en: "Cooperation with politics & institutions",
    body_de:
      "eDebatte und die App eDebatte verstehen sich nicht als Konkurrenz zu bestehenden Parteien oder Vertretungen, sondern als zusätzliche, unabhängige Ebene. Wir liefern aktuelle Meinungsbilder, strukturierte Dossiers und aufbereitete Entscheidungsgrundlagen, damit gewählte Vertreter:innen besser entscheiden können – transparent und überprüfbar.",
    body_en:
      "eDebatte and the eDebatte app are not competitors to existing parties or parliaments. We add an independent layer: current sentiment, structured dossiers, and actionable recommendations so elected officials can decide transparently and accountably.",
    bullets: [
      {
        id: "coop-politics-1",
        body_de:
          "Parteien, Fraktionen und Mandatsträger:innen können unsere Dossiers nutzen, ohne Einfluss zu kaufen.",
        body_en:
          "Parties, caucuses, and elected officials can use the dossiers without buying influence.",
      },
      {
        id: "coop-politics-2",
        body_de:
          "Empfehlungen kommen immer mit Quellen, Unsicherheiten, Minderheitsberichten und Datenpaketen – keine „Sprachregelungen“, sondern Entscheidungsgrundlagen.",
        body_en:
          "Recommendations include sources, uncertainties, and minority reports – real decision support instead of talking points.",
      },
      {
        id: "coop-politics-3",
        body_de:
          "Kooperation heißt: gemeinsam lernen, was funktioniert, und es auf weitere Regionen übertragen.",
        body_en:
          "Cooperation means learning together what works and scaling it to other regions.",
      },
    ],
  },
  {
    id: "coop-media",
    title_de: "Journalismus – vom Zuschauen zum Mitgestalten",
    title_en: "Journalism – from observing to co-creating",
    body_de:
      "Das alte Bild „Politik entscheidet, das Volk darf wählen, der Journalismus berichtet darüber“ ist für viele Krisen zu langsam und zu oberflächlich geworden. Wir wünschen uns kritischen Journalismus, der redaktionell mitgestaltet, Fragen sauber aufbereitet und von Anfang an in Auswertung und Einordnung hineingeht – lokal, investigativ und transparent.",
    body_en:
      "The old logic – politics decides, people vote, journalism comments – is too slow for current crises. We want critical journalism to join from the very beginning: asking questions, investigating locally, explaining data.",
    bullets: [
      {
        id: "coop-media-1",
        body_de:
          "Reporter:innen sehen, welche Themen Menschen vor Ort wirklich beschäftigen – inklusive Quellen, Gegenargumenten und offenen Fragen.",
        body_en:
          "Reporters see which topics matter locally – with sources, counter-arguments, and open questions.",
      },
      {
        id: "coop-media-2",
        body_de:
          "Jede Vorlage liefert eine Schablone für Beiträge, Podcasts oder Streams – mit klaren Fragestellungen und nachvollziehbaren Quellen.",
        body_en:
          "Each template comes with ready-to-use question sets for articles, podcasts, or streams.",
      },
      {
        id: "coop-media-3",
        body_de:
          "Faktenlage und Verfahren sind offen einsehbar, die Bewertung bleibt bei der Redaktion – kritische Distanz ausdrücklich erwünscht.",
        body_en:
          "Facts and procedures stay open; the editorial assessment remains independent – critical distance encouraged.",
      },
    ],
  },
];

const joinPanel = {
  title_de: "Mitmachen & Kooperation",
  title_en: "Participate & cooperate",
  intro_de:
    "Ohne Mitglieder, Unterstützer:innen und Partner funktioniert das alles nicht. Wenn dich die Idee überzeugt, kannst du auf drei Arten einsteigen – als Bürger:in, als Verband/Verein oder als Redaktion/Creator:",
  intro_en:
    "None of this works without members, supporters, and partners. If the idea resonates with you, there are three ways to join – as a citizen, an elected body, or a newsroom/creator:",
  segments: [
    {
      id: "segment-citizen",
      label_de: "Für Bürger:innen",
      label_en: "For citizens",
      body_de:
        "Mitglied werden, Anliegen einbringen, an Abstimmungen teilnehmen – und als Creator Themen, Streams oder Regionen begleiten.",
      body_en: "Become a member, file concerns, take part in votes.",
    },
    {
      id: "segment-politics",
      label_de: "Für Politik, Verbände & Vereine",
      label_en: "For politics & associations",
      body_de:
        "Aufbereitete Entscheidungsgrundlagen nutzen, Verfahren gemeinsam testen und in Regionen skalieren.",
      body_en: "Use dossiers and sentiment data, test the procedures together, scale them regionally.",
    },
    {
      id: "segment-media",
      label_de: "Für Journalist:innen & Creator",
      label_en: "For journalists & creators",
      body_de:
        "Redaktionell mitgestalten: Faktenchecks, Fragenschablonen und Daten für Beiträge, Podcasts oder Streams.",
      body_en: "Current topics, question templates, and data for articles, podcasts, or live formats.",
    },
  ],
  buttons: [
    {
      id: "panel-member",
      href: "/mitglied-werden",
      label_de: "Mitglied werden",
      label_en: "Become a member",
      primary: true,
    },
    {
      id: "panel-politics",
      href: "/team?focus=politik",
      label_de: "Für Politik & Verbände",
      label_en: "For politics & associations",
      primary: false,
    },
    {
      id: "panel-media",
      href: "/team?focus=medien",
      label_de: "Für Journalist:innen & Creator",
      label_en: "For journalists & creators",
      primary: false,
    },
  ],
};

export default function HowToWorksBewegungPage() {
  const { locale } = useLocale();
  const text = React.useCallback(
    (entry: Record<string, any>, key: string) => resolveLocalizedField(entry, key, locale),
    [locale],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <h1
            className="text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage: "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {text(heroCopy, "title")}
          </h1>
          <div className="rounded-[40px] border border-transparent bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <div className="rounded-[36px] bg-white/90 p-6 space-y-4">
              <p className="text-lg text-slate-700">{text(heroCopy, "lead")}</p>
              <p className="text-sm text-slate-600">{text(heroCopy, "secondary")}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-700">
                {heroChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="rounded-full border px-3 py-1 shadow-sm"
                    style={{ borderColor: "var(--chip-border)", background: "rgba(14,165,233,0.08)" }}
                  >
                    {text(chip, "label")}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {heroButtons.map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    className={
                      btn.variant === "primary"
                        ? "btn bg-brand-grad text-white shadow-soft"
                        : "btn border border-slate-300 bg-white"
                    }
                  >
                    {text(btn, "label")}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)] space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{text(independenceSection, "title")}</h2>
          {independenceSection.paragraphs.map((paragraph) => (
            <p key={paragraph.id} className="text-sm text-slate-700 leading-relaxed">
              {text(paragraph, "body")}
            </p>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)] space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">{text(membershipSection, "title")}</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{text(membershipSection, "intro")}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {membershipList.map((item) => (
              <li key={item.id}>{text(item, "body")}</li>
            ))}
          </ul>
          <p className="text-sm text-slate-700 leading-relaxed">{text(membershipSection, "outro")}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href="/mitglied-werden" className="btn bg-brand-grad text-white shadow-soft">
              {text(heroButtons[0], "label")}
            </a>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              {cooperationBlocks.map((block) => (
                <div key={block.id} className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">{text(block, "title")}</h2>
                  <p className="text-sm text-slate-700 leading-relaxed">{text(block, "body")}</p>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                    {block.bullets.map((bullet) => (
                      <li key={bullet.id}>{text(bullet, "body")}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex">
              <div className="flex w-full flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-5 shadow-sm">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-slate-900">{text(joinPanel, "title")}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{text(joinPanel, "intro")}</p>
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  {joinPanel.segments.map((segment) => (
                    <p key={segment.id}>
                      <span className="font-semibold text-slate-800">{text(segment, "label")}</span>: {text(segment, "body")}
                    </p>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {joinPanel.buttons.map((btn) => (
                    <a
                      key={btn.id}
                      href={btn.href}
                      className={
                        btn.primary
                          ? "btn bg-brand-grad text-white shadow-soft"
                          : "btn border border-slate-300 bg-white text-sm"
                      }
                    >
                      {text(btn, "label")}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
