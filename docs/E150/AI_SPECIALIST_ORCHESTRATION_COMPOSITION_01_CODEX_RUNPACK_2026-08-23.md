# AI-SPECIALIST-ORCHESTRATION-COMPOSITION-01 — Codex Run-Pack

Stand: 2026-08-23

Status: Kanonische Governance- und Ausführungsvorbereitung für Issue `#629`, serialisiert über Governance-PR `#630`. Dieser Run-Pack und die zugehörige OpenTasks-Serialisierung implementieren keine Produktlogik und aktivieren keinen Provider.

Bezug: Issue `#629`, Issue `#617` und Draft-PR `#627` (`AI-CREATE-ORCHESTRATOR-LIVE-SMOKE-01`).

## Zweck

Dieser Run-Pack definiert den nächsten P0-Vertrag für eine echte, typisierte Spezialisten-Orchestrierung. Er erweitert den bestehenden graph-guided, deterministischen E150-Policy-Orchestrator und soll nach Disposition von PR `#627` dessen belegte `/create`-, Source-, PDF- und Transcript-Grenzen wiederverwenden. Er erzeugt keine zweite Create-, Material-, Research-, Provider-, Review- oder Publishing-Wahrheit.

`docs/E150/OpenTasks.md` bleibt die operative SSOT. Der Status `codex_ready` erlaubt den taskbezogenen Preflight, ersetzt aber weder die Abhängigkeitsprüfung gegen PR `#627` noch die in diesem Run-Pack festgelegte serielle Implementierungsreihenfolge. Ein positiver Preflight ist deshalb keine pauschale Freigabe aller vier Slices.

## Verbindliches Start-Gate

Vor jedem Produkt- oder Runtime-Slice muss auf einem sauberen, aktuellen `main` ausgeführt werden:

```bash
node scripts/codex-task-preflight.mjs AI-SPECIALIST-ORCHESTRATION-COMPOSITION-01
```

Der erwartete operative Status ist:

```text
status: codex_ready
executable: true
branchCreationAllowed: true
```

Zusätzlich gilt unabhängig vom technischen Preflight:

- Es wird in diesem Governance-Slice kein Produktbranch erstellt.
- Solange PR `#627` nicht dispositioniert beziehungsweise gemergt ist, darf ein späterer Produktbranch ausschließlich den foundation-unabhängigen Slice 1 (typed Ergebnisverträge, deterministischer Composer und lokale Fixtures) umfassen und keine bestehende `/create`-, Source-, Provider- oder Runtimefläche ändern.
- Ein späterer Produktbranch muss von einem `main` starten, das die für den jeweiligen Slice benötigten Source-, Loader-, PDF-, Transcript-, Security- und Runtime-Verträge aus PR `#627` enthält.
- Die Slices 2 bis 4 und jeder andere Produktbranch, der auf dieser Foundation aufbaut, bleiben bis zu diesem Gate gesperrt.
- Vor Implementierungsstart sind Diff und Merge-Stand von PR `#627` erneut gegen `main` zu prüfen; seine Runtime darf weder kopiert noch parallel neu gebaut werden.
- Existiert dann bereits ein Branch oder PR für Issue `#629`, wird ausschließlich dieser wiederverwendet.

## Belegter Ist-Zustand

Die Evidence aus PR `#627` belegt:

- Der reale interaktive `/create`-Happy-Path ist derzeit Single-Provider OpenAI.
- Freitext läuft über den OpenAI-Planner.
- HTML, PDF und YouTube mit Transcript laufen zuerst durch deterministische Klassifikation und Extraktion und danach durch eine vollständige OpenAI-Dokumentanalyse.
- `structureProvider=mistral` und `summaryProvider=claude` sind im Create-Planner deklarative Metadaten ohne Runtime-Consumer.
- E150 kann mehrere vollständige Providerkandidaten ausführen, wählt aber einen Best-Kandidaten; isolierte Spezialistenresultate werden nicht komponiert.
- Gemini besitzt einen echten optionalen Textadapter, aber keinen offiziellen Datei-, Video-, Audio-, YouTube-, multimodalen oder Source-Grounding-Adapter.
- NotebookLM ist keine Runtime-Integration. Der vorhandene NotebookLM-benannte Code ist ein lokaler Mock/Formatter ohne Netzwerk-API und ohne produktiven Consumer.
- `CreateClient` startet E150 nach Planner oder Linkanalyse derzeit nicht automatisch.
- Der bestehende Source-Loader, SSRF-Schutz, PDF-Parser und Transcriptpfad aus PR `#627` sind die wiederzuverwendende deterministische Input-Grenze.

Relevante Evidence auf Draft-PR `#627`; die drei PR-Dateien gehören erst nach dessen Merge zur `main`-Foundation:

- `docs/E150/AI_CREATE_ORCHESTRATOR_INPUT_MATRIX_2026-08-23.md`
- `docs/E150/AI_CREATE_ORCHESTRATOR_PROVIDER_EXECUTION_AUDIT_2026-08-23.md`
- `docs/E150/AI_CREATE_ORCHESTRATOR_GOOGLE_GEMINI_NOTEBOOKLM_AUDIT_2026-08-23.md`
- `docs/E150/Part05_Orchestrator_E150_Core.md`
- `docs/E150/Part16_AI_Orchestration_and_Safety.md`
- `docs/E150/V2-AI-ORCHESTRATION-CONSOLIDATION-01_2026-05-27.md`
- `docs/E150/V2-MATERIAL-EXTRACTION-JOBS-01_2026-05-27.md`
- `docs/E150/MATERIAL-INTAKE-PRODUCTION-01_REVIEW_FIRST_UPLOADS_PDF_YOUTUBE_2026-05-23.md`
- Issues `#48`, `#58`, `#59`, `#211`, `#617` und `#629`

## Architekturautorität

- Der graph-guided Policy-Orchestrator bleibt die deterministische und auditierbare Steuerungsinstanz.
- Provider sind Werkzeuge mit begrenzten, typisierten Rollen; sie entscheiden weder Wahrheit noch Publishability, Merge oder Governance.
- `AnalyzeResultSchema` beziehungsweise ein bewusst versionierter kompatibler Nachfolger bleibt finale Validierungs-SSOT.
- Der Specialist Path erweitert den strict-staged E150-Hauptfluss. Er ist keine zweite Orchestrator- oder Create-Runtime.
- Spezialistenoutputs sind Ableitungen und niemals Originalquellen.
- Ein deterministischer Composer übernimmt ausschließlich schema-valide, quellenreferenzierte Felder und erzeugt keine eigenen semantischen Aussagen.

## Zielarchitektur

```text
deterministischer Intake und Source Loader
  ├─ Mistral StructureResult ─────────────┐
  └─ Gemini GroundingCoverageResult ──────┤
                                          ↓
                         OpenAI CanonicalAnalysisResult
                                          ↓
                           Anthropic/Claude CriticResult
                                          ↓
                         deterministischer Composer/Validator
                                          ↓
                              ComposedAnalysisResult
```

Strukturierung und Coverage dürfen nach erfolgreicher Extraktion parallel laufen. `CanonicalAnalysisResult` hängt vom Originalmaterial und allen für den gewählten Pfad erforderlichen validierten Vorstufen ab. `CriticResult` hängt vom kanonischen Draft und dessen Evidence-Referenzen ab. Der Composer läuft zuletzt und lokal.

Die Providerzuordnung ist ein interner Rollenvertrag und keine öffentliche Produktcopy. Ein Provider darf eine fremde Rolle nur über eine explizite, getestete und capability-kompatible Fallbackregel übernehmen.

## Gemeinsamer Execution-Vertrag

Jede Modellstufe trägt mindestens:

- `contractVersion`
- `runId` beziehungsweise `correlationId`
- `role`
- `requirement: required | optional`
- `executionState: planned | executed | skipped | failed | degraded`
- `provider` und `model` nur bei geplanter oder ausgeführter Providerstufe
- `attemptCount`, `durationMs` und sichere Fehlerklasse
- `inputArtifactHashes` und `outputHash`
- `sourceRefs` beziehungsweise `evidenceRefs`
- `confidence` und `validationState`
- `fallbackUsed` und `fallbackReason`

Prompts, Quellvolltexte, Transcripte, Secrets, Cookies, Tokens, Request-Header, personenbezogene Daten und private Chain-of-Thought sind keine Execution-Metadaten.

## Typed Zwischenverträge

### `StructureResult`

Mindestens:

- `sourceArtifactRefs`
- `documentOutline` mit stabilen Segment- und Abschnitts-IDs
- `topicClusters` mit Segmentreferenzen
- atomare `claimCandidates` mit Source- und Segmentreferenzen
- `argumentRelations` als Kandidaten, nicht als Wahrheit
- `unclassifiedSegments`
- `structureCoverage`
- gemeinsamer Execution-Vertrag

Mistral ist der vorgesehene Spezialist. `StructureResult` darf keine kanonischen Claims, Faktenfreigabe oder Publikationsentscheidung behaupten.

### `GroundingCoverageResult`

Mindestens:

- `sourceArtifactRefs`
- Modalität je Quelle
- `coveredSegments` und `uncoveredSegments`
- Abdeckungsgrad je Quelle
- Evidence-Referenzen mit Original-URL sowie optional `pageRef`, `timestampRef` oder `segmentId`
- Zuordnung von Claim-Kandidaten als `supports | contradicts | contextualizes | insufficient`
- `extractionLimitations`
- `unsupportedCandidateIds`
- gemeinsamer Execution-Vertrag

Gemini ist der vorgesehene Spezialist, aber ausschließlich über einen offiziellen, rechtlich und technisch geprüften Source-, File- oder Media-Adapter. Ohne diesen Adapter darf kein Gemini-Media-Erfolg behauptet werden. Deterministische Extraktionsabdeckung ist eine technische Vorprüfung und ersetzt keine als `required` geplante Gemini-Spezialistenrolle.

### `CanonicalAnalysisResult`

Mindestens:

- `normalizedThemes`
- atomare Claims mit Evidence-Referenzen, Unsicherheit und Confidence
- `relationships`
- Verantwortungs- und Zuständigkeitskandidaten
- `openQuestions`
- `contradictions`
- `summaryDraft`
- `sourceCoverageReceipt`
- gemeinsamer Execution-Vertrag

OpenAI ist der vorgesehene Spezialist für kanonisches E150-Reasoning. Die Stufe darf nur validierte Originalartefakte und schema-valide Spezialistenoutputs verwenden. Fehlende Evidence bleibt sichtbar und darf nicht durch plausible Inhalte ersetzt werden.

### `CriticResult`

Mindestens:

- `targetAnalysisHash`
- `unsupportedClaims`
- `omissions`
- `contradictions`
- `overinterpretations`
- `missingPerspectives`
- `summaryCritique`
- `severity` und `reviewRecommendations`
- gemeinsamer Execution-Vertrag

Anthropic/Claude ist der vorgesehene Critic. Die Ausgabe ändert den kanonischen Draft nicht selbst und erzeugt keine neuen unbelegten Claims. Sie liefert ausschließlich typisierte Befunde für Composer und menschlichen Review.

### `ComposedAnalysisResult`

Mindestens:

- `composedThemes`
- `retainedClaims` mit unveränderten Evidence-Referenzen
- `rejectedClaimCandidates` mit maschinenlesbarem Grund
- sichtbare Widersprüche und Unsicherheiten
- `composedSummary`
- `openQuestions`
- Provenienzgraph vom Originalartefakt über Spezialistenoutput bis Ergebnisfeld
- `roleExecutions`
- `degraded`, `degradedReasons` und `requiresHumanReview`
- `validationState`
- Providerattempts ausschließlich als sichere Metadaten

Der Composer ist deterministischer Code. Er verwirft schema-invalide oder nicht belegte Claims, erhält Widersprüche und Unsicherheiten und darf keine Aussage erfinden. Kein Auto-Publish, kein Silent Merge und kein automatisches Siegel.

## Fast Path und Specialist Path

### Fast Path

Für kurzen, klaren Freitext und eine begrenzte, gut extrahierte Einzelquelle darf ein einzelner `CanonicalAnalysisResult`-Aufruf genügen, wenn Klassifikation, Schema, Grounding und Quality Gate grün sind.

Nicht ausgeführte Rollen werden mit `executionState=skipped` und `reason=fast_path` sichtbar. Sie dürfen nicht als ausgeführt erscheinen.

### Specialist Path

Mindestens eines dieser deterministischen Signale aktiviert den Specialist Path:

- langes Dokument oder unzureichende Ausschnittabdeckung
- mehrere Quellen
- multimodale Quelle
- YouTube oder Video
- widersprüchliche Quellen
- High-impact-, Sealed- oder besonders prüfkritischer Pfad
- nicht erfülltes Quality- oder Grounding-Gate des Fast Path

## Rollenpflichten je Eingangsklasse

| Eingangsklasse | Pflichtrollen | Optionale beziehungsweise bedingte Rollen |
| --- | --- | --- |
| kurzer klarer Freitext | `CanonicalAnalysisResult`, lokaler Validator | Structure, GroundingCoverage und Critic als `skipped:fast_path` |
| begrenzte normale HTML-Einzelquelle | deterministischer Loader, `CanonicalAnalysisResult`, lokaler Validator | weitere Rollen nur bei Coverage-, Längen- oder Risikotrigger |
| langes Partei-/Fraktionsprogramm | `StructureResult`, `CanonicalAnalysisResult`, `CriticResult`, Composer | `GroundingCoverageResult` wird bei Long-Context-/Coverage-Trigger Pflicht |
| wissenschaftliches Dossier/PDF | `StructureResult`, `GroundingCoverageResult`, `CanonicalAnalysisResult`, `CriticResult`, Composer | keine stille Abwahl einer Pflichtrolle |
| YouTube mit Transcript | Transcript-Loader, `CanonicalAnalysisResult`, Composer | offizielles Gemini-Grounding wird nach Adapterfreigabe Pflicht; Critic nach Länge/Risiko |
| Video ohne verwertbares Transcript | ehrlicher Degraded-/Manual-Vertrag | offizieller Gemini-Media-Pfad erst nach Capability-, Kosten-, Consent-, Rechte- und Eval-Gate |
| Multi-Source/High-impact/sealed | `GroundingCoverageResult`, `CanonicalAnalysisResult`, `CriticResult`, Composer | Structure wird abhängig von dokumentierter Komplexität Pflicht |

## Fallback- und Degraded-Vertrag

- Fallbacks sind rollen- und capability-spezifisch, nicht nur providerweit.
- Jede Rolle erhält eine explizite Allowlist zulässiger Fallbackadapter und Modelle.
- Ein Fallback muss denselben typed Outputvertrag erfüllen.
- Providerwechsel, Modellwechsel und `runtime_rescue` bleiben in `roleExecutions` sichtbar.
- Fehlt eine Pflichtrolle und existiert kein valider erlaubter Fallback, bleibt das Ergebnis `degraded` und `requiresHumanReview=true`.
- OpenAI darf Structure, GroundingCoverage oder Critic nie still übernehmen.
- Ein validierter Fast Path darf bei Ausfall einer optionalen Rolle fortfahren; ein tatsächlich versuchter und gescheiterter Rollenlauf bleibt als `failed` sichtbar und setzt den Gesamtlauf auf `degraded`. `skipped` ist ausschließlich einer nie aufgerufenen, policyseitig abgewählten Rolle vorbehalten.
- Ein erfolgreicher HTTP-Status genügt nie als fachliches Qualitätsgate.
- Fetch-, Transcript-, PDF- oder Groundingfehler stoppen vor unbelegter semantischer Analyse beziehungsweise führen sichtbar in Manual Review.

## Quellen- und Evidence-Provenance

- Jede übernommene semantische Aussage referenziert mindestens ein Originalartefakt und, soweit verfügbar, Segment, Seite oder Timestamp.
- Spezialistenoutputs bleiben getrennt als Ableitungen referenziert und zählen nicht als Quellen.
- Content- und Result-Hashes sind zulässig; Prompts und Quellvolltexte werden nicht geloggt.
- Übersetzung ist Lesefassung und keine zusätzliche Evidenz.
- Nicht analysierte Bereiche und Coverage-Limits bleiben sichtbar.
- Kein ungrounded Claim darf in `ComposedAnalysisResult.retainedClaims` gelangen.

## Kosten- und Latenzbudgets

Die folgenden Werte sind provisorische, fail-closed Contract-Test-Obergrenzen für die erste Umsetzung. Sie aktivieren oder erhöhen keine Production-Runtime-Policy. `AI-RUNTIME-POLICY-01` bleibt für tatsächliche Modelle, Timeouts, Output-Limits, Budgets und Rate Limits im Status `manual_gate` maßgeblich.

| Pfad | Happy Path | Absolute Request-Obergrenze | Gesamtbudget |
| --- | ---: | ---: | ---: |
| Fast Path | 1 erfolgreicher Modellaufruf | 2 physische Modellrequests | 12 Sekunden |
| Specialist Path | höchstens 4 erfolgreiche Rollenaufrufe | 6 physische Modellrequests einschließlich Retries und Adapterfallbacks | 50 Sekunden |

Zusätzlich:

- Die Obergrenzen dürfen in Contract- und Fixture-Tests nur gleich streng oder strenger als die bestehende Runtime ausgelegt werden; niedrigere bestehende Limits gewinnen.
- Jede Production-Änderung an Modell-, Timeout-, Output-, Kosten- oder Rate-Limit-Konfiguration bleibt bis zur Freigabe von `AI-RUNTIME-POLICY-01` gesperrt.
- je Rolle höchstens ein Retry, nur für klassifizierte transiente Fehler;
- runweit höchstens zwei Retries;
- Composer lokal mit höchstens zwei Sekunden Validierungsbudget;
- provisorische Contract-Test-Outputobergrenzen: Structure 1.600, GroundingCoverage 1.800, CanonicalAnalysis 2.400 und Critic 1.400 Tokens; niedrigere bestehende Runtimegrenzen gewinnen;
- kein unbeschränkter Map/Reduce-Fan-out;
- ein späterer Multi-Source-Map/Reduce-Ausbau braucht einen eigenen Budget- und Approval-Slice;
- unbekannte Kosten bleiben `costKnown=false` und werden nie als `0 EUR` ausgegeben;
- Provider-, Modell- und Tokenlimits bleiben in der zentralen Runtime-Policy, nicht in UI oder Prompts.

## Observability

Sicher zu dokumentieren:

- `runId` beziehungsweise `correlationId`
- `inputClass`, `selectedPath` und `triggerReasons`
- `role`, `requirement` und `executionState`
- `provider`, `model` und Attemptnummer
- `fallbackUsed`, `fallbackReason` und sichere Fehlerklasse
- Startzeit, `durationMs` und Timeoutklasse
- Input-/Output-Hashes
- Source-/Evidence-Zähler und Coverage
- `validationState`, `degraded` und `degradedReasons`
- `physicalRequestCount` und `orchestratorAttemptCount`
- `costKnown` sowie nur erlaubte aggregierte Usage- und Kostenfelder

Nicht zulässig sind Prompts, Quellvolltexte, Transcripte, Secrets, Cookies, Tokens, Request-Header, personenbezogene Daten und private Chain-of-Thought.

## Acceptance Gates

- Kurzer Freitext bleibt als schneller, stabiler Single-Provider-Fast-Path grün.
- Ein langes Partei- oder Fraktionsprogramm durchläuft echte Structure-, CanonicalAnalysis-, Critic- und Composer-Stufen; bei Coverage-Trigger zusätzlich GroundingCoverage.
- Ein wissenschaftliches Dossier mit mehreren Abschnitten wird aus typisierten Spezialistenresultaten komponiert und nicht vollständig durch einen Provider ersetzt.
- YouTube oder Video nutzt bei vorhandenem und freigegebenem offiziellen Gemini-/Media-Adapter Gemini als Spezialisten; ohne Adapter oder Transcript bleibt der Zustand ehrlich `degraded` beziehungsweise manuell.
- Provider-Ausfälle sind in `roleExecutions` und `degradedReasons` sichtbar.
- Kein ungrounded Claim wird vom Composer übernommen.
- Geplante, ausgeführte, übersprungene und fehlgeschlagene Rollen sind getrennt; Provider- und Modellmetadaten entsprechen realer Ausführung.
- Absolute Modellrequest- und Latenzbudgets sind automatisch getestet.
- Der generische E150-`runtime_rescue` kann keine im Lane-Plan nicht genannte Pflichtrolle unsichtbar ersetzen.
- Alle #627-Regressionen für Freitext, HTML, PDF, YouTube, SSRF, Ressourcenlimits und Source-Grounding bleiben grün.
- Contract- und Fixture-Evidence ist ohne Provider-Credentials reproduzierbar.
- Echte Provider-Smokes bleiben Environment- und Human-Gates, wenn Credentials oder freigegebene Adapter fehlen.
- Kein NotebookLM-Automationsclaim, keine inoffizielle Browserautomation und keine neue NotebookLM-Integration.
- Kein Auto-Publish, keine Secret-Manipulation und keine Provideraktivierung.

## Nicht-Ziele

- kein Big-Bang-Umbau in PR `#627`
- keine Provideraktivierung oder Secret-/ENV-Manipulation
- kein Production-Deployment
- keine NotebookLM-Browserautomation oder erfundene NotebookLM-API
- keine automatische externe Recherche
- keine neue Research-, Material-, Create- oder Review-Parallelwelt
- keine öffentlichen Provider-Namen in Product UX
- kein Auto-Publish, Auto-Merge, autonomes Siegel oder Graph-Write

## Serielle Implementierungsslices

### Slice 1 — Typed Contracts und deterministischer Composer

- fünf Zwischenverträge;
- Provenienz- und Grounding-Validator;
- Contract- und Red-Team-Fixtures;
- keine Providercalls und keine Routeumschaltung.

### Slice 2 — Stage Policy und wahrheitsgetreue Execution-Metadaten

- Fast-/Specialist-Trigger;
- Rollenpflichten und capability-spezifische Fallback-Allowlist;
- globales Request- und Latenzbudget;
- `planned | executed | skipped | failed | degraded`;
- expliziter `runtime_rescue`;
- keine neue Provideraktivierung.

### Slice 3 — Text- und Dokument-Komposition

- vorhandene Mistral-, OpenAI- und Anthropic-Adapter rollenrein anbinden;
- lange HTML- und PDF-Fixtures;
- bewusster `/create → E150`-Handoff hinter bestehender Policy;
- #627-Fast-Path und Security-Regressionen erhalten.

Dieser Slice darf erst auf einem `main` beginnen, das die benötigte PR-`#627`-Foundation enthält.

### Slice 4 — Offizieller Gemini-Source-/Media-Adapter

- getrenntes Capability-, Kosten-, Consent-, Rechte- und Eval-Gate;
- Long Context, Datei und YouTube/Video nur über offizielle unterstützte Schnittstellen;
- kein NotebookLM-Ersatz;
- kein Start ohne Environment- und Human-Gate.

## Pflicht-Gegenprobe vor Review eines Implementierungsslices

Mindestens:

- fokussierte Contract-, Fixture-, Budget-, Fallback- und Provenienztests;
- alle betroffenen #627-Input-, Source-, SSRF-, PDF- und Transcriptregressionen;
- Typecheck und Lint;
- Build, sofern Type- oder Runtimeflächen berührt werden;
- `git diff --check`;
- Exact-Head GitHub CI und ausgelöste Vercel-Gates;
- keine offenen Reviewthreads;
- Scope-Vergleich gegen aktuelles `main`;
- keine erfundenen Provider-, Browser-, Preview- oder Production-Smokes.

## Branch- und PR-Vertrag

- Dieser Governance-PR enthält ausschließlich diesen Run-Pack und die additive OpenTasks-Serialisierung.
- Kein Produktcode, keine Provider-, Secret-, ENV-, Runtime-, Voxy-, Auth- oder PR-`#627`-Änderung.
- Nach Merge ist der taskbezogene Preflight auf sauberem aktuellem `main` zu wiederholen.
- Ein späterer Produktbranch entsteht erst nach positivem Preflight; vor erfülltem PR-`#627`-Foundation-Gate ist er strikt auf Slice 1 ohne `/create`-, Source-, Provider- oder Runtimeänderung begrenzt.
- Die Slices 2 bis 4 benötigen ein `main` mit der jeweils erforderlichen dispositionierten beziehungsweise gemergten PR-`#627`-Foundation; Production-Budgetänderungen benötigen zusätzlich die Freigabe von `AI-RUNTIME-POLICY-01`.
- Die vier Implementierungsslices bleiben seriell und werden nicht als Big-Bang-PR zusammengezogen.
