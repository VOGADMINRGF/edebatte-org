# C13 / T9 / G6 — Global Topic Intelligence & Media Research Run-Pack

Stand: 2026-09-20
Revision: 3 — Canonical owner and runtime convergence

Status: Governance-, Architektur- und Ausführungsvorbereitung. **Keine Runtime-, Schema-, Provider-, Graph-, Publish- oder Production-Freigabe.**

Operative Anker:

- C13 / Issue #950 — `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`
- T9 / Issue #951 — `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01`
- G6 / Issue #952 — `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01`
- OpenTasks Single-Writer: Issue #447
- Canonical Topic Owner: `features/topic/canonicalTopicResolutionContract.ts` / Issue #586
- Atomic Claim ↔ Source / Evidence Contract: `features/analyze/atomicClaimSourceRelationContract.ts` / Issue #587
- Durable source observation owner: `features/feeds/sourceSnapshot.ts`
- Specialist-/Provider-Orchestration-Owner: Issue #629 / `AI-SPECIALIST-ORCHESTRATION-COMPOSITION-01`
- Reliable live YouTube/media acquisition owner: Issue #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01`
- Existing Evidence persistence/projection surfaces: `core/evidence/*`, `features/evidence/syncFromAnalyze.ts`, `features/analyze/evidenceGraph.ts`, `features/analyze/schemas.ts`

Diese Datei ist **kein zweiter Backlog und keine neue Domain-Architektur**. `docs/E150/OpenTasks.md` bleibt die operative SSOT.

## Revisionshinweis

Die erste Fassung dieses Run-Packs behandelte #586/#587 zu konservativ als noch nicht implementierte Voraussetzungen. Revision 2 korrigierte diese Annahme. Revision 3 schließt zusätzlich zwei weitere Doppelstruktur-Risiken:

1. **Ausführungsduplikat:** #629 ist bereits der kanonische Owner für typisierte Specialist-/Provider-Komposition auf dem bestehenden E150-Policy-Orchestrator. T9 darf deshalb keinen eigenen Runner, Scheduler, Provider-Router oder Composer etablieren.
2. **Media-Runtime-Duplikat:** #644 ist bereits der fokussierte Owner für eine zuverlässige offizielle/vertraglich belastbare YouTube-/Media-Acquisition-Grenze. C13 darf keinen zweiten Video-/Transcript-/Media-Loader bauen.
3. **Evidence-/Graph-Duplikat:** Das Repository besitzt bereits atomare Evidence-Contracts, einen Analyze-`EvidenceGraph`, persistierte `core/evidence`-Dokumente und Analyze→Core-Sync. G6 darf keinen dritten Evidence-/Graph-Store hinzufügen; vor Code ist eine Ownership-/Projection-Convergence-Matrix Pflicht.

Auf aktuellem `main` gilt bereits:

- `CanonicalTopic`, `JurisdictionContext`, `DecisionQuestion` und fail-closed Topic Resolution existieren unter `features/topic/canonicalTopicResolutionContract.ts`;
- `SourceArtifact`, `SourceSegment`, `AtomicClaim`, `ClaimSourceRelation`, `SourceFamily`, `EvidenceAssessment`, `PublicationClassification` und `SynthesisReceipt` existieren unter `features/analyze/atomicClaimSourceRelationContract.ts`;
- `DurableSourceSnapshot.snapshotId` ist ausdrücklich die **Observation identity**, `contentId` die immutable Content Identity;
- Dossier- und Research-Owner existieren im Decision-Dossier-Track;
- der bestehende E150-Orchestrator und #629 besitzen die Ausführungsautorität für Specialist Composition;
- #644 besitzt die vorbereitete Media-Acquisition-Owner-Grenze.

Daraus folgt verbindlich:

> **Ein fachliches Konzept = ein kanonischer Owner. C13 adaptiert, T9 definiert ein fachliches Verification-Profil auf der bestehenden Orchestrierung, G6 konvergiert/projiziert. Keine der drei Lanes eröffnet eine zweite Wahrheit oder eine zweite Runtime.**

---

## 1. Zielarchitektur: ein System, eine Wahrheit pro Konzept

Für eDebatte gilt:

> **Thema zuerst, Herkunft danach. Ein kanonisches Fachobjekt pro fachlicher Identität. Eine kanonische Runtime pro Ausführungsrolle.**

Ein Medienbeitrag, Podcast, Video, Faktencheck, Interview, Parlamentsbeitrag, Artikel oder sonstiges Material kann ein Thema entdecken, aktualisieren, belegen, einschränken oder widersprechen. Es wird dadurch weder zum öffentlichen Primärobjekt noch zur Wahrheitsinstanz.

Die kanonische Kette lautet:

```text
SourceRef / external material
        ↓
existing source loader / #644 media boundary where required
        ↓
DurableSourceSnapshot, falls replaybar/fetchbar
        ↓
SourceArtifact
        ↓
SourceSegment + speaker + locator
        ↓
AtomicClaim
        ↓
ClaimSourceRelation + SourceFamily
        ↓
#629 / existing E150 specialist orchestration, policy-controlled
        +
T9 global verification profile
        ↓
EvidenceAssessment + SynthesisReceipt
        ↓
CanonicalTopic + JurisdictionContext
        ↓
existing Dossier / ResearchTask
        ↓
DecisionQuestion, falls tatsächlich entscheidbar
        ↓
existing Source-/Question-/Swipe-Gates
        ↓
Human Review
        ↓
G6 convergence / derived Graph/Readmodel projection
```

Keine Stufe darf dieselbe fachliche Wahrheit oder dieselbe Ausführungsrolle unter einem zweiten Namen neu persistieren oder neu implementieren.

---

## 2. Kanonische Mapping-Matrix

| Fachliches Konzept / Rolle | Kanonischer Owner auf `main` bzw. vorbereiteter Owner | C13 darf | T9 darf | G6 darf |
| --- | --- | --- | --- | --- |
| Observation bei durablem Fetch | `DurableSourceSnapshot.snapshotId` | erzeugen über bestehenden Fetch-/Snapshot-Pfad | referenzieren | projizieren |
| Immutable Content Identity | `DurableSourceSnapshot.contentId` | referenzieren | deduplizieren/revalidieren | projizieren |
| Quelle | `SourceArtifact` | Candidate/Adapter auf bestehenden Typ | konsumieren | ID projizieren |
| Quellsegment / Timecode / Passage | `SourceSegment` | segmentieren/binden | verifizieren | ID + Relation projizieren |
| Atomare Aussage | `AtomicClaim` | Candidate erzeugen | normalisieren/verifizieren | projizieren |
| Claim↔Source-Beziehung | `ClaimSourceRelation` | Candidate erzeugen | prüfen/aktualisieren | Relation projizieren |
| Quellenfamilie / Unabhängigkeit | `SourceFamily` + Relation-Independence | Hints liefern | bestimmen/prüfen | projizieren |
| Evidenzbewertung | `EvidenceAssessment` | niemals Truth-Promotion | bestehende Semantik anwenden/ergänzen | nur lesen/projizieren |
| Publikationsklasse | `PublicationClassification` | nicht eigenmächtig setzen | bestehende Resolverlogik anwenden | nur lesen |
| Synthese-/Verification-Receipt | `SynthesisReceipt` | Inputs referenzieren | erzeugen/validieren innerhalb Owner | projizieren |
| Thema | `CanonicalTopic` | Candidate-Input liefern | bestehenden Resolver nutzen | Topic-ID projizieren |
| Jurisdiktion | `JurisdictionContext` | Metadaten liefern | bestehenden Resolver/Assessment nutzen | projizieren |
| konkrete Entscheidungsfrage | `DecisionQuestion` | nie aus Material automatisch finalisieren | Candidate nur über bestehenden Owner | projizieren |
| Dossier / Research | bestehende Dossier-/Research-Owner | Handoff liefern | Delta aktualisieren | Dossier-ID/Revision projizieren |
| Specialist-/Provider-Ausführung | #629 / bestehender E150-Policy-Orchestrator | typed Candidate-Input liefern | fachliche Anforderungen/Profile definieren, **keinen Runner bauen** | nur Receipts/Run-Refs projizieren |
| Live YouTube/Media Acquisition | #644 + bestehende Source-/Security-Grenzen | konsumieren oder manual/degraded bleiben, **keinen zweiten Loader bauen** | nur SourceArtifact/Segment konsumieren | nur referenzieren |
| Analyze Evidence Readmodel | `features/analyze/evidenceGraph.ts` + Schemas | nicht kanonisieren | konsumieren/adapterfähig halten | konvergieren/projizieren |
| Persisted Evidence Index/Store | `core/evidence/*` + `features/evidence/syncFromAnalyze.ts` | nicht duplizieren | nur über geklärte Adapter-/Owner-Grenze | vor Erweiterung Ownership-/Projection-Matrix verpflichtend |
| Graph | bestehende Reason-/Analyze-/Evidence-Projektionen | nichts kanonisieren | nichts kanonisieren | ausschließlich convergence/derived projection |

### Harte Schlussfolgerung

Ein neues Objekt oder Runtime-Konzept wie `Observation`, `MediaClaim`, `GlobalEvidence`, `T9Assessment`, `T9Runner`, `T9Composer`, `G6TopicNode`, `MediaDossier`, `FactcheckTruth`, `TranslatedClaim`, ein zweiter `SourceFamily`-Typ oder ein zweiter YouTube-/Media-Loader ist **nicht zulässig**, wenn dieselbe Identität, derselbe Lifecycle oder dieselbe Ausführungsrolle bereits vorhanden ist.

---

## 3. No-semantic-duplicate gate

Vor jedem neuen Typ, Contract, Store, Repository, Collection, Graph-Knotenmodell, Persistenzfeld, Runner, Scheduler, Provider-Router oder Composer muss der Agent beantworten:

1. Existiert dieselbe fachliche Identität bereits unter anderem Namen?
2. Ist das Neue nur eine medien-, provider-, sprach- oder UI-spezifische Variante?
3. Kann die Information als additive Metadaten, Adapter-Output oder Referenz am bestehenden Owner geführt werden?
4. Würde ein neuer Store dieselbe Wahrheit spiegeln?
5. Würde ein Graph-Knoten nur eine bereits kanonische Entity kopieren?
6. Würde ein Modelloutput als Wahrheit persistiert, obwohl er nur Candidate oder Processing-Provenienz ist?
7. Existiert bereits eine Runtime, die dieselbe Ausführungsrolle besitzt, insbesondere #629/E150 oder #644?
8. Würde ein neuer Runner/Loader/Composer nur einen bestehenden Flow neu verpacken?

Wenn eine Antwort `ja` ist, gilt:

> **Bestehenden Owner erweitern oder adaptieren; keine neue kanonische Struktur und keine zweite Runtime.**

Eine neue persistente Entity oder Runtime ist nur zulässig, wenn alle folgenden Punkte belegt sind:

- eigenständige Identität oder eigenständige, nicht vorhandene Ausführungsrolle;
- eigenständiger Lifecycle;
- keine semantische oder Runtime-Überschneidung mit bestehendem Owner;
- klarer fachlicher Owner;
- positive Collision-/Architecture-Prüfung;
- ausdrückliche Autorisierung im taskbezogenen Preflight.

---

## 4. C13 — Media/Event Intake Adapter

C13 ist **kein Domain-Layer**, kein `DieAnstaltAgent` und keine neue Media-Runtime.

### Aufgabe

Internationale und mehrsprachige öffentliche Materialien über bestehende Source-/Material-/Evidence-Owner ingestieren und deren fehlende, generische Medienmetadaten als additive Adapterdaten verfügbar machen.

Unterstützbare Inputklassen mindestens:

- TV-/Streaming-Sendung;
- politische Satire / Kabarett;
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

### Observation Identity

Es wird **kein neuer `Observation`-Store** eingeführt.

- Wenn Material über den bestehenden Fetch-/Snapshot-Pfad dauerhaft replaybar vorliegt, ist `DurableSourceSnapshot.snapshotId` die Observation Identity.
- Byte-identischer Inhalt teilt `contentId`, auch wenn er zu mehreren Zeitpunkten beobachtet wurde.
- Wenn ein externes Medium aus Rechte-, Provider- oder Runtime-Gründen nicht dauerhaft gespiegelt/fetched werden darf, bleiben `SourceArtifact.canonicalRef`, `SourceSegment.locator`, Access-/Rights-/Retention-Status und vorhandene SourceRef-/Adapter-Metadaten maßgeblich. Daraus entsteht kein Ersatz-Observation-Store.

### Live-Media-Acquisition

Issue #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` ist der fokussierte Owner für die zuverlässige offizielle/vertraglich belastbare YouTube-/Media-Acquisition-Grenze vor #629 Slice 4.

C13 darf deshalb:

- Fixture-/Contract-Metadaten für Video/Audio modellieren;
- einen durch #644 gelieferten typed `SourceArtifact`/Segment-Handoff konsumieren;
- ehrlich `runtime_incompatible`, `unavailable`, `manual` oder `degraded` weitergeben.

C13 darf **nicht**:

- den bestehenden problematischen YouTube-Web/InnerTube-Transcriptpfad kopieren;
- einen eigenen Gemini-/YouTube-/Browser-/Proxy-Loader bauen;
- Cookies, Anti-Bot-Umgehungen oder inoffizielle Scraping-Bypässe einführen;
- Media-Erfolg behaupten, wenn kein belastbarer SourceArtifact/Segment geladen wurde.

### Additive Medienmetadaten

Ein späterer C13-Preflight darf nur echte Gaps ergänzen, z. B. soweit nicht bereits vorhanden:

- Programme-/Format-/Episode-Referenz;
- Speaker Role;
- Timecode/Locator;
- Duration;
- Availability / `availableUntil`;
- Subtitle-/Transcript-Status;
- Supplement-/Show-Notes-/Factcheck-Links;
- deklarierte Source Role wie origin/evidence/counter-evidence/context.

Diese Felder gehören an den fachlich passenden bestehenden Source-/Segment-/Adapter-Owner. Sie rechtfertigen keine neue C13-Domain.

### Speaker-/Medienregeln

1. `Sender veröffentlicht Aussage von Gast X` ist nicht gleich `Sender behauptet X`.
2. Talkshow-/Interview-/Panel-Claims bleiben auf Sprecher + Segment rückführbar.
3. Host, Redaktion, Gast, zitierte Person und externes Dokument bleiben getrennt.
4. Automatisches Transkript ist nicht automatisch verifiziertes Wortzitat.
5. Satire, Ironie, Metapher, Übertreibung und überprüfbarer Faktenclaim bleiben getrennt.
6. Öffentliches Video darf referenziert werden; kein stilles dauerhaftes Spiegeln fremder Medien.
7. Abgelaufene URL ändert Availability, nicht rückwirkend kanonische Claim-/Topic-Identität.

### C13-Handoff

```text
SourceRef/material
  -> existing source loader OR #644 media boundary when required
  -> existing DurableSourceSnapshot where applicable
  -> existing SourceArtifact
  -> existing SourceSegment
  -> existing AtomicClaim candidate
  -> existing ClaimSourceRelation/SourceFamily candidate
  -> T9 verification profile on #629/E150
```

---

## 5. T9 — Global Verification Profile

T9 ist **kein neues Evidence-System und kein eigener Orchestrator**.

### Ausführungsautorität

Issue #629 / `AI-SPECIALIST-ORCHESTRATION-COMPOSITION-01` ist der bestehende Owner für die typisierte Specialist-/Provider-Komposition auf dem graph-guided, deterministischen E150-Policy-Orchestrator.

T9 definiert deshalb nur:

- fachliche Research-/Verification-Anforderungen;
- welche Source-/Claim-/Lineage-/Counterevidence-Gates für Global Research gelten;
- welche bestehenden #629-Rollen/typed Outputs benötigt werden;
- welche deterministischen Evidence-/Dossier-Gates danach greifen;
- welchen Dossier-/Decision-Handoff das Ergebnis erzeugen darf.

T9 definiert **nicht**:

- einen eigenen Runner oder Scheduler;
- einen eigenen Provider-Router;
- einen eigenen Composer;
- neue Provider-Fallbackregeln außerhalb #629;
- einen zweiten `CanonicalAnalysisResult`/`ComposedAnalysisResult`;
- eine zweite AI-Trace-/Run-SSOT.

Wenn #629 eine für T9 erforderliche Ausführungsrolle noch nicht implementiert hat, bleibt der Runtime-Teil von T9 blockiert oder beschränkt sich auf Contract-/Fixture-Vorbereitung. Er darf die Lücke nicht durch eine Parallelruntime schließen.

### Aufgabe

Bestehende Topic-, Claim-/Source-, Evidence-, Dossier-, Language- und Review-Owner so über das fachliche Profil zu komponieren, dass internationale Research-Inputs verifiziert und als Dossier-Delta eingeordnet werden.

### Harte Ontologie

```text
Source observation ≠ CanonicalTopic ≠ AtomicClaim ≠ DecisionQuestion
```

- neues Material kann ein bestehendes Topic aktualisieren;
- neuer Claim kann ein bestehendes Dossier ergänzen/revidieren;
- neuer Ort kann Jurisdiction-Kontext ändern;
- neue konkrete Entscheidung kann eine DecisionQuestion begründen;
- neue Sprache/Formulierung erzeugt nicht automatisch neues Topic oder neuen Claim.

### Factcheck-of-factcheck

Ein externer Faktencheck ist Research-Artefakt, keine Truth Authority.

```text
external factcheck
  -> existing AtomicClaims identifizieren
  -> verwendete SourceArtifacts/Segments erfassen
  -> upstream Primärquelle öffnen oder fehlend markieren
  -> konkrete Passage/Tabelle/Methodik/Definition prüfen
  -> existing ClaimSourceRelation bestimmen
  -> Zeitraum/Population/Quantifizierung prüfen
  -> Jurisdiction/Generalizability prüfen
  -> Gegenbelege/alternative Erklärungen suchen
  -> existing SourceFamily/Independence bestimmen
  -> bestehenden EvidenceAssessment aktualisieren
  -> bestehenden SynthesisReceipt erzeugen/validieren
```

Das Label `Faktencheck`, Medienreputation oder Modellmehrheit erhöht allein keinen Evidence-Status.

### Quellenunabhängigkeit

Nicht automatisch unabhängig:

- Sendung + Faktencheck desselben Formats mit gleicher Studie;
- mehrere Artikel derselben Agenturmeldung;
- mehrere Texte desselben Interviews;
- mehrere Medien mit derselben amtlichen Statistik;
- mehrere Agenten/Modelle auf derselben Quelle;
- Übersetzungen/Zusammenfassungen derselben Originalquelle.

Maßgeblich bleiben `SourceFamily`, Relation zum gleichen AtomicClaim und bestehende Independence-Regeln.

### Freshness / Jurisdiction / Generalizability

- Daten-/Messzeitraum und aktuelle Gültigkeit bleiben getrennt;
- veraltete Claims dürfen nicht still aktuell bleiben;
- belastbare Auslandsquellen werden nicht automatisch zu deutschen Fakten;
- direkte Geltung, teilweise Übertragbarkeit, Kontext/Benchmark, nicht übertragbar und unknown/review bleiben unterscheidbar;
- fehlende Dimensionen werden nur additiv am bestehenden Evidence-/Claim-/Dossier-Owner ergänzt, nicht als `T9Assessment` dupliziert.

### Delta-Orchestrierung

Bei neuem Material zuerst:

1. bereits bekannte Snapshot-/Content-/Source-Identity?
2. neuer AtomicClaim oder nur neue Expression?
3. neue Relation oder nur derselbe Root?
4. neue Evidence/Counterevidence?
5. Freshness-/Jurisdiction-Änderung?
6. vorhandenes CanonicalTopic/Dossier?
7. neue DecisionQuestion oder nur neuer Kontext?

Nur betroffene Claims/Dossiers werden revalidiert. Die physische AI-/Specialist-Ausführung bleibt Eigentum von #629/E150.

---

## 6. Topic-zentriertes Dossier

Das öffentliche Dossier bleibt beim bestehenden Dossier-Owner und beginnt mit:

- Topic/Kernfrage;
- gesichertem Erkenntnisstand;
- strittigen/unklaren Punkten;
- Daten, Definitionen und Zeiträumen;
- Jurisdiktion/Zuständigkeit;
- offenen Research Gaps;
- möglichen Entscheidungen, sofern tatsächlich vorhanden.

Nicht mit `Medium X sagt ...` als Primärlogik.

Provenienz bleibt sichtbar über:

- auslösendes Material;
- Originalformat/Publisher/Episode;
- Originalvideo/-audio/-artikel;
- Timecode/Seite/Locator;
- Faktencheck/Quellenliste;
- zusätzlich geprüfte unabhängige Quellen;
- strittige, veraltete oder nicht übertragbare Teile.

> Ein öffentliches Dossier darf nicht allein auf einem Medienformat oder dessen eigenem Faktencheck beruhen.

---

## 7. Decision Readiness ist nicht Evidence Maturity

Ein hervorragend recherchiertes Dossier kann ohne konkrete Entscheidung **keinen** sinnvollen Swipe erzeugen.

Ein Decision-/Swipe-Candidate entsteht nur über bestehende Owner/Gates, wenn mindestens:

- konkrete zuständige Instanz oder nachvollziehbarer Entscheidungskontext;
- konkrete Handlung/Option;
- Scope/Conditions/Timeframe;
- belastbare Folgeevidenz oder klar markierte Unsicherheit;
- keine zentrale offene Evidenzlücke, die die Frage verzerrt;
- Neutralitäts-/Question-Quality-Gates;
- bestehende Source-/Vote-/Swipe-Readiness erfüllt oder Review ausgelöst.

T9 darf Readiness nur **restriktiver** machen, niemals fehlende Readiness herstellen.

---

## 8. G6 — Evidence/Graph Convergence & Derived Provenance Projection

G6 ist **kein Graph-Kanon und keine dritte Evidence-Struktur**.

### Bereits vorhandene Flächen

Vor G6-Code müssen mindestens gemeinsam inventarisiert werden:

- `features/analyze/atomicClaimSourceRelationContract.ts` — persistenzfreier atomarer Source-/Claim-/Relation-/SourceFamily-/EvidenceAssessment-/SynthesisReceipt-Vertrag;
- `features/analyze/schemas.ts` und `features/analyze/evidenceGraph.ts` — bestehender Analyze-`EvidenceGraph`/Readmodel-Pfad;
- `core/evidence/types.ts` und `core/evidence/db.ts` — bestehende persistierte EvidenceClaim-/EvidenceItem-/EvidenceLink-/Decision-Strukturen;
- `features/evidence/syncFromAnalyze.ts` — bestehender Analyze→Core-Evidence-Sync;
- bestehende Dossier-Consumer, die Analyze EvidenceGraph und Core Evidence verwenden.

Der aktuelle `syncFromAnalyze.ts` persistiert ältere `AnalyzeResult.claims` als `EvidenceClaimDoc` und leitet `meta.confidence` aus Claim-`importance` ab. Der neuere atomare Contract besitzt dagegen mehrdimensionale `EvidenceAssessment`-Semantik. Dieser vorhandene Drift ist **kein Argument für einen dritten Store**, sondern ein Konvergenzauftrag.

### Pflicht vor erstem Code: Evidence/Graph Convergence Matrix

Der G6-Preflight muss für jede bestehende Fläche festlegen:

1. **Domain/Semantic Contract** — welche Semantik ist fachlich maßgeblich und welche Felder sind nur Kompatibilität?
2. **Persistence Owner** — welcher Store ist dauerhafte Ablage, welche IDs/Revisionen sind referenzierbar?
3. **Analyze Readmodel** — welche `EvidenceGraph`-Knoten/-Kanten sind nur berechnete Projektion?
4. **Legacy Compatibility** — welche älteren scalar Felder wie `confidence` dürfen nur gelesen, aber nie zur Truth-Promotion genutzt werden?
5. **Write Direction** — genau welche Richtung ist erlaubt; **niemals Projection/Graph → Domain Truth**.
6. **Adapter/Versionierung** — wie wird Semantikdrift additiv und rückwärtskompatibel konvergiert, ohne parallelen neuen Store?
7. **Dossier/Consumer Contract** — welcher Consumer liest welchen Owner, ohne eine zweite Wahrheit zu materialisieren?

Solange diese Matrix nicht eindeutig ist, bleibt G6 fail-closed und führt keine neuen Evidence-/Graph-Typen oder Collections ein.

### Aufgabe

Kanonische Domain-IDs, Revisionen und Receipts über die vorhandenen Evidence-/Graph-Flächen als nachvollziehbare Relation/Index/Readmodel projizieren und vorhandene Drift kontrolliert konvergieren.

Bevorzugt werden Edges auf bestehende IDs; neue Graph-Entities sind nur zulässig, wenn der Domain-Owner bereits eine eigenständige Entity-ID/Lifecycle besitzt.

### Projektion

```text
SourceSnapshot/Artifact
  -> SourceSegment
  -> speaker attribution
  -> AtomicClaim
  -> ClaimSourceRelation
  -> SourceFamily/root
  -> CanonicalTopic/Jurisdiction
  -> conflict/research gap
  -> Dossier revision
  -> DecisionQuestion
  -> SwipeCandidate
  -> Synthesis/Review receipt
```

### Harte Grenzen

- keine dritte Evidence-/Graph-SSOT;
- keine Auto-Fusion;
- kein Graph-write-to-truth feedback loop;
- keine fehlende Domain-Entity per Graph-Autocomplete erfinden;
- Übersetzung erzeugt keine neue Evidence Root;
- Agentenläufe erzeugen keine unabhängigen Roots;
- scalar Legacy-`confidence` darf `EvidenceAssessment` nicht ersetzen oder erhöhen;
- politische Position/Zuständigkeit nicht aus Name/Medium/Organisation ableiten;
- kein politisches Ranking oder Publish-Owner.

---

## 9. Cross-Lingual Truth

- Originalsprache bleibt Evidence-/Review-Basis.
- `SourceSegment.readingView` bzw. bestehende Language-Bridge-Flächen bleiben Lesefassung, keine neue Quelle.
- sprachliche Ähnlichkeit erhöht keinen Match-/Evidence-Status.
- unsichere Cross-Lingual-Matches bleiben Candidate/Review.
- fehlerhafte Übersetzung überschreibt nie Originalsegment/-claim.
- CanonicalTopic-Identität bleibt sprachunabhängig nur soweit der bestehende Resolver dies bestätigt.

---

## 10. Reproducible Receipts

Bestehende `SynthesisReceipt`-/AI-Trace-Verträge bleiben maßgeblich.

Rückverfolgbar sein sollen mindestens:

- verwendete Snapshot-/Source-/Segment-IDs;
- AtomicClaim-IDs;
- ClaimSourceRelation-IDs;
- SourceFamilies/Independence;
- berücksichtigte/ausgelassene Gegenbelege;
- Freshness/Jurisdiction/Generalizability;
- Original-/Reading-Language-Status;
- offene Research Gaps;
- #629/E150 Role-/Run-Referenzen und Provider/Model/Policy/Prompt als Processing-Provenienz;
- Human-Review-Revision;
- Dossier-/Decision-/Swipe-Handoff.

Provider-/Modell-Trace ist **Verarbeitungsprovenienz**, keine externe Evidenz.

---

## 11. Pflicht-Fixtures

Nach Autorisierung mindestens:

1. Satiresegment + normalisierter Faktenclaim bleiben getrennt.
2. Sendung + Sender-Faktencheck + gemeinsame Primärquelle zählen nicht mehrfach unabhängig.
3. Faktencheck-Quelle stützt Claim nur teilweise → kein extern verifizierter Fakt.
4. Talkshow-Gast macht Claim → Sprechersegment trägt Aussage.
5. Unsicheres automatisches Transkript → kein verifiziertes Wortzitat.
6. Original + Übersetzung/Lesefassung → eine Evidence Root.
7. Gleiche Agenturmeldung in drei Medien → eine SourceFamily.
8. Zwei echte unabhängige Primärquellen → getrennte Roots.
9. Gut belegter UK-/US-Claim → keine automatische DE-Faktenpromotion.
10. Neuer Bericht wiederholt bekannten Claim → Dossier-Delta, kein neues Topic.
11. Neue Primärquelle widerspricht altem Finding → Conflict + Re-Review.
12. Veraltete Statistik → Freshness-Gate.
13. Gutes Dossier ohne Entscheidung → kein Swipe.
14. DecisionQuestion mit unvollständiger Folgeevidenz → Review.
15. Mehrere LLMs auf gleicher Quelle → keine zusätzliche Unabhängigkeit.
16. Translation/Summary → keine zusätzliche Evidenz.
17. Cross-Lingual Similarity ohne eindeutige Identität → Review, kein Auto-Merge.
18. Abgelaufenes Video → Availability ändert sich, kanonische IDs bleiben nachvollziehbar.
19. Fehlende kanonische ID → Graph erfindet sie nicht.
20. Ein Implementierungsversuch mit semantischem Duplicate-Typ/Store muss durch Architektur-/Contract-Test oder Review-Gate scheitern.
21. C13 versucht einen zweiten YouTube-/Media-Loader → Architecture Gate fail.
22. T9 versucht eigenen Runner/Composer/Provider-Router neben #629/E150 → Architecture Gate fail.
23. G6 versucht dritte Evidence-/Graph-Collection → Architecture Gate fail.
24. Legacy `EvidenceClaimDoc.meta.confidence` widerspricht mehrdimensionalem `EvidenceAssessment` → keine Truth-Promotion; Review/Adapterpfad.

---

## 12. Spätere Implementierungsslices — ausschließlich in bestehenden Ownern

Nur nach OpenTasks-Serialisierung + positivem Preflight.

### C13.1 — Source/Media Adapter Gap Inventory

- Inventar gegen `DurableSourceSnapshot`, `SourceArtifact`, `SourceSegment`, vorhandene Material-/Source-Adapter und #644;
- nur belegte fehlende Medienmetadaten additiv ergänzen;
- keine neue C13-Entity/Collection;
- Fixtures ohne Live-Provider.

### C13.2 — Provider-neutral Extraction Handoff

- strukturierter Output ausschließlich als Candidate auf vorhandene AtomicClaim-/Segment-Typen;
- Ausführung über bestehende #629-Rollen, soweit autorisiert;
- Gemini/andere Provider nicht in C13 hardcodieren;
- keine Truth-Promotion.

### T9.1 — Global Verification Profile Contract

- fachliche Anforderungen auf bestehende #629 typed roles mappen;
- bestehende `ClaimSourceRelation`, `SourceFamily`, `EvidenceAssessment`, `SynthesisReceipt` komponieren;
- Factcheck-of-factcheck;
- Counterevidence/Freshness/Jurisdiction/Generalizability;
- **kein neuer Runner und kein neues Assessment-Modell**.

### T9.2 — Dossier Delta Handoff

- bestehenden CanonicalTopic-Resolver nutzen;
- bestehenden Dossier-Owner aktualisieren;
- Delta-/Revalidation-Receipt;
- keine zweite Dossier-Persistenz.

### T9.3 — Decision Readiness Handoff

- bestehende DecisionQuestion-/Source-/Swipe-Gates konsumieren;
- kein Auto-Publish.

### G6.0 — Evidence/Graph Ownership & Projection Convergence

- Atomic Contract vs Analyze EvidenceGraph vs Core Evidence Store vs Sync-Pfad inventarisieren;
- Domain/Persistence/Readmodel/Legacy/Write-direction eindeutig festlegen;
- nötige Versionierungs-/Adapterstrategie dokumentieren;
- keine neue Collection.

### G6.1 — Derived Projection

- ausschließlich bestehende IDs/Revisionen/Receipts;
- vorhandene Graph-/Evidence-Flächen erweitern oder konvergieren;
- Relations/Indices/Readmodel;
- keine neue Truth-Persistenz.

### G6.2 — Consumer Readmodel

- topic-first Transparenz;
- Herkunft/Video/Locator/Sources sichtbar;
- keine Medienherkunft als Primärthema;
- Consumer lesen eine geklärte Projection, keine konkurrierenden Wahrheiten.

---

## 13. OpenTasks-Zielserialisierung

Der #447 Single Writer soll die drei IDs als **Integrations-/Ausführungsslices** registrieren, nicht als neue Domain-Owner:

- C13 — `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`
- T9 — `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01`
- G6 — `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01`

Empfohlener Startzustand:

```text
C13 = codex_ready
  authorization: preflight_only
  live media acquisition: delegated to #644

T9 = blocked
  depends on: C13 contract/adapter evidence
              + available/authorized #629/E150 execution role for runtime slices

G6 = blocked
  depends on: T9 verified handoff
              + Evidence/Graph Convergence Matrix
```

Nicht zulässig ist eine Lesart, nach der C13/T9/G6 #586/#587 neu implementieren, #629 duplizieren oder #644 umgehen dürften.

---

## 14. P0/P1 Guardrails

Als P0/P1-relevante Architekturfehler behandeln:

- neue zweite Topic-/Claim-/Evidence-/Dossier-SSOT;
- dritte Evidence-/Graph-SSOT neben Analyze/Core-Evidence-Flächen;
- eigener `Observation`-Store trotz vorhandener Snapshot-/Source-Identität;
- zweiter T9-Orchestrator/Runner/Composer neben #629/E150;
- zweiter C13-Media-/YouTube-Loader neben #644;
- Medien-/Faktencheck-Label als Truth Authority;
- Übersetzung als unabhängige Evidenz;
- gleiche Root Source mehrfach als unabhängige Bestätigung;
- fehlende Speaker Attribution sicher behauptet;
- fremde Jurisdiktion als lokale Tatsache;
- stale Daten ohne Freshness-Gate;
- scalar Legacy-`confidence` erhöht neueren Evidence-Status;
- Graph/LLM erzeugt Domain Truth;
- politisches Ranking aus Research-Evidenz;
- Auto-Publish/Auto-Merge/Auto-Truth-Promotion;
- Dossier oder Swipe ohne Human Review finalisiert.

---

## 15. Nicht-Ziele

Dieser Run-Pack autorisiert nicht:

- Vollcrawler oder ungeregeltes Scraping;
- dauerhafte Spiegelung fremder Videos/Audioinhalte;
- Copyright-/Lizenzannahmen;
- neue Datenbank/Collection/Migration ohne belegte neue Identität/Lifecycle;
- neue AI-Orchestrator-/Runner-Runtime;
- neue Media-Acquisition-Runtime außerhalb #644;
- Provider-/Secret-Aktivierung;
- Live-Research in Production;
- neue öffentliche Dossier-/Swipe-Publishing-Automation;
- politische Empfehlung oder Ranking;
- automatische Topic-/Claim-/Actor-Fusion;
- Ersetzung bestehender Topic-, Analyze/Evidence-, Core-Evidence-, Dossier-, Language-, Source-, AI-Orchestration-, Graph- oder Swipe-Owner durch parallele Strukturen.

---

## 16. Startbedingung

Vor jedem technischen Slice zwingend:

```text
OpenTasks serialisiert
→ taskbezogener Preflight
→ semantic-duplicate inventory gegen vorhandene Domain- UND Runtime-Owner
→ #629/#644 collision/dependency check, falls AI/Media betroffen
→ Evidence/Graph Convergence Matrix, falls G6/Evidence persistence betroffen
→ executable: true
→ branchCreationAllowed: true
→ aktuelles main + Collision Map
→ exakt vorhandenen Domain-/Runtime-Owner erweitern oder Adapter/Projection bauen
→ fokussierte Tests + Typecheck/Lint/Build soweit relevant
→ Exact-Head-CI
→ Reviewthreads / Gegenprobe
→ Human Review
→ Single-Writer-Reconciliation
```

Bis dahin sind ausschließlich Governance-, Dokumentations-, Dependency- und vorbereitende Audit-Arbeiten erlaubt.