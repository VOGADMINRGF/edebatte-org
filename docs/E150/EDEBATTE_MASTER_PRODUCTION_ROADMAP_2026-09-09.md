# eDebatte Master Production Roadmap

Stand: 2026-09-10

Basis: `main@c3ff4b01ada66e397c61e7b597ac20ce12e136fb`

Status: Governance- und Architekturmanifest; keine Runtime-, Schema-, Provider-, Secret-, Deploy-, Publish- oder Produktionsfreigabe

## 1. Verbindliche Lesart

Dieses Dokument verbindet die vorhandenen Roadmap-Lanes, ohne ihre kanonischen Domain-Owner, IDs oder Statuswahrheiten zu ersetzen. Operative Ausführbarkeit steht ausschließlich im Kopf von `docs/E150/OpenTasks.md`. Der fachliche Standard für Systemfragen und globale Einordnung ist `docs/E150/EDEBATTE_SYSTEM_QUESTION_GLOBAL_CONTEXT_STANDARD_2026-09-09.md`. Der Abschluss von C1–C12 oder G1–G5 allein bedeutet ausdrücklich nicht, dass eDebatte als Gesamtprodukt production-ready ist.

`hard dependency` bezeichnet eine zwingende Vorgängerkante. `parallel-safe lane` bedeutet nur, dass die Lane nach eigenem Task, positivem Preflight, kollisionsfreiem Owner und geschlossenen Gates unabhängig fortschreiten kann; daraus folgt keine aktuelle Autorisierung.

## 2. Master-Abhängigkeitsbild

```text
CREATE / PUBLIC GUARDS — hard dependencies
Foundations + C1 DONE + C2 DONE
  → C3A Anonymous Session Foundation
  → C3B Anonymous Abuse / Route Security
  → C3C Guest Claim / PII / Single Flight
  → C3D Guest Ephemeral UI
  → C4 Resume / explicit Adoption / Draft Binding
  → C5 Citizen Context / Place
  → C6 Existing Topic / explicit Stance
  → C7 Jurisdiction
  → C8 Authenticated Source / Link Analysis

existing G1 Shared Public Question Guard ─┐
C6 + C7 + C8 ────────────────────────────┴→ C9 Canonical Handoff / Review Persistence
                                              → C10 Notifications
                                              → C11 Progress Contract / Store / Stream
                                              → C12 Truthful Progressive UX

G1 → existing G2 Participation, G3 Anlassraum, G4 QR and G5 Material lanes

DECISION DOSSIER — separate hard dependency lane
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7
                                      ├→ Golden Case A: Rente
                                      ├→ Golden Case B: Bildung
                                      └→ Golden Fixture C: Fast-change/Low-data
Golden A + Golden B + Golden C + production provider/feed gates → T8

PARALLEL-SAFE CONTROL / RELEASE LANES, each behind its own gates
Alpha2 convergence | DB/Brownfield production | Voxy/QR/Marketing output
```

G2–G5 behalten ihre vorhandenen Owner und Abhängigkeiten; G4 bleibt der einzige Public-QR-Guard-Owner. Unabhängige Guard- und Create-Arbeit wird nicht künstlich vollständig serialisiert. C9 folgt weiterhin erst nach C6–C8 und G1. C4–C12 und G1–G5 werden durch dieses Manifest nicht `codex_ready`.

## 3. C3-Preflight und sichere Dekomposition

Für den bisherigen Parent `CREATE-ANONYMOUS-SESSION-ABUSE-GUEST-CLAIM-01` gilt:

```text
TASK_PREFLIGHT=PASS
PII_SECURITY_PREFLIGHT=FAIL
SIZE_GATE=FAIL_SPLIT_REQUIRED
SECURITY_GATE=FAIL_BLOCKED
WORK_REQUIRED=true
SAFE_TO_IMPLEMENT=false
```

Der Parent ist `blocked` und nicht ausführbar. P1-/Security-Architekturblocker sind rohe Guest-Daten in `localStorage`, rekursiv codierte PII, Credential-/Signed-URL-Bypass, clientseitige freie Correlation im Claim, unsichere persistierte Result-/Failure-Payloads, unzureichend abuse-begrenzte Session-Erzeugung, unvollständige Body-Size-/Content-Type-Gates und ein zu großer Slice über Core-Contract-/Security-Grenzen. Ein P0 ist derzeit nicht bekannt.

| Slice | Operative ID | Owner und Scope | Harte Ausschlüsse | Status / nächste Gate-Bedingung |
| --- | --- | --- | --- | --- |
| C3A | `CREATE-ANONYMOUS-SESSION-FOUNDATION-01` | Signierte anonyme Session: HMAC/signiertes HttpOnly-SameSite-Cookie, serverseitige UUID-/Expiry-Prüfung, `POST /api/create/session`, Issuance-Rate-Limit, awaited Initialisierung, minimale wahrheitsgemäße Response; explizite TTL, Retention, Cleanup Owner und Expiry-/Orphan-/Crash-Recovery-Verifikation | Intake, Planner, Single Flight, Account Draft, Adoption, Resume, Source Fetch, roher Browser-Snapshot | `done`; PR `#740`, Exact Head `39a5e2567885ec1d33c74c51b553561d7bd91637`, `main@52b1995706e0b69c01413171b63b4d7888dbb16b` |
| C3B | `CREATE-ANONYMOUS-ABUSE-ROUTE-SECURITY-01` | Same-Origin/Fetch Metadata/CSRF, Honeypot einschließlich minimalem nicht sichtbarem `CreateClient`-Trap, persistente Actor-/IP-/Session-/Client-Limits, Cooldown, expliziter Content-Type, vor dem Parse gemessene Body-Grenze, malformed/unknown/unsupported fail-closed, unavailable limiter fail-closed | Planner-/Intake-Fachsemantik, Claim/Single Flight/PII-URL-Analyse, sichtbare Browser-UI über den begrenzten Trap hinaus, Adoption und Account Draft | `done`; PR `#744`, Implementation Head `c697fe225339e8f9e923b37506d84214d69068a2`, Merge-Commit `91ac96aa8dc12ab38e4912b6e4d29807f124cde4`; nicht ausführbar; neue oder doppelte Implementierungsautorisierung geschlossen |
| C3C | `CREATE-GUEST-CLAIM-PII-SAFETY-01` | Server-authoritativer Guest Claim/PII/Single Flight mit persistenter Mongo-Koordination, ausschließlich servergenerierter Correlation, rekursiver PII-/Secret-/Signed-URL-Erkennung, begrenzter Traversierung und allowlisteten sicheren Fehlern innerhalb der exakt sieben autorisierten Dateien | Adoption, Resume, Account Draft, Browserpersistenz, Planner-/Intake-Workflow-Ausführung über den Claim-only-Endpunkt hinaus, Schema/Migration, Provider-/Secret-/Deployment-/Production-Aktivierung und Auto-Publish | `done`; PR `#748`, Implementation Head `00c54ae5fcc42e005955ed8854287e585331750c`, `main@932d01e6a85c55e6763f070647c2d67513248e36`; finaler Exact-Head-Gate durch manuelles Repository-Audit plus passing deterministische lokale Validierung |
| C3D | `CREATE-GUEST-EPHEMERAL-UI-01` | Künftige minimale Guest-UI auf bestehenden Create-Flächen; ausschließlich ephemerer React-/Runtime-State | Rohtext, Source, Planner-Trace oder Result in jeder Browserpersistenz; `localStorage`, `sessionStorage`, IndexedDB, Cache API, Service Worker, Resume, Adoption, Account Draft, authentifizierter Draft-Crossover, Planner-/Intake-Erweiterung, C4-Ownership und Production-Aktivierung | `codex_ready`; `implementation`; `implementation_authorized=true`; nicht `done`; exakt drei Dateien gemäß `CREATE_GUEST_EPHEMERAL_UI_C3D_PREFLIGHT_2026-09-11.md`, jede vierte Datei Hard Stop |

Der C3A-Preflight hat vor Code belegt: eine servergenerierte, opake, unvorhersagbare und manipulationssichere kanonische Session-Identität ohne clientseitige Autorität; ein host-only `HttpOnly`-/`SameSite=Lax`-Cookie auf `/api/create` mit umgebungs- und produktionskonformem `Secure` und begrenzter Laufzeit; serverseitige Signatur- und Expiry-Validierung; fail-closed Verhalten für abgelaufene, manipulierte oder malformed Cookies; begrenzte persistente Session-Issuance samt definiertem Fehlerfall und mit C3B kompatibler Abuse-Grenze; sowie awaited Initialisierung und eine minimale wahrheitsgemäße Response von `POST /api/create/session`. Token und Cookie enthalten weder rohe Guest-/Source-Inhalte noch PII oder Secrets; Session-Secrets und rohe Identifikatoren gelangen nicht in Logs, Analytics, Traces oder Error Payloads. Die Implementierung bleibt stateless: Es entsteht kein serverseitiger Session-Orphan-State; kryptografische Expiry, Cookie-Max-Age und Invalid-Cookie-Clearing begrenzen die Lebensdauer auch über Restarts, während die Issuance-Buckets dem vorhandenen TTL-Cleanup unterliegen. Der Slice ist über PR `#740` abgeschlossen. C3B ist über PR `#744`, Implementation Head `c697fe225339e8f9e923b37506d84214d69068a2`, als `main@91ac96aa8dc12ab38e4912b6e4d29807f124cde4` abgeschlossen. C3C ist über PR `#748`, Implementation Head `00c54ae5fcc42e005955ed8854287e585331750c`, als `main@932d01e6a85c55e6763f070647c2d67513248e36` abgeschlossen. Der C3D-Preflight auf `main@6b52215263253593fa01850299bba3439b3c4fe1` empfiehlt `PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION`; C3D ist `codex_ready` mit `AUTHORIZATION=implementation` und `IMPLEMENTATION_AUTHORIZED=true` ausschließlich innerhalb seiner dokumentierten Drei-Dateien-Grenze und bleibt nicht `done`. C4 bleibt vom Abschluss aller vier Slices abhängig.

> **Historische C3B-Preflight- und Implementierungsevidence:** Der C3B-Preflight belegt `TASK_PREFLIGHT=PASS`, `SECURITY_PREFLIGHT=PASS`, `EXTRACTION_PREFLIGHT=PASS`, `SIZE_PREFLIGHT=PASS`, `DEPENDENCY_GATE=PASS` und `BLOCKERS=NONE`. Seine durch PR `#744` ausgeschöpfte Implementierungsfreigabe umfasste ausschließlich Same-Origin, Fetch Metadata, CSRF, Honeypot, persistente Actor-/IP-/Session-/Client- und Risk-Limits samt Cooldown/Duplicate-Handling, expliziten Content-Type, die vor dem Parse tatsächlich gemessene und begrenzte Body-Größe, malformed/unknown/unsupported sowie unavailable limiter fail-closed, minimierte beziehungsweise gehashte Subjects, feste sichere öffentliche Fehler, C3A-Session-Verifikationskompatibilität, Leak-Schutz und fokussierte Regressionen. Implementiert und über Merge `91ac96aa8dc12ab38e4912b6e4d29807f124cde4` abgeschlossen sind neun Dateien, davon drei neu: geändert wurden ausschließlich `apps/web/src/features/create/createMutationSecurityContract.ts`, `apps/web/src/features/create/createRouteSecurity.ts`, `apps/web/src/app/api/create/session/route.ts`, `apps/web/src/app/create/CreateClient.tsx`, `apps/web/tests/create-route-security.contract.test.ts` und `apps/web/tests/create-mode.save.route.test.ts`; neu hinzugekommen sind ausschließlich `apps/web/src/features/create/createAbuseGuard.ts`, `apps/web/tests/create-abuse-guard.contract.test.ts` und `apps/web/tests/create-antispam-client.contract.test.ts`. Die neunte Datei ist ausschließlich ein bestehender Test und durfte nur den minimalen steuerbaren persistenten Limiter-Mock mit erlaubendem Default erhalten. Auf der ergänzenden Governance-Basis `main@67c3fb8b6e62201587964e0226714cf3e84e9b4c` und im C3B-Implementierungsstand scheiterten ohne ihn jeweils 17/19 Save-Route-Tests; dies war eine Test-Harness-Inkompatibilität und keine belegte Runtime-Regression. Assertions und Security-Gates dürfen nicht abgeschwächt oder umgangen werden. In `CreateClient.tsx` bleibt der Hunk auf einen initial leeren, begrenzten, nicht sichtbaren Honeypot-State, ein off-screen Control im bestehenden Composer und die Weitergabe an die fünf vorhandenen `createMutationRequestHeaders()`-Callsites beschränkt. Eine weitere Runtime- oder Testdatei benötigt eine neue Collision-/Preflight-Entscheidung. C3B übernimmt weder anonyme Intake-Fachsemantik, Guest Claim, Single Flight, Planner, Source-/Linkanalyse, rekursive PII-URL-Behandlung, persistierte Guest Results, sichtbare Browser-UI über den begrenzten Trap hinaus, Resume, Adoption, Account-Draft-Bindung, browsergenerierte anonyme Session-IDs, Session-/Local-Storage-Resume noch impliztes Session-Priming. C3B ist `done` und nicht erneut ausführbar. Die darin genannten damaligen C3C-/C3D-Status sind historisch; aktuell sind C3C `done`, C3D `codex_ready` mit `AUTHORIZATION=implementation` und `IMPLEMENTATION_AUTHORIZED=true`, und C4 bleibt vom Abschluss aller vier Slices abhängig.

> **Historisches Status-Update nach PR #748:** Die unmittelbar vorstehende C3B-Preflight-Erzählung beschreibt den Stand vor der C3C-Implementierung. C3C ist über PR `#748` `done`; zum Zeitpunkt dieses historischen Updates war C3D nur `preflight_only` und `IMPLEMENTATION_AUTHORIZED=false`. Der aktuelle C3D-Status steht im operativen Kopf und in `CREATE_GUEST_EPHEMERAL_UI_C3D_PREFLIGHT_2026-09-11.md`.

Die kanonische reproduzierbare Preflight-Evidence mit Source-Hunks, Collision Map, C3A-Grenze, Security-Gates, Size-, Test- und Dependency-Nachweis steht in `docs/E150/CREATE_ANONYMOUS_ABUSE_ROUTE_SECURITY_C3B_PREFLIGHT_2026-09-10.md`.

Der C3C-Preflight belegt `PASS` und `BLOCKING_COLLISIONS=NONE`; die reproduzierbare Evidence steht in `docs/E150/CREATE_GUEST_CLAIM_PII_SAFETY_C3C_PREFLIGHT_2026-09-11.md`. Die Implementierung ist auf exakt sieben Dateien begrenzt (`FILES_CHANGED_COUNT=7`, `NEW_FILES_COUNT=4`): geändert werden dürfen ausschließlich `apps/web/src/features/create/createRouteSecurity.ts`, `apps/web/src/features/create/createOrchestrationSingleFlight.ts` und `apps/web/tests/create-route-security.contract.test.ts`; neu hinzukommen dürfen ausschließlich `apps/web/src/features/create/safety/createGuestClaimSafety.ts`, `apps/web/src/app/api/create/intake/route.ts`, `apps/web/tests/create-guest-claim-safety.contract.test.ts` und `apps/web/tests/create-guest-claim.route.test.ts`. Beide Allowlist-Schemas schließen rohen Guest-Text, Source-Input, sensitive oder signierte URLs, Planner-Prompt/-Trace, rohe Providerantwort, Token/Credential/Secret, beliebige Fehlerstrings und beliebige Metadatenblobs aus. Rekursive PII-/Secret-/Signed-URL-Leakage-Erkennung ist vor Persistenz und separat vor API-Return zu prüfen; jeder Fund stoppt ohne unsichere Persistenz und ohne unsicheren Response. Human-readable Diagnostics dürfen ausschließlich aus festen servereigenen Failure-Codes abgeleitet werden. Eine Client-Correlation darf niemals Claim-Identität, Single-Flight-Key, Replay-Namespace oder freie persistierte Metadaten beeinflussen; die authoritative Correlation ist servergeneriert. Der historische PR `#682` bleibt Reference-only: kein clientgeneriertes Correlation-Feld, Planner-Aufruf, breites Result-Modell, Browserpersistenz, Adoption oder Resume wird kopiert. Alle Gates `SINGLE_FLIGHT_ARCHITECTURE`, `SERVER_CORRELATION`, `RECURSIVE_PII_GUARD`, `RECURSIVE_SECRET_GUARD`, `SIGNED_URL_GUARD`, `SAFE_FAILURE_ALLOWLIST`, `LOGGING_SAFETY`, `BROWSER_PERSISTENCE_ABSENCE`, `NO_ADOPTION`, `NO_RESUME`, `NO_ACCOUNT_DRAFT`, `NO_DB_MIGRATION` und `NO_PROVIDER_SECRET_DEPENDENCY` stehen auf `PASS`.

Jedes temporäre Anonymous-Objekt führt TTL, Retention Policy, Cleanup Owner, Expiry-Verhalten, Orphan-/stale-Lease-Cleanup, Crash-/Restart-Recovery und Cleanup-Verifikation, ohne zweiten Persistenzpfad. Dieselbe PII-/Secret-Policy gilt für Datenbank, API-Responses, Logs/Structured Logs, Traces, Analytics, Error Payloads, Audit Metadata und Provider Diagnostics.

C4 hängt weiterhin hart vom Abschluss aller vier Slices ab. C3D ist nach dem positiven, revisionsgebundenen Preflight nur innerhalb der exakt dokumentierten Drei-Dateien-Grenze für Implementierung autorisiert: Diese bestimmt Wiederverwendung, historische Persistenzkollisionen, Client-/Server-Grenze, C3A-/C3B-/C3C-Regressionen, Browser-Persistenz-Abwesenheit, adversarial Tests und die Trennung von authentifizierten Create-Flows. C3D speichert keinen Guest-State in `localStorage`, `sessionStorage`, IndexedDB, Cache API oder Service Worker und führt weder Resume, Adoption, Account Draft noch authentifizierten Draft-Crossover ein. Guest → Login → Adoption bleibt allein C4-Owner und muss später den Security Context rotieren beziehungsweise authentifizieren: die anonyme Session bleibt kein wiederverwendbares Auth-Credential, Client-IDs allein autorisieren nichts, Account Identity ist server-authoritative, alte Bindings sind nicht cross-account wiederverwendbar, das Adoption Receipt bleibt idempotent und Cross-Account-Adoption scheitert fail-closed. Session-Rotation/Rebinding erhält Regressionstests. Seine technische Ownership sowie die von C5–C12 und G1–G5 bleibt unverändert.

## 4. Topic Intelligence / Decision Dossier

Alle T-Slices sind `blocked`, nicht `codex_ready`, und benötigen ihren eigenen Architektur-/Security-Review sowie positiven Preflight. Sie erweitern vorhandene Dossier-, Topic-, Claim-, Evidence-, Poll- und TopicRound-Wahrheiten; sie erzeugen keinen zweiten Dossier-/Decision-Store.

| Stufe | Task-ID | Kanonischer Owner / Ergebnis | Harte Bedingung |
| --- | --- | --- | --- |
| T0 | `DECISION-DOSSIER-ARCHITECTURE-CONTRACT-01` | Contract-Mapping für SystemQuestion, ResearchObject, ContextEvent, Metric/Projection/Assumption, ScenarioSet/Scenario, Impact/Tradeoff, Comparator und DecisionBinding; kleine Contract-Fixtures für ein nicht deutsches Rechts-/Institutionensystem und eine Low-data-Jurisdiktion; keine Migration | Standard angenommen; Architekturreview |
| T1 | `TOPIC-QUALIFICATION-SYSTEM-QUESTION-01` | Qualifikation als transient event, factual clarification, policy question, structural/system question oder long-term societal choice; Rationale, Scope, Jurisdiktion, Horizont, kontrollierbare Hebel, Ausschlüsse, Gruppen, Signal-IDs, Review | T0 |
| T2 | `DOSSIER-RESEARCH-WORKSPACE-01` | Dossiergebundener systematischer ResearchPlan mit WorkItems, Fragen, Source Gaps, Ein-/Ausschlussrationale, Primary-/Secondary-Mix, Unabhängigkeit, Widerspruch, Konsens/Dissens, Frische, Artefakten, Runs/Checkpoints, Completeness, Retry/Recovery, Human Gates, Budget/Cost; keine zweite Dossier-ID | T1 |
| T3 | `DOSSIER-CONTEXT-METRICS-EPISTEMIC-01` | Historische-/Kontext-/Reformereignisse, Current-System-Modell, Metriken/Serien, Projektionen/Modelle, Annahmen, Epistemik, Source Relations und stale/superseded; reviewbare Methoden-, Modell-, Expert-/Institutions- und globale Vergleichsqualität einschließlich Bias, Stichprobe, Unsicherheit, Robustheit, Kausalgrenzen, Provenienz, Conflicts, Übersetzung und Messdefinitionen | T2 |
| T4 | `DOSSIER-SCENARIO-SET-01` | First-class PolicyBuildingBlock, ScenarioSet, Scenario; Status quo/No-change; kompatible Kombinationen | T3 |
| T5 | `DOSSIER-SCENARIO-IMPACT-COMPARATOR-01` | Impact, Trade-offs, Gruppen, Verteilungs-/Generationseffekte, Kosten/Finanzierung, Recht, internationale Comparatoren, Transferierbarkeit, Unsicherheitsbandbreiten und Stresstests; wo materiell Sensitivität, Irreversibilität/Reversibilität, Option Value, Lock-in/Path Dependency und Sequencing Dependency; kleine Comparator-Fixtures für ein nicht deutsches System und eine Low-data-Jurisdiktion | T4 |
| T6 | `DECISION-REVISION-BINDING-01` | Poll/TopicRound bleibt Decision-Owner; jede Frage/Option bindet an exakt freigegebene Dossier-/ScenarioSet-/Scenario-Revisionen; kein stale Ballot | T5 |
| T7 | `PUBLIC-DECISION-DOSSIER-JOURNEY-01` | Vorhandener öffentlicher Dossier-Arbeitsraum als Readmodel: Why now → Goal → History → Current system → Causes → No-change → International context → Evidence/gaps → Scenarios → Trade-offs → Decision | T6 |
| T8 | `SELF-FEEDING-TOPIC-RESEARCH-ORCHESTRATION-01` | Signal → Qualification Candidate → Research Mission → validierte strukturierte Schritte → Scenario-/Impact-Kandidaten → Human Gates → publish-ready Decision-Dossier-Draft; keine Auto-Truth, Veröffentlichung oder Entscheidungsaktivierung | T7, Pension, Education und Fast-change/Low-data Golden Acceptance sowie Production-Provider-/Feed-Gates |

### Decision Readiness

Das Gate aus dem System-Question-Standard ist verbindlich. `ready_for_human_deliberation` ist nicht `activation_ready`/`decision_ready`. Beratung darf mit vollständig sichtbaren ungelösten materiellen Gaps beginnen; Aktivierung nicht. `decision_ready=true` verlangt für jede materielle Pflichtdimension `SUFFICIENTLY_EVIDENCED_AND_REVIEWED`; jede ungelöste materielle Lücke erzwingt false. Materialität samt Actor, Rationale, Revision, Reviewstatus und kanonisch erforderlichem Timestamp ist auditierbar. Kein menschlicher Override darf einen weiterhin materiellen Hard Blocker unsichtbar überstimmen.

False-positive-Contract-Fixtures halten Aktivierung false bei fehlendem materiellem Comparator oder betroffener Gruppe, stale Projektion/Revision, ungelöster Rechtsgrenze, unreviewter High-impact-Zahl, materiell unterbelegtem Szenario, fehlendem Status quo oder anwendbarer No-change-Baseline, verzerrt unvollständigem ScenarioSet, ausgelassenem materiellem Dissens oder falsch als nicht materiell eingestuftem `UNKNOWN`. Auflösung verlangt Evidenz plus Review oder eine reviewte Änderung der Materialität.

### Golden-Case-Acceptance

- `DECISION-DOSSIER-GOLDEN-CASE-PENSION-01` ist `blocked` auf T7. Der beaufsichtigte deutsche Renten-/Ruhestandsfall muss Geschichte, aktuelles System und Finanzierung, demografische Projektionen, Rechtsgrenzen, internationale Vergleiche, mehrere kombinierbare Reformpfade, Übergang/Finanzierung, Verteilungs-/Generationseffekte, Stresstests und revisionsgebundene Entscheidung beweisen.
- `DECISION-DOSSIER-GOLDEN-CASE-EDUCATION-01` ist `blocked` auf T7. Der beaufsichtigte Bildungsfall mit Sachsen-Anhalt als Trigger muss regionalen Zustand, deutsche föderale Struktur, Länder-Vergleich, nationale Indikatoren, PISA/OECD/internationalen Kontext, Strukturunterschiede, erfolgreiche und gescheiterte Auslandsmodelle, Transferabilität, nationale versus regionale Hebel, Szenarien/Trade-offs und revisionsgebundene Entscheidung beweisen.
- `DECISION-DOSSIER-GOLDEN-FIXTURE-FAST-CHANGE-LOW-DATA-01` ist `blocked` auf T7. Die adversariale Fixture prüft eine schnelllebige, polarisierte und/oder datenarme Frage mit widersprechenden Quellen, hoher Freshness-Anforderung, unvollständiger Evidenz, unsicherer Kausalität, möglicherweise fehlendem verlässlichem internationalem Comparator und sich entwickelnder Baseline. Das korrekte Ergebnis darf und soll `NOT DECISION READY` sein, wenn Unsicherheit, Datenlücken, Dissens, Freshness-Grenzen oder Nichtvergleichbarkeit materiell bleiben.

T8 bleibt auf alle drei Golden Acceptances und Production-Provider-/Feed-Gates blockiert. Dadurch wird keine Architektur aus nur einer Policy-Domäne verallgemeinert und keine Vollständigkeit halluziniert.

## 5. Alpha2 Control Plane

Alpha2 erweitert die bestehende Control Plane und ist kein zweiter Orchestrator. Die Dependency-Zeilen im operativen `OpenTasks.md` sind autoritativ; dieses Diagramm ist nur ihre Projektion und keine Ersatz-SSOT:

```text
ALPHA2-RUN-CONTRACT-01 (done)
├→ ALPHA2-PERSISTENT-RUN-LEDGER-01 (done)
│  ├→ ALPHA2-AGENT-REGISTRY-01 (review)
│  │  ├→ ALPHA2-LEARNING-EVALS-01 (blocked)
│  │  │  └→ ALPHA2-MISSION-CONTROL-01 (blocked)
│  │  └→ ALPHA2-ORCHESTRATOR-LOOP-01 (blocked)
│  └→ ALPHA2-ORCHESTRATOR-LOOP-01 (blocked)
└→ ALPHA2-GITHUB-STATE-ADAPTER-01 (blocked)
   ├→ ALPHA2-OPENTASKS-SINGLE-WRITER-01 (blocked)
   │  └→ ALPHA2-ORCHESTRATOR-LOOP-01 (blocked)
   ├→ ALPHA2-ORCHESTRATOR-LOOP-01 (blocked)
   └→ ALPHA2-MISSION-CONTROL-01 (blocked)

ALPHA2-ORCHESTRATOR-LOOP-01 + ALPHA2-MISSION-CONTROL-01
→ ALPHA2-CONTINUOUS-DISPATCH-01 (blocked)
→ ALPHA2-REPAIR-CONTINUATION-01 (blocked)

State Adapter + Mission Control + Continuous Dispatch + Repair
→ ALPHA2-MISSION-CONTROL-TRANSPARENCY-02 (blocked)

ALPHA2-BUILD-TO-OPERATE-TRANSITION-01 (review; completion remains a hard gate)
+ Orchestrator Loop + Continuous Dispatch + Repair
+ ALPHA2-MISSION-CONTROL-TRANSPARENCY-02
+ relevant Observability/Production Gates
→ ALPHA2-AUTONOMOUS-E2E-RECOVERY-ACCEPTANCE-01 (blocked)
```

Alle dargestellten Statusangaben sind unverändert aus dem OpenTasks-Kopf am Basis-Commit projiziert. Insbesondere liegt Learning/Evals vor Mission Control, und Continuous Dispatch hängt sowohl von Orchestrator Loop als auch Mission Control ab. Repair folgt ausschließlich seiner kanonischen Continuous-Dispatch-Abhängigkeit. Alpha2 darf Workflows erst beschleunigen, nachdem Zielschemas/-verträge und menschliche Gates existieren. Fehlende Decision-Dossier-Domainmodelle dürfen nicht durch Prosa ersetzt werden.

Der vorhandene Owner `ALPHA2-AUTONOMOUS-E2E-RECOVERY-ACCEPTANCE-01` wird für Autonomous Operations Ready wiederverwendet. Sein synthetischer Long-run muss GitHub Task → kanonische Owner-Auflösung → Lease genau einmal → Run → Duplicate Delivery → Provider Failure → bounded Retry → Process Restart → Resume → CI Failure → Repair oder Human Escalation → Human Gate → OpenTasks-/SSOT-Update genau einmal beweisen. Zusätzlich testet er Budget-/Rate-Erschöpfung, Infinite/Recursive Loop, Duplicate Work, wiederholte Research-Arbeit, Starvation/Fairness, stale Base SHA, superseding Head, konkurrierenden OpenTasks Writer, Queue Backlog, Provider Outage/Fallback, Model-/Version Change, Eval Regression, Kill Switch und manuellen Emergency Stop. Das bleibt eine blockierte Acceptance, keine zweite Runtime.

## 6. DB- und Production-Gates

Die operative Queue besitzt noch keinen vollständigen exakten Owner für die folgenden querschnittlichen Production-Acceptances. Deshalb sind `PROD-OBSERVABILITY-INCIDENT-SLO-01`, `PROD-DATA-RECOVERY-PRIVACY-LIFECYCLE-01` und `PROD-SECURITY-SUPPLY-CONFIG-01` als neue `blocked` Governance-Tasks dispositioniert. Sie duplizieren keine Runtime: Der erste schließt SLI/SLO, Monitoring/Alerting, On-call, Incident Runbook, Queue-/Provider-Degradation, Cost-/Rate-Alarme, actionable Errors und Postmortem-Evidence; der zweite RTO/RPO, Backup-/Restore-Übung, Retention/TTL/Deletion/Export, Privacy Deletion, Legal Hold soweit relevant, Orphan Cleanup, Audit Retention und Disaster Recovery; der dritte Secret Rotation, Dependency-/Package-/Image-Supply-Scanning soweit relevant, Patch SLA, Least Privilege, Config-/Environment-Drift, Security Incident Response, Disclosure/Escalation und Credential-Rotation-Evidence.

`DB-MIGRATION-BASELINE-01` / PR `#731` bleibt unverändert `manual_gate`. Der abgeschlossene read-only Preflight autorisiert keine Production-Arbeit. Ein globaler DB-Launch verlangt Evidenz für kanonische Migrationsbaseline, Brownfield-Vergleich, Schema-Drift-Prüfung, Backup, getesteten Restore, Migration-Dry-Run, exakten Release-Commit, Preview-Validierung, ausdrückliche Production-Human-Approval und Rollback-Verfahren. Zusätzlich werden Expand-/Contract-Kompatibilität soweit nötig, destructive Migration Identification, Backward-/Forward-Compatibility Window, Rollback-Grenze, Downgrade-Limits, Migration Observability, Partial-Failure-Handling, Orphan Cleanup sowie TTL-/Index-Verifikation geprüft. Ein sauberer Fresh-DB-Lauf ist kein Brownfield-Beleg.

## 7. Voxy / QR / Marketing als Output-Consumer

```text
approved/reviewable topic or post
→ canonical briefing
→ Voxy script draft
→ Voxy video PREVIEW
→ captions/accessibility
→ canonical public destination
→ QR PREVIEW
→ social variants
→ /admin/marketing review
→ explicit human approval
→ publish/distribute
```

Die Lane referenziert bestehende Owner, unter anderem `QR-PUBLIC-ENTRY-02`, `MARKETING-CONTENT-OPERATIONS-READMODEL-02`, `MARKETING-PUBLISH-APPROVAL-06`, `MARKETING-DELEGATED-DISTRIBUTION-07`, `VOXY-HOMEPAGE-REFERENCE-FILMS-01`, `VOXY-ADMIN-VIDEO-STUDIO-01` und `V3-DOSSIER-SOCIAL-OUTPUT-DRAFTS-01`; sie dupliziert sie nicht. G4 bleibt Public-QR-Guard-Owner.

Es gibt kein Auto-Publish. Outputs dürfen keine Evidenz erfinden. QR-Ziele sind kanonisch und versionssicher; eine stale Dossier-/Decision-Revision invalidiert davon abgeleitete Promotion. Provenienz führt zum kanonischen Topic/Dossier und zur exakten Revision zurück. Captions und Accessibility gehören zur Freigabe. Fehler und Retry sind beobachtbar. Generierte Medien sind niemals Evidenz für ihre eigenen Behauptungen.

Da kein vorhandener Task die vollständige Cross-output-Acceptance besitzt, wird `VOXY-QR-MARKETING-OUTPUT-LIFECYCLE-ACCEPTANCE-01` `blocked` dispositioniert. Er prüft die bestehenden Owner als Kette `approved canonical object/revision → briefing provenance → script → render preview → caption review → canonical public URL → QR preview → human approval → distribution/export receipt → correction/revocation`. Acceptance umfasst Failed Render, bounded Retry, keine Duplicate Render/Distribution, stale Revision Invalidation, Media Retention/Deletion/Retraction, Bild-/Audio-/Voice-/Music-/Font-Rechte und Consent soweit relevant, Caption Accuracy, korrekte Sprachvariante, Accessibility, stale/revoked QR-Verhalten, Output Provenance, Distribution Receipt und Post-publication Correction. Es entsteht weder neue Output-Runtime noch Auto-Publish.

## 8. Global Production Definition of Done

Ein produktionsrelevanter Slice ist nicht allein wegen grüner Unit-/Contract-Tests `done`. Wo anwendbar sind folgende Belege Pflicht:

| Kategorie | Pflichtbelege |
| --- | --- |
| Functional | exakter Acceptance Contract; keine doppelte Runtime; Idempotenz/Replay |
| Security/Privacy | PII-/Secret-Red-Team; Auth-/Session-/Actor-Isolation; Abuse-/Rate-Limits; fail-closed |
| Data | Persistenz/Reload; relevante Migrationskompatibilität; Retention/TTL; stale/superseded; keine rohe Browser-PII |
| Recovery | Retry; Resume; Crash/Restart; Duplicate Delivery; Provider-Ausfall |
| Truth/Governance | Source Provenance; Unsicherheit; Human Review; kein Auto-Publish; keine falsche Repräsentativität; keine Fake Metrics |
| UX | Mobile; Tastatur; Screenreader; Empty/Partial/Error; Lokalisierung; RTL, wo anwendbar; Browser-Support-Matrix; manuelle Accessibility-QA für Public Production |
| Operations | Observability; actionable errors; Cost-/Rate-Limits; Kill Switch, wo relevant; Rollback |
| Performance | begrenzte Latenz, Payload und Ressourcennutzung; repräsentativer Load-/Concurrency-Test, wo anwendbar |
| Human Acceptance | echte manuelle Abnahme, wo verlangt; automatisierte Tests werden nicht als Human Acceptance bezeichnet |

Der globale Production-/Public-Launch-Gate darf nur `GREEN` sein, wenn alle anwendbaren P0-/P1-Gates geschlossen sind. P2 blockiert nach den bestehenden Stop-Loss-Regeln nicht automatisch.

## 9. Sechsstufige Launch-Reife

Die Stufen dürfen nicht zu einem generischen „Launch“ zusammengezogen werden:

| Stufe | Exit-Gate |
| --- | --- |
| 1. DEVELOPMENT COMPLETE | Scope, Contracts, Tests und Reviews des begrenzten Slices geschlossen; keinerlei Production-Claim. |
| 2. INTERNAL ALPHA | interne Nutzer sowie synthetische oder kontrollierte Daten; Observability, sichere Fehler und Kill Switch belegt. |
| 3. CONTROLLED BETA | benannte Kohorte, Operator Support, sichere Data-/Review-/Publish-Grenzen und dokumentierter Rollback. |
| 4. PUBLIC BETA | Für den öffentlich angebotenen Core Scope sind Security, Privacy/Legal, Auth/Session, Review/Publish, Incident Readiness und Human Publish Gates geschlossen. T8, volle autonome Operations und volle Voxy-/QR-Automation dürfen ehrlich ausgeschlossen bleiben, wenn sie nicht beworben werden. |
| 5. PUBLIC PRODUCTION | Soweit anwendbar: SLO/Monitoring, On-call, Incident Response, DR/RTO/RPO, Data Lifecycle, Backup/Restore, Production-Migration-Proof, Load/Concurrency, Browser Compatibility, manuelle Accessibility-Abnahme, Rollback und Security-/Supply-/Config-Gates. |
| 6. AUTONOMOUS OPERATIONS READY | Zusätzlich Alpha2-E2E-Safety-/Recovery-Acceptance, Single Writer, Orchestrator, Dispatch, Repair, Mission Control, Evals/Drift, Budgets, Kill Switch, Human Escalation sowie unveränderte Human Publish/Decision Gates. |

Public Beta ist keine Public-Production- oder Autonomous-Operations-Behauptung. Der aktuelle globale Production-/Public-Launch-Status bleibt `BLOCKED`.

## 10. Globale Readiness-Grenze

Die Kategorien in `docs/E150/ProductionReadinessMatrix.md` sind die kompakte Statussicht. Ein lokaler `done`-, `production_ready`- oder Pilot-Beleg gilt nur für seinen ausdrücklich begrenzten Contract. Er überschreibt weder offene P0/P1-Gates noch Golden-Case-, Brownfield-, Security-, Human- oder Public-Launch-Anforderungen.
