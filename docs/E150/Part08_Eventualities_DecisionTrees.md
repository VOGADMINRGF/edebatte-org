# E150 Master Spec – Part 8: Eventualities, Entscheidungsbäume & Szenarien

## 1. Zweck dieses Dokuments

Eventualitäten (What-if-Fragen) sind einer der stärksten Bausteine von eDebatte/eDebatte.

Sie ermöglichen Bürger:innen:

- **konkrete Folgen** einer Entscheidung zu verstehen,  
- **Szenarien** zu vergleichen („Was passiert, wenn ich CONTRA stimme?“),  
- **Risiken & Chancen abzuwägen**,  
- **argumentationsfähig** zu werden,  
- **Widersprüche** besser zu erkennen.

Dieses Dokument definiert:

1. das Datenmodell für Eventualitäten & Entschei­dungsbäume,  
2. wie KI & Orchestrator sie erzeugen,  
3. wie UI/UX sie nutzt,  
4. wie sie in Graph & Reports eingebunden sind,  
5. wie Communities & Gemeinden sie weiterverarbeiten.

Eventualitäten sind Grundlage für E200 (Entscheidungsmodelle & Impact-Mapping).

---

## 2. Was sind Eventualitäten?

### 2.1 Definition

> Eine Eventualität ist eine „Was passiert wenn…“-Aussage, die von einem Statement ausgeht und eine alternative Realität beschreibt.

Beispiele:

- „Was passiert, wenn wir dem Vorschlag NICHT zustimmen?“  
- „Welche Folgen hätte eine stärkere Regulierung?“  
- „Welche Risiken entstehen, wenn wir weitermachen wie bisher?“  
- „Was passiert, wenn wir Option A vor Option B wählen?“

### 2.2 Ziele

Eventualitäten dienen dazu:

- einen **vollständigen Blick** auf ein Statement zu ermöglichen,
- **blinde Flecken** aufzudecken,
- **Vorteile/Nachteile** sichtbar zu machen,
- **Konflikte greifbarer** zu machen,
- Debatten zu **strukturieren statt zu polarisieren**.

---

## 3. Datenmodell (Eventuality Tree)

Codex MUSS folgendes Typenmodell einführen:

### 3.1 EventualityNode

```ts
type EventualityNode = {
  id: string;
  statementId: string;
  label: string;          // Kurzbeschreibung z.B. "Wenn wir X NICHT tun"
  narrative: string;      // Ausformuliert
  likelihood?: number;    // optional (0–1), NICHT KI-generiert, nur Admin
  impact?: number;        // optional (0–1), später für E200/E500
  consequences: Consequence[];
  responsibilities: Responsibility[];
  children: EventualityNode[];
};
3.2 DecisionTree
ts
Code kopieren
type DecisionTree = {
  rootStatementId: string;
  options: {
    pro: EventualityNode;
    neutral?: EventualityNode;
    contra: EventualityNode;
  };
  createdAt: string;
  updatedAt?: string;
};
3.3 Consequence & Responsibility (aus Part06)
Wird direkt eingebettet – kein eigenes Modell hier nötig.

4. Wie entstehen Eventualitäten?
4.1 Quellen
Eventualitäten können entstehen durch:

KI-Orchestrator (partielle, strukturierte What-if-Narratives)

User-Beiträge (ein Nutzer schreibt eine mögliche Auswirkung)

Community-Fragen („Was passiert, wenn…?“)

Redaktionelle Korrekturen

Offizielle Angaben (z.B. Regierung, Kommune)

4.2 Reihenfolge der Priorität
Damit kein Chaos entsteht:

Offizielle Quellen (Behörden, Verwaltungen)

Redaktion/Kontrollgremium

Community-Validierung

KI generierte Basis — nur als Startpunkt, nie als Wahrheit

Codex MUSS dieses Prinzip in Score/Weighting berücksichtigen.

5. KI-Orchestrator: Was wird von Codex erwartet?
Der Orchestrator (siehe Part05) muss folgende Eventualitäts-Outputs erzeugen:

Pro-Szenario
Was passiert, wenn wir diesem Statement aktiv zustimmen?

Contra-Szenario
Was passiert, wenn wir ablehnen?

Neutral-Szenario
Was passiert, wenn wir nichts tun oder alles lassen wie es ist?

Konsequenzen für Regionen (optional)
Betroffenheit: Kommune, Land, Bund, EU, global.

Konflikt-Eventualitäten
Wenn ein Statement mehrere widersprüchliche Unterfolgen erzeugt.

Format der KI-Rohantwort
ts
Code kopieren
type OrchestratorEventualityOutput = {
  pro: { narrative: string; consequences: Consequence[]; responsibilities: Responsibility[]; };
  neutral: { narrative: string; consequences: Consequence[]; responsibilities: Responsibility[]; };
  contra: { narrative: string; consequences: Consequence[]; responsibilities: Responsibility[]; };
};
Codex soll dies streng validieren und in EventualityNode-Strukturen gießen.

6. Wie fließen Eventualitäten ins UI?
6.1 /statement/new (Light Mode)
Beim einfachen Statement:

User sieht 3 Buttons: Pro, Neutral, Contra.

Nach Auswahl:

Eventualitäten für diese Option werden angezeigt.

User kann eigene Eventualitäten ergänzen.

User kann die Eventualitäten der Community liken/flaggen.

Eventualitäten fließen als Rohdaten in den Graph.

6.2 /contributions/new (Deep Mode)
Bei längeren Texten:

Alle drei Szenarien sichtbar:

Pro

Neutral

Contra

Nutzer kann Szenarien vergleichen („Szenario-Vergleich“).

Communities können Szenarien punktuell verfeinern.

Redaktion kann Knoten setzen: „Hier fehlt noch ein Aspekt“.

6.3 Szenario-Vergleich (Matrix UI)
Matrix ähnlich wie:

Pfad	Folgen kurz	Verantwortung	Risiko	Chancen
Pro	...	...	...	...
Neutral	...	...	...	...
Contra	...	...	...	...

Codex MUSS das Grundlayout implementieren.

7. Integration in den Graph (Part07)
Jede Eventualität wird:

als Node eingefügt (type: "consequence" oder "eventuality"),

verbunden mit:

causes (Statement → Eventualität)

responsibility_of (Akteur)

child_of (für Untereventualitäten)

contradicts (wenn mehrere Szenarien sich widersprechen)

Dieses Mapping übernimmt Codex automatisch beim Speichern.

8. Workflow mit Gemeinden / Unternehmen
8.1 Gemeinden (B2G)
Eventualitäten sind Pflichtbestandteil der 5–8 Themen pro Quartal.

Lokale Behörden können:

Szenarien korrigieren,

Risiken markieren,

Verantwortlichkeiten anpassen,

in Reports einfließen lassen.

8.2 Unternehmen (B2B)
Hilft bei internen Mitarbeiterumfragen.

Entscheidungsvorlagen (z.B. „Homeoffice-Regelung – Pro/Contra/Neutral“).

Automatische Entscheidungsbäume im PDF-Report.

9. Qualitätskriterien (E150.8.x)
E150.8.1 – Keine Angst-/Schocknarrative
Neutral, faktenorientiert, keine Dramatisierungen.

E150.8.2 – Keine Vorhersagen (keine „KI-Prognosen“)
Es werden Szenarien beschrieben, keine Wahrscheinlichkeiten.

E150.8.3 – Konsistenz
Pro/Neutral/Contra müssen sich logisch unterscheiden.

E150.8.4 – Keine politischen Empfehlungen
Nur Strukturen, keine Bewertungen.

E150.8.5 – Mehrsprachigkeit
Szenarien automatisch übersetzen, aber Originaltext behalten.

10. Admin-Funktionen
/admin/eventualities
Codex soll folgende Funktionen anlegen:

Liste aller Eventualitäten pro Statement

Konfliktfinder („Pro und Contra identisch → Fehler“)

Szenario-Editor

Merge-Funktion („zwei ähnliche Szenarien“)

Button: „in Report übernehmen“

Button: „in Stream Card verwandeln“ (für Live-Debatten)

11. Konsum durch Reports & Streams
11.1 Reports
Jeder Report enthält:

Pro/Contra/Neutral-Szenario je Top-Statement

Regionale Unterschiede

Risiken/Chancen

Verantwortlichkeiten

Offene Fragen

Widersprüche & Knoten

11.2 Streams
Streamer bekommen:

4–8 Szenarien als Karten

Kontexte:

„Diese Folge betrifft deine Region“

Community kann live neue Eventualitäten vorschlagen

12. Codex-Anweisungen (kompakt)
Codex MUSS:

EventualityNode & DecisionTree Typen implementieren.

KI-Orchestrator um Eventualitäts-Ausgabe erweitern.

UI-Komponenten:

EventualityCard

ScenarioMatrix

DecisionTreeVisualizer

Backend-Routen:

/api/eventualities/create

/api/eventualities/update

/api/eventualities/by-statement/:id

/api/decisiontree/:statementId

Admin-Panel:

Editor

Konsistenzprüfung

Merge Tool

Graph-Mapping

Kanten erzeugen nach Part07

Reports & Streams anbinden

Export-Funktionen

Stream Cards generieren

PII-Redaktion streng einhalten

Multilingualität vorbereiten (E300)

13. Summary
Eventualitäten verwandeln eDebatte in:

ein seriöses Analysewerkzeug,

ein Bildungsmittel,

ein Moderations-Tool,

ein Entscheidungshelfer,

ein Instrument für öffentliche Konsensbildung

und Grundlage für E200/E500 Modelle.

Part08 schafft die Struktur,
mit Part09 (Knowledge Graph & Streams) wird alles dynamisch verknüpft.