# E150 Master Spec – Part 1: Systemvision, Mission & Governance

## 1. Zweck dieses Parts

Part 01 beschreibt die **Systemvision**, die **Mission** und die **Governance-Prinzipien** von eDebatte / eDebatte.

Alles, was in späteren Parts (Orchestrator, Graph, Pricing, Streams, Admin etc.) steht, muss mit diesen Grundentscheidungen kompatibel sein:

- Was will die Plattform gesellschaftlich leisten?
- Wie wird mit Mehrheiten & Minderheiten umgegangen?
- Welche Rolle spielt KI – und welche explizit **nicht**?
- Wie bleiben wir unabhängig von Lobby, Parteien & Einzelinteressen?
- Welche Governance-Strukturen sind im Produkt technisch zu unterstützen?

Codex soll diese Prinzipien in Kommentaren, Modellen und Admin-Features widerspiegeln, aber **keinen eigenen politischen Kurs** implementieren.

---

## 2. Systemvision

### 2.1 Langfristige Zielbilder

eDebatte / eDebatte soll eine **dauerhafte, internationale Demokratie-Infrastruktur** werden, die:

- Bürger:innen befähigt, komplexe Themen zu verstehen,
- Mehrheiten und Minderheiten fair sichtbar macht,
- Verantwortlichkeiten und Folgen transparent macht,
- lokale, nationale, europäische und globale Ebenen verbindet,
- Vertrauen in demokratische Prozesse erhöht,
- populistische Vereinfachungen durch Struktur und Kontext entschärft.

Die Plattform versteht sich als:

- **„Instrument“** zur Strukturierung von Meinungen, Fakten & Optionen,
- **kein soziales Netzwerk** im klassischen Sinne (keine Rage-Belohnung),
- **kein Abstimmungstool, das Parlamente ersetzt**, sondern ein Ergänzungs- und Feedbackkanal.

### 2.2 Gesellschaftlicher Fokus („Society first“)

Über alle Features hinweg gilt:

- **Gesamtgesellschaftlicher Mehrwert** ist wichtiger als kurzfristige Klicks.
- Plattform-Logiken (Algorithmik, Sortierung, UI-Highlights) sollen:
  - konstruktiven Diskurs stärken,
  - Extrem-Polarisierung dämpfen,
  - Brücken schlagen, statt Lager zu verhärten.

Codex:

- darf keine Mechanismen einbauen, die gezielt Empörung/Polarisierung verstärken (z.B. algorithmische Bevorzugung extremer Aussagen),
- soll Funktionen bevorzugen, die Verständigung, Kompromisssuche und Transparenz fördern.

---

## 3. Mission im Detail

### 3.1 Kernaufgaben

1. **Strukturieren statt polarisieren**  
   - komplexe Themen in klare Statements/Optionen zerlegen,
   - Eventualitäten sichtbar machen („Ich wäre dafür, wenn …“),
   - Konflikte (Knots) benennen statt verstecken.

2. **Kontext & Zuständigkeit erklären**
   - wer ist wofür zuständig (EU/Bund/Land/Kreis/Gemeinde),
   - welche Rechtslage und Rahmenbedingungen gibt es,
   - welche Folgen hätten verschiedene Optionen.

3. **Beteiligung niederschwellig ermöglichen**
   - einfache Swipes statt komplizierter Umfragen,
   - barrierearme Sprache & UI,
   - klare Feedback-Schleifen („Dein Beitrag floss hier ein …“).

4. **Vertrauen & Nachvollziehbarkeit stärken**
   - offene Darstellung von Mehrheiten/Minderheiten,
   - nachvollziehbare Orchestrator-Logik (E150),
   - Audit-Trails für wichtige Eingriffe (Moderation, Admin-Entscheidungen).

### 3.2 Was die Plattform explizit nicht ist

- keine Partei, kein Verein, keine Stiftung, keine Lobbyorganisation,
- kein Werkzeug zur geheimen Kampagnensteuerung,
- keine Maschine für „Abstimmungsempfehlungen“ im Sinne von: „Du solltest X wählen“.

**Verpflichtung:**  
Beiträge, Reports, Streams dürfen **nie** als „offizielle Wahlempfehlung“ des Systems auftreten.  
Sie sind strukturierte Spiegel der Beteiligung, keine Empfehlung.

---

## 4. Mehrheitsprinzip & Minderheitenschutz

### 4.1 Mehrheiten „finden Recht“ – aber nicht „haben Recht“

Grundprinzip:

- **Mehrheiten** sollen klar sichtbar sein (Anteil Pro/Neutral/Contra etc.),
- **Minderheiten** sollen ebenso klar sichtbar und respektiert werden,
- die Plattform behauptet **nicht**, dass die Mehrheit inhaltlich recht hat, sondern dass sie aktuell die **Mehrheitsposition** ist.

UI/Reporting:

- Mehrheiten werden als Balken, Zahlen, Heatmaps etc. gezeigt,
- Minderheiten bekommen eigene Sichtbarkeit (z.B. „gut begründete Gegenposition“),
- Diskrepanz zwischen knapper Mehrheitslage und starken Eventualitäten wird hervorgehoben („Mehrheit, aber nur unter Bedingungen …“).

Codex:

- darf keine Formulierungen wie „richtige Antwort“, „korrekte Position“ generieren,
- soll Datenmodelle & Reports so anlegen, dass **Mehrheitsverhältnisse + Minderheitsargumente gleichwertig abgebildet werden können**.

### 4.2 Umgang mit kontroversen Themen

- Bei stark polarisierten Themen sind:
  - Eventualitäten besonders wichtig (welche Bedingungen könnten Konsens bringen?),
  - Consequences & Fairness-Analysen besonders hervorzuheben.
- Moderations- & Safety-Regeln (Hass, Rassismus etc.) werden strikt umgesetzt:
  - solche Inhalte werden gefiltert / markiert / entfernt,
  - Kritik an Institutionen/Politik ist erlaubt, solange sie nicht in Hetze kippt.

---

## 5. Rolle der KI

### 5.1 KI als Werkzeug, nicht als Entscheider

Leitgedanke:

> „Möge KI noch so umstritten sein – im Kern ist sie hier ein Instrument,  
> um Texte schnell und fachlich korrekt einzuordnen und zu analysieren.“

Konkrete Grenzen:

- KI **strukturiert**, **fasst zusammen**, **stellt Fragen**, **benennt Konflikte**,
- KI **entscheidet nicht**,
- KI **gibt keine Wahlempfehlungen**,
- KI **darf keine persönlichen Profile** („User X ist eher links/rechts“) bauen.

### 5.2 Zusammenspiel mit menschlicher Redaktion

- Redakteur:innen / Moderation prüfen:
  - Qualität von KI-Ergebnissen,
  - problematische Formulierungen,
  - heikle Themen.
- KI-Vorschläge können:
  - akzeptiert, modifiziert oder verworfen werden,
  - durch Community-Research (Part 10) vertieft werden.

Codex:

- soll E150-Orchestrator & Analyze-Pipeline so gestalten,  
  dass immer **Platz für menschliche Prüfschritte** bleibt (z.B. Statusfelder, Review-Flags),
- muss sicherstellen, dass KI-Ausgaben immer als solche erkennbar bleiben (z.B. Metadaten).

---

## 6. Unabhängigkeit & Finanzierung

### 6.1 Keine versteckte Lobby, keine „gekaufte Redaktion“

Finanzierungsprinzipien:

- Einnahmen primär durch:
  - Mitgliedschaften / Tiers,
  - Kampagnen / B2G- & B2B-Modelle,
  - Schenkungen, freiwillige Mitarbeit, kleine Zuwendungen.
- **Keine Abhängigkeit** von:
  - großen Einzelspendern oder Lobbygruppen,  
  - Parteien, Ministerien, Unternehmen mit direktem Interessen-Konflikt.

Es ist bewusst **nicht** vorgesehen:

- als klassischer Verein mit Spendenquittungen,  
- als gGmbH mit Rücksubventionierung des Staates über Steuernachlässe.

Die Idee dahinter:  
Geldflüsse sollen **überschaubar und transparent** sein – „aus der Gesellschaft für die Gesellschaft“.

### 6.2 Transparenzanforderungen im Produkt

Codex soll Strukturen vorsehen für:

- **Transparenzseiten**:
  - Einnahmequellen nach Kategorien (Mitgliedschaften, B2G, B2B, Merch …),
  - keine personenbezogenen Daten, nur aggregiert.
- **Konflikt-of-Interest-Hinweise**:
  - z.B. Markierung, wenn eine Organisation sowohl Kunde als auch häufiges Thema ist.

---

## 7. Governance-Struktur (Rollen & Gremien)

### 7.1 Interne Governance-Rollen

Nicht zwingend alle von Anfang an, aber als Zielbild:

- **Platform Owner**  
  - verantwortet Betrieb & strategische Ausrichtung,
  - legt Grundprinzipien fest (diese Doku).

- **Editorial Council (Redaktionsrat)**  
  - entscheidet über Leitlinien z.B. zu Themenpriorisierung, Formaten, Moderation,
  - hat Vetorecht bei großen inhaltlichen Änderungen.

- **Community Council**  
  - repräsentative Gruppe engagierter Nutzer:innen („Brennend“/„Leuchtend“),
  - Feedback zu Features, Kampagnen, Umgang mit Community-Themen.

- **Scientific Advisory Board**  
  - Expert:innen für Demokratie, Ethik, Data Science,
  - Feedback zu Orchestrator-Logik, Bias-Fragen, Auswertung.

- **Ombudsperson**  
  - Anlaufstelle bei Konflikten (Moderation, Sperrungen, Transparenzfragen).

Codex:

- muss nicht alle Gremien technisch „umsetzen“,  
- sollte aber Roles & Permissions so modellieren, dass diese Struktur ENTSTEHEN kann (z.B. eigene Role-Flags für Council-Mitglieder, Ombudsperson).

### 7.2 Produktseitige Governance-Funktionen

- Audit-Logs für:
  - Moderationsentscheidungen,
  - manuelle Eingriffe in Daten (z.B. Korrektur eines Reports),
  - Rollenänderungen (z.B. Staff-Zugänge).
- Übersichtliche Admin-Panels:
  - wer hat welche Rolle,
  - welche Gremien sind wie besetzt,
  - welche Eskalationen laufen.

---

## 8. Prinzipien für Admin-Eingriffe

### 8.1 „Kein heimliches Schieben“

- Ergebnisse dürfen nicht ohne Spur „zurechtgebogen“ werden.
- Wenn z.B. ein Statement gelöscht oder zusammengeführt wird:
  - muss es einen verlinkten Audit-Eintrag geben,
  - idealerweise mit Begründung (z.B. Doppelung, Hate Speech, Fake).

### 8.2 Technische Anforderungen

Codex soll:

- Modelle für Audit-Einträge vorsehen,
- UI-Komponenten für Admins so bauen, dass:
  - immer ein Grund angegeben werden muss,
  - Zeitstempel & verantwortliche Person mitgespeichert werden.

---

## 9. Internationale Ausrichtung & Fairness

### 9.1 Mehrsprachigkeit

- Plattform soll von Anfang an **mehrsprachig** gedacht sein (siehe Part 13),
- Systemvision & Governance gelten in allen Sprachen identisch,
- lokale Besonderheiten (z.B. andere Institutionen) werden auf Ebene der Responsibility-Modelle abgebildet, **nicht** durch andere Grundwerte.

### 9.2 Fairness gegenüber Regionen & Gruppen

- keine Benachteiligung kleiner Regionen,
- auch Themen mit wenig Reichweite können Relevanz haben (z.B. Minderheitenschutz),
- Orchestrator & Reports sollen nicht nur „laute Mehrheiten“ abbilden, sondern auch strukturierte Minderheitsargumente.

---

## 10. Anforderungen an Codex (Part 1)

Zusammenfassend soll Codex bei allen zukünftigen Aufgaben:

1. **Systemvision respektieren**  
   - keine Features bauen, die explizit gegen die Mission arbeiten (z.B. Empörungs-Booster).

2. **Mehrheitsprinzip + Minderheitenschutz abbilden**  
   - Datenmodelle so entwerfen, dass Mehrheits- UND Minderheitspositionen sichtbar bleiben.

3. **KI als Werkzeug halten**  
   - KI-Module immer als Assistenz, nie als Entscheidungsinstanz implementieren.

4. **Unabhängigkeit & Transparenz unterstützen**  
   - Strukturen für transparente Einnahmen/Pläne,  
   - Audit-Logs für kritische Admin-Aktionen,  
   - keine versteckten „Manipulationsknöpfe“.

5. **Governance-Rollen vorbereiten**  
   - Rollen/Permissions so modellieren, dass Platform Owner, Editorial Council, Community Council & Ombudsperson technisch möglich sind.

Part 01 ist damit der **wertemäßige Rahmen**.
Part 02 ff. konkretisieren, wie diese Werte in Rollen, XP-System, Pricing, Orchestrator, Graph, Streams und Admin-Oberflächen umgesetzt werden.

## 11. Themenkatalog & Zuständigkeiten (15 Hauptkategorien)

Alle Anliegen, Beiträge und Profil-Themen werden in **15 Hauptkategorien** eingeordnet, die sich an realen Zuständigkeiten orientieren (Ministerien, Parlamente, Kommunen, EU). Der vollständige Themenkatalog ist in `docs/E150/Part06_Themenkatalog_und_Zustaendigkeiten.md` beschrieben.

Ziele:

- Bürger:innen verstehen besser, **wer** für welches Thema zuständig ist.
- Wir können Anliegen entlang der realen Entscheidungswege auffächern.
- Profil-Themen spiegeln nicht nur „Interessen“, sondern auch das Verständnis von Verantwortung.

Die 15 Kategorien (Arbeitstitel, Feintuning später):

1. Demokratie & Wahlen
2. Haushalt & Finanzen
3. Arbeit & Wirtschaft
4. Soziales & Familie
5. Bildung & Forschung
6. Gesundheit & Pflege
7. Klima & Umwelt
8. Energie & Infrastruktur
9. Mobilität & Stadtentwicklung
10. Inneres & Sicherheit
11. Justiz & Recht
12. Migration & Integration
13. Digitalisierung & Medien
14. Europa & Außenpolitik
15. Kommunales & Lebensumfeld (Rathaus, Stadt, Kreis)

Vorgabe:

- `TOPIC_CHOICES` in Code und Profil-Funktionen müssen sich **immer** aus diesen 15 Kategorien ableiten.
- Zusätzliche Tags/Unterthemen sind erlaubt, hängen aber immer an einer der 15 Hauptkategorien.

### Aktueller B2C-Stand (eDebatte + eDebatte)

- B2C-Tiers der App: **eDebatte Basis (0 €), Erweitert, Premium** – Preise und Labels liegen zentral in `apps/web/src/config/pricing.ts`.
- Mitgliedschaft: eDebatte mit empfohlenen 5,63 € p. P. pro Monat. 24 Monate Mindestlaufzeit, wenn das eDebatte-Dankeschön genutzt werden soll.
- Goodie: Bis zu 25 % Nachlass auf eDebatte-Abos in den ersten 6 Monaten, nur bei monatlicher Zahlung, Mindestbeitrag 5,63 € und 24 Monaten Commitment; einmalig pro Mitgliedschaft.
