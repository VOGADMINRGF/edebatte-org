# Governance SSOT Sync Patch Packet — C13 / T9 / G6 — 2026-09-20

> **Nicht kanonisch / kein zweiter SSOT.** Dieses Dokument ist ausschließlich ein verlustfreies Patch-/Review-Paket für Issue #447 und den bestehenden Single-Writer-Branch `docs/governance-ssot-sync-05`. Die operative Wahrheit bleibt ausschließlich `docs/E150/OpenTasks.md`. Produkt-/Runtime-Code ist durch dieses Paket nicht autorisiert.

## Reconciliation-Basis

- Repository: `VOGADMINRGF/edebatte-org`
- Single-Writer: Issue #447
- Single-Writer-Branch: `docs/governance-ssot-sync-05`
- Basis bei Erstellung: `main@6043d9292b94333484117f45b9d0acbb872ffd11`
- `docs/E150/OpenTasks.md` Blob bei Erstellung: `83e6e3b09f135b6a6aa2d76ffbe221db55320552`
- Architektur-/Collision-Evidence: Draft-PR #953 und `docs/E150/C13_T9_G6_CONVERGENCE_COLLISION_PREFLIGHT_2026-09-20.md`
- Task-/Owner-Delta: Issue #447, insbesondere Kommentar `#issuecomment-5751265738` plus Refinement `#issuecomment-5751600107`

## Exakte operative Delta-Semantik für `OpenTasks.md`

### C13 — CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01

- Issue: #950
- Status: `codex_ready`
- Authorization: `preflight_only`
- Priorität: P0
- Rolle: Source/Media Adapter auf bestehenden `SourceSnapshot`-, `SourceArtifact`-, `SourceSegment`- und `AtomicClaim`-Ownern.
- Erster technischer Slice **erst nach positivem taskbezogenen Preflight**: bestehenden `REPOSITORY-INTEGRITY-GUARDS-01` um Canonical-Owner-/Runtime-Collision-Checks erweitern.
- Danach ausschließlich additive SourceArtifact-/SourceSegment-Media- und Lineage-Metadaten.
- Live-Media-/YouTube-Acquisition bleibt Eigentum von #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01`.
- Verboten: zweiter Video-/Transcript-/Media-Loader, Observation-Repository, C13-Truth-Store, zweite Evidence-SSOT, Auto-Publish.
- Preflight muss Source-/Evidence-Owner und #644-Collision explizit prüfen.

### T9 — GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01

- Issue: #951
- Status: `blocked`
- Priorität: P0
- Abhängigkeiten: C13 Contract-/Adapter-Evidence **und** verfügbare/zulässige #629-/E150-Ausführungsrolle für den jeweiligen Runtime-Slice.
- Rolle: fachliches Global-Verification-Profil + Evidence-/Dossier-Gates auf bestehender #629/E150-Orchestrierung.
- Verboten: eigener T9 Runner, Scheduler, Composer, Provider-Router, `T9Assessment`, zweites Evidence-/Dossier-System.
- Zielsemantik nach Freigabe: revisionsgebundene `SynthesisReceipt`-/Verification-Receipts, Delta-Invalidierung, Factcheck-of-factcheck; kein Truth-Cache.

### G6 — PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01

- Issue: #952
- Status: `blocked`
- Priorität: P0
- Abhängigkeiten: T9 verified handoff **und** dokumentierte Evidence/Graph Convergence Matrix.
- Rolle: derived provenance projection / convergence auf vorhandenen IDs, Revisionen und Receipts.
- One canonical semantic write / compatibility reads.
- Bestehende `core/evidence`-Persistenz wiederverwenden/versionieren; keine dritte Collection und kein dritter Store.
- `features/evidence/syncFromAnalyze.ts` wird perspektivisch Compatibility-Adapter, nicht Truth Producer.
- Kein Graph→Domain-Truth-Writeback.

## Kanonische Owner, die beim Patch nicht dupliziert werden dürfen

- `features/topic/canonicalTopicResolutionContract.ts`: `CanonicalTopic`, `JurisdictionContext`, `DecisionQuestion`.
- `features/analyze/atomicClaimSourceRelationContract.ts`: `SourceArtifact`, `SourceSegment`, `AtomicClaim`, `ClaimSourceRelation`, `SourceFamily`, `EvidenceAssessment`, `PublicationClassification`, `SynthesisReceipt`.
- `features/feeds/sourceSnapshot.ts`: `DurableSourceSnapshot.snapshotId` = Observation identity; `contentId` = immutable content identity.
- #629 / `AI-SPECIALIST-ORCHESTRATION-COMPOSITION-01`: Specialist-/Provider-Komposition auf bestehendem E150-Policy-Orchestrator.
- #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01`: zuverlässige offizielle/vertraglich belastbare YouTube-/Media-Acquisition-Grenze.
- Bestehende Evidence-/Graph-Flächen: `features/analyze/evidenceGraph.ts`, `features/analyze/schemas.ts`, `core/evidence/*`, `features/evidence/syncFromAnalyze.ts`.

## Belegte historische Media-Schuld — nicht duplizieren

`apps/web/src/features/create/externalSourceIntake.ts` ist bereits als `runtime-bridge` klassifiziert und importiert derzeit direkt `fetchYoutubeTranscript` aus `@features/ai/sources/youtube`. Dieser Bestandspfad ist **historische Kompatibilität, kein neuer Canonical Owner**.

Issue #644 belegt für genau die zugrunde liegende anonyme Web-/InnerTube-Kette einen serverless Runtime-Blocker und definiert die spätere offizielle/vertraglich belastbare Media-Acquisition-Grenze. Daraus folgt für den ersten C13-Integrity-Slice:

- der bestehende Pfad darf zunächst eng und pfadgenau grandfathered bleiben, damit der Guard historische Schuld nicht rückwirkend als neue Verletzung behandelt;
- **jede neue** direkte Abhängigkeit auf `@features/ai/sources/youtube` bzw. ein neuer YouTube-/Video-/Transcript-Loader außerhalb des #644-Owners muss fail-closed blockiert werden;
- der Grandfather-Eintrag darf nicht als allgemeine Allowlist formuliert werden;
- Migration/Ablösung des bestehenden Create-Pfads gehört zu #644 bzw. einem dort autorisierten Adapter-Slice, nicht zu C13;
- C13 darf den bestehenden problematischen Loader weder kopieren noch durch einen zweiten Providerpfad umgehen.

## No-semantic-duplicate Gate

Vor jedem neuen Typ, Contract, Store, Repository, Collection, Graph-Knotenmodell oder Persistenzfeld prüfen, ob dieselbe fachliche Identität bereits existiert oder als additive Metadaten, Adapter oder Relation an einem bestehenden Owner abbildbar ist. Wenn ja, ist eine neue kanonische Entity verboten.

Zusätzliche Konvergenzregeln:

- Quellsprachen sind nicht an UI-Locale-Support gekoppelt; `originalLocale` bleibt frei.
- Eine globale `CanonicalTopic`-Identität; locale-tagged Labels/Aliase statt Topic-Kopien pro Sprache.
- `SourceSegment` bleibt Owner für Originaltext/Reading View/Translation Status/Speaker/Locator; kein paralleles `ClaimExpression`-Modell.
- Source→Source-Lineage (`cites`, `derived_from`, `syndicates`, `uses_dataset`, `uses_study`) wird als Relation am bestehenden Evidence-/Source-Owner ergänzt, nicht als neuer Truth-Store.
- AI-/Verification-Caches sind Processing-Candidates; sie dürfen Truth, Publication Status, Human Review oder Decision Readiness nicht autoritativ setzen.

## Mechanischer Apply-Contract für den kanonischen Single-Writer

Dieser Abschnitt beschreibt **nur** den späteren verlustfreien Apply in `docs/E150/OpenTasks.md`. Er ist kein Ersatz für den Apply und keine zweite operative Taskliste.

### Target und erwartete Identität

- Target: `docs/E150/OpenTasks.md`
- Expected blob SHA **vor** Apply: `83e6e3b09f135b6a6aa2d76ffbe221db55320552`
- Operative-Head-Startmarker aus `scripts/codex-task-preflight.mjs`: `## Kanonischer Operativteil`
- Eindeutiger Insert-Anchor aus `scripts/codex-task-preflight.mjs`: `## Historischer Katalog und Evidenz`
- Insert-Position: **unmittelbar vor** der einzigen exakten Zeile `## Historischer Katalog und Evidenz`.
- Der bestehende historische Body ab diesem Marker bleibt byte-/inhaltlich unverändert; kein Rekonstruieren, Kürzen, Normalisieren oder Umsortieren historischer Einträge.

### Preconditions — alle müssen erfüllt sein, sonst STOP

1. `docs/E150/OpenTasks.md` besitzt exakt Blob-SHA `83e6e3b09f135b6a6aa2d76ffbe221db55320552`.
2. `## Kanonischer Operativteil` kommt exakt einmal vor.
3. `## Historischer Katalog und Evidenz` kommt exakt einmal vor und liegt nach `## Kanonischer Operativteil`.
4. Die folgenden drei IDs kommen im operativen Bereich zwischen diesen Markern **nullmal** vor:
   - `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`
   - `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01`
   - `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01`
5. PR #953 bleibt Governance-/Canon-Evidence und wird nicht als Domain-/Runtime-Owner interpretiert.
6. Es existiert kein paralleler `OpenTasks.md`-Writer für diesen Delta-Apply; #954 / `docs/governance-ssot-sync-05` bleibt der einzige erlaubte Writer.
7. Kein bestehender Taskstatus, keine bestehende ID und keine bestehende Tabellenzeile darf für diesen Apply verändert werden.
8. Falls eine Precondition nicht mechanisch bewiesen werden kann: **kein Write**; zurück zu Review/Operator.

### Exakter einzufügender Block

Der folgende Block wird exakt einmal unmittelbar vor dem History-Marker eingefügt. Die unquoted Zellen `ID` und `Status` sind absichtlich kompatibel mit `scripts/codex-task-preflight.mjs`; Backticks gehören **nicht** in die drei ID-/Status-Zellen.

```markdown
### C13 / T9 / G6 — global research intelligence governance delta

| ID | Status | Authorization | Issue | Rolle / harte Grenze |
| --- | --- | --- | --- | --- |
| CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01 | codex_ready | preflight_only | #950 | C13 adapter-only; kein neuer Observation-/Truth-/Evidence-Store; `DurableSourceSnapshot.snapshotId` bleibt Observation Identity; #644 bleibt Media-Acquisition-Owner; erster Runtime-Slice erst nach positivem Preflight und nur als Erweiterung des bestehenden Repository-Integrity-Guards. |
| GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01 | blocked | none | #951 | T9 fachliches Verification-Profil auf #629/E150; kein T9Runner/T9Composer/T9ProviderRouter; Factchecks selbst verifizieren; Translation erzeugt keine Evidenz; Jurisdiction/Freshness/Generalizability fail-closed beachten. |
| PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01 | blocked | none | #952 | G6 ausschließlich derived/read-only; vorhandene Analyze-/`core/evidence`-Owner konvergieren; kein dritter Evidence-/Graph-Store; niemals Graph→Domain-Truth-Writeback. |

```

### Postconditions — alle müssen nach Apply gelten

1. Der neue `OpenTasks.md`-Diff besteht für diesen Delta ausschließlich aus dem **einen** oben definierten Insert-Block unmittelbar vor dem unveränderten History-Marker.
2. Die drei IDs kommen im operativen Bereich jeweils exakt einmal vor.
3. `CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01` hat exakt Status `codex_ready` und Authorization `preflight_only`.
4. `GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01` hat exakt Status `blocked`.
5. `PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01` hat exakt Status `blocked`.
6. Kein vorher existierender Taskstatus, keine vorher existierende Task-ID und kein historischer Eintrag wurde verändert, entfernt oder umsortiert.
7. `scripts/codex-task-preflight.mjs CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01` darf erst auf sauberem, **gemergtem `main`** ausgeführt werden; ein positiver Preflight ist Voraussetzung für jeden C13-Runtime-Branch.
8. T9 und G6 bleiben trotz C13-Serialisierung nicht ausführbar.
9. Kein Produkt-/Runtime-Code, kein neuer Store/Runner/Provider-Router und kein Auto-Publish wird durch den Docs-Apply autorisiert.
10. Exact-Head CI des tatsächlichen #954-Heads muss grün sein; bei Head-Move ist der Nachweis neu zu führen.

## Verbindliche Ausführungsreihenfolge nach SSOT-Serialisierung

1. `OpenTasks.md` auf diesem Single-Writer-Branch verlustfrei serialisieren; historischen Body unverändert erhalten.
2. Docs-only Diff prüfen; keine Runtime-/Provider-/Publish-/Production-Datei zulassen.
3. #447-SSOT-Sync reviewen und mergen.
4. Von sauberem gemergten `main` ausführen: `node scripts/codex-task-preflight.mjs CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01`.
5. Nur bei positivem Preflight den ersten C13-Technikslice eröffnen: Erweiterung des bestehenden Repository-Integrity-Guards um semantische Collision-Checks.
6. T9 und G6 bleiben `blocked`, bis ihre dokumentierten Abhängigkeiten real erfüllt sind.

## Stop-Loss

- Dieses Paket selbst macht C13 **nicht** ausführbar.
- Kein Implementierungsbranch vor gemergter `OpenTasks.md`-Serialisierung und positivem Preflight.
- Keine stille Umstufung von `blocked`, `review` oder `manual_gate`.
- Keine zweite OpenTasks-Datei, Registry, Queue, Orchestrierung, Evidence-SSOT oder Media-Acquisition-Runtime erzeugen.
