// apps/web/src/app/satzung/page.tsx
import type { ReactNode } from "react";

export default function SatzungPage() {
  const sections: { id: string; title: string; content: ReactNode }[] = [
    {
      id: "praeambel",
      title: "Präambel",
      content: (
        <>
          <p>
            VoiceOpenGov ist ein gesellschaftliches Infrastrukturprojekt: ein
            überparteiliches, unabhängiges digitales Beteiligungssystem.
          </p>
          <p>
            Ziel von VoiceOpenGov ist es, Menschen, Organisationen und
            Institutionen weltweit zu ermöglichen, auf faire, transparente und
            nachvollziehbare Weise Entscheidungen vorzubereiten und zu treffen.
            VoiceOpenGov stellt hierfür insbesondere die Plattform „eDebatte“ sowie
            weitere Module zur Verfügung, mit denen Inhalte strukturiert,
            Positionen abgewogen, Eventualitäten formuliert und Abstimmungen
            vorbereitet werden können.
          </p>
          <p>
            VoiceOpenGov ist selbst keine Partei und verfolgt keine eigenen
            politischen Programme – außer dem Bekenntnis zum Mehrheitsprinzip.
            Die Organisation stellt ein „Betriebssystem“ für demokratische
            Teilhabe und kollektive Entscheidungsfindung bereit, das von
            Parteien, Initiativen, Verwaltungen, Medien und Einzelpersonen
            genutzt werden kann – ohne die Neutralität der Plattform aufzugeben.
          </p>
        </>
      ),
    },
    {
      id: "1",
      title: "§ 1 Name, Zweck und Charakter",
      content: (
        <>
          <p>(1) Die Organisation führt den Namen „VoiceOpenGov“.</p>
          <p>
            (2) VoiceOpenGov ist eine überparteiliche, unabhängige Struktur mit dem Ziel,
            digitale demokratische Teilhabe und transparente
            Entscheidungsfindung zu fördern.
          </p>
          <p>(3) VoiceOpenGov entwickelt, betreibt und pflegt insbesondere:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>die Plattform „eDebatte“,</li>
            <li>
              Module für strukturierte Diskurse, Eventualitäten und
              Entscheidungsbäume,
            </li>
            <li>
              Werkzeuge zur Bewertung, Gewichtung und Visualisierung von
              Mehrheiten,
            </li>
            <li>Transparenz- und Dokumentationsfunktionen.</li>
          </ul>
          <p>
            (4) VoiceOpenGov kann in unterschiedlichen rechtlichen Formen (z. B. Verein,
            gUG, Stiftung oder Kombinationen) organisiert oder weiterentwickelt
            werden. Diese Charta beschreibt die grundlegende Governance-Logik,
            unabhängig von der konkreten Rechtsform.
          </p>
        </>
      ),
    },
    {
      id: "2",
      title: "§ 2 Leitprinzipien",
      content: (
        <>
          <p>
            (1) <span className="font-semibold">One Human, One Voice</span> –
            soweit technisch und rechtlich sinnvoll, orientiert sich VoiceOpenGov an dem
            Prinzip „eine Person, eine Stimme“.
          </p>
          <p>
            (2) <span className="font-semibold">Transparenz vor Macht</span> –
            Entscheidungen sollen nachvollziehbar und möglichst offen
            dokumentiert werden.
          </p>
          <p>
            (3) <span className="font-semibold">Technologie als Werkzeug</span>{" "}
            – Tools dienen der Stärkung von Menschen und Gemeinschaften, nicht
            ihrer Steuerung oder Ausnutzung.
          </p>
          <p>
            (4) <span className="font-semibold">Neutralität</span> – VoiceOpenGov selbst
            ergreift keine parteipolitischen Positionen und betreibt keine
            politische Werbung.
          </p>
          <p>
            (5) <span className="font-semibold">Nichtdiskriminierung</span> –
            VoiceOpenGov lehnt jede Form von Diskriminierung ab und unterstützt
            inklusive, barrierearme Beteiligungsformen.
          </p>
          <p>
            (6) <span className="font-semibold">Datenschutz &amp; Sicherheit</span>{" "}
            – „Privacy by Design“ und hohe Sicherheitsstandards sind
            verbindlich.
          </p>
        </>
      ),
    },
    {
      id: "3",
      title: "§ 3 Mitgliedschaft",
      content: (
        <>
          <p>
            (1) Mitglied von VoiceOpenGov kann jede natürliche oder juristische Person
            werden, die die Grundprinzipien dieser Charta anerkennt.
          </p>
          <p>
            (2) Die Mitgliedschaft ist freiwillig und kann – unter Einhaltung
            angemessener Fristen – jederzeit beendet werden.
          </p>
          <p>(3) VoiceOpenGov unterscheidet insbesondere:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <span className="font-semibold">aktive Mitglieder</span>:
              Personen mit Zugang zu internen Informationen, Konsultationen und
              Mitwirkungsmöglichkeiten,
            </li>
            <li>
              <span className="font-semibold">fördernde Mitglieder</span>:
              Personen oder Organisationen, die VoiceOpenGov finanziell oder ideell
              unterstützen, ohne weitergehende Mitwirkungsrechte,
            </li>
            <li>
              <span className="font-semibold">institutionelle Partner</span>:
              Organisationen, Kommunen, Initiativen, die eDebatte und andere
              Tools von VoiceOpenGov nutzen.
            </li>
          </ul>
          <p>
            (4) Die Mitgliedschaft begründet keine parteipolitische Bindung und
            verpflichtet nicht zur Unterstützung bestimmter politischer
            Positionen.
          </p>
        </>
      ),
    },
    {
      id: "4",
      title: "§ 4 Rechte und Pflichten der Mitglieder",
      content: (
        <>
          <p>
            (1) Mitglieder von VoiceOpenGov erhalten einen vertieften Einblick
            in den Aufbau, die Funktionsweise und die Weiterentwicklung der
            Plattformen und Werkzeuge (insbesondere eDebatte) sowie in die
            veröffentlichten Transparenz- und Wirkungsberichte.
          </p>
          <p>(2) Mitglieder haben das Recht,</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>an internen Informations- und Austauschformaten teilzunehmen,</li>
            <li>
              Vorschläge zur Weiterentwicklung der Plattformen, Prozesse und
              Governance-Elemente einzubringen,
            </li>
            <li>
              an nicht-öffentlichen Konsultationen, Pilotprojekten und
              Feedbackrunden mitzuwirken.
            </li>
          </ul>
          <p>
            (3) Interne Befragungen, Votings oder Konsultationen unter den
            Mitgliedern dienen der inhaltlichen Orientierung und Priorisierung.
            Sie sind <span className="font-semibold">beratend, nicht bindend</span>.
            Entscheidungen über Finanzierung, Geschäftsmodell, operativen
            Betrieb und technische Roadmap verbleiben beim{" "}
            <span className="font-semibold">Trägerkreis bzw. Core-Team</span> von
            VoiceOpenGov, das diese Entscheidungen transparent begründet und
            dokumentiert.
          </p>
          <p>
            (4) Mitglieder verpflichten sich zu einem respektvollen Umgang, zur
            Einhaltung der Kommunikations- und Nutzungsregeln sowie zur
            Unterstützung der Grundprinzipien von VoiceOpenGov (Transparenz,
            Fairness, Nichtdiskriminierung, Datenschutz).
          </p>
          <p>(5) Mitgliedsrechte sind personenbezogen und nicht übertragbar.</p>
        </>
      ),
    },
    {
      id: "5",
      title: "§ 5 Teilnahme ohne Mitgliedschaft",
      content: (
        <>
          <p>
            (1) Die Nutzung von eDebatte und anderen VoiceOpenGov-Tools ist grundsätzlich
            auch ohne Mitgliedschaft möglich – etwa im Rahmen von Abonnements,
            Projektpaketen oder Kooperationen.
          </p>
          <p>
            (2) Ein normales eDebatte-Abo oder die Teilnahme an über eDebatte
            durchgeführten Abstimmungen begründet keine Mitgliedschaft bei
            VoiceOpenGov und vermittelt keine Governance-Rechte in Bezug auf:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>die Finanzierungsstrategie von VoiceOpenGov,</li>
            <li>die interne Struktur,</li>
            <li>die langfristige technische Roadmap.</li>
          </ul>
          <p>
            (3) VoiceOpenGov trennt klar zwischen der{" "}
            <span className="font-semibold">Nutzung des Werkzeugs (eDebatte)</span>{" "}
            und der <span className="font-semibold">Steuerung der Organisation</span>{" "}
            VoiceOpenGov (Governance).
          </p>
        </>
      ),
    },
    {
      id: "6",
      title: "§ 6 Organisation und Governance-Struktur",
      content: (
        <>
          <p>
            (1) Die konkrete juristische Trägerstruktur (z. B. Verein, gUG,
            Stiftung) wird durch den Gründerkreis bzw. den Trägerkreis von
            VoiceOpenGov definiert und bei Bedarf weiterentwickelt.
          </p>
          <p>
            (2) Zur operativen Steuerung kann ein{" "}
            <span className="font-semibold">Core-Team</span> bzw. eine
            Geschäftsführung eingesetzt werden, das/die:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>den täglichen Betrieb sicherstellt,</li>
            <li>technische Entscheidungen vorbereitet und umsetzt,</li>
            <li>mit Partnern und Institutionen kooperiert,</li>
            <li>Transparenzberichte erstellt.</li>
          </ul>
          <p>
            (3) Ergänzend kann ein{" "}
            <span className="font-semibold">Advisory Board / Beirat</span>{" "}
            eingerichtet werden, das aus externen Expert:innen (z. B. aus
            Zivilgesellschaft, Wissenschaft, Technik, Recht, Ethik) besteht und
            den Trägerkreis berät.
          </p>
          <p>
            (4) Die Zusammensetzung und Aufgaben dieser Organe, ihre
            Verantwortlichkeiten sowie Kontroll- und Haftungsfragen werden in
            ergänzenden Dokumenten (z. B. Geschäftsordnung, Satzung des
            Trägervereins / der gUG / der Stiftung) konkret geregelt.
          </p>
        </>
      ),
    },
    {
      id: "7",
      title: "§ 7 Digitale Beteiligung über eDebatte",
      content: (
        <>
          <p>(1) eDebatte ist das zentrale Werkzeug von VoiceOpenGov zur:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Strukturierung von Themen,</li>
            <li>Extraktion von Aussagen und Positionen,</li>
            <li>
              Formulierung und Gegenüberstellung von Varianten und
              Eventualitäten,
            </li>
            <li>Vorbereitung und Durchführung von Abstimmungen.</li>
          </ul>
          <p>(2) eDebatte kann genutzt werden von:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Bürger:innen und Communities,</li>
            <li>Initiativen und NGOs,</li>
            <li>Kommunen und Verwaltungen,</li>
            <li>Medienpartnern,</li>
            <li>
              Parteien und parteiunabhängigen Projekten – unter Beachtung der
              Neutralität von VoiceOpenGov.
            </li>
          </ul>
          <p>
            (3) VoiceOpenGov stellt sicher, dass Prozesse auf eDebatte nachvollziehbar,
            dokumentiert, möglichst prüfbar, datenschutzkonform und technisch
            gegen Manipulation abgesichert sind.
          </p>
          <p>
            (4) Die Organisation kann zwischen verschiedenen Nutzungsebenen
            unterscheiden (z. B. offene Beteiligung, geschlossene
            Fachverfahren, Pilotprojekte), um sowohl Experimentierfreiheit als
            auch Sicherheit zu gewährleisten.
          </p>
        </>
      ),
    },
    {
      id: "8",
      title: "§ 8 Finanzierung",
      content: (
        <>
          <p>
            (1) VoiceOpenGov finanziert sich insbesondere durch Nutzungs- und
            Lizenzmodelle für eDebatte und weitere Tools, Mitglieds- und
            Förderbeiträge, projektbezogene Unterstützungen, Kooperationen und
            ggf. Fördermittel sowie in begrenztem Rahmen durch
            Dienstleistungsangebote (z. B. Begleitung von Beteiligungsprozessen).
          </p>
          <p>
            (2) VoiceOpenGov nimmt keine Zuwendungen an, die an die Bedingung der
            inhaltlichen Einflussnahme auf Entscheidungen, Gewichtungen oder
            Algorithmen geknüpft sind.
          </p>
          <p>
            (3) Die Verantwortung für Finanzierung, Geschäftsmodell und
            langfristige Tragfähigkeit von VoiceOpenGov liegt beim Trägerkreis / Core-Team,
            der diese Entscheidungen transparent machen und in regelmäßigen
            Berichten offenlegen soll.
          </p>
          <p>
            (4) Finanzdaten und wesentliche wirtschaftliche Entscheidungen
            werden – soweit rechtlich und wirtschaftlich sinnvoll – in
            Transparenzberichten veröffentlicht.
          </p>
        </>
      ),
    },
    {
      id: "9",
      title: "§ 9 Neutralität und Umgang mit Parteien",
      content: (
        <>
          <p>
            (1) VoiceOpenGov ist politisch neutral und unterstützt keine Partei,
            Liste oder Kandidatur bevorzugt.
          </p>
          <p>
            (2) Politische Parteien, Bewegungen und Initiativen können eDebatte
            nutzen, sofern sie die Nutzungsbedingungen, Transparenzregeln und
            Fairnessprinzipien akzeptieren.
          </p>
          <p>
            (3) Das Projekt „Vote4Gov“ kann VoiceOpenGov- und eDebatte-Infrastruktur
            einsetzen, bleibt jedoch eine separate, eigenständige politische
            Initiative/Partei. Die Governance von VoiceOpenGov ist von
            Vote4Gov organisatorisch und finanziell getrennt.
          </p>
          <p>
            (4) VoiceOpenGov verpflichtet sich, die gleichen technischen und
            prozessualen Standards allen Nutzenden zur Verfügung zu stellen, die
            die Regeln akzeptieren – unabhängig von politischer Ausrichtung.
          </p>
        </>
      ),
    },
    {
      id: "10",
      title: "§ 10 Internationale Ausrichtung",
      content: (
        <>
          <p>
            (1) VoiceOpenGov versteht sich als global anschlussfähige
            Infrastruktur.
          </p>
          <p>
            (2) In verschiedenen Ländern oder Regionen können eigenständige
            Chapters oder Partnerstrukturen entstehen, die:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>die Grundprinzipien dieser Charta respektieren,</li>
            <li>lokale rechtliche Vorgaben berücksichtigen,</li>
            <li>
              in ihrer Governance eigenständig sein können, aber transparent
              machen, wie sie VoiceOpenGov-Tools einsetzen.
            </li>
          </ul>
          <p>
            (3) Technische und organisatorische Entwicklungen sollen sich an
            international anerkannten Standards, insbesondere in den Bereichen
            Datenschutz, IT-Sicherheit und Beteiligungsverfahren, orientieren.
          </p>
        </>
      ),
    },
    {
      id: "11",
      title: "§ 11 Datenschutz und IT-Sicherheit",
      content: (
        <>
          <p>
            (1) VoiceOpenGov verarbeitet personenbezogene Daten nur im erforderlichen
            Umfang und nach dem Grundsatz der Zweckbindung.
          </p>
          <p>
            (2) Es gelten hohe Standards der Informationssicherheit:
            Verschlüsselung, Zugriffsbeschränkungen, Protokollierung
            sicherheitsrelevanter Ereignisse, regelmäßige Sicherheitsupdates.
          </p>
          <p>
            (3) Langfristig sollen unabhängige Audits und Sicherheitsprüfungen
            etabliert werden, deren Ergebnisse – soweit möglich – öffentlich
            kommuniziert werden.
          </p>
        </>
      ),
    },
    {
      id: "12",
      title: "§ 12 Änderungen der Charta und Auflösung",
      content: (
        <>
          <p>
            (1) Änderungen dieser Governance-Charta können vom Trägerkreis /
            Core-Team initiiert werden. Mitglieder können Änderungsvorschläge
            einbringen und im Rahmen von Konsultationen hierzu Stellung nehmen.
          </p>
          <p>
            (2) Wesentliche Änderungen sollen transparent begründet und
            versioniert veröffentlicht werden.
          </p>
          <p>
            (3) Eine vollständige Auflösung von VoiceOpenGov oder die Aufgabe
            des Projekts kann nur mit qualifizierter Mehrheit innerhalb des
            Trägerkreises beschlossen werden. Die Nutzung bereits veröffentlichter
            und offener Komponenten soll – soweit rechtlich möglich – erhalten
            oder in gemeinwohlorientierte Strukturen überführt werden.
          </p>
          <p>
            (4) Im Fall einer Auflösung sollen verbleibende Mittel – nach
            Begleichung von Verbindlichkeiten – für Zwecke digitaler
            Demokratiebildung, Transparenz und gemeinwohlorientierter
            Beteiligungsinfrastruktur eingesetzt werden.
          </p>
        </>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">
            Governance
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            VoiceOpenGov – Governance-Charta
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            Arbeitsfassung der Satzung / Grundordnung für die Dachorganisation
            von VoiceOpenGov.
          </p>
        </header>

        {/* Inhaltsverzeichnis */}
        <nav className="bg-white/95 border border-slate-100 rounded-3xl p-5 md:p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="font-semibold text-slate-900">Inhaltsverzeichnis</h2>
            <span className="text-[11px] px-2 py-1 rounded-full bg-sky-50 text-sky-700 font-medium">
              {sections.length} Abschnitte
            </span>
          </div>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  className="inline-flex items-baseline gap-1 hover:text-sky-600 hover:underline decoration-sky-400/70 decoration-[1.5px]"
                  href={`#${s.id}`}
                >
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Abschnitte */}
        <section className="space-y-6 text-slate-700">
          {sections.map(({ id, title, content }) => (
            <article
              key={id}
              id={id}
              className="bg-white/95 border border-slate-100 border-l-4 border-l-sky-500/80 p-4 md:p-6 rounded-3xl shadow-sm scroll-mt-28"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="font-semibold text-slate-900">{title}</h2>
                {id === "praeambel" && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-sky-50 text-sky-700 font-medium">
                    Grundgedanke
                  </span>
                )}
              </div>
              <div className="prose prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-li:leading-relaxed">
                {content}
              </div>
            </article>
          ))}
        </section>

        <footer className="text-center space-y-3">
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            Hinweis: Diese Fassung ist ein konzeptioneller Entwurf. Für die
            konkrete juristische Ausgestaltung müssen ggf. ergänzende Dokumente
            erstellt und fachlich geprüft werden.
          </p>
          <div>
            <a
              href="/unterstuetzen"
              className="inline-block text-sm font-medium underline underline-offset-4 text-sky-700 hover:text-sky-900"
            >
              → Mitmachen &amp; VoiceOpenGov unterstützen
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
