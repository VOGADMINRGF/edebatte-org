# C13 / T9 / G6 — Convergence & Collision Preflight

Stand: 2026-09-20  
Base audit: `main@6043d9292b94333484117f45b9d0acbb872ffd11`  
PR: #953  
Issues: C13 #950 · T9 #951 · G6 #952  
Status: **Governance/Preflight only. Keine Runtime-, Schema-, Persistenz-, Provider-, Graph- oder Production-Freigabe.**

## 1. Zweck

Dieser Preflight beantwortet vor dem ersten Produktcode die Frage:

> Wie erweitern wir eDebatte um internationale, mehrsprachige Media-/Event-Research-Intelligence, ohne eine zweite Topic-, Source-, Claim-, Evidence-, Dossier-, AI-Orchestration-, Media-Acquisition- oder Graph-Wahrheit zu erzeugen?

Die Antwort ist verbindlich:

> **Ein fachliches Konzept = ein kanonischer Domain-Owner. Eine Ausführungsrolle = eine kanonische Runtime. Neue Fähigkeiten werden als additive Felder, Adapter, Relations, Profile oder Derived Readmodels am bestehenden Owner ergänzt.**

`docs/E150/OpenTasks.md` bleibt operative SSOT. Solange C13/T9/G6 dort nicht verlustfrei serialisiert und taskbezogen freigegeben sind, bleibt jeder technische Schritt unterhalb dieses Dokuments gesperrt.

---

## 2. Verifizierte Canonicals auf `main`

### 2.1 Observation / Source Snapshot

Owner: `features/feeds/sourceSnapshot.ts`

Bereits vorhanden:

- `DurableSourceSnapshot.snapshotId` = Observation Identity;
- `DurableSourceSnapshot.contentId` = immutable Content Identity;
- `contentHash`, `retrievedAt`, `publishedAt`, `modifiedAt`;
- `supersedes`;
- Rechte-/Lizenzfelder;
- offline replay mit Hash-/Length-Verifikation;
- Review-first / `autoPublishAllowed=false`.

**Folge:** Kein neues `Observation`-Repository, kein zweiter Snapshot-Store.

### 2.2 Source / Segment / Atomic Claim / Evidence Semantics

Owner: `features/analyze/atomicClaimSourceRelationContract.ts`

Bereits vorhanden:

- `SourceArtifact`;
- `SourceSegment` mit `locator`, `speaker`, Transkriptions- und Übersetzungsstatus;
- `AtomicClaim` + Scope für Subject/Predicate/Object/Time/Jurisdiction/Population/Quantification;
- `SourceFamily`;
- `ClaimSourceRelation`;
- mehrdimensionales `EvidenceAssessment`;
- `PublicationClassification`;
- `SynthesisReceipt`;
- Fail-closed Resolver für verifizierte Fakten;
- Translation zählt nicht als Evidence;
- gleiche Source Family zählt nicht mehrfach unabhängig.

`features/analyze/atomicClaimSourceRelationAdapter.ts` besitzt bereits einen legacy-sicheren `AnalyzeResult -> AtomicClaimEvidenceHandoff` und erfindet ausdrücklich keine SourceSegments, Relations, Independence oder Publication Eligibility.

**Folge:** Keine `MediaClaim`, `GlobalEvidence`, `T9Assessment`, `TranslatedClaim` oder zweite SourceFamily-/EvidenceAssessment-Taxonomie.

### 2.3 Topic / Jurisdiction / Decision Question

Owner: `features/topic/canonicalTopicResolutionContract.ts`

Bereits vorhanden:

- `CanonicalTopic`;
- `JurisdictionContext`;
- `DecisionQuestion`;
- Fail-closed bei `languageUncertain`, `duplicateRisk`, fehlender Jurisdiction oder mehreren plausiblen Topics;
- bestehendes Topic und bestehende DecisionQuestion werden bevorzugt.

Der Web-Pfad `apps/web/src/features/create/canonicalTopicResolutionContract.ts` ist nur ein Re-export des Root-Owners und **kein zweiter Owner**.

**Folge:** Neue Implementierungen importieren direkt aus `@features/topic/canonicalTopicResolutionContract`. Der Web-Re-export bleibt ausschließlich Legacy-/Compatibility-Fläche.

### 2.4 Dossier / Research Revision Truth

Owner: bestehende `features/dossier/*`- und `core/research/*`-Contracts.

Bereits vorhanden:

- Dossier Sources, Claims, Findings, Citations und Edges;
- Citation `locator`;
- Dossier Revision Hash Chain;
- `dossierRevisionSeq` + `dossierRevisionHash` in Research-Bindings;
- Research Plan / Task bindet auf vorhandene Dossier-Revision statt zweiter Dossier-Wahrheit.

**Folge:** Media Research aktualisiert ein bestehendes Dossier als revisionsgebundenes Delta; kein `MediaDossier`.

### 2.5 AI Orchestration

Owner: bestehender E150 Policy-Orchestrator + Issue #629 / `AI-SPECIALIST-ORCHESTRATION-COMPOSITION-01`.

Bereits vorgesehen:

- typed Specialist Outputs;
- versionierte Execution Metadata;
- deterministischer Composer/Validator;
- Provider als Werkzeuge, nicht Truth Authority;
- Translation/Model Outputs sind keine Originalquelle;
- kein Auto-Publish.

**Folge:** Kein `T9Runner`, `T9Composer`, T9-Scheduler oder T9-Provider-Router.

### 2.6 Live Media Acquisition

Owner: Issue #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` plus bestehende sichere Source Loader.

**Folge:** C13 baut keinen zweiten YouTube-, Transcript-, Browser-, Gemini-Media- oder Proxy-Loader. Live Media wird über #644 konsumiert oder bleibt ehrlich `manual/degraded/unavailable`.

### 2.7 Existing Evidence/Graph Surfaces

Bereits vorhanden:

- atomarer Evidence Semantic Contract unter `features/analyze/atomicClaimSourceRelationContract.ts`;
- Analyze `EvidenceGraph` unter `features/analyze/evidenceGraph.ts` + `features/analyze/schemas.ts`;
- persistierte `core/evidence/*`-Dokumente;
- `features/evidence/syncFromAnalyze.ts` als Analyze→Core-Evidence-Sync;
- Dossier-Consumer lesen EvidenceGraph/Core Evidence.

`syncFromAnalyze.ts` bildet derzeit ältere `AnalyzeResult.claims` direkt auf `EvidenceClaimDoc` ab und leitet `meta.confidence` aus Claim-`importance` ab. Dieses skalare Compatibility-Feld darf **nie** einen neueren mehrdimensionalen `EvidenceAssessment` ersetzen oder hochstufen.

**Folge:** G6 beginnt mit Konvergenz, nicht mit einem dritten Store.

---

## 3. Echte Gaps — und wo sie hingehören

Nur die folgenden Lücken sind nach aktuellem Audit plausibel. Sie rechtfertigen **keine neue Domain**, sondern additive Erweiterungen bestehender Owner nach positiver taskbezogener Freigabe.

### 3.1 SourceSnapshot ↔ SourceArtifact stabile Bindung

`DurableSourceSnapshot` besitzt `snapshotId/contentId`; `SourceArtifact` besitzt nur `contentHashOrRevision`.

Für reproduzierbare Verification ist eine additive Referenz am bestehenden `SourceArtifact`-Owner sinnvoll, z. B. konzeptionell:

```text
snapshotRef?: snapshotId | null
contentRef?: contentId | null
```

Nicht jede Media-Quelle ist dauerhaft replaybar. Deshalb bleiben diese Felder optional; bei `retentionStatus=prohibited` darf kein künstlicher Snapshot erfunden werden.

### 3.2 Source-to-Source Lineage für Factcheck-of-Factcheck

`SourceFamily.originRef` deckt Familienidentität ab, aber ein Faktencheck kann mehrere upstream Dokumente/Studien/Datensätze zitieren. Für zirkuläre Zitation und Root-Independence fehlt eine explizite Source→Source-Lineage-Relation.

Diese Relation gehört in den bestehenden Analyze/Evidence-Owner, nicht in G6. G6 projiziert sie nur.

Erforderliche Semantik mindestens:

```text
cites
quotes
summarizes
derived_from
syndicates
uses_dataset
uses_study
uses_interview
```

Die Relation muss auf bestehende `SourceArtifact.id` zeigen. Kein eigener Lineage-Store, solange bestehende Evidence-Persistenz dieselben IDs versioniert abbilden kann.

### 3.3 Generische Media-Metadaten

Für TV/Streaming/Podcast/Talkshow/Video fehlen strukturierte, generische Metadaten. Diese gehören als optionale Metadaten an `SourceArtifact`/`SourceSegment`, nicht in eine neue Media-Domain.

Mindestbedarf:

- `mediumKind`;
- Programme/Series Ref;
- Episode Ref/Title/Date;
- public original media URL;
- duration;
- availability status + optional `availableUntil` + `lastCheckedAt`;
- subtitle/transcript availability;
- supplemental refs (`fact_check`, `transcript`, `show_notes`, `source_list`, `document`);
- declared source role (`origin`, `evidence`, `counter_evidence`, `context`);
- Segment speaker role / attribution state.

`SourceSegment.locator`, `speaker`, `transcriptionStatus` und `translationStatus` bleiben kanonisch und werden nicht dupliziert.

### 3.4 Cross-Lingual Topic Labels ohne neue Topics

`CanonicalTopic.id/key` kann sprachunabhängige Identität tragen, besitzt aktuell aber nur `canonicalTitle`.

Für internationale Deduplication benötigt derselbe Topic-Owner lokalisierte Labels/Aliase. **Keine Topic-Kopie pro Sprache.**

Wichtig: Content-/Source-Sprache und UI-Sprache bleiben getrennt. `AtomicClaim.originalLocale` und `SourceArtifact.originalLocale` sind bereits freie Strings; eine Quelle kann daher eine Sprache besitzen, die die UI noch nicht aktiv unterstützt.

Ein späterer Owner-Slice soll bevorzugt locale-tagged Labels/Aliase am `CanonicalTopic` ergänzen und nicht auf eine ausschließlich UI-sprachliche Enumeration reduzieren.

Cross-Language Matching bleibt Candidate/Similarity-Signal. `languageUncertain` muss weiter fail-closed Human Review auslösen.

### 3.5 Reproduzierbare Verification Receipts

`SynthesisReceipt` besitzt bereits Claim-/Segment-/Relation-/Family-Refs sowie Modell-, Prompt-, Policy- und Human-Review-Versionen. Für vollständige Replay-/Revisionstreue fehlen derzeit direkte Bindungen an die konkrete SourceArtifact-/Snapshot-/Content-Revision und – bei Dossierläufen – die kanonische Dossier-Revision.

Ziel ist **keine neue Receipt-Domain**, sondern additive Revision Bindings im bestehenden Receipt oder ein eindeutig versionierter Adapter auf vorhandene IDs:

```text
Source artifact/content revision bindings
Dossier revision binding when applicable
Evidence contract version
assessment/review timestamp
```

`caseId/caseRevision` dürfen verwendet werden, wenn der Preflight eindeutig beweist, dass sie die vorhandene Dossier-/Case-Revision verlustfrei abbilden. Andernfalls nur minimale additive Binding-Felder beim bestehenden Owner.

---

## 4. One Canonical Write / Multiple Compatibility Reads

Langfristige Zielrichtung für Evidence:

```text
canonical semantic contract
features/analyze/atomicClaimSourceRelationContract.ts
                ↓
versionierter persistence adapter
                ↓
existing core/evidence persistence
                ↓
Analyze/Dossier/Graph readmodels + compatibility adapters
```

### 4.1 Semantik-Owner

`features/analyze/atomicClaimSourceRelationContract.ts` bleibt fachlicher Owner für:

- AtomicClaim;
- SourceArtifact/SourceSegment;
- SourceFamily/Independence;
- ClaimSourceRelation;
- EvidenceAssessment;
- PublicationClassification;
- SynthesisReceipt.

### 4.2 Persistence Owner

Es wird **keine neue Evidence-Collection** eröffnet. Der erste G6/T9-Persistence-Slice muss prüfen, wie `core/evidence/*` versioniert/additiv dieselben kanonischen IDs und mehrdimensionalen Assessments speichern kann.

### 4.3 Legacy Analyze Sync

`features/evidence/syncFromAnalyze.ts` wird perspektivisch Compatibility-Adapter, nicht Truth-Producer.

Nach Freigabe soll gelten:

- `AnalyzeResult` zuerst über den vorhandenen `buildAtomicClaimEvidenceHandoff` normalisieren;
- ungebundene Claims bleiben `requiresHumanReview=true`;
- kein `importance -> truth confidence` Mapping;
- kein `verified` ohne SourceSegment/Relation/Independence/Assessment;
- Legacy `meta.confidence` darf höchstens UI-/Ranking-Kompatibilität signalisieren und nie PublicationClassification/EvidenceAssessment erhöhen;
- alte Consumer bleiben read-kompatibel, bis sie auf kanonische IDs migriert sind.

### 4.4 Write Direction

Verboten:

```text
Graph/readmodel -> Evidence truth
Legacy scalar confidence -> EvidenceAssessment promotion
Model majority -> Source independence
Translation -> new evidence root
Media/factcheck label -> verified fact
```

---

## 5. Delta-Invalidierung statt Voll-Neuberechnung

Neue Source-Beobachtungen sollen nur abhängige Wahrheitsteile revalidieren.

### 5.1 Dependency Chain

```text
contentId / SourceArtifact revision
    ↓
SourceSegment
    ↓
ClaimSourceRelation
    ↓
EvidenceAssessment / SynthesisReceipt
    ↓
Dossier Finding / Research Result
    ↓
DecisionQuestion / consequence evidence
    ↓
Swipe review readiness
```

### 5.2 Deterministische Invalidierungsfälle

- **Source content changed:** betroffene Segmente/Relations/Assessments/Findings werden stale/review-required; alte Revision bleibt nachvollziehbar.
- **URL expired/unreachable, Content unverändert:** Availability ändert sich; historische Evidenz wird nicht rückwirkend gelöscht. Neue öffentliche Darstellung kann `source currently unavailable` anzeigen.
- **nur Reading View/Übersetzung geändert:** keine Evidence-Promotion und normalerweise keine Original-Claim-Invalidierung.
- **Speaker Attribution korrigiert:** betroffene reported-speech Claims/Quotes müssen re-reviewed werden.
- **neue Counterevidence:** bestehender Claim bleibt identisch; EvidenceAssessment/Synthesis/Dossier-Finding wird revalidiert.
- **Jurisdiction/Applicability geändert:** Topic-ID bleibt; betroffene Generalizability/Decision Readiness wird revalidiert.
- **nur neuer Medienbeitrag mit bereits bekannten Claims und derselben Root Source:** Dossier-Delta/Provenienz, kein künstlicher Independent-Support-Zuwachs.

Kein Delete+Recreate von CanonicalTopic/Dossier/Claim, wenn dieselbe fachliche Identität fortbesteht.

---

## 6. Derived-AI Cache ohne Truth Cache

Zur Kosten-/Latenzoptimierung darf später nur **abgeleitete Verarbeitung** gecacht werden, nie Wahrheit oder Publication Eligibility.

Geeigneter Cache-Key konzeptionell:

```text
contentId or immutable artifact revision
+ specialist role
+ contractVersion
+ promptVersion
+ policyVersion
+ model/provider execution version where relevant
```

Cachebare Kandidaten:

- StructureResult;
- bounded extraction/coverage candidates;
- normalized claim candidates;
- translation reading views;
- deterministic parsing outputs.

Nicht als Wahrheit cachebar:

- `EvidenceAssessment.externalVerificationStatus` ohne Revalidation Policy;
- Source Independence nach veränderter Lineage;
- PublicationClassification;
- Dossier/Decision/Swipe Release Readiness;
- Human Review.

Rights-/Retention-Regeln gelten vor Cache-Nutzung. `retentionStatus=prohibited` darf nicht durch einen Derived Cache umgangen werden.

---

## 7. Technischer Architecture-Collision Guard — nach OpenTasks-Freigabe

Der bestehende `scripts/ci/check-repository-integrity-guards.mjs` schützt bereits Root-Domain-Ownership und geschützte Evidence-Dokumente. Der nächste zulässige CI-Hardening-Slice soll diese Infrastruktur erweitern, **keinen zweiten Guard-Runner bauen**.

### 7.1 Protected canonical definition owners

Neue oder geänderte Dateien dürfen folgende Canonical-Symbole nicht außerhalb des jeweiligen Owners **neu definieren**:

| Symbol | erlaubter Canonical Owner |
| --- | --- |
| `CanonicalTopic` | `features/topic/canonicalTopicResolutionContract.ts` |
| `JurisdictionContext` | `features/topic/canonicalTopicResolutionContract.ts` |
| `DecisionQuestion` | `features/topic/canonicalTopicResolutionContract.ts` |
| `DurableSourceSnapshot` | `features/feeds/sourceSnapshot.ts` |
| `SourceArtifact` | `features/analyze/atomicClaimSourceRelationContract.ts` |
| `SourceSegment` | `features/analyze/atomicClaimSourceRelationContract.ts` |
| `AtomicClaim` | `features/analyze/atomicClaimSourceRelationContract.ts` |
| `SourceFamily` | `features/analyze/atomicClaimSourceRelationContract.ts` |
| `ClaimSourceRelation` | `features/analyze/atomicClaimSourceRelationContract.ts` |
| `EvidenceAssessment` | `features/analyze/atomicClaimSourceRelationContract.ts` |
| `PublicationClassification` | `features/analyze/atomicClaimSourceRelationContract.ts` |
| `SynthesisReceipt` | `features/analyze/atomicClaimSourceRelationContract.ts` |

Re-export/Import ist erlaubt. Neue Definition (`type/interface/class/schema/const` mit derselben Domain-Identität) außerhalb des Owners ist Guard-Failure.

### 7.2 Canonical import path

Neue oder geänderte Produktdateien sollen `CanonicalTopic`/`DecisionQuestion`/`JurisdictionContext` direkt aus `@features/topic/canonicalTopicResolutionContract` importieren. Der bestehende Web-Re-export bleibt Compatibility-Fläche, darf aber nicht als neuer Owner propagiert werden.

Historische Evidence-Dokumente werden nicht rückwirkend umgeschrieben; neue Docs müssen den aktuellen Owner nennen oder einen Supersession-Hinweis enthalten.

### 7.3 Runtime collision checks

C13/T9/G6-Code darf keine zweite Runtime definieren, die semantisch bereits #629/E150 oder #644 gehört. Mindestens explizite negative Fixtures für:

- `T9Runner` / `T9Composer` / separater T9 Provider Router;
- C13 YouTube-/Transcript-/Media Loader;
- G6 Evidence Collection / Graph Store;
- neuer Observation Store parallel zu SourceSnapshot.

Der Guard soll Pfad-/Definition-/Owner-Regeln prüfen, nicht bloß fragile Dateinamen.

### 7.4 Tests

Erweiterung der bestehenden `apps/web/tests/repository-integrity-guards.contract.test.ts` mit positiven und negativen Fixtures. Kein neues Testframework.

---

## 8. Cross-Lingual Contract ohne ClaimExpression-Doppelstruktur

`SourceSegment` besitzt bereits:

- `originalText`;
- `readingView`;
- `translationStatus`;
- `transcriptionStatus`;
- `speaker`;
- `locator`.

Damit ist eine neue persistente `ClaimExpression`-Entität derzeit **nicht gerechtfertigt**.

Regel:

- Originalsegment bleibt Evidence Basis;
- Reading View ist Darstellung;
- AtomicClaim behält `originalLocale`;
- locale-tagged Topic Labels dienen Discovery/UI, nicht Evidence;
- Übersetzung erzeugt keine SourceFamily und keinen Independent Support;
- maschinelle Übersetzung ohne Review kann Topic-/Claim-Matching unterstützen, aber niemals allein einen Auto-Merge oder verified fact auslösen.

---

## 9. Pflicht-Fixtures für die erste technische Umsetzung

Zusätzlich zu den Fixtures aus dem Haupt-Run-Pack:

1. neuer Typ `CanonicalTopic` außerhalb des Owners → CI fail;
2. Re-export des CanonicalTopic-Owners → erlaubt;
3. neuer Produktimport über alten Web-Re-export → CI fail oder klare Migration Warning, abhängig vom finalen Guard-Modus;
4. `AnalyzeResult.importance=5` ohne SourceRelation/EvidenceAssessment → niemals verified;
5. `SourceSnapshot.contentId` bindet SourceArtifact revisionstreu → replaybarer Verification-Fall;
6. nicht replaybare Media Source ohne Snapshot → Artifact/Segment bleibt zulässig, Snapshot wird nicht erfunden;
7. Factcheck zitiert drei Quellen, zwei davon gleiche Root Study → Independence zählt korrekt;
8. Zitationszyklus A→B→A → kein künstlicher Independent-Support;
9. Topic DE/EN/FR Aliase → eine Topic-ID;
10. Quelle in nicht aktivierter UI-Sprache → OriginalLocale bleibt erhalten; UI-Fallback erzeugt keine neue Evidenz;
11. Content A→B→A → A teilt `contentId`, neue Observation behält eigenes `snapshotId`;
12. Source URL expired → Historical Receipt bleibt reproduzierbar; Availability ändert sich;
13. Speaker Attribution geändert → nur abhängige reported-speech Claims werden stale;
14. Translation Reading View geändert → EvidenceAssessment bleibt unverändert;
15. neue Counterevidence → Receipt/Finding re-review, Claim-ID bleibt;
16. cache hit mit anderer `promptVersion`/`contractVersion` → miss;
17. cache hit mit `retentionStatus=prohibited` → nicht persistent wiederverwenden;
18. Graph projection versucht Evidence status hochzustufen → fail;
19. G6 versucht neue Evidence Collection → architecture fail;
20. C13 versucht zweiten Media Loader → architecture fail;
21. T9 versucht eigenen Runner → architecture fail.

---

## 10. Zulässige Implementierungsreihenfolge nach SSOT-Serialisierung

### Slice 0 — Architecture collision hardening

Nur nach positiver OpenTasks-/Preflight-Freigabe:

- bestehenden Repository Integrity Guard erweitern;
- protected canonical owner map;
- aktuelle Topic-Importregel;
- fokussierte Contract-Tests.

Keine Domain-/DB-/Runtimeänderung.

### Slice 1 — C13 additive Source/Segment metadata

- ausschließlich belegte Gaps;
- Snapshot/Content refs am bestehenden SourceArtifact;
- Media metadata/availability/supplemental refs;
- Speaker attribution detail;
- Source-to-Source lineage;
- keine Collection.

### Slice 2 — Evidence persistence convergence

- Ownership/Projection Matrix final bestätigen;
- `core/evidence` als bestehende Persistenzfläche versioniert an Canonical IDs/Assessments anbinden;
- `syncFromAnalyze` auf canonical handoff/fail-closed Candidate-Semantik umstellen;
- Legacy read compatibility erhalten;
- kein Big-Bang delete/migration.

### Slice 3 — T9 verification profile + revision-bound receipt

- ausschließlich über #629/E150 ausführen;
- Factcheck-of-factcheck;
- counterevidence/source-lineage/freshness/jurisdiction/generalizability;
- Source/Dossier revision binding im bestehenden Receipt/Handoff;
- Delta invalidation.

### Slice 4 — CanonicalTopic multilingual labels

- derselbe Topic Owner;
- locale-tagged aliases/reading labels;
- kein Topic pro Sprache;
- language-uncertain remains fail-closed.

### Slice 5 — G6 derived projection

- vorhandene IDs/Revisionen/Receipts projizieren;
- Legacy Analyze/Core-Evidence Readmodel adapter;
- kein neuer Truth Store;
- kein Graph→Truth Feedback.

---

## 11. Stop Conditions

Jeder spätere Agent muss den Slice stoppen und als Architecture Collision melden, wenn er für die Aufgabe glaubt, eines der folgenden Dinge neu zu benötigen:

- zweiten Topic-/Claim-/Source-/Evidence-/Dossier-Store;
- neue Evidence-Taxonomie parallel zu `EvidenceAssessment`;
- eigenen T9-Orchestrator;
- eigenen C13-Media-Loader;
- neuen G6-Graph-Truth-Store;
- neue persistente Übersetzungs-/ClaimExpression-Wahrheit;
- automatisches Truth-/Publish-/Decision-Promoting aus Modelloutput;
- neue per-language Topic-ID für dieselbe Sache.

Erlaubte Reaktion ist dann nicht „trotzdem bauen“, sondern:

1. Collision gegen Canonical Owner dokumentieren;
2. prüfen, ob additive Owner-Erweiterung genügt;
3. falls wirklich neue Identität/Lifecycle vorliegt, separate Governance-Entscheidung + OpenTasks-Serialisierung;
4. bis dahin fail-closed.

---

## 12. Preflight-Ergebnis

**Architekturentscheidung:** PASS für Fortführung als konvergierende Erweiterung, **BLOCKED für Produktcode bis OpenTasks-Serialisierung/positivem taskbezogenem Preflight**.

Die beste Zielrichtung ist nicht eine zusätzliche Media-/Research-Plattform im Repository, sondern eine strengere Verbindung der bereits vorhandenen Canonicals:

```text
SourceSnapshot
  -> SourceArtifact / SourceSegment
  -> AtomicClaim / ClaimSourceRelation / SourceFamily
  -> EvidenceAssessment / SynthesisReceipt
  -> CanonicalTopic / Jurisdiction
  -> Dossier revision / Research
  -> DecisionQuestion / existing Swipe gates
  -> derived Graph projection
```

#629 bleibt AI-Orchestrator. #644 bleibt Live-Media-Acquisition-Owner. `core/evidence` wird konvergiert statt ersetzt. Übersetzung bleibt Reading View. Topic bleibt sprachunabhängige Identität. Herkunft bleibt vollständig sichtbar, aber das Thema steht im Zentrum.