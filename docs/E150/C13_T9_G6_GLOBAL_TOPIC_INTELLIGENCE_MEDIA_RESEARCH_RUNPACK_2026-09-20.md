# C13 / T9 / G6 — Global Topic Intelligence & Media Research Run-Pack

Stand: 2026-09-20

Status: Governance-, Architektur- und Ausführungsvorbereitung. **Keine Runtime-, Schema-, Provider-, Graph-, Publish- oder Production-Freigabe.**

Operative Anker:

- C13 / Issue #950 — `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`
- T9 / Issue #951 — `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01`
- G6 / Issue #952 — `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01`
- OpenTasks Single-Writer: Issue #447
- Canonical Topic Owner: Issue #586 / `CANONICAL-TOPIC-RESOLUTION-01`
- Atomic Claim ↔ Source / Evidence Owner: Issue #587 / `ATOMIC-CLAIM-SOURCE-RELATION-CONTRACT-01`

Diese Datei ist **kein zweiter Backlog**. `docs/E150/OpenTasks.md` bleibt die operative SSOT. Die drei Tasks dürfen erst implementiert werden, nachdem sie durch den kanonischen Single Writer verlustfrei serialisiert wurden und der jeweilige taskbezogene Preflight die Ausführung ausdrücklich erlaubt.

---

## 1. Verbindliche Produktentscheidung

Für eDebatte gilt:

> **Thema zuerst, Herkunft danach.**

Ein Medienbeitrag, Podcast, Video, Faktencheck, Interview, Parlamentsbeitrag, Artikel oder sonstiges Material kann ein Thema entdecken, aktualisieren, belegen, einschränken oder widersprechen. Es wird dadurch **nicht** zum öffentlichen Primärobjekt und **nicht** zur Wahrheitsinstanz.

Das öffentliche Dossier ist ein eigenständiges, topic-zentriertes Erkenntnisobjekt. Herkunft bleibt vollständig nachvollziehbar, aber sekundär:

```text
Observation / Event / Media Material
        ↓
Original Source Snapshot / Artifact
        ↓
Source Segment + Speaker + Locator
        ↓
Atomic Claim / Claim Expression
        ↓
Source Lineage + Independence
        ↓
Cross-Lingual Canonical Topic Resolution
        ↓
Independent Verification + Counterevidence
        ↓
Conflict / Research Gap / Freshness / Applicability
        ↓
Topic-centric Dossier update candidate
        ↓
DecisionQuestion candidate, falls tatsächlich entscheidbar
        ↓
Source-/Question-/Swipe-Gates
        ↓
AI Orchestra review
        ↓
Human Review
```

Keine Ebene darf eine nachgelagerte Wahrheit vorwegnehmen.

---

## 2. Warum dieser Track existiert

Hochwertige politische und gesellschaftliche Formate besitzen oft große Recherche- und Quellenbreite. Beispiele sind politische Magazine, Satireformate mit Quellenlisten, investigative Sendungen, Talkshows, Podcasts, öffentliche Videos, Parlamentsdebatten und internationale Rechercheformate.

Diese Recherche soll eDebatte nutzen können, ohne folgende Fehlmodi einzuführen:

- Sendung oder Redaktion wird zur Truth Authority;
- Sender-Faktencheck gilt ungeprüft als Wahrheit;
- fünf Artikel mit derselben Agenturmeldung zählen als fünf unabhängige Quellen;
- Übersetzung zählt als zusätzliche Evidenz;
- Talkshow-Aussage wird dem Sender statt dem Sprecher zugerechnet;
- Satire oder rhetorische Zuspitzung wird als Tatsachenclaim gespeichert;
- ein neues Video erzeugt automatisch ein neues Topic/Dossier;
- gut belegter UK-/US-Claim wird ungeprüft als deutsche Tatsache dargestellt;
- veraltete Zahlen bleiben dauerhaft `verified`;
- Provider-/Agentenmehrheit erzeugt scheinbaren Konsens;
- ein gutes Dossier erzeugt automatisch einen Swipe, obwohl keine konkrete Entscheidung existiert.

C13, T9 und G6 schließen diese Lücken, ohne neue Domain-SSOTs zu erfinden.

---

## 3. Domain-Ownership und keine Parallelarchitektur

### #586 bleibt Canonical-Topic-Owner

C13/T9/G6 definieren **kein zweites CanonicalTopic-Modell**. Wiederzuverwenden sind insbesondere:

- `CanonicalTopic`;
- `JurisdictionContext`;
- `DecisionQuestion`;
- `ExternalParticipationSignal`;
- fail-closed Matching/Review bei Ambiguität;
- keine Auto-Fusion und keine Topic-Neuanlage nur wegen anderer Formulierung, Sprache oder Region.

### #587 bleibt Atomic-Claim-/Source-/Evidence-Owner

C13/T9/G6 definieren **keine zweite Claim-/Evidence-Wahrheit**. Wiederzuverwenden sind insbesondere:

- `SourceArtifact`;
- `SourceSegment`;
- `AtomicClaim`;
- `ClaimSourceRelation`;
- `SourceLineage` / `SourceFamily`;
- `EvidenceAssessment`;
- `PublicationClassification`;
- `SynthesisReceipt`.

### Bestehende Runtime-Flächen bleiben Owner

Wiederzuverwenden statt duplizieren:

- `features/feeds/sourceSnapshot.ts`;
- bestehende Feed-/Source-/Material-Extraction-Pfade;
- `features/themenradar/autonomousSupply.ts`;
- bestehende Analyze-/Evidence-Graph-/Dossier-Handoffs;
- Language Bridge und Original-vs-Reading Truth;
- AI-Provider-/Role-/Lane-Policy;
- bestehende Dossier-Persistenz und Review-/Publish-Gates;
- bestehende Source-/Question-/Swipe-Gates, insbesondere die in #935/#940/#943 vorbereitete fail-closed Konvergenz, sobald kanonisch integriert.

Gemini oder andere LLMs sind austauschbare Research-/Extraction-Provider. **Provider wählen oder erzeugen keine kanonische Wahrheit.**

---

## 4. C13 — Cross-Lingual Media & Event Research Intake

### Aufgabe

C13 bringt internationale und mehrsprachige öffentliche Materialien als strukturierte **Observations** in die vorhandene Source-/Materialwelt.

C13 ist kein `DieAnstaltAgent`. Das erste Profil darf `Die Anstalt` sein, der Contract muss aber von Beginn an generisch funktionieren.

### Von V1 an modellierbare Eingänge

- TV-/Streaming-Sendung;
- politische Satire / Kabarett mit Research-Material;
- politisches Magazin / investigative Sendung;
- Talkshow / Interview / Panel;
- Podcast / Radio;
- öffentliches Video / YouTube;
- Dokumentation;
- Pressekonferenz;
- Parlamentsdebatte / öffentliche Sitzung;
- Artikel / Recherche;
- externer Faktencheck;
- amtliches Dokument;
- Gesetz / Gerichtsentscheidung;
- wissenschaftliche Studie;
- Datensatz / Statistik;
- bestehende RSS-/Open-Data-/Nutzer-/Material-Hinweise.

### Observation-Metadaten

Soweit anwendbar und verfügbar:

- stabile Observation-ID;
- SourceArtifact-/Snapshot-ID;
- Publisher/Urheber;
- Programme-/Format-ID und Titel;
- Episode-ID/Titel/Datum;
- canonical original URL;
- öffentliche Video-/Audio-URL;
- Availability-Status und `availableUntil`, wenn bekannt;
- Dauer;
- Untertitel-/Transkriptstatus;
- Originalsprache;
- Sprecher und Sprecherrolle;
- SourceSegment-ID;
- Locator: Timecode, Seite, Absatz, Zeile oder Datensatz;
- Transkriptions-/OCR-/Übersetzungsstatus und Unsicherheit;
- erlaubter Ausschnitt/Originalreferenz;
- Supplement-Links wie Faktencheck, Quellenliste, Show Notes oder Dokumente;
- Source Role: `origin | evidence | counter_evidence | context | primary_document`;
- bekannte upstream-/Source-Family-Hinweise;
- Rechte-/Retention-/Access-Metadaten soweit bekannt.

### Medien- und Speaker-Regeln

1. `Sender veröffentlicht Aussage von Gast X` ist nicht gleich `Sender behauptet X`.
2. Talkshow-/Interview-/Panel-Claims müssen auf Sprecher/Segment zurückführbar bleiben.
3. Host, Redaktion, Gast, zitierte Person und externes Dokument werden getrennt gehalten.
4. Ein automatisches Transkript ist nicht automatisch ein verifiziertes Wortzitat.
5. Satire-/Ironie-/Metapher-/rhetorische Übertreibung bleibt als Kontextmarkierung erhalten; daraus abgeleitete Faktenclaims müssen separat normalisiert und geprüft werden.
6. Öffentliches Video darf referenziert werden; vollständige Fremdmedien werden nicht stillschweigend dauerhaft gespiegelt.
7. Abgelaufene oder verschobene Medien-URL zerstört die kanonische Topic-/Claim-Wahrheit nicht; Availability wird als eigener Zustand behandelt.

### C13-Handoff

```text
Observation
  -> SourceSnapshot / SourceArtifact
  -> SourceSegment
  -> ClaimExpression / AtomicClaim candidate
  -> SourceLineage candidate
  -> reviewable T9 intake
```

C13 darf keine EvidenceAssessment-Dimension eigenmächtig auf `externally_verified` oder eine äquivalente Veröffentlichungsklasse hochstufen.

---

## 5. T9 — Global Topic Intelligence & Independent Verification

### Aufgabe

T9 macht aus internationalen Observations **keine Medien-Dossiers**, sondern aktualisiert den bestehenden kanonischen Themen- und Dossierstand.

### Harte Ontologie

```text
Observation/Event ≠ CanonicalTopic ≠ AtomicClaim ≠ DecisionQuestion
```

- neues Event: kann ein bestehendes Topic aktualisieren;
- neuer Claim: kann ein bestehendes Dossier ergänzen oder revidieren;
- neuer Ort: kann einen JurisdictionContext erzeugen;
- neue konkrete Entscheidung: kann eine DecisionQuestion unter demselben Topic erzeugen;
- neue Formulierung/Sprache: erzeugt nicht automatisch einen neuen Claim oder ein neues Topic.

### Factcheck-of-factcheck

Ein externer Faktencheck ist ein Research-Artefakt und wird selbst geprüft.

Mindestens:

```text
externer Faktencheck
  -> einzelne Claims atomisieren
  -> zitierte/upstream Quellen erfassen
  -> konkrete Primärquelle öffnen oder als fehlend markieren
  -> relevante Tabelle/Passage/Methodik/Definition identifizieren
  -> Claim-Entailment prüfen
  -> Zeitraum/Population/Quantifizierung prüfen
  -> Jurisdiktion und Übertragbarkeit prüfen
  -> alternative Erklärungen/Gegenbelege suchen
  -> Source Lineage / Independence bestimmen
  -> EvidenceAssessment aktualisieren
```

Das Label `Faktencheck`, der Ruf eines Mediums oder eine Redaktionseinschätzung erhöht allein keinen Truth-Status.

### Quellenunabhängigkeit

Folgende Beispiele zählen **nicht** automatisch als voneinander unabhängige Bestätigung:

- Sendung + Faktencheck desselben Senders, wenn beide dieselbe Studie verwenden;
- mehrere Artikel auf Basis derselben Agenturmeldung;
- mehrere Texte auf Basis desselben Interviews;
- mehrere Medien, die dieselbe amtliche Statistik paraphrasieren;
- mehrere Agenten/Modelle, die dieselbe Quelle analysieren;
- Übersetzungen oder Zusammenfassungen derselben Originalquelle.

Maßgeblich sind Source Lineage, Root Source und Relation zum **gleichen atomaren Claim**.

### Temporal validity / Freshness

Claims müssen soweit anwendbar besitzen oder ableiten lassen:

- beobachteter/veröffentlichter Zeitpunkt;
- Daten-/Messzeitraum;
- `lastVerifiedAt`;
- Freshness-Status;
- erkennbare Ablösung durch neue Version/Statistik/Gesetzeslage.

Ein ehemals korrekter Zahlen- oder Rechtsclaim darf nach relevanter Änderung nicht still als aktuell bestätigt erscheinen.

### Jurisdiction / Applicability / Generalizability

Mindestens getrennt modellieren:

- direkte Geltung;
- teilweise Übertragbarkeit;
- nur Kontext/Benchmark;
- nicht übertragbar;
- unbekannt / Review erforderlich.

Eine belastbare Quelle aus GB/US/FR/EU wird nicht automatisch als Aussage über Deutschland oder eine deutsche Kommune ausgegeben.

### Cross-Lingual Truth

- Originalsprache bleibt Evidence-/Review-Grundlage.
- Übersetzung/Lesefassung ist eine Darstellung, keine Quelle.
- sprachliche Ähnlichkeit erhöht keinen Match- oder Evidenzgrad.
- unsicheres Cross-Lingual-Matching endet in Kandidaten/Review.
- eine fehlerhafte Übersetzung darf Originalclaim/-segment nicht überschreiben.

### Contradictions / Research Gaps

Widerspruch ist kein Boolescher Fehlerzustand, sondern ein prüfbarer Befund.

Getrennt halten:

- echter Widerspruch;
- andere Quantifizierung;
- anderer Zeitraum;
- andere Population;
- andere Jurisdiktion;
- Ausnahme / Boundary Case;
- Gegenbeispiel;
- alternative Erklärung;
- normative Gegenposition;
- fehlende Daten / Research Gap.

Keine künstliche 50/50-Balance. Gegenpositionen oder Gegenbelege werden aufgenommen, wenn sie real und belegbar sind.

### Delta-Orchestrierung

Bei neuen Materialien zuerst prüfen:

1. neue Observation?
2. bereits bekannte Source/Root?
3. neuer Atomic Claim oder nur neue Expression?
4. neue Evidenz für bestehenden Claim?
5. Widerspruch/Änderung/Freshness-Update?
6. vorhandenes CanonicalTopic/Dossier?
7. neue DecisionQuestion oder nur neuer Kontext?

Nur betroffene Claims/Dossiers müssen revalidiert werden. Blindes Neu-Erzeugen kompletter Dossiers ist kein Ziel.

---

## 6. Topic-zentriertes Dossier

### Öffentliche Priorität

Das Dossier beginnt mit:

- Topic / Kernfrage;
- gesichertem Erkenntnisstand;
- strittigen oder unklaren Punkten;
- Daten/Definitionen/Zeiträumen;
- Jurisdiktion und Zuständigkeit;
- offenen Fragen;
- möglichen Entscheidungen, wenn tatsächlich vorhanden.

Nicht mit:

- `Die Anstalt sagt ...`;
- `BBC sagt ...`;
- `Sender X hat recht ...`.

### Provenienz bleibt sichtbar

In einer Transparenz-/Research-Herkunftsebene kann stehen:

- wodurch ein Aspekt entdeckt oder aktualisiert wurde;
- Originalformat/Publisher/Episode;
- Originalvideo/-audio/-artikel;
- Timecode/Seite/Locator;
- Faktencheck/Quellenliste des Formats;
- welche unabhängigen Quellen eDebatte zusätzlich geprüft hat;
- welche Teile nur Kontext, strittig, veraltet oder nicht übertragbar sind.

Verbindlich:

> Ein öffentliches Dossier darf nicht allein auf einem Medienformat oder dessen eigenem Faktencheck beruhen.

---

## 7. Decision Readiness ist nicht Topic Confidence

Ein hervorragend recherchiertes Dossier kann **keinen** sinnvollen Swipe besitzen.

Ein Decision-/Swipe-Candidate entsteht nur, wenn mindestens:

- konkrete zuständige Instanz oder nachvollziehbarer Entscheidungskontext;
- konkrete Handlung/Option;
- Scope/Conditions/Timeframe;
- evidenzbasierte Folgen oder sichtbar unsichere Hypothesen;
- keine zentrale offene Evidenzlücke, die die Fragestellung verzerrt;
- Question Quality und Neutralität;
- bestehende Source-/Vote-/Swipe-Gates erfüllt oder Review ausgelöst.

T9 darf die bestehenden Source-/Swipe-Readiness-Gates nur **restriktiver** machen, niemals fehlende Readiness herstellen.

---

## 8. G6 — Provenance, Evidence Lineage & Cross-Lingual Topic Graph

### Aufgabe

G6 projiziert kanonische Domain-IDs und Revisionen in eine nachvollziehbare Beziehungssicht.

Graph ist **Derived Projection**, keine Truth Source.

### Modellierbare Knoten

Soweit ihre Domain-Owner sie kanonisch erzeugt haben:

- Observation/Event;
- SourceArtifact;
- SourceSegment;
- Speaker/Actor reference;
- ClaimExpression;
- AtomicClaim;
- SourceFamily / IndependenceGroup / RootSource;
- CanonicalTopic;
- JurisdictionContext;
- EvidenceConflict / ResearchGap;
- Dossier;
- DecisionQuestion;
- SwipeCandidate;
- Verification/Synthesis Receipt.

### Kernrelationen

- Origin/Contains/Attributed-To;
- bestehende ClaimSourceRelation aus #587;
- upstream/derived/quoted/syndicated/uses-dataset;
- same-source-family / independence-group;
- translation-of / reading-version-of;
- about-topic;
- applies-to/contextual-for jurisdiction;
- conflicts/alternative-explanation/research-gap;
- updates-dossier;
- candidate-for-decision;
- candidate-for-swipe;
- verified/reviewed-by-receipt.

G6 darf weder neue Topic-/Claim-/Actor-Wahrheit erzeugen noch eine politische Option ranken oder veröffentlichen.

---

## 9. Reproducible Verification Receipts

Jede relevante Synthese-/Verification-Stufe soll auf den vorhandenen Receipt-/Trace-Gedanken aufbauen und mindestens rückverfolgbar machen:

- verwendete Observation-/Source-/Segment-IDs;
- Atomic-Claim-IDs;
- ClaimSourceRelation-IDs;
- Source Families/Roots und Independence-Status;
- berücksichtigte und offene Gegenbelege;
- Freshness-/Jurisdiction-/Generalizability-Prüfungen;
- Original-/Reading-Language-Status;
- offene Research Gaps;
- Modell/Provider/Policy-/Promptversion soweit bestehende AI-Trace-Contracts dies erlauben;
- menschliche Reviewrevision;
- resultierenden Dossier-/Decision-/Swipe-Handoff.

Provider- oder Modell-Trace ist Provenienz der **Verarbeitung**, nicht Evidenz für den externen Claim.

---

## 10. Pflicht-Fixtures über C13/T9/G6

Nach späterer Autorisierung müssen mindestens folgende Fälle deterministisch abgedeckt sein:

1. Satiresegment + normalisierter Faktenclaim bleiben getrennt.
2. Sender-Faktencheck + Sendung + gemeinsame UBA-/Primärquelle zählen nicht als drei unabhängige Belege.
3. Faktencheck zitiert Tabelle, die den Claim nur teilweise stützt → kein `verified`.
4. Talkshow-Gast macht Claim → Speaker owns statement; Sender bleibt Publisher/Origin context.
5. Automatisches Transkript mit unsicherer Passage → kein verifiziertes Wortzitat.
6. Original Deutsch + Lesefassung Englisch/Französisch → eine Evidenzquelle.
7. Gleiche Agenturmeldung in drei Medien → eine Source Family.
8. Zwei tatsächlich unabhängige Primärquellen → getrennte Roots.
9. Gut belegter UK-Claim → nicht automatisch deutsche Faktenwahrheit.
10. Neuer Bericht wiederholt nur bekannte Claims → Dossier-Delta, kein neues Topic.
11. Neue Primärquelle widerspricht altem Finding → Conflict + Review, keine automatische Gewinnerseite.
12. Veraltete Statistik → Freshness-Gate.
13. Gutes Dossier ohne konkrete Entscheidung → kein Swipe.
14. DecisionQuestion mit unvollständiger Consequence-Evidence → fail-closed in Review.
15. Mehrere LLMs auf gleicher Quelle → keine zusätzliche Quellenunabhängigkeit.
16. Übersetzung oder Zusammenfassung → keine zusätzliche Evidenz.
17. Cross-lingual Similarity ohne eindeutige Identität → Review, kein Auto-Merge.
18. Abgelaufenes öffentliches Video → Provenienz bleibt, Availability ändert sich, Dossier zerfällt nicht.
19. Graph enthält fehlende kanonische ID nicht → Graph erfindet sie nicht.
20. Topic-Projektion zeigt Herkunft nachvollziehbar, ohne Medienformat zum Thema zu machen.

---

## 11. Initiale Adapter-Strategie

Der Contract ist international/generisch; konkrete Adapter werden später als kleine Source Profiles ergänzt.

Geeignete erste Testklassen:

- Recherche-/Satireformat mit veröffentlichten Quellen/Faktencheck-Materialien;
- politisches Magazin;
- Talkshow/Interview mit Speaker-Wechseln;
- Podcast;
- öffentliches Video;
- Parlaments-/Behördenvideo oder Protokoll;
- fremdsprachiges internationales Rechercheformat.

`Die Anstalt` eignet sich als Golden Fixture, weil der Fall gleichzeitig Video, Satire, Claims, Quellenlisten/Faktenchecks und politische Themen verbindet. Der Golden Fixture darf aber **keine ZDF-spezifische Domain-Architektur** erzeugen.

---

## 12. Vorgeschlagene spätere Implementierungsslices

Nur nach OpenTasks-Serialisierung + positivem Preflight.

### Slice C13.1 — Observation / Media Source Contract

- additive shared contracts im bestehenden Domain-Owner;
- Adapter auf SourceSnapshot/Material Extraction;
- SourceSegment/Speaker/Locator/Language/Availability;
- Contract-Fixtures, kein Provider-Livezugriff.

### Slice C13.2 — Provider-neutral Extraction Handoff

- Lane/Capability-Contract;
- strukturierter Output nur als Candidate;
- Gemini/andere Provider austauschbar;
- keine Truth-Promotion.

### Slice T9.1 — Independent Verification Orchestration Contract

- reuse #587 EvidenceAssessment/Lineage;
- factcheck-of-factcheck;
- root independence;
- counterevidence/conflict/gaps;
- temporal/jurisdiction/generalizability.

### Slice T9.2 — Topic/Dossier Delta Handoff

- reuse #586 resolver;
- bestehendes Dossier bevorzugen;
- Delta-/Revalidation-Receipt;
- keine automatische öffentliche Mutation.

### Slice T9.3 — Decision Readiness Handoff

- nur verified/reviewable topic state;
- bestehende #935/#940/#943 Source-/Swipe-Gates konsumieren;
- kein Auto-Publish.

### Slice G6.1 — Derived Provenance Projection

- ausschließlich kanonische IDs;
- Lineage/Translation/Jurisdiction/Conflict edges;
- keine neue Truth-Persistenz.

### Slice G6.2 — Consumer Readmodel

- topic-first Dossier transparency;
- Herkunft/Video/Locator/Sources sichtbar;
- keine Herkunftsdominanz in der Topic-UI.

Jeder Slice bleibt klein, testbar und collision-aware.

---

## 13. OpenTasks-Zielserialisierung

Der #447 Single Writer soll folgende operative IDs verlustfrei registrieren:

- C13 — `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`
- T9 — `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01`
- G6 — `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01`

Initial `blocked`, solange #586/#587 und ihre taskbezogenen Preflights nicht kanonisch ausführbar sind.

Verbindliche Dependency Chain:

```text
#586 CANONICAL-TOPIC-RESOLUTION-01
        +
#587 ATOMIC-CLAIM-SOURCE-RELATION-CONTRACT-01
        ↓
C13
        ↓
T9
        ↓
G6
```

T9 darf C13-Deltas inkrementell konsumieren; G6 kann vorbereitete Types/Fixtures planen, aber keine Domain-Wahrheit vor seinen Ownern erzeugen.

---

## 14. P0/P1 Guardrails

Als P0/P1 zu behandeln wären insbesondere:

- Medien-/Faktencheck-Label wird zur Truth Authority;
- Übersetzung zählt als unabhängige Evidenz;
- gleiche Root Source wird mehrfach als unabhängige Bestätigung gezählt;
- fehlende Speaker Attribution wird sicher behauptet;
- nicht übertragbare Jurisdiktion wird als lokale Tatsache ausgegeben;
- veraltete Daten bleiben ohne Freshness-Hinweis aktuell;
- Graph oder LLM erzeugt kanonische Truth ohne Domain Owner;
- politische Empfehlung/Ranking wird aus Research-Evidenz abgeleitet;
- Dossier oder Swipe wird ohne Human Review automatisch veröffentlicht;
- Medienformat wird zur parallelen Dossier-/Topic-SSOT;
- Faktencheck-of-factcheck wird übersprungen, obwohl externe Wahrheitsklassifikation übernommen würde.

---

## 15. Nicht-Ziele

Dieser Run-Pack autorisiert nicht:

- Vollcrawler oder ungeregeltes Scraping;
- dauerhafte Spiegelung fremder Videos/Audioinhalte;
- Copyright-/Lizenzannahmen;
- neue Datenbank/Collection/Migration;
- Provider-/Secret-Aktivierung;
- Live-Research in Production;
- neue öffentliche Dossier-/Swipe-Publishing-Automation;
- politische Empfehlung oder Ranking;
- automatische Topic-/Claim-/Actor-Fusion;
- Ersetzung der bestehenden T0–T8-, G1–G5-, #586-, #587-, Dossier-, Language-Bridge- oder AI-Orchestration-SSOTs.

---

## 16. Startbedingung

Vor jedem technischen Slice zwingend:

```text
OpenTasks serialisiert
→ taskbezogener Preflight
→ executable: true
→ branchCreationAllowed: true
→ aktuelles main + Collision Map
→ vorhandenen Owner/PR wiederverwenden oder exakt einen kleinen Branch
→ fokussierte Tests + Typecheck/Lint/Build soweit relevant
→ Exact-Head-CI
→ Reviewthreads / Gegenprobe
→ Human Review
→ Single-Writer-Reconciliation
```

Bis dahin sind ausschließlich Governance-, Dokumentations-, Dependency- und vorbereitende Audit-Arbeiten erlaubt.