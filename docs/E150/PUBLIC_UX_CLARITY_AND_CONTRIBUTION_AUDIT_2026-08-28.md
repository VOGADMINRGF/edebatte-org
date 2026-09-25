# PUBLIC-UX-CLARITY-01 — öffentliche eDebatte-Oberflächen einfach, selbsterklärend und mitmachbar machen

Stand: 2026-08-28

## Ziel

Die öffentliche eDebatte-Journey muss sich wie ein einfaches Produkt anfühlen, nicht wie eine technische Prozess- oder Architekturdemonstration. Komplexität, Review-, Provenienz-, Graph-, Dossier- und KI-Logik bleiben im Hintergrund wirksam; die Oberfläche erklärt nur, was ein Mensch jetzt tun kann und warum das nützlich ist.

Leitregel:

> Sehen → verstehen → direkt handeln.

Kein öffentliches Wording wie `preview-first`, `review-first`, `auditierbar`, `RePro`, `Evidenz-Graph`, `Prozessobjekt`, `Anlassraum / Event`, `Paketstart`, `Level 2/3` oder vergleichbarer interner Produkt-/Architekturjargon, wenn dafür eine einfache Nutzersprache möglich ist.

## Einstieg: zuerst die Absicht des Besuchers erkennen

Der öffentliche Einstieg darf nicht stillschweigend davon ausgehen, dass jeder Besucher eine neue Abstimmung erstellen will. In der Praxis kommt ein großer Teil der Nutzer über einen konkreten Kontext: QR-Code, geteilten Link, Nachricht, Social Post, News, Suchergebnis oder eine konkrete offene Frage.

Darum muss eDebatte beim Einstieg möglichst schnell zwischen zwei Grundabsichten unterscheiden:

1. **Ich will mitmachen** — abstimmen, eine Position wählen, etwas ergänzen, eine Quelle beisteuern, eine Erfahrung teilen, eine offene Frage beantworten oder einen Widerspruch markieren.
2. **Ich will etwas starten** — selbst eine Frage, Abstimmung, Befragung, Recherche oder Ideensammlung eröffnen.

Das ist kein vorgeschalteter Zwangsdialog. Wenn der Kontext bereits klar ist, soll eDebatte direkt in die passende Aufgabe springen:

- QR-/Share-Link zu einer Runde → direkt teilnehmen.
- Link zu einem Claim/Beitrag → direkt lesen und bei Bedarf ergänzen oder widersprechen.
- Link zu News/Thema/Dossier → aktuellen Stand zeigen, dann kontextbezogene Mitmachaktion anbieten.
- Homepage ohne Kontext → klare Wahl zwischen **Mitmachen** und **Etwas starten**; darunter aktuelle/relevante Themen als Einstieg.

Die erste Frage an einen kontextlosen Besucher kann sinngemäß lauten:

> **Was möchtest du tun?**
> **Mitmachen** oder **etwas starten**.

Dabei soll `Mitmachen` nicht auf reines Abstimmen reduziert werden. Es umfasst auch Ergänzen, Quellen einreichen, Erfahrungen teilen, offene Punkte beantworten und Alternativen vorschlagen.

## Kritischer Ist-Befund

### `/ueber-uns`

Die Seite ist aktuell zu institutionell und zu abstrakt. Sie beschreibt VoiceOpenGov, Entscheidungsakten, institutionelles Andocken, Kapitelstrukturen und Veröffentlichungsdokumente stärker als das konkrete Nutzererlebnis von eDebatte. `Paketstart anlegen` ist kein selbsterklärender öffentlicher CTA. Die Seite muss klarer beantworten:

1. Warum gibt es eDebatte?
2. Was kann ich hier konkret tun?
3. Was unterscheidet eDebatte von Umfrage, Forum und Kommentarspalte?
4. Wie kann ich selbst beitragen oder etwas verbessern?

### `/howtoworks/edebatte`

Die aktuelle Darstellung `Check → Dossier → Beteiligung → Status`, `review-first`, `auditierbar` und `RePro-Nutzerreise` ist systemzentriert und zu schematisch. Menschen sollten stattdessen einen einfachen Ablauf verstehen, z. B.:

1. Eine Frage stellen oder an einer bestehenden Frage teilnehmen.
2. Position, Idee, Erfahrung oder Hinweis beitragen.
3. Gründe und Quellen ergänzen, wenn sie helfen.
4. Sehen, was andere denken, was gut belegt und was noch offen ist.
5. Gemeinsam erkennen, was als Nächstes sinnvoll ist.

Die technische Tiefe darf über optionale Vertiefungen erreichbar bleiben, soll aber nicht die primäre Erklärung sein.

### `/runden` und `/runden/new`

Die öffentliche Sprache ist noch nicht konsistent. `Anlassraum`, `Anlass`, `Mitmachraum`, `Beteiligung`, `Befragung` und `Abstimmung` werden nebeneinander verwendet. Für den primären Einstieg brauchen wir wenige klare Nutzerbegriffe. Interne IDs und Datenmodelle bleiben unverändert.

Der Guided Start ist deutlich besser, aber der Abschluss `Vorschau & Teilen` / `Teilnehmeransicht` darf nicht zu einer Produktphilosophie `preview-first` werden. Der Nutzer will eine Frage erstellen, prüfen, speichern und teilen — die Vorschau ist nur eine hilfreiche Ansicht, kein Fachbegriff oder Prozessprinzip.

Der dritte Modus `Offene Beiträge sammeln` bleibt Eigentum von #657 und wird hier nicht dupliziert.

### `/howtoworks/edebatte/dossier`

Die Seite ist deutlich zu fachlich für eine öffentliche Erklärung: `auditierbare Grundlage`, `Evidenz-Graph`, `Versionierung`, `Audit-Trail`, `Level 2/3`, `Provenienz-Nachweise`. Diese Konzepte können als Detail-/Transparenzebene bleiben, aber der Einstieg muss lauten: Was ist hier bekannt? Woher wissen wir das? Was widerspricht dem? Was fehlt noch? Wie kann ich helfen?

## Zentrales Mitmachprinzip

Ein angemeldeter Nutzer soll dort, wo er eine erkennbare Lücke sieht, möglichst direkt handeln können — nicht erst über Navigation oder einen separaten abstrakten Create-Prozess.

Kontextsensitive Aktionen, soweit die bestehende Contribution-/Evidence-/Review-SSOT sie trägt:

- `Etwas ergänzen`
- `Quelle hinzufügen`
- `Eigene Erfahrung beitragen`
- `Fehler oder Widerspruch melden`
- `Offene Frage beantworten`
- `Alternative vorschlagen`

Nicht angemeldete Nutzer dürfen verstehen, dass die Aktion möglich ist; beim Ausführen Login mit Rückkehr an exakt dieselbe Stelle (`next`/returnTo), sofern bestehende Auth-Verträge dies erlauben.

Wichtig: keine parallele Contribution-, Evidence- oder Moderationsarchitektur. Bestehende `/create`-/Contribution-/Evidence-/Review-Pfade wiederverwenden und Kontext (Thema, Runde, Claim, Dossier, offene Frage, Rückkehrziel) mitgeben.

## Surface-Audit vor Abschluss GTM

Mindestens prüfen:

- `/`
- `/start`
- `/runden`
- `/runden/new`
- echte Teilnahme-/Ergebnisansichten der Runden
- `/themen`
- `/create` bzw. öffentliche Beitragswege
- `/ueber-uns`
- `/howtoworks/edebatte`
- relevante Unterseiten unter `/howtoworks/edebatte/*`
- `/faq`
- `/pricing`
- Header/Desktop/Mobile Navigation
- Footer
- Login-Rückkehrpfade von kontextuellen Aktionen

Pro Seite prüfen:

1. Versteht ein Erstbesucher in 5–10 Sekunden, was die Seite ist?
2. Ist die wichtigste Aktion ohne Erklärung erkennbar?
3. Gibt es unnötigen internen Jargon?
4. Sind Begriffe über Seiten hinweg konsistent?
5. Kann ein Nutzer bei einer Lücke direkt beitragen?
6. Bleibt der Kontext beim Login erhalten?
7. Wird nur behauptet, was technisch real verfügbar ist?
8. Funktioniert die Kernaufgabe ohne KI?
9. Ist die KI-Hilfe optional und verständlich erklärt?
10. Mobile, Keyboard, A11y und i18n bleiben intakt.
11. Wird der Nutzer bei einem bereits bekannten Einstiegskontext direkt zur passenden Aufgabe geführt statt erneut durch generische Startseiten zu schicken?

## Produktsprachliche Leitplanken

Bevorzugen:
- Frage
- Abstimmung / Befragung nur passend zum Modus
- Beitrag
- Idee
- Erfahrung
- Quelle
- offener Punkt / offene Frage
- Ergebnis / gemeinsames Bild
- nächster Schritt
- ergänzen / verbessern / mitmachen

Nur in Vertiefung oder intern:
- Anlassraum
- Dossier als Fachname nur dort, wo tatsächlich ein Dossier gezeigt wird; sonst eher `Hintergründe & Quellen`
- Review-first
- Audit / auditierbar
- Provenienz
- Evidenz-Graph
- Prozessobjekt
- RePro
- Level 2/3
- Preview-first

## Definition of Done

- Öffentliche Haupt- und Unterseiten wurden nicht nur technisch, sondern sprachlich und als komplette Nutzerreise geprüft.
- Kontextlose Besucher können sofort zwischen `Mitmachen` und `Etwas starten` unterscheiden.
- Kontextgebundene Besucher (QR, Share-Link, Thema, News, Claim, Dossier) landen direkt bei der passenden Aufgabe und müssen nicht nochmals eine künstliche Einstiegsentscheidung treffen.
- Interner Jargon ist aus der primären Journey entfernt oder in optionale Detail-/Transparenzebenen verschoben.
- Wo ein Nutzer eine Lücke erkennt, gibt es — soweit technisch unterstützt — eine direkte, kontextbezogene Mitmachaktion.
- Login unterbricht diese Aktion nicht dauerhaft, sondern führt nach Anmeldung zurück in den ursprünglichen Kontext.
- Homepage, Über-uns, Wie-funktioniert-es, Runden, Create, Themen, FAQ, Pricing, Header und Footer erzählen dasselbe einfache Produktmodell.
- Bestehende Product-DNA-, Evidence-, Review-, i18n-, Auth- und Privacy-SSOTs werden wiederverwendet.
- Keine neuen öffentlichen Fähigkeiten werden behauptet, bevor sie technisch tragen.
