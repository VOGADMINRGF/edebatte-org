// apps/web/src/app/transparenzbericht/strings.ts

export type TransparenzSection = {
    id: string;
    title: string;
    paragraphs: string[];
    bullets?: string[][];
  };
  
  export type TransparenzberichtStrings = {
    title: string;
    subtitle: string;
    meta: {
      stand: string;
      projekt: string;
      produkt: string;
      rechtsform: string;
      verantwortung: string;
    };
    introNote: string;
    sections: TransparenzSection[];
  };
  
  export function getTransparenzberichtStrings(locale: string): TransparenzberichtStrings {
    // Aktuell nur Deutsch; später kannst du hier nach locale verzweigen.
    switch (locale) {
      case "de":
      default:
        return {
          title: "Startphase VoiceOpenGov / eDebatte",
          subtitle: "Aufbauphase und Vorschau auf den Jahresbericht 2026",
          meta: {
            stand: "Stand: Dezember 2025",
            projekt: "Projekt: VoiceOpenGov – Infrastruktur für digitale direkte Demokratie",
            produkt: "Produkt: eDebatte (mehrstufige Beteiligungsplattform)",
            rechtsform: "Rechtsform: VoiceOpenGov UG (haftungsbeschränkt), in Gründung",
            verantwortung:
              "Verantwortlich für diesen Bericht ist Ricky G. Fleischer als Initiator und künftiger Geschäftsführer der VoiceOpenGov UG (haftungsbeschränkt).",
          },
          introNote:
            "Dieser Transparenzbericht beschreibt die aktuelle Finanzierungslogik in der Aufbauphase, macht das geschätzte Start-Minus aus Entwicklungsleistungen sichtbar und skizziert, wie ab 2026 regelmäßige Transparenzberichte aussehen sollen.",
          sections: [
            {
              id: "warum",
              title: "1. Warum es diesen Transparenzbericht gibt",
              paragraphs: [
                "VoiceOpenGov soll eine Infrastruktur für digitale direkte Demokratie werden, der man bei politischen Entscheidungen vertrauen kann. Dieses Vertrauen entsteht nicht nur durch guten Code und robuste Abstimmungsverfahren, sondern auch durch nachvollziehbare Finanzen.",
                "Wir starten mit einem Projekt, in das bereits sehr viel Zeit, Know-how und persönliche Ressourcen geflossen sind. Gleichzeitig befinden wir uns rechtlich und finanziell noch in einer frühen Aufbauphase.",
                "Mit diesem Transparenzbericht legen wir offen, mit welchem geschätzten Minus wir starten, wie wir die ersten Einnahmen priorisieren und wie zukünftige Transparenzberichte – etwa für das Jahr 2026 – gestaltet sein werden.",
              ],
            },
            {
              id: "ausgangslage",
              title: "2. Ausgangslage: Aufbau aus eigener Tasche",
              paragraphs: [
                "In den letzten Monaten wurde die Plattform – von der technischen Architektur über Datenbanken und Infrastruktur bis hin zu den ersten Frontends und Analysepipelines – im Wesentlichen aus einer Hand aufgebaut.",
                "Auf Basis von Entwicklungsstunden, externen Dienstleistungen, Tools und Infrastruktur gehen wir aktuell von folgenden Größenordnungen aus:",
                "Geschätzte bisherige Entwicklungs- und Aufbaukosten (Eigenleistung plus externe Kosten) liegen bei rund 150.000 €.",
                "Diese Summe ist kein klassischer Kredit und keine offene Forderung eines externen Investors, sondern eine realistische Bewertung der bereits investierten Leistungen. Man kann sie als unsichtbares Start-Minus verstehen, das transparent benannt wird, ohne dass es 1:1 refinanziert werden muss.",
              ],
              bullets: [
                [
                  "Software-Entwicklung (Backend, Frontend, Datenbank-Design, AI-Orchestrierung)",
                  "Konzeption und Spezifikation (z. B. Analyse- und Qualitäts-Blueprints)",
                  "Erste Infrastrukturkosten (Domains, Hosting, Datenbanken, Tools)",
                  "Vorbereitende Rechts- und Gründungsberatung",
                ],
              ],
            },
            {
              id: "konten",
              title: "3. Kontoführung in der Gründungsphase",
              paragraphs: [
                "Bis zur Eintragung der VoiceOpenGov UG (haftungsbeschränkt) werden Mitgliedsbeiträge, einmalige Unterstützungen (Gutschriften) und eDebatte-Vorbestellungen über ein privates Konto von Ricky G. Fleischer entgegengenommen.",
                "Diese Gelder werden buchhalterisch strikt vom privaten Vermögen getrennt erfasst. Nach Eintragung der UG werden die Projektmittel sukzessive auf ein Geschäftskonto überführt.",
                "Es werden aktuell keine Spendenquittungen ausgestellt. Beiträge sind in der Regel nicht steuerlich absetzbar. Sobald sich die rechtliche Struktur verfestigt, wird geprüft, ob und wie sich hier mittelfristig Verbesserungen erreichen lassen, ohne die Unabhängigkeit des Projekts zu gefährden.",
              ],
            },
            {
              id: "prioritaeten",
              title: "4. Prioritäten bei der Verwendung der ersten Gelder",
              paragraphs: [
                "Die ersten eingehenden Gelder – egal ob als laufende Mitgliedsbeiträge, einmalige Gutschriften oder eDebatte-Preorders – werden konsequent nach klaren Prioritäten eingesetzt. Im Fokus stehen zunächst Stabilität und rechtliche Absicherung, nicht Marketing-Feuerwerke.",
              ],
              bullets: [
                [
                  "Priorität 1 – Betrieb & Infrastruktur:",
                  "• Server und Hosting: Laufende Kosten für Hosting, Storage und Verarbeitung.",
                  "• Datenbanken und Backups: Kern-Datenbanken (z. B. Tri-Mongo-Setup, Graph-Datenbank), sichere Backups, Monitoring und Ausfallsicherheit.",
                  "",
                  "Priorität 2 – Lizenzen & Schutzrechte:",
                  "• Software-Lizenzen und Tools: z. B. AI-APIs, Developer-Tools, Monitoring- und Kollaborations-Software.",
                  "• Schutz von Ideen und Verfahren: Juristische Prüfung, welche Schutzrechte (Marken, Design, ggf. technische Schutzrechte) sinnvoll sind, um die Infrastruktur offen zu halten, ohne sie Dritten zur beliebigen Vereinnahmung zu überlassen.",
                  "",
                  "Priorität 3 – Operative Basis & Recht:",
                  "• Geschäftsadresse und Virtual Office: Ladungsfähige Anschrift, Postbearbeitung und organisatorische Basis.",
                  "• Notar, Rechtsanwälte und Steuerberatung: Eintragung der UG, Vertragsgestaltung, AGB, Datenschutzerklärungen sowie steuerliche und rechtliche Begleitung.",
                  "",
                  "Priorität 4 – Gründerlohn:",
                  "• Monatlicher Lohnanteil für den Gründer in zunächst bewusst reduzierter Höhe.",
                  "• Ziel ist, die Arbeitsfähigkeit langfristig zu sichern, ohne dass alles dauerhaft auf unbezahlter Überlastarbeit basiert. Ein fairer, marktüblicher Lohn wird erst angestrebt, wenn Infrastruktur und Grundkosten nachhaltig gedeckt sind.",
                ],
              ],
            },
            {
              id: "unabhaengigkeit",
              title: "5. Unabhängigkeit und Grundsätze der Finanzierung",
              paragraphs: [
                "VoiceOpenGov soll eine Infrastruktur sein, die langfristig nicht von einzelnen großen Geldgeber:innen oder staatlichen Zuschüssen abhängt. Unabhängigkeit ist ein zentrales Designprinzip.",
                "In der aktuellen Phase nehmen wir keine Gelder von politischen Parteien oder parteinahen Organisationen an. Auch staatliche oder EU-Fördermittel werden sehr kritisch geprüft und nur in Betracht gezogen, wenn Konditionen und Einflussmöglichkeiten klar begrenzt sind und mit der Community transparent besprochen werden.",
                "Für Mitbestimmung gilt unabhängig von finanziellen Beiträgen das Prinzip: eine Person, eine Stimme. Geld kauft weder zusätzliche Stimmen noch Sonderrechte bei Abstimmungen.",
              ],
            },
            {
              id: "rhythmus",
              title: "6. Veröffentlichungsrhythmus der Transparenzberichte",
              paragraphs: [
                "Ab 2026 planen wir, mindestens einmal jährlich einen ausführlichen Transparenzbericht zu veröffentlichen, der Einnahmen, Ausgaben, Governance und Wirkung strukturiert darstellt.",
                "Sobald Umfang, Nutzerzahl und Budget wachsen, ist ein halbjährlicher Rhythmus das Ziel. Kurzfristige Finanzupdates – zum Beispiel bei größeren Ausgaben oder unerwarteten Einnahmen – können zusätzlich über die Website oder Newsletter kommuniziert werden.",
                "Die Berichte werden auf der Website frei zugänglich sein und können von Mitgliedern, Medien und interessierten Dritten genutzt und kritisch kommentiert werden.",
              ],
            },
            {
              id: "vorschau-2026",
              title: "7. Vorschau: Wie ein Jahres-Transparenzbericht 2026 aussehen wird",
              paragraphs: [
                "Um bereits heute zu zeigen, wie Transparenz in Zukunft aussehen soll, skizzieren wir die Struktur eines Musterberichts für das Jahr 2026. Die folgenden Punkte enthalten Platzhalter und dienen als Blaupause für kommende Jahre.",
                "Der Transparenzbericht 2026 wird voraussichtlich folgende Elemente enthalten:",
              ],
              bullets: [
                [
                  "Kurzfassung 2026:",
                  "• Einnahmen 2026 gesamt mit Überblick über die wichtigsten Quellen.",
                  "• Ausgaben 2026 gesamt mit Überblick über die wichtigsten Kategorien.",
                  "• Jahresergebnis 2026 (Überschuss oder Fehlbetrag) sowie Mitglieder- und Nutzungszahlen.",
                  "",
                  "Musterstruktur „Einnahmen nach Quellen“:",
                  "• Laufende Mitgliedsbeiträge (monatlich/jährlich).",
                  "• Einmalige Gutschriften und Unterstützungen.",
                  "• eDebatte-Preorders.",
                  "• Sonstige Erlöse, z. B. Events, Formate oder Merch.",
                  "• Darstellung der Summen in einer einfachen Tabelle (Quelle, Betrag, Anteil in %).",
                  "",
                  "Einnahmen-Teil:",
                  "• Aufschlüsselung nach Quelle (Mitgliedsbeiträge, Gutschriften, Preorders, sonstige Einnahmen).",
                  "• Verhältnis von laufenden zu einmaligen Einnahmen und Entwicklung im Jahresverlauf.",
                  "",
                  "Ausgaben-Teil:",
                  "• Aufschlüsselung nach Kategorie (Software-Entwicklung, Infrastruktur, Recht & Steuern, Kommunikation & Community, Verwaltung & Office, Gründerlohn/Team).",
                  "• Erläuterung größerer Einzelposten (z. B. Notar, größere Entwicklungs-Sprints, neue Features).",
                  "",
                  "Community & Nutzung:",
                  "• Anzahl registrierter und aktiver Nutzer:innen.",
                  "• Anzahl durchgeführter Debatten und Abstimmungen.",
                  "• Beispiele für konkrete Wirkung (z. B. lokal oder thematisch sichtbare Ergebnisse).",
                  "",
                   ],
              ],
            },
            {
              id: "ausblick",
              title: "8. Ausblick",
              paragraphs: [
                "Wir starten bewusst mit einem transparent benannten, grob geschätzten Entwicklungs-Minus von rund 150.000 €. Dieses Minus steht nicht für klassische Schulden, sondern für bereits geleistete Arbeit, übernommenes Risiko und vorfinanzierte Infrastruktur in der Aufbauphase.",
                "Die ersten eingehenden Gelder werden konsequent dort eingesetzt, wo sie Stabilität, Rechtssicherheit und Arbeitsfähigkeit am stärksten erhöhen: zuerst Server, Datenbanken und technische Basis-Infrastruktur, danach Lizenzen und Schutzrechte, dann Geschäftsadresse, Notar- und Rechtskosten sowie ein moderater Gründerlohn. Erst wenn diese Grundlagen solide finanziert sind, folgen weiterer Personalaufbau, Community-Betreuung sowie Marketing- und Vertriebsaktivitäten.",
                "Ab 2026 werden wir diese Logik regelmäßig – mindestens jährlich, perspektivisch bei Bedarf auch halbjährlich – mit konkreten Zahlen hinterlegen. Unser Ziel ist eine Infrastruktur, die sich nachhaltig und möglichst breit gestützt aus vielen kleineren Beiträgen finanziert und bei der kein einzelner Akteur dominanten finanziellen oder politischen Einfluss erhält.",
              ],
            },
          ],
        };
    }
  }
  
