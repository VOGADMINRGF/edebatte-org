# C13 / T9 / G6 — Global Topic Intelligence & Media Research Run-Pack

Stand: 2026-09-20
Revision: 2 — Convergence correction

Status: Governance-, Architektur- und Ausführungsvorbereitung. **Keine Runtime-, Schema-, Provider-, Graph-, Publish- oder Production-Freigabe.**

Operative Anker:

- C13 / Issue #950 — `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`
- T9 / Issue #951 — `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01`
- G6 / Issue #952 — `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01`
- OpenTasks Single-Writer: Issue #447
- Canonical Topic Owner: `features/topic/canonicalTopicResolutionContract.ts` / Issue #586
- Atomic Claim ↔ Source / Evidence Owner: `features/analyze/atomicClaimSourceRelationContract.ts` / Issue #587
- Durable source observation owner: `features/feeds/sourceSnapshot.ts`

Diese Datei ist **kein zweiter Backlog und keine neue Domain-Architektur**. `docs/E150/OpenTasks.md` bleibt die operative SSOT.

## Revisionshinweis

Die erste Fassung dieses Run-Packs behandelte #586/#587 zu konservativ als noch nicht implementierte Voraussetzungen. Das ist auf aktuellem `main` nicht mehr korrekt:

- `CanonicalTopic`, `JurisdictionContext`, `DecisionQuestion` und der fail-closed Resolver existieren bereits unter `features/topic/canonicalTopicResolutionContract.ts`;
- `SourceArtifact`, `SourceSegment`, `AtomicClaim`, `ClaimSourceRelation`, `SourceFamily`, `EvidenceAssessment`, `PublicationClassification` und `SynthesisReceipt` existieren bereits unter `features/analyze/atomicClaimSourceRelationContract.ts`;
- `DurableSourceSnapshot.snapshotId` ist bereits ausdrücklich die **Observation identity**, `contentId` die immutable Content Identity;
- Dossier- und Research-Owner existieren bereits im Decision-Dossier-Track.

Daraus folgt verbindlich:

> **C13, T9 und G6 dürfen keine zweite Struktur eröffnen. Sie dürfen nur bestehende kanonische Owner adaptieren, orchestrieren und projizieren.**

---

## 1. Zielarchitektur: ein System, eine Wahrheit pro Konzept

Für eDebatte gilt:

> **Thema zuerst, Herkunft danach. Ein kanonisches Fachobjekt pro fachlicher Identität.**

Ein Medienbeitrag, Podcast, Video, Faktencheck, Interview, Parlamentsbeitrag, Artikel oder sonstiges Material kann ein Thema entdecken, aktualisieren, belegen, einschränken oder widersprechen. Es wird dadurch weder zum öffentlichen Primärobjekt noch zur Wahrheitsinstanz.

Die kanonische Kette lautet:

```text
SourceRef / external material
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
derived Graph/Readmodel projection
```

Keine Stufe darf dieselbe fachliche Wahrheit unter einem zweiten Namen neu persistieren.

---

## 2. Kanonische Mapping-Matrix

| Fachliches Konzept | Kanonischer Owner auf `main` | C13 darf | T9 darf | G6 darf |
| --- | --- | --- | --- | --- |
| Observation bei durablem Fetch | `DurableSourceSnapshot.snapshotId` | erzeugen über bestehenden Fetch-/Snapshot-Pfad | referenzieren | projizieren |
| Immutable Content Identity | `DurableSourceSnapshot.contentId` | referenzieren | deduplizieren/revalidieren | projizieren |
| Quelle | `SourceArtifact` | Candidate/Adapter auf bestehenden Typ | konsumieren | ID projizieren |
| Quellsegment / Timecode / Passage | `SourceSegment` | segmentieren/binden | verifizieren | ID + Relation projizieren |
| Atomare Aussage | `AtomicClaim` | Candidate erzeugen | normalisieren/verifizieren | projizieren |
| Claim↔Source-Beziehung | `ClaimSourceRelation` | Candidate erzeugen | prüfen/aktualisieren | Relation projizieren |
| Quellenfamilie / Unabhängigkeit | `SourceFamily` + Relation-Independence | Hints liefern | bestimmen/prüfen | projizieren |
| Evidenzbewertung | `EvidenceAssessment` | niemals Truth-Promotion | aktualisieren innerhalb Owner-Semantik | nur lesen/projizieren |
| Publikationsklasse | `PublicationClassification` | nicht setzen außer bestehende Resolverlogik | bestehende Resolverlogik anwenden | nur lesen |
| Synthese-/Verification-Receipt | `SynthesisReceipt` | Inputs referenzieren | erzeugen/validieren innerhalb Owner | projizieren |
| Thema | `CanonicalTopic` | Candidate-Input liefern | bestehenden Resolver nutzen | Topic-ID projizieren |
| Jurisdiktion | `JurisdictionContext` | Metadaten liefern | bestehenden Resolver/Assessment nutzen | projizieren |
| konkrete Entscheidungsfrage | `DecisionQuestion` | nie aus Material automatisch finalisieren | Candidate nur über bestehenden Owner | projizieren |
| Dossier / Research | bestehende Dossier-/Research-Owner | Handoff liefern | Delta aktualisieren | Dossier-ID/Revision projizieren |
| Graph | bestehende Reason-/Graph-Projektion | nichts kanonisieren | nichts kanonisieren | ausschließlich derived projection |

### Harte Schlussfolgerung

Ein neues Objekt wie `Observation`, `MediaClaim`, `GlobalEvidence`, `T9Assessment`, `G6TopicNode`, `MediaDossier`, `FactcheckTruth`, `TranslatedClaim` oder ein zweiter `SourceFamily`-Typ ist **nicht zulässig**, wenn es dieselbe Identität oder denselben Lifecycle wie ein vorhandener Owner abbildet.

---

## 3. No-semantic-duplicate gate

Vor jedem neuen Typ, Contract, Store, Repository, Collection, Graph-Knotenmodell oder Persistenzfeld muss der Agent beantworten:

1. Existiert dieselbe fachliche Identität bereits unter anderem Namen?
2. Ist das Neue nur eine medien-, provider-, sprach- oder UI-spezifische Variante?
3. Kann die Information als additive Metadaten, Adapter-Output oder Referenz am bestehenden Owner geführt werden?
4. Würde ein neuer Store dieselbe Wahrheit spiegeln?
5. Würde ein Graph-Knoten nur eine bereits kanonische Entity kopieren?
6. Würde ein Modelloutput als Wahrheit persistiert, obwohl er nur Candidate oder Processing-Provenienz ist?

Wenn eine Antwort `ja` ist, gilt:

> **Bestehenden Owner erweitern oder adaptieren; keine neue kanonische Struktur.**

Eine neue persistente Entity ist nur zulässig, wenn alle folgenden Punkte belegt sind:

- eigenständige Identität;
- eigenständiger Lifecycle;
- keine semantische Überschneidung mit bestehendem Owner;
- eigener fachlicher Owner;
- positive Collision-/Architecture-Prüfung;
- ausdrückliche Autorisierung im taskbezogenen Preflight.

---

## 4. C13 — Media/Event Intake Adapter

C13 ist **kein Domain-Layer** und insbesondere kein `DieAnstaltAgent`.

### Aufgabe

Internationale und mehrsprachige öffentliche Materialien über bestehende Source-/Material-/Evidence-Owner ingestieren.

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
  -> existing DurableSourceSnapshot where applicable
  -> existing SourceArtifact
  -> existing SourceSegment
  -> existing AtomicClaim candidate
  -> existing ClaimSourceRelation/SourceFamily candidate
  -> T9 orchestration
```

---

## 5. T9 — Verification Orchestration

T9 ist **kein neues Evidence-System**.

### Aufgabe

Bestehende Topic-, Claim-/Source-, Evidence-, Dossier-, Language- und Review-Owner so orchestrieren, dass internationale Research-Inputs verifiziert und als Dossier-Delta eingeordnet werden.

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
  -> AtomicClaims identifizieren
  -> verwendete SourceArtifacts/Segments erfassen
  -> upstream Primärquelle öffnen oder fehlend markieren
  -> konkrete Passage/Tabelle/Methodik/Definition prüfen
  -> ClaimSourceRelation bestimmen
  -> Zeitraum/Population/Quantifizierung prüfen
  -> Jurisdiction/Generalizability prüfen
  -> Gegenbelege/alternative Erklärungen suchen
  -> SourceFamily/Independence bestimmen
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

Nur betroffene Claims/Dossiers werden revalidiert.

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

## 8. G6 — Derived Provenance Projection

G6 ist **kein Graph-Kanon**.

### Aufgabe

Kanonische Domain-IDs, Revisionen und Receipts als nachvollziehbare Relation/Index/Readmodel projizieren.

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

- keine Auto-Fusion;
- kein Graph-write-to-truth feedback loop;
- keine fehlende Domain-Entity per Graph-Autocomplete erfinden;
- Übersetzung erzeugt keine neue Evidence Root;
- Agentenläufe erzeugen keine unabhängigen Roots;
- politische Position/Zuständigkeit nicht aus Name/Medium/Organisation ableiten;
- kein politisches Ranking oder Publish-Owner.

---

## 9. Cross-Lingual Truth

- Originalsprache bleibt Evidence-/Review-Basis.
- `SourceSegment.readingView`/bestehende Language-Bridge-Flächen bleiben Lesefassung, keine neue Quelle.
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
- Provider/Model/Policy/Prompt als Processing-Provenienz;
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

---

## 12. Spätere Implementierungsslices — ausschließlich in bestehenden Ownern

Nur nach OpenTasks-Serialisierung + positivem Preflight.

### C13.1 — Source/Media Adapter Gap

- Inventar gegen `DurableSourceSnapshot`, `SourceArtifact`, `SourceSegment`;
- nur belegte fehlende Medienmetadaten additiv ergänzen;
- keine neue C13-Entity/Collection;
- Fixtures ohne Live-Provider.

### C13.2 — Provider-neutral Extraction Adapter

- strukturierter Output ausschließlich als Candidate auf vorhandene AtomicClaim-/Segment-Typen;
- Gemini/andere Provider austauschbar;
- keine Truth-Promotion.

### T9.1 — Verification Orchestration

- bestehende `ClaimSourceRelation`, `SourceFamily`, `EvidenceAssessment`, `SynthesisReceipt` komponieren;
- Factcheck-of-factcheck;
- Counterevidence/Freshness/Jurisdiction/Generalizability;
- kein neues Assessment-Modell.

### T9.2 — Dossier Delta Handoff

- bestehenden CanonicalTopic-Resolver nutzen;
- bestehenden Dossier-Owner aktualisieren;
- Delta-/Revalidation-Receipt;
- keine zweite Dossier-Persistenz.

### T9.3 — Decision Readiness Handoff

- bestehende DecisionQuestion-/Source-/Swipe-Gates konsumieren;
- kein Auto-Publish.

### G6.1 — Derived Projection

- ausschließlich bestehende IDs/Revisionen/Receipts;
- Relations/Indices/Readmodel;
- keine neue Truth-Persistenz.

### G6.2 — Consumer Readmodel

- topic-first Transparenz;
- Herkunft/Video/Locator/Sources sichtbar;
- keine Medienherkunft als Primärthema.

---

## 13. OpenTasks-Zielserialisierung

Der #447 Single Writer soll die drei IDs als **Integrations-/Ausführungsslices** registrieren, nicht als neue Domain-Owner:

- C13 — `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`
- T9 — `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01`
- G6 — `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01`

Da #586/#587 bereits implementiert und ihre Canonicals auf `main` vorhanden sind, lautet der empfohlene Startzustand:

```text
C13 = codex_ready (preflight_only; keine Implementation ohne positiven taskbezogenen Preflight)
T9  = blocked on C13 contract/adapter evidence
G6  = blocked on T9 verified handoff contract
```

Nicht mehr zulässig ist die frühere Lesart, C13/T9/G6 müssten auf eine erneute Implementierung von #586/#587 warten oder deren Fachmodelle neu definieren.

---

## 14. P0/P1 Guardrails

Als P0/P1-relevante Architekturfehler behandeln:

- neue zweite Topic-/Claim-/Evidence-/Dossier-/Graph-SSOT;
- eigener `Observation`-Store trotz vorhandener Snapshot-/Source-Identität;
- Medien-/Faktencheck-Label als Truth Authority;
- Übersetzung als unabhängige Evidenz;
- gleiche Root Source mehrfach als unabhängige Bestätigung;
- fehlende Speaker Attribution sicher behauptet;
- fremde Jurisdiktion als lokale Tatsache;
- stale Daten ohne Freshness-Gate;
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
- Provider-/Secret-Aktivierung;
- Live-Research in Production;
- neue öffentliche Dossier-/Swipe-Publishing-Automation;
- politische Empfehlung oder Ranking;
- automatische Topic-/Claim-/Actor-Fusion;
- Ersetzung bestehender Topic-, Analyze/Evidence-, Dossier-, Language-, Source-, Graph- oder Swipe-Owner.

---

## 16. Startbedingung

Vor jedem technischen Slice zwingend:

```text
OpenTasks serialisiert
→ taskbezogener Preflight
→ semantic-duplicate inventory gegen vorhandene Owner
→ executable: true
→ branchCreationAllowed: true
→ aktuelles main + Collision Map
→ exakt vorhandenen Domain-Owner erweitern oder Adapter/Projection bauen
→ fokussierte Tests + Typecheck/Lint/Build soweit relevant
→ Exact-Head-CI
→ Reviewthreads / Gegenprobe
→ Human Review
→ Single-Writer-Reconciliation
```

Bis dahin sind ausschließlich Governance-, Dokumentations-, Dependency- und vorbereitende Audit-Arbeiten erlaubt.