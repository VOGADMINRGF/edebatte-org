# E150 Master Spec – Part 10: Responsibility Navigator

## 1. Zweck dieses Dokuments

Part10 definiert den **Responsibility Navigator** – also alles, was dazu gehört:

- Bürger:innen können zu jedem Statement sehen:
  - **welche Ebene zuständig ist** (Gemeinde, Land, Bund, EU, …),
  - **welche Institutionen** konkret betroffen sind,
  - **welche Prozesspfade** existieren (z.B. Ausschuss → Rat → Verwaltung).
- Gemeinden & Organisationen können ihre Zuständigkeiten pflegen.
- Der Graph (Part07) und Consequences/Responsibility (Part06) werden sichtbar gemacht.
- B2C-/B2G-/B2B-Flows greifen auf dieselbe Logik zu.

Ziel:  
„Wer ist für dieses Thema zuständig?“ ist immer **maximal transparent, selbsterklärend und barrierearm**.

---

## 2. Ausgangspunkt: Responsibility aus Part06

Part06 hat das Datenmodell für Responsibility eingeführt:

```ts
type Responsibility = {
  id: string;
  level: "municipality" | "district" | "state" | "federal" | "eu" | "ngo" | "private" | "unknown";
  actor?: string;      // z.B. "Stadtrat Köln", "Bundestag"
  text: string;        // Kurzbeschreibung der Verantwortung
  relevance: number;   // 0–1, wie wichtig in diesem Kontext
};
Part10 baut hierauf auf und ergänzt:

Navigationslogik (Pfad von lokal → global),

UI-Komponenten,

Admin-Config & Datenquellen,

Integration mit Graph & Reports.

3. Responsibility Navigator – Kernidee
Für jedes Statement (und ggf. Eventualität/Consequence) soll es eine Ansicht geben:

„Wer ist dafür zuständig, was kann diese Ebene tun und wie hängt das mit anderen Ebenen zusammen?“

Der Navigator besteht aus drei Ebenen:

Level-Ansicht (Kacheln/Balken: Gemeinde, Land, Bund, EU, …)

Institutions-Ansicht (z.B. Stadtrat, Ministerium, Ausschuss)

Kontakt-/Prozess-Ansicht (z.B. Petitionswege, Sprechstunden, Ausschusstermine – soweit öffentlich verfügbar)

4. Datenmodell-Erweiterungen
4.1 ResponsibilityPath
ts
Code kopieren
type ResponsibilityPath = {
  id: string;
  statementId: string;
  locale: string;
  nodes: ResponsibilityPathNode[];
  createdAt: string;
  updatedAt?: string;
};
4.2 ResponsibilityPathNode
ts
Code kopieren
type ResponsibilityPathNode = {
  level: Responsibility["level"]; // municipality, state, federal, eu, ...
  actorKey: string;               // z.B. "stadt_koeln_rat", "bundestag", "eu_parliament"
  displayName: string;            // Anzeigename
  description?: string;           // Text: "Beschließt Satzungen zum Thema X"
  contactUrl?: string;            // Rathausseite, Petitionsportal, etc.
  processHint?: string;           // "Erster Ansprechpartner", "Letzte Instanz", ...
  relevance: number;              // 0–1 – Wichtigkeit im aktuellen Kontext
};
4.3 ResponsibilityDirectory (globale Konfiguration)
ts
Code kopieren
type ResponsibilityDirectoryEntry = {
  actorKey: string;
  level: Responsibility["level"];
  locale: string;
  regionCode?: string;       // z.B. AGS/NUTS-Code
  displayName: string;
  description?: string;
  contactUrl?: string;
  meta?: Record<string, any>;
};
Diese Directory-Einträge können aus:

öffentlichen Listen (z.B. Kommunalverzeichnis),

manueller Pflege,

später EU-/Bundes-APIs

gefüllt werden.
Codex soll nur Schnittstellen & Models vorbereiten, keine Datenquellen erzwingen.

5. Quellen für Zuständigkeiten
5.1 Offizielle Daten
Kommunalverzeichnisse,

Ministerienlisten,

EU-Institutionen.

Diese werden nicht von KI erfunden, sondern z.B. via Cronjobs / Imports gepflegt.

5.2 Heuristische KI-Unterstützung
KI darf nur:

aus dem Statement ableiten, ob eher:

Kommune,

Land,

Bund,

EU,

private Akteure,

NGOs

betroffen sind, und das als Vorschlag markieren.

Finale Verantwortungspfad-Einträge müssen von:

Redaktion,

Gemeinde-Admins,

Staff

bestätigt oder korrigiert werden.

6. UI/UX – Bürger:innen-Perspektive
6.1 Einstiegspunkt
in /statement/* und /contributions/* gibt es einen Button:

„Wer ist zuständig?“

Klick öffnet den Responsibility Navigator.

6.2 Level-Übersicht
UI-Element (mobile-first):

horizontale oder vertikale Reihe von Kacheln:

„Vor Ort (Gemeinde)“

„Land / Bundesland“

„Bund“

„EU/International“

„Private / NGOs“

Jede Kachel zeigt:

eine Kurzbeschreibung („beschließt lokale Satzungen“),

den Relevanz-Indikator (z.B. Balken oder Prozent).

6.3 Detail-Ansicht pro Ebene
Beim Klick auf eine Kachel:

Liste der zuständigen Institutionen:

z.B. „Stadtrat Köln“, „Verkehrsausschuss“, „EU-Parlament“.

pro Institution:

Kurzbeschreibung (1–3 Sätze),

Link zu offiziellen Seiten,

ggf. Hinweise:

„Hier kannst du eine Petition einreichen.“

„Hier finden regelmäßige Bürgersprechstunden statt.“

6.4 Flow-Visualisierung
Optional (E200):

kleiner Flowchart:

„Bürgerinitiative → Ausschuss → Ratsbeschluss → Verwaltung → Umsetzung“

Speziell für B2G-Tarife konfigurierbar.

7. Integration in Graph & Reports
7.1 Graph
ResponsibilityPathNodes werden als Graph-Nodes und Edges abgebildet:

Node: actor (type: "responsibility")

Edge: responsibility_of (Statement → Actor)

Edge: part_of oder child_of (Actor → übergeordnete Ebene)

7.2 Reports
Region- und Themen-Reports (Part07) enthalten:

Sektion „Zuständigkeiten & Prozesse“:

Liste der Ebenen,

wichtigste Institutionen,

wie der politische Weg typischerweise verläuft.

Das hilft:

Gemeinden bei Bürgerkommunikation,

Bürger:innen beim Verständnis „wo das Thema eigentlich landet“.

8. Admin-Perspektive
8.1 Responsibility-Verwaltung
Route: /admin/responsibility (oder ähnlich)

Funktionen:

Tabellenansicht aller ResponsibilityDirectory-Einträge:

Filter: Region, Level, Locale.

Bearbeitungsformular:

Name,

Beschreibung,

URL,

Level,

RegionCode.

Import-Tool:

CSV/JSON-Import für z.B. Kommunenlisten.

8.2 Responsibility Paths pro Statement
Route: /admin/statement/:id/responsibility

Anzeige der automatisch vorgeschlagenen Pfade (auf Basis Part06 + KI).

Möglichkeit:

Actor-Kacheln hinzufügen/entfernen,

Relevanz justieren,

Texte anpassen,

Pfad veröffentlichen.

8.3 B2G-Spezialfälle
Gemeinden/Landkreise mit B2G-Plan (Part04) können:

eigene Strukturen pflegen:

zusätzliche Gremien (z.B. Beiräte),

Bezirksvertretungen,

lokale Beteiligungsformate.

definieren:

welche Stellen im Navigator „prominent“ sein sollen.

9. Fairness, Neutralität & Sicherheit
9.1 Neutralität
Responsibility Navigator beschreibt nur Zuständigkeit, nicht Kompetenz oder Qualität.

keine Wertung à la „ineffizient“, „korrupt“, etc.

Formulierungen bleiben sachlich.

9.2 Keine Doxxing-Risiken
keine personenbezogenen Daten von Amtsträger:innen,

nur Institutionen/Ämter, keine Privatadressen.

Links stets auf offizielle Kanäle (z.B. rathausXY.de, bundestag.de).

9.3 Transparenz-Hinweise
UI sollte klar machen:

„Diese Informationen ersetzen keine Rechtsberatung.“

„Zuständigkeiten können sich ändern; Angaben ohne Gewähr.“

„Für verbindliche Auskünfte wende dich bitte direkt an die Institution.“

10. Verbindung zu XP/Levels (Part02)
Der Navigator kann XP-Prozesse triggern:

Nutzer:innen können z.B. markieren:

„Ich habe mich an Institution X gewendet.“

optional:

kurze Rückmeldung („Antwort erhalten?“, „Hilfreich?“).

Dies kann:

XP bringen,

qualitative Hinweise liefern,

aber darf nicht zum „Gamification-Spam“ führen (Limits, Cooldowns).

11. API & technische Anforderungen
Codex MUSS folgende technische Schnittstellen vorbereiten:

11.1 Models / Schemas
ResponsibilityDirectory

ResponsibilityPath

ResponsibilityPathNode

11.2 API-Routen
GET /api/responsibility/directory
– Filterbar nach Level, Region, Locale.

POST /api/responsibility/directory
– Nur Admin/B2G-Berechtigte.

GET /api/responsibility/path/:statementId
– Liefert Pfad für ein Statement.

POST /api/responsibility/path/:statementId
– Speichern/Aktualisieren durch Admin/Staff.

11.3 Frontend-Komponenten
ResponsibilityNavigator (Kernkomponente)

ResponsibilityLevelStrip (Level-Kacheln)

ResponsibilityActorList (Institutionen je Level)

ResponsibilityFlowHint (Prozessvisualisierung, später)

12. Codex-Anweisungen (kompakt)
Codex SOLL:

Responsibility Navigator als eigenständiges Modul umsetzen, aber eng an Part06/Part07 anbinden.

die Directory-Modelle als zentrale Quellen verwenden (kein Hardcoding).

bei fehlenden Daten:

„unbekannt“ anzeigen,

keine KI-Halluzination in UI übernehmen.

in /statement- und /contributions-Flows den „Wer ist zuständig?“-Button integrieren.

in Reports & Admin-Ansichten Responsibility-Blöcke anzeigen.

B2G/B2B-spezifische Anpassungen (Part04) respektieren.

PII-Schutz & Fairness aus Part00/Part06 strikt anwenden.

alle Texte und Labels mehrsprachig vorbereiten (Part13 I18N).

13. Summary
Der Responsibility Navigator schließt eine zentrale Lücke:

Bürger:innen erfahren nicht nur, was ein Statement bedeutet (Part05–08),

sondern auch wer konkret zuständig ist, wo man ansetzen kann und wie der Weg aussieht.

Damit wird eDebatte/eDebatte von einer „reinen Debattier-Plattform“
zur echten Navigationshilfe durch die Demokratie-Infrastruktur.

Part11 (Streams & Brennende Bürger) kann nun auf:

Statements,

Eventualitäten,

Research,

Responsibility Paths

zurückgreifen und so hochqualitative, strukturierte Streams ermöglichen.