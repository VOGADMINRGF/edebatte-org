# E150 Master Spec – Part 7: Graph, Reports & Structured Knowledge

## 1. Zweck dieses Dokuments

Part 07 definiert die **Wissensstruktur**, die eDebatte/eDebatte langfristig ermöglicht:

1. **Graph-Modell** für Claims, Knoten, Fragen, Folgen, Verantwortlichkeiten.
2. **Report-System** (lokale Themen, nationale Themen, Streams, Snapshots).
3. **Wissensakkumulation** durch Beiträge, Feeds & Community-Interaktion.
4. **Konflikt- und Konsens-Erkennung** (E200+).
5. **Integration in Admin-Panel, Dashboards und die B2G/B2B-Welt**.

Part 07 verbindet somit:

- die atomaren Daten aus Part05 (Orchestrator),
- die Folgen-Logik aus Part06 (Consequences/Fairness),
- mit der globalen Wissensdatenbank der Plattform.

Ziel:  
**Aus Millionen Beiträgen und News entsteht ein lebender Wissensgraph, der jede politische Aussage strukturiert auffindbar macht.**

---

## 2. Warum ein Graph?

Ein echtes Demokratie-Tool braucht:

- Bezüge zwischen Aussagen,
- logische Zusammenhänge,
- Mehrheiten/Minderheiten pro Thema,
- Konflikte vs. Konsens sichtbar,
- regionale Unterschiede nachvollziehbar,
- Rückfragen & Unterfragen strukturiert.

Das geht nicht mit SQL-Tabellen allein.  
Deshalb:

> Der E150-Wissensgraph ist die übergeordnete, formale Strukturierung aller Statements, Fragen, Knoten, Konsequenzen und Verantwortlichkeiten.

---

## 3. Graph-Datenmodell (Zielbild)

Der Graph wird **nicht** sofort vollständig implementiert,  
aber Codex soll bereits **kompatible Schnittstellen und Typen** anlegen.

### 3.1 Knoten (Nodes)

```ts
type GraphNode = {
  id: string;
  type: "statement" | "question" | "knot" | "consequence" | "responsibility" | "topic";
  locale: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
};
3.2 Kanten (Edges)
ts
Code kopieren
type GraphEdge = {
  id: string;
  from: string; // node-id
  to: string;   // node-id
  relation: 
    | "supports" 
    | "contradicts"
    | "refines"
    | "causes"
    | "relates_to"
    | "responsibility_of"
    | "child_of"
    | "part_of"
    | "depends_on"
    | "follows_from"
    | "question_of"
    | "knot_of";
  metadata?: Record<string, any>;
};
3.3 Top-Level Graph Container
ts
Code kopieren
type GraphSnapshot = {
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
};
4. Welche Elemente aus E150 wandern in den Graph?
4.1 Statements (Claims)
Jeder Claim = eigener Graph-Knoten.

Verknüpfungen:

contradicts, supports, refines

part_of (Themen / Oberthemen)

question_of (wenn ein Statement eine Frage impliziert)

4.2 Questions
Fragekarten sind eigenständige Graph-Knoten.

Verknüpfungen:

question_of (bezieht sich auf Statement)

refines (wenn Frage Unterfrage erzeugt)

4.3 Knots (Konflikte/Widersprüche)
Knoten sind strukturelle Konfliktmarken.

Verknüpfungen:

knot_of (bezieht sich auf Statement/Claim)

contradicts (zwei widersprüchliche Claims)

4.4 Consequences (aus Part06)
Jede Kurzfolge ein Knoten.

Kanten:

causes (Aussage → Folge)

responsibility_of (Folge → Akteur)

4.5 Verantwortlichkeiten (aus Part06)
Responsibility-Objekte bilden ebenfalls eigene Knoten.

5. Wie der Graph im System lebt (E150 → E200)
5.1 Automatisch befüllt durch:
Contributions (/contributions/new)

Feeds (News → StatementCandidates)

Eventualitäten (Part08)

Community-Refinements (Abstimmungen, Fragen übernehmen)

Admin-Moderation (Zusammenführen, Markieren)

Der Graph wird nie von der KI vollständig erstellt.
Er wächst organisch durch:

Integration,

Matching,

semantische Nähe,

Konflikt-Erkennung,

menschliche Aktionen.

5.2 Persistenz
MongoDB für Rohdaten

optional später: Neo4j / Arango / Memgraph für Graph-Optimierung

Codex soll Schnittstellen vorbereiten, aber keine DB entscheiden.

6. Reports – Nutzung des Graphen
Reports sind verdichtete Themenbilder.

6.1 Region Reports
ts
Code kopieren
type RegionReport = {
  region: string;
  topics: TopicReport[];
};
6.2 TopicReport
ts
Code kopieren
type TopicReport = {
  topicId: string;
  topicName: string;
  summary: string;
  topStatements: StatementRecord[];
  supportingStatements: StatementRecord[];
  opposingStatements: StatementRecord[];
  questions: QuestionRecord[];
  knots: KnotRecord[];
  consequences: Consequence[];
  responsibilities: Responsibility[];
};
6.3 Warum Reports?
Für Bürger: „Was ist der Stand der Debatte?“

Für Gemeinden:

Meine 5–8 Themen pro Quartal,

Stimmungsbild,

Eventualitäten,

Konflikte & Konsens.

Für Admin:

Qualität,

Schwachstellen (fehlende Fragen/Knoten),

Mehrheitsbildung.

7. Integration von Streams & Live-Debatten
Streams (siehe Part09) nutzen den Graphen wie folgt:

Übergabe eines TopicReports an den Streamer,

dynamische Generierung von 5–12 „Fragen“ für die Session,

Echtzeit-Aktualisierung (Swipes & User-Input fließen zurück),

Live-Discovery: „Welche Unterargumente fehlen?“

Der Graph generiert also Themenkarten, die Streamer nutzen können,
damit der Austausch strukturiert bleibt.

8. Konsistenzregeln (E150.7.x)
E150.7.1 – Graph ist streng neutral
Keine Gewichtung, nur Struktur.

E150.7.2 – Keine automatischen Empfehlungen
Graph zeigt Beziehungen, nicht Bewertungen.

E150.7.3 – Regionale Filterung
Graph muss nach Region filtrierbar sein (DE/NRW/Köln/Bezirk).

E150.7.4 – Multilinguale Konsistenz
Knoten verschiedener Sprachen werden per Übersetzungs-Hash verknüpft (E300).

E150.7.5 – Versionierung
Jede Graph-Änderung bekommt:

timestamp,

userId (falls manuell),

provenance (Quelle: Contribution/Feed/Derived).

9. Admin-Funktionen (Pflicht für Codex)
Codex muss folgende Funktionen implementieren / vorbereiten:

9.1 Graph Inspector (/admin/graph)
Suchfeld (Statement, Text-Snippet)

Node-Details

Edge-Übersicht

Filter:

Typ

Region

Sprache

Zeitraum

Highlight:

„Widersprüche“ (Knots)

„Unterfragen fehlen“

„Statements ohne Folgenabschätzung“

9.2 Graph Merge Tools
„Duplicate statements“ identifizieren

„Merge similar nodes“

„Split double claims“

„Mark as deprecated“

9.3 Verantwortlichkeiten-Check
Welche Level sind nicht ausgefüllt?

Gibt es Bürgerbeiträge ohne Akteurs-Zuordnung?

Automatische Vorschläge (nicht verpflichtend):

z.B. „Wahrscheinlich Landeszuständigkeit (Bildung)“

9.4 Report Generator
Region → Themen → Template

Export als PDF/JSON

Übersicht der:

Claims

Fragen

Knoten

Konsequenzen

Trends

Swipes

Zuständigkeiten

10. Performance & Caching
Für Graph-Reports gilt:

Caches mindestens 6 Stunden,

Region/Topic-spezifische Snapshots,

invalideren bei:

neuen Contributions,

neuen Feeds,

Admin-Merge,

Stream-Events.

11. Codex-Anweisungen (kompakt)
Codex MUSS:

Schnittstellen für GraphNodes & GraphEdges vorbereiten.

Insert-Logiken für Statements, Questions, Knots, Consequences anlegen.

Reports-Struktur (TopicReport, RegionReport) als TS-Typen implementieren.

Admin-Routen /admin/graph/* vorbereiten:

Inspector

Merge-Tools

Node-Details

Duplicate-Finder

/api/reports/* Routen anlegen (Basis, Mock-Daten erlaubt).

Unterstützung für regionale Filter (DE → NRW → Köln).

Graph-Snapshots generieren (/admin/graph/snapshot).

Saubere PII-Redaktion auch im Graph-Bereich.

Keine Recommendations, nur Struktur.

Mehrsprachigkeit vorbereiten (E300).

12. Summary
Part07 macht eDebatte/eDebatte zu einer echten Wissensinfrastruktur,
nicht nur einer Voting-App.
Der Graph bildet Streit, Konsens, Argumentation, Folgen und Zuständigkeiten systematisch ab.
Reports machen Themen transparent.
Streams nutzen diese Strukturen für die Öffentlichkeit.
Admin-Tools halten alles sauber und widerspruchsfrei.

Mit Part08 wird alles um Eventualitäten & Entscheidungsbäume erweitert —
der nächste große Schritt Richtung E200.