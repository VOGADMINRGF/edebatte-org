# eDebatte Create Stack Extraction Runbook

Stand: 2026-09-10

Status: Governance- und Extraktionsplan; C1, C2, C3A und C3B sind gemergt, der C3-Parent bleibt blockiert und ausschließlich C3C `CREATE-GUEST-CLAIM-PII-SAFETY-01` ist `codex_ready` für seinen Preflight; die Implementierung ist nicht autorisiert

Zielbasis: `main@91ac96aa8dc12ab38e4912b6e4d29807f124cde4` (enthält C1 über PR `#734`, C2 über PR `#736`, C3A über PR `#740` und C3B über PR `#744`)

## 1. Zweck und verbindliche Grenzen

Dieses Runbook versioniert den freigegebenen verlustfreien Extraktionsplan aus dem System-wide Architecture & Collision Audit vom 2026-09-08. Es übernimmt getestete Verantwortung aus den gestapelten PRs `#627`, `#713`, `#724`, `#682`, `#725`, `#727` und `#708` in kleine, jeweils frisch von aktuellem `main` gestartete Slices.

Es gilt für jeden Slice:

- keine ganzen gemischten Commits und keine gestapelte Branchbasis übernehmen;
- Dateien und insbesondere Mischdateien symbol- beziehungsweise hunkgenau extrahieren;
- vorhandene Tests und Korrekturen wiederverwenden, nicht parallel neu erfinden;
- jede fachliche Änderung besitzt genau einen Slice-Owner;
- ein späterer Slice darf dieselbe Integrationsdatei erneut ändern, aber keinen bereits übernommenen Hunk duplizieren;
- kein Auto-Publish, kein Silent Merge, keine zweite Create-, Planner-, Session-, Resolver-, Source-, Review- oder Progress-Runtime;
- Quellen, Unsicherheit, Nutzerentscheidung, Auth-Grenze und PII-Grenze bleiben nachvollziehbar;
- C3A ist über PR `#740` abgeschlossen; C3B ist über PR `#744`, Implementation Head `c697fe225339e8f9e923b37506d84214d69068a2`, als `main@91ac96aa8dc12ab38e4912b6e4d29807f124cde4` abgeschlossen. Ausschließlich C3C `CREATE-GUEST-CLAIM-PII-SAFETY-01` ist `codex_ready` und `preflight_only`; `IMPLEMENTATION_AUTHORIZED=false`. C3D bleibt `blocked`, C4–C12 und G1–G5 bleiben nicht autorisiert, und der fehlgeschlagene C3-Parent-Preflight autorisiert keine weitere Implementierung.

`CREATE-PLANNER-TIMING-FOUNDATION-01` (C1) ist über PR `#734` gemergt. `CREATE-WORKSPACE-MOBILE-PRESENTATION-01` (C2) ist über PR `#736`, Implementation Head `a86d50128fed9ec86a0c7884c7f5a11a978b79e1`, als `main@7896cd41ba366b3b7de5725872675170e8f3b86b` gemergt. Für `CREATE-ANONYMOUS-SESSION-ABUSE-GUEST-CLAIM-01` (C3) gilt `TASK_PREFLIGHT=PASS`, `PII_SECURITY_PREFLIGHT=FAIL`, `SIZE_GATE=FAIL_SPLIT_REQUIRED`, `SECURITY_GATE=FAIL_BLOCKED`, `WORK_REQUIRED=true` und `SAFE_TO_IMPLEMENT=false`. Der Parent bleibt nicht ausführbar. C3A ist über PR `#740` abgeschlossen; C3B ist über PR `#744`, Implementation Head `c697fe225339e8f9e923b37506d84214d69068a2`, als `main@91ac96aa8dc12ab38e4912b6e4d29807f124cde4` abgeschlossen. Ausschließlich der C3C-Task `CREATE-GUEST-CLAIM-PII-SAFETY-01` ist für Task-, Security-, Extraktions- und Size-Preflight `codex_ready`; die Implementierung bleibt nicht autorisiert. C3D, C4–C12 und G1–G5 bleiben unautorisiert. Jeder spätere Slice braucht nach Abschluss aller Vorgänger einen eigenen operativen Task, einen positiven Preflight und einen frischen Branch vom dann aktuellen `main`. Die produktweite Einordnung steht in `docs/E150/EDEBATTE_MASTER_PRODUCTION_ROADMAP_2026-09-09.md`.

## 2. Exakte Extraktionsreihenfolge

| Slice | Eindeutiger fachlicher Owner | Primäre Quelle | Startbedingung |
| --- | --- | --- | --- |
| C1 | Authenticated Create Planner / Timing Foundation | `#713`, korrigierende Evidence `#682`, Vergleich `#627` | gemergt über PR `#734` als `main@cc42c0f73490833b0bf999d177672ebf342f9880` |
| C2 | Authenticated Create Workspace / Mobile Presentation | `#713` | gemergt über PR `#736` als `main@7896cd41ba366b3b7de5725872675170e8f3b86b` |
| C3 | Anonymous Session, Abuse Gates und redacted Guest Claim | `#724`, `#682` | Parent `blocked`; C3A über PR `#740` done; C3B über PR `#744` auf Head `c697fe225339e8f9e923b37506d84214d69068a2` done; nur C3C `CREATE-GUEST-CLAIM-PII-SAFETY-01` `codex_ready`/`preflight_only`; C3D `blocked` |
| C4 | Browser Resume, explizite Adoption und Draft Binding | `#682` | C3A–C3D abgeschlossen; Session-/Actor-/Claim-Verträge stabil |
| C5 | Citizen Context und Place Resolution | `#682` | C4 gemergt; keine zweite Resolver-Wahrheit |
| C6 | Existing-Topic Match und explizite Stance | `#682` | C5 gemergt; kanonische Match-IDs verfügbar |
| C7 | Official Jurisdiction Index und Confirmation | `#682` | C6 gemergt; serverauthoritative Candidate-Keys |
| C8 | Authenticated Source / Link Analysis | `#627`, korrigierende Übergaben `#682` | C4 und C7 gemergt; sichere Source-Grenze |
| C9 | Canonical Handoff und Review Persistence | `#682`; Guard-Abhängigkeit G1 aus `#708` | C6–C8 und G1 gemergt |
| C10 | Operator Notifications | `#725` | C9 gemergt; Mail-/Secret-Gates getrennt |
| C11 | Progress Event Contract, Store und Stream/Resume | `#727` | C1, C3, C4, C9 und C10 gemergt |
| C12 | Truthful Progressive-Transparency UX | `#727` | C11 gemergt; Accessibility-/Human-Gate |

Die Reihenfolge bezeichnet Merge-Reihenfolge, nicht Branch-Stacking. Jeder Branch startet nach Aktualisierung von `origin/main` neu.

## 3. Slice-Verträge C1–C12

### C1 — Authenticated Create Planner / Timing Foundation

**Source-PRs und Commits:** `#713`: `09a5e51f`, `c908cd63`, `60656e1e`; korrigierende Planner-Evidence aus `#682`: `93a9b631`, `4e21a513`; historische Vergleichsevidenz aus `#627`: `3e472fc6`, `8cbe9d78`, `4cdeaab8`, `62dc0fcf`, `6a630fb8` — nicht cherry-picken.

**Zu extrahierende Owner-Dateien/Hunks:**

- `apps/web/src/features/create/createPlanner.ts`: typisierte Normalisierung, Qualitätsgate, wahrer Provider-/Timeout-/Degraded-Status;
- `apps/web/src/features/create/createIntakeClassification.ts`: Single-/Multi-Issue und Hauptthema-versus-Aspekte;
- `apps/web/src/features/create/createFastIntakeTiming.ts`: Deadline erst nach durable Save und Fast-/Standard-Lane;
- `apps/web/src/features/create/intelligentFollowup.ts` und `intelligentFollowupContract.ts`: nur Planner-Ergebnisvertrag und requestgebundene Metadaten;
- `apps/web/src/app/api/create/intelligent-followup/route.ts`: ausschließlich authentifizierter Planner und lifecycle-sichere AI-Usage-Persistenz;
- `apps/web/src/app/create/CreateClient.tsx`: nur Save-before-analysis, Deadline-after-save, gleiche Correlation bei Retry und kontrolliertes Update desselben Drafts;
- fokussierte Planner-, Timing-, Route-, Save-, Multi-Issue- und Werkstätten-Regressionen aus den genannten Commits.

**Nicht enthalten:** anonyme Identity, Abuse-Gates, Guest Intake/Claim/Resume/Adoption, Jurisdiction, Match/Stance, Source/Link, Handoff, Notifications, Progress/SSE sowie breite Mobile-, Layout- oder Copy-Hunks; keine Provider-Policy-Neuerfindung aus `#627`.

**Grenzen:** API höchstens `/api/create/intelligent-followup` und der bereits vorhandene authentifizierte Save-Aufruf; Persistenzobjekt ist derselbe Account-Draft plus AI-Usage-Eintrag; Auth fail-closed; Planner erhält nur model-safe Text; Retry bleibt auf derselben Draft-/Correlation-Identität idempotent.

**Pflichttests und Human Acceptance:** Planner-Normalisierung, Quality Gate, Fast-/Standard-Timing, Save-before-analysis, Same-Correlation-Retry, truthful timeout/degraded, genau ein logischer Providerlauf; Werkstätten-Text ergibt `result_ready`, `specific`, ein Hauptthema und sinnvolle Aspekte. Human Acceptance prüft verständliche Single-/Multi-Issue-Ergebnisse und wahrheitsgemäße Recovery.

**Merge-Voraussetzungen:** positiver Task-Preflight; vor Implementierung `≤25` Dateien, `≤2` Core-Contracts, `≤2` API-Grenzen und ungefähr `≤1500` Nettozeilen nachweisen, sonst vorher splitten; fokussierte Tests, Web Critical, Production Guardrails, Typecheck, Full Lint, Diff-Check, Build, Exact-Head-CI und Review grün.

### C2 — Authenticated Create Workspace / Mobile Presentation

**Source:** `#713`, insbesondere `a0613740`, `d6e57e7d`, `38c1af2d`, `a2e6d6c9`, `547843cb`, `7518b19c`, `cc2e38ef`, `2f07cf9f`, `76097cc7`, `2b3879f4`, `f58befe2`, `10df34d3`, `00236351`.

**Owner-Dateien/Hunks:** `create-mobile-polish.css`, `CreateWorkspaceShell.tsx`, `SharedCreateComposer.tsx`, `CreateVisualFollowup.tsx`, `CreateDebattenstandSidecar.tsx`, `createDebattenstandSelector.ts`, `createSurfaceConfig.ts`, `createVoxySupportCopy.ts`; in `CreateClient.tsx` nur Darstellung und authentifizierter Workstate; `api/create/workstates/route.ts` und zugehörige nullable-reference-/workspace-/mobile Tests. `layout.tsx` und `LoginPageShell.tsx` nur übernehmen, wenn der hunkgenaue Preflight eine zwingende Create-Abhängigkeit beweist; sonst ausschließen.

**Nicht enthalten:** C1-Plannerlogik, Guest-/Security-/Jurisdiction-/Source-/Handoff-/Progress-Verantwortung oder allgemeiner Site-Layout-Umbau.

**Grenzen:** vorhandene Auth-/Workstate-Grenze; keine neue Persistenz, sondern bestehender Saved Workstate/Account-Draft; keine PII-Duplikation in Browserstatus; UI-Retry erzeugt weder Draft noch Providerlauf doppelt.

**Tests/Human/Merge:** bestehende Mobile-/Desktop-, Entry-Hierarchy-, Dialog-, Workstate- und Recovery-Contracts; Tastatur, Screenreader, 320/375/768/1440-Viewport und echter authentifizierter Preview-Smoke. C1 muss gemergt sein; Dateigröße vor Implementierung erneut begrenzen.

### C3 — Anonymous Session, Abuse Gates und redacted Guest Claim

**Disposition 2026-09-09:** Der Parent `CREATE-ANONYMOUS-SESSION-ABUSE-GUEST-CLAIM-01` ist `blocked` und darf nicht implementiert werden. Der Task-Preflight war positiv, aber PII-/Security-Preflight und Größen-/Security-Gates sind fehlgeschlagen. Blocker sind rohe Guest-Daten in `localStorage`, rekursiv codierte PII, Credential-/Signed-URL-Bypass, clientseitige freie Correlation, unsichere persistierte Result-/Failure-Payloads, unzureichend abuse-begrenzte Session-Erzeugung, unvollständige Body-Size-/Content-Type-Gates sowie überschrittene Slice-/Core-Contract-/Security-Grenzen. Es ist kein P0 bekannt; die Befunde sind P1-/Security-Architekturblocker.

Die einzig zulässige spätere Reihenfolge ist:

1. C3A `CREATE-ANONYMOUS-SESSION-FOUNDATION-01` — signierte HttpOnly-SameSite-Session, serverseitige UUID/Expiry, minimaler Session-Endpunkt und begrenzte Issuance; keine Intake-/Planner-/Resume-/Browser-Rohdaten-Verantwortung. Jede temporäre Session besitzt explizite TTL, Retention Policy, Cleanup Owner, Expiry-/Orphan-Cleanup und Crash-/Restart-Recovery samt verifizierbarer Bereinigung.
2. C3B `CREATE-ANONYMOUS-ABUSE-ROUTE-SECURITY-01` — Same-Origin/Fetch Metadata/CSRF, Honeypot, persistente Limits/Cooldown, Content-Type, gemessene Body-Grenze und fail-closed Parser-/Limiter-Grenzen; keine fachliche Planner-/Intake-Semantik.
3. C3C `CREATE-GUEST-CLAIM-PII-SAFETY-01` — der autorisierte Preflight bestimmt die Implementierungsgrenze für Claim-Identität und kanonischen Single-Flight-Key mit ausschließlich servergenerierter Correlation sowie für rekursive PII-/Secret-/Signed-URL-Leakage-Erkennung und ausschließlich allowlistete sichere Fehler. Client-Correlation ist niemals Claim-Identität, Key-Einfluss, Replay-Namespace oder freie persistierte Metadaten. Keine Adoption, kein Resume, kein Account Draft, keine Browserpersistenz und keine Production-Aktivierung; die Implementierung ist nicht autorisiert.
4. C3D `CREATE-GUEST-EPHEMERAL-UI-01` — minimale Guest-UI mit ephemerem React-State; keine Rohdaten-/Trace-/Result-Persistenz, kein Resume, keine Adoption und kein Account Draft.

C3A hat den eigenen Preflight bestanden und wurde über PR `#740`, Exact Head `39a5e2567885ec1d33c74c51b553561d7bd91637`, als `main@52b1995706e0b69c01413171b63b4d7888dbb16b` gemergt. C3B wurde über PR `#744`, Implementation Head `c697fe225339e8f9e923b37506d84214d69068a2`, als `main@91ac96aa8dc12ab38e4912b6e4d29807f124cde4` gemergt und ist `done`; seine Implementierungsautorisierung bleibt für neue oder doppelte Dispatches geschlossen. Ausschließlich C3C `CREATE-GUEST-CLAIM-PII-SAFETY-01` ist jetzt `codex_ready` für Task-, Security-, Extraktions- und Size-Preflight. Es gilt `AUTHORIZATION=preflight_only` und `IMPLEMENTATION_AUTHORIZED=false`. C3D bleibt `blocked`, und C4 hängt weiterhin vom Abschluss aller vier Slices ab. Die folgende Source-/Owner-Evidence beschreibt den historischen Parent-Scope und ist keine pauschale Copy- oder Merge-Freigabe.

Die durch PR `#744` ausgeschöpfte C3B-Implementierungsfreigabe war auf neun Dateien begrenzt. Geändert werden durften ausschließlich `apps/web/src/features/create/createMutationSecurityContract.ts`, `apps/web/src/features/create/createRouteSecurity.ts`, `apps/web/src/app/api/create/session/route.ts`, `apps/web/src/app/create/CreateClient.tsx`, `apps/web/tests/create-route-security.contract.test.ts` und `apps/web/tests/create-mode.save.route.test.ts`; neu hinzukommen durften ausschließlich `apps/web/src/features/create/createAbuseGuard.ts`, `apps/web/tests/create-abuse-guard.contract.test.ts` und `apps/web/tests/create-antispam-client.contract.test.ts`. Die neunte Datei ist eine bestehende Testdatei und durfte nur den minimalen steuerbaren Mock für den realen persistenten Limiter erhalten, dessen Default den verfügbaren und erlaubenden Limiter abbildet. Auf `main@67c3fb8b6e62201587964e0226714cf3e84e9b4c` und im sicher verwahrten C3B-Implementierungsstand bestanden ohne diesen Mock jeweils 2/19 Tests; 17/19 scheiterten als Test-Harness-Inkompatibilität, nicht als belegte Runtime-Regression. Assertions sowie Origin-, Fetch-Metadata-, CSRF-, Honeypot-, Parser- und Body-Size-Prüfungen dürfen weder abgeschwächt noch umgangen werden. In `CreateClient.tsx` war der Hunk ausschließlich auf den minimalen initial leeren, längenbegrenzten, nicht sichtbaren Honeypot-State samt off-screen Control im bestehenden Composer und die Weitergabe an die fünf vorhandenen `createMutationRequestHeaders()`-Callsites beschränkt; `SharedCreateComposer.tsx`, Request-Bodies und Submit-Pfade blieben unverändert. Die ausgeschöpfte Freigabe umfasste nur Same-Origin, Fetch Metadata, CSRF, Honeypot, persistente Rate-/Risk-Limits, Cooldown/Duplicate-Handling, Content-Type, tatsächlich gemessene und vor dem Parse begrenzte Body-Größe, fail-closed Parser/Limiter, minimierte beziehungsweise gehashte Subjects, feste sichere öffentliche Fehler, C3A-Session-Verifikationskompatibilität, Leak-Schutz und fokussierte Regressionen. Weitere Runtime- oder Testdateien, sichtbare Browser-UX, Planner-/Intake-Fachsemantik, Guest Claim/Adoption, browsergenerierte anonyme Session-IDs, Session-/Local-Storage-Resume, implizites Session-Priming, Production-DB, Migration, Deployment, Provider-/Secret-Aktivierung und Auto-Publish bleiben ausgeschlossen.

Die kanonische Source-Hunk-, Collision-, C3A-, Security-, Size-, Test- und Dependency-Evidence für diese Freigabe steht in `docs/E150/CREATE_ANONYMOUS_ABUSE_ROUTE_SECURITY_C3B_PREFLIGHT_2026-09-10.md`.

C3C definiert getrennte minimale Allowlist-Schemas für (A) den persistierten Claim/das persistierte Result und (B) die API-Response. Beide schließen rohen Guest-Text, Source-Input, sensitive URL, Planner-Prompt/-Trace, rohe Providerantwort, Token, Credential, Secret, beliebige Fehlerstrings und beliebige Metadatenblobs aus. Rekursive PII-/Secret-Validierung erfolgt sowohl vor Persistenz als auch vor API-Return. Ein Fehler stoppt ohne unsichere Persistenz und ohne unsicheren Response-Payload; ausschließlich feste allowlistete Failure-Codes dürfen eine servereigene menschenlesbare Diagnose ableiten.

Für Anonymous Session, Guest Operation, Single-Flight Claim, Lease und sicheres gespeichertes Result sind jeweils TTL, Retention, Cleanup Owner, Expiry-Verhalten, Orphan- und stale-Lease-Cleanup, Crash-/Restart-Recovery und Cleanup-Verifikation explizit. Es entsteht kein zweites Persistenzsystem. Dieselbe PII-/Secret-Policy gilt für Datenbank, API-Response, Log, Structured Log, Trace, Analytics, Error Payload, Audit Metadata und Provider Diagnostics; rohe Guest-/Source-Secrets dürfen Observability nie erreichen.

**Source:** `#724`: `3011d46a`, `c05be10d`, `a8f227cf`; `#682`: `bb72c178`, `52baa748`, `0added0a`, `04dd1f49`, `0b258560`. Merge-/Konvergenzcommits sind keine Extraktionseinheit.

**Owner-Dateien/Hunks:** `createAbuseGuard.ts`, `createAnonymousSession.ts`, `createMutationSecurityContract.ts`, `createRouteSecurity.ts`, `createOrchestrationSingleFlight.ts`, `/api/create/session`, `/api/create/intake`; Guest-Claim-Erzeugung und ausschließlich pre-planner URL-Erkennung/`source_pending` in `linkIntake.ts`; minimale Guest-Hunks in `CreateClient.tsx`, `page.tsx` und `SharedCreateComposer.tsx`; Abuse-, Anonymous-Session-, Intake-, Single-Flight-, Route-Security- und recursive-PII-Tests.

**Nicht enthalten:** Login-Adoption und Account-Draft-Bindung (C4), fachliche Linkanalyse (C8), Jurisdiction (C7), Handoff (C9), Planner-Neuerfindung oder Client-vertraute Claims.

**Grenzen:** APIs `/api/create/session` und `/api/create/intake`; Persistenzobjekte Anonymous Session, browser-/sessiongebundene Guest Operation und Single-Flight Claim; keine Account-Persistenz vor expliziter Adoption; Rohtext und URLs sind PII-Zonen; Claim enthält nur servervalidierte sichere Zustände; Session-, Actor-, Input-Hash- und Correlation-Key binden Idempotenz.

**DO-NOT-COPY aus dem Reference-Branch `#682`:** Die folgenden Punkte gelten als offene Regressionsevidence und dürfen nicht als dort behoben behauptet werden:

1. rekursiv mehrfach percent-encodierte PII in Username, Password, Path, Query-Key, Query-Value oder Fragment;
2. Credential-, Token- und signed-resource Query-Parameter, auch wenn sie keinem einfachen E-Mail-/Telefonmuster entsprechen;
3. keine semantisch verfälschte „redigierte“ Fetch-URL erzeugen; bei sensitiver URL fail-closed und ehrlich `source_pending`/sichere Neueingabe verlangen.

**Historische Testevidence, keine Merge-Freigabe:** Honeypot, Rate-/Risk-Gates, Cross-Session-Angriff, Single Flight, normaler Guest-Text, URL-only/URL-led ohne Planner, rekursiver Claim-Scan und mehrstufig encodierte/signed URL-Fixtures. Jeder Subslice braucht eigene fokussierte Tests und Human Acceptance; ein gemeinsamer C3-Merge ist ausgeschlossen.

### C4 — Browser Resume, explizite Adoption und Draft Binding

**Source:** `#682`: `52baa748`, `a12978a5`, `0added0a` sowie ausschließlich Adoption-/Binding-Korrekturen aus `d0444a90` und `af8c1a57`.

**Owner-Dateien/Hunks:** Resume-/Guest-Workspace-Hunks in `CreateClient.tsx`, `SharedCreateComposer.tsx` und `CreateVisualFollowup.tsx`; Adoption in `/api/create/save`; Session-Read in `/api/create/session`; `createAnonymousSession.ts`, `createOrchestrationSingleFlight.ts`, `createContributionPackageContract.ts`, `createHandoffDrafts.ts` nur soweit sie Claim-Verbrauch und echte Draft-ID binden; Save-, Resume-, Adoption- und Single-Flight-Tests.

**Nicht enthalten:** neue Intake-/PII-Policy (C3), Jurisdiction-/Match-/Handoff-Fachpayload, Link-Fetch (C8), Planner-Replay oder implizite Adoption.

**Grenzen:** Login ist sichtbare Auth-Grenze; Guest → Login → Adoption rotiert beziehungsweise authentifiziert den Security Context. Die anonyme Session bleibt nach Login kein wiederverwendbares Auth-Credential. Account-Identität ist ausschließlich server-authoritative; eine clientseitige ID allein autorisiert keine Adoption. Der Server validiert Guest Session, Operation, Browserbindung und bisherigen Verbrauch; alte anonyme Bindings sind nicht cross-account wiederverwendbar. Persistenzobjekte sind Claim, idempotentes Adoption Receipt und genau ein Account-Draft; Client darf Operation-ID plus Payload nicht erfinden; Wiederholung liefert denselben Draft und Cross-Account-/Cross-Session-Adoption bleibt fail-closed.

**Tests/Human/Merge:** Reload/Resume, Login-Grenze, erfolgreiche explizite Adoption, zweite Adoption idempotent, fremder Actor abgewiesen, genau ein Draft, kein Planner-Replay und kein `draftId:null`; zusätzlich Session-Rotation/Rebinding, alte anonyme Credential-Wiederverwendung und Cross-Account-Adoption. C3A–C3D müssen abgeschlossen und gemergt sein; authentifizierter und Guest-Browser-Smoke erforderlich.

### C5 — Citizen Context und Place Resolution

**Source:** `#682`: `28e08cd6`, `52baa748`, `9a183863`, `d0444a90`; spätere Korrekturen nur hunkgenau.

**Owner-Dateien/Hunks:** `createCitizenIntakeContext.ts`, `createCitizenIntakeContextServer.ts`, `SharedCreateComposer.tsx`, Citizen-Region-Chip-Hunks in `CreateClient.tsx`, `intelligentFollowup.ts`, `intelligentFollowupContract.ts` und `intelligentFollowupResults.ts`; zugehörige Citizen-Context-/Region-/Emergency-Regressionen.

**Nicht enthalten:** offizieller Candidate-Index und Confirmation (C7), Existing-Topic-Match (C6), Guest-Identity (C3/C4), Handoff-Persistenz (C9) oder zweite Place-/Resolver-Runtime.

**Grenzen:** vorhandener serverseitiger Place Resolver bleibt authoritative; expliziter Ort schlägt Profilregion; Bund/EU werden nicht auf Kommune reduziert; Ambiguität bleibt Klärung; Citizen Context wird nur im bestehenden Draft/Analysis-Payload fortgeführt; keine PII über notwendige kanonische Ortsreferenz hinaus; dieselbe Correlation aktualisiert denselben Context.

**Tests/Human/Merge:** expliziter Ort versus Profil, Wuppertal, Dithmarschen, Bund, EU, Ambiguität, Emergency trotz Planner-Degraded. Human Acceptance prüft verständliche Ortschips und keine erfundene Zuständigkeit. C4 muss gemergt sein.

### C6 — Existing-Topic Match und explizite Stance

**Source:** `#682`: `28e08cd6`, `a12978a5`, `843a68a6`, `e0449a3b`, `9a183863`.

**Owner-Dateien/Hunks:** `existingTopicMatches.ts`, `existingTopicMatchesRuntimeBridge.ts`, `createExistingMatchDecision.ts`, `ExistingTopicMatchesPanel.tsx`; Match-/Stance-Hunks in `CreateClient.tsx`, `createContributionPackageContract.ts`, `createHandoffDrafts.ts` und Review-Queue-Mapping nur bis zum kanonischen Übergabeobjekt; Existing-Topic-, Counterposition-, Relation- und Match-Target-Tests.

**Nicht enthalten:** Persistierung des finalen Review/Handoffs (C9), Jurisdiction (C7), Source Match (C8), Silent Merge oder automatisch erfundene Haltung.

**Grenzen:** bestehende Topic-IDs/Titel sind serverseitige Referenzen; `support`, `oppose/counterposition`, `nuance`, `separate/new position` werden nur nach expliziter Wahl gesetzt, sonst `null/unknown`; Client kann kein fremdes Match umschreiben; wiederholte Wahl aktualisiert dieselbe Draft-/Correlation-Identität.

**Tests/Human/Merge:** vier explizite Entscheidungen plus keine Auswahl, Match-ID/Titel über Resume, kein Silent Merge und keine doppelte Position. Human Acceptance prüft verständliche Wahl und Gegenposition. C5 muss gemergt sein.

### C7 — Official Jurisdiction Index und Confirmation

**Source:** `#682`: initial `28e08cd6`; Index-/Validierungskorrekturen `e0449a3b`, `287482c3`, `93a9b631`, `4e21a513`, `d0444a90`, `af8c1a57`. Bei `93a9b631` und `4e21a513` gehören nur Jurisdiction-Hunks C7; Planner-Hunks gehören C1.

**Owner-Dateien/Hunks:** `createCitizenIntakeContextServer.ts`, `generatedOfficialAdministrativeUnitIndex.json`, nur falls noch benötigt der superseded Municipality-Index samt Generator-Migration, `scripts/generate-create-official-municipality-index.ts`; Confirmation-Hunks in `createCitizenIntakeContext.ts`, `/api/create/intake`, `/api/create/save` und `/api/create/handoffs`; Performance-, Index-, Citizen-Context- und Persistence-Tests.

**Nicht enthalten:** freie Client-Authority, zweiter Resolver, Match/Stance (C6), Handoff-Queue-Mechanik (C9) oder beliebiger Client-Text als Zuständigkeit.

**Grenzen:** servervalidierter Candidate-Key/ID ist authoritative; Persistenz bewahrt tatsächliche administrative Ebene und amtliche Authority; Wuppertal bleibt municipality/city, Dithmarschen district/county, Bund/EU unverändert; Guest/Profile-Adoption darf spätere legitime Confirmation nicht überschreiben; Index-Lookup ist gecacht und scannt nicht pro Request das vollständige Directory.

**DO-NOT-COPY:** Die bekannte P2-Lücke „Jurisdiction confirmation panel vollständig DE/EN lokalisieren“ ist im `#682`-Reference-Branch nicht als behoben belegt. Sie bleibt C7-Acceptance/Folgearbeit und darf weder verschwiegen noch als dort geschlossen dokumentiert werden.

**Tests/Human/Merge:** Candidate-Key-Manipulation, Ebene/Authority bis Persistenz, Wuppertal, Dithmarschen, Bund/EU, Profil-/Explicit-Precedence, Ambiguität, kalter/warmer Lookup ohne Full Scan, Guest Adoption und DE/EN-UI. C6 muss gemergt sein; serverseitiger Security-Review erforderlich.

### C8 — Authenticated Source / Link Analysis

**Source:** `#627`: `fb34133f`, `2fe5a15e`, `32a7569a`, `c9288245`, `719836f8`, `545f5c07`, `48d22af8`, `eafe3ae5`; Integrations-/Security-Evidence aus `#682`: `af8c1a57`, `0added0a`, `04dd1f49`, `0b258560` ausschließlich nach erfolgreicher C3/C4-Adoption.

**Owner-Dateien/Hunks:** `/api/create/link-analysis`, `externalSourceAnalysis.ts`, `externalSourceIntake.ts`, `inputClassification.ts`, vorhandener `safeExternalFetch.ts`, `features/ai/sources/youtube.ts`; PDF-/YouTube-/HTML-/SSRF-/Ressourcenlimit- und Source-Grounding-Tests; in `CreateClient.tsx` nur Start/Result des bereits adoptierten Drafts.

**Nicht enthalten:** pre-planner Guest-Claim/URL-Redaction (C3), Guest Adoption (C4), Planner aus URL/Slug, Support-Ticket-Automation, Provider-Policy-Umbau, DB-Workaround oder Paketänderung ohne einzeln bewiesene Notwendigkeit.

**Grenzen:** Linkanalyse erst nach echter `draftId` und Auth; Source-URL servervalidiert; Fetch bleibt SSRF-/Size-/Timeout-fail-closed; SourceArtifact/EvidenceReference wird im bestehenden Draft gespeichert; PII-/Credential-URL wird nicht verfälscht gefetcht; gleicher Source-Key und Draft ergeben idempotentes Ergebnis.

**Tests/Human/Merge:** URL-only erzeugt vor Adoption keinen Planner/Fetch, sichere URL lädt über echte Draft-ID, HTML/PDF/YouTube, Redirect/SSRF, Timeout, Größe, unsupported media, Source-Provenienz und kein erfundener Erfolg. Human Acceptance prüft klare Source-Pending-/Failure-Zustände. C4 und C7 müssen gemergt sein.

### C9 — Canonical Handoff und Review Persistence

**Source:** `#682`: `843a68a6`, `e0449a3b`, `7698a208`, `d0444a90`, `af8c1a57`; Shared Public Question Guard aus G1/`#708` als gemergte Abhängigkeit, nicht als hineinkopierter Hunk.

**Owner-Dateien/Hunks:** `createHandoff.ts`, `createHandoffDrafts.ts`, `createHandoffPersistenceContract.ts`, `createHandoffReviewQueue.ts`, `createHandoffReviewQueueRuntimeBridge.ts`, `persistedHandoffReviewQueue.ts`, `unifiedReviewQueueWiring.ts`, `/api/create/handoffs`; nur Übergabe-/Persistenz-Hunks in `/api/create/save` und `CreateClient.tsx`; Handoff-, Queue-, Persistence-, Replay- und Organization-Ownership-Tests.

**Nicht enthalten:** Producer-Publish-/Activation-Runtimes aus `#708`, Notification-Versand (C10), Progress (C11/C12), Auto-Publish, Auto-Merge oder zweite Review Queue.

**Grenzen:** Auth vor Account-Handoff; Guest muss C4-adoptiert sein; Persistenzobjekte sind canonical `CreateHandoffDraft` und bestehender Review-Queue-Eintrag; Match/Stance aus C6, Jurisdiction aus C7 und Source Result aus C8 werden kanonisch übernommen, nicht aus Clienttext rekonstruiert; Idempotency-/Replay-Key erzeugt genau einen Handoff; Organisationseigentum bleibt erhalten.

**Tests/Human/Merge:** vollständige Feldpersistenz, Resume, Replay, Actor-/Org-Isolation, manipulierte Clientfelder, kein Silent Merge und review-first Producer-Übergabe. Human Acceptance prüft den editierbaren Reviewzustand. C6–C8 und G1 müssen gemergt sein.

### C10 — Operator Notifications

**Source:** `#725`: `62d7f373`, `6f68d024`, `8eceb654`; die Merge-/Rebase-Historie wird nicht übernommen.

**Owner-Dateien/Hunks:** `operatorNotifications.ts`, `/api/cron/operator-digest`, notwendige Event-Hunks in `/api/create/intelligent-followup`, `/api/create/save` und `src/lib/onboarding/events.ts`, ausschließlich erforderliche `vercel.json`-Cron-Hunks und `operator-notifications.contract.test.ts`.

**Nicht enthalten:** Create-Stack-Basis aus `#713/#724/#682`, neue Mailruntime, Inbox-/Provideraktivierung, personenbezogene Prompt-/Inputinhalte oder Progress-Events.

**Grenzen:** bestehende serverseitige Auth-/Cron-Secret-Grenzen; persistiert werden nur kanonische, minimierte Operator-Events/Digest-Dedupe-Keys; keine Raw-Prompts, Secrets oder unnötige PII; Event-ID und Berlin-Tagesfenster verhindern Doppelversand.

**Tests/Human/Merge:** Routing, Redaction, Dedupe, DST/18-Uhr-Slots, fehlendes Secret fail-closed; echte Inbox-, Secret- und Providerprüfung bleiben Human Gate. C9 muss gemergt sein; SMTP-Acceptance ist kein Mergebeleg.

### C11 — Progress Event Contract, Store und Stream/Resume

**Source:** `#727`: `7fc69547`, korrigierende truthful-save Evidence `975a5337`; sämtliche geerbten `#713/#724/#725/#682`-Hunks sind ausgeschlossen.

**Owner-Dateien/Hunks:** `createProgressEventContract.ts`, `createProgressResume.ts`, `createProgressStreamClient.ts`, Progress-Hunks in `createOrchestrationSingleFlight.ts`, `aiOrchestrationProvenanceTrace.ts` und `/api/create/intelligent-followup`; nur echte Eventpersistenz/Streamtests aus `create-progressive-transparency`, `create-intelligent-followup`, Single-Flight und Responsive Smoke.

**Nicht enthalten:** Planner-, Guest-, Adoption-, Jurisdiction-, Match-, Handoff- oder Notification-Reimplementierung; keine UI-Choreografie (C12), keine Token-/Chain-of-Thought-Ausgabe und keine Fake-Prozentwerte.

**Grenzen:** Eventzugriff ist an Actor, Operation, Correlation und Draft gebunden; Events sind PII-minimiert und enthalten keine Secrets oder Rohreasoning; bestehender Progress-/Single-Flight-Store ist das Persistenzobjekt; Event-ID/Sequence und Resume-Cursor sind idempotent; Reconnect erzeugt weder Providerlauf noch Draft neu.

**Tests/Human/Merge:** Actor-Isolation, monotone Sequenz, Replay/Resume, SSE-Reconnect, Abbruch, Retention, Fehler nach Teilfortschritt, kein doppelter Planner/Draft und `draft.saved` nur nach echter Persistenz. C1, C3, C4, C9 und C10 müssen gemergt sein.

### C12 — Truthful Progressive-Transparency UX

**Source:** `#727`: ausschließlich UI-Hunks aus `7fc69547` und `975a5337`.

**Owner-Dateien/Hunks:** `CreateProgressiveTransparency.tsx`; ausschließlich Progress-Rendering in `CreateClient.tsx`; zugehörige UI-/A11y-/Responsive-Hunks in `create-progressive-transparency.contract.test.tsx`, Planner Responsive Smoke und Voxy Support Recovery.

**Nicht enthalten:** Eventstore/-transport (C11), geerbte Create-Foundation, neue Planneraufrufe, Research-/Graphbehauptungen ohne realen Start, interne Chain-of-Thought oder künstliche Prozentanzeigen.

**Grenzen:** UI konsumiert nur C11-Events; keine zusätzliche Persistenz; Actor-/PII-Grenze wird nicht im Client aufgeweicht; Reload verwendet Cursor/Operation statt Neustart; `provisional`, `corrected`, `failed` und `ready` werden wahrheitsgemäß sichtbar.

**Tests/Human/Merge:** kurzer Text ohne künstliche Choreografie, strukturierter Text mit deterministischer früher Struktur, validierte Topics erst nach Gate, Korrekturen nachvollziehbar, Fehler erhält bestätigte Teilergebnisse, Screenreader ohne Live-Region-Spam, Mobile/Desktop gleichwertig. C11 muss gemergt sein; Human Preview Acceptance ist Pflicht.

## 4. #627 Disposition Map

| Funktionale Einheit | Disposition | Begründung / Ziel |
| --- | --- | --- |
| `createPlanner.ts` Fast-Model-/Strict-Schema-/Timing-Änderungen | B — superseded | `#713` plus korrigierende `#682`-Evidence sind der neuere C1-Vertrag; `#627` nur Vergleich, nicht kopieren |
| `/api/create/intelligent-followup` und Create-Planner-Routing | B — superseded | C1 übernimmt den neueren authentifizierten Save-/Planner-/Retry-Lifecycle |
| `CreateClient.tsx` Planner-/Recovery-Hunks | B — superseded | hunkgenaue Verantwortungen liegen in C1/C2 und später C4/C8; kein alter monolithischer Client-Hunk |
| `features/ai/aiRuntimePolicy.ts`, `orchestratorE150.ts`, OpenAI-Provider-Grundlagen | A/B — bereits auf `main` beziehungsweise durch neueren Canon superseded | keine zweite Provider-Policy; C1 verwendet vorhandene zentrale Policy und nimmt nur belegte fehlende Adapterhunks |
| External Input Classification, HTML/PDF/YouTube und `/api/create/link-analysis` | C — weiterhin erforderlich | sicherheits- und source-spezifisch in C8 extrahieren; Tests für SSRF, Größe, Timeout, Parser und Grounding erhalten |
| `safeExternalFetch.ts` | A/C — vorhandene Main-Foundation, fehlende Source-Härtung nur hunkgenau | vorhandenen Helper erweitern, keinen parallelen Fetcher kopieren |
| DB-URL-Workaround, `.env.example`, DB-Client und pauschale Package-/Lockfile-Hunks | D — nicht Teil der Create-Extraktion | separat dispositioniert/obsolet; keine DB-Arbeit in C1–C12 |
| Provider-/Gemini-/NotebookLM-Audittexte | D für Runtime-Extraktion, historische Evidence bleibt | kein NotebookLM- oder Provider-Aktivierungsclaim |

Nach C1 und C8 kann `#627` geschlossen werden, sofern seine fokussierten Source-Security-Tests vollständig in den neuen Heads nachweisbar sind.

## 5. #682 exklusive Extraction Map

| Fachliche Änderung aus `#682` | Einziger Owner |
| --- | --- |
| geerbte anonyme Session und Abuse Gates | C3 |
| Guest Intake | C3 |
| Single-Flight Guest Claim | C3 |
| pre-planner URL Detection und `link_detected/source_pending` | C3 |
| Browser Resume / Guest Workspace | C4 |
| explizite Guest Adoption | C4 |
| Account-Draft-Binding und Adoption Receipt | C4 |
| Citizen Context, explicit place > profile region, Bund/EU, Ambiguität, Emergency | C5 |
| Existing-Topic-Matches, ausgewählte Match-ID/-Titel und Relation | C6 |
| explizite Support/Oppose/Nuance/Separate-Stance | C6 |
| Official Administrative Unit Index und Candidate-Key-Validierung | C7 |
| Jurisdiction Confirmation, Ebene und Authority bis Persistenz | C7 |
| post-adoption Link Analysis und Source Result | C8 |
| canonical Handoff Draft, Review Queue, API-Normalisierung und Persistenz | C9 |
| geerbte Planner-/Timing-Hunks aus `#713` | C1, nicht erneut aus `#682` |
| geerbte Mobile-/Presentation-Hunks aus `#713` | C2, nicht erneut aus `#682` |

Mischdateien wie `CreateClient.tsx`, `intelligentFollowup.ts`, `/api/create/save` und `/api/create/handoffs` dürfen in mehreren zeitlich getrennten Slices vorkommen, aber nur für die oben benannten disjunkten Verantwortungen. Der Reference-Head von `#682` ist kein Merge-Kandidat und kein Beleg, dass die drei C3-/C7-DO-NOT-COPY-Defekte geschlossen sind.

## 6. #727 exklusive Extraction Map

Der eigentliche Mehrwert von `#727` ist ausschließlich:

- C11: typed Event Contract, eventgebundene Persistenz, SSE beziehungsweise gleichwertiger serverless-tauglicher Stream, Actor-Isolation, Sequence/Cursor, Reconnect und Resume;
- C12: wahrheitsgemäße Progressive-Transparency-UX, vorläufige und korrigierte Zustände, Recovery, Accessibility und Responsive Rendering.

Nicht aus `#727` übernehmen werden alle geerbten Dateien/Hunks aus `#713`, `#724`, `#725` und `#682`, insbesondere Planner, Guest Session/Claim, Adoption, Citizen Context, Jurisdiction, Existing-Topic-Match, Handoff und Notifications. `draft.saved` darf erst nach realer Persistenz erscheinen; ein Reconnect darf weder Planner noch Draft duplizieren.

## 7. #708 Split Map G1–G5

`#708` ist kein einzelner Merge-Kandidat. Die 61 Dateien werden nach Producer/Runtime getrennt:

| Guard-Slice | Owner und Source-Commits | Dateien/Funktionen | Reihenfolge / Blockade |
| --- | --- | --- | --- |
| G1 | Shared Guard & Evidence; `6f3b6044`, `d42557b6`, `e33885ef`, `242c025b`, `017c5138`, `ea294d27` | `publicQuestionGeneralization.ts`, `questionGuardReviewPersistence.ts`, gemeinsame Review-/Audit-Transitions und Contracttests | zuerst; blockiert C9 und jede öffentliche Producer-Freigabe |
| G2 | Participation; `6f3b6044`, `d42557b6`, `ab17e99f`, `e33885ef`, `242c025b`, `017c5138`, `ea294d27` | Participation Publish Workflow/Runtime/Server, Admin-Route/-Action, Public Runtime und Tests | nach G1; blockiert nur Participation-Handoff/Public Release |
| G3 | Anlassraum; dieselben hunkrelevanten Commits einschließlich `4cdeda3e` | Anlassraum Activation Workflow/Server/Runtime, Admin-Route/-Action, Runden Public Input, Visibility/Concurrency und Tests | nach G1; blockiert Anlassraum-Handoff/Public Release |
| G4 | QR; `6f3b6044`, `ea294d27`, `b5276160`, `cb96b03b`, `f1c36c25`, `e9e80af4` | `qrQuestionSetGuard.ts`, Review-/Activation-/Resolve-/Vote-/Protocol-Routen, QR Studio und fokussierte Tests | nach G1; Reviewed-Set-Aktivierung und Reservation Recovery blockieren QR-Public-Release |
| G5 | Material; `6f3b6044`, `43eef025` | `materialDocumentReviewStore.ts`, `materialStructuredDrafts.ts`, Admin Material Review/API und Persistenztests | nach G1; blockiert nur Material-Producer, nicht generischen Create-Handoff |

Empfohlene Mergefolge: G1 → G2 → G3 → G4 → G5. Nach G1 können G2–G5 technisch auf jeweils frisch aktualisiertem `main` vorbereitet werden, bleiben aber separate PRs. Nur G1 blockiert den generischen review-first Create-Handoff; G2–G5 blockieren jeweils ausschließlich ihren Producer/Public-Release-Pfad.

## 8. Lifecycle-Gates

Jeder Slice führt zusätzlich zu seinen fokussierten Tests mindestens Typecheck, Full Lint, `git diff --check`, Web Critical, Production Guardrails und bei Route-/UI-/Buildrelevanz den Node-20-Production-Build aus. Exact-Head-CI und Review werden nach jedem Headwechsel neu bewertet.

| Slice | Permanenter Lifecycle-Ausschnitt |
| --- | --- |
| C1 | Auth Save → Planner → Result → Update desselben Drafts; Timeout/Retry ohne Duplikat |
| C2 | Auth Draft/Workstate → Reload → UI Recovery auf Mobile/Desktop |
| C3 | Guest Input → Session/Risk → redacted Claim → Single Flight; Text und URL |
| C4 | Claim → Resume → Login → explizite Adoption → genau ein Account-Draft |
| C5 | Input/Profile → Citizen Context → Place/Ambiguity/Emergency → Draft |
| C6 | Draft → bestehendes Topic → explizite Stance → kein Silent Merge |
| C7 | angebotener Candidate-Key → servervalidierte Confirmation → unveränderte Ebene/Authority |
| C8 | adoptierter Draft → sichere Source-Validierung → Source Result/Failure mit Provenienz |
| C9 | Draft + Context/Match/Source → canonical Handoff → bestehende Review Queue → Replay |
| C10 | kanonisches Event → minimierte Notification/Digest → Dedupe; Provider bleibt Human Gate |
| C11 | Operation → Event Store → Stream → Reconnect/Resume → identisches Resultat |
| C12 | echte Events → zugängliche truthful UX → corrected/failed/ready ohne Fake Progress |

### Finaler synthetischer Integrationstest

**Textpfad:**

`Guest → Planner → Resume → Login → Adoption → Draft → Jurisdiction → Match/Stance → Handoff → Review`

Der Test beweist durchgehend eine Guest Operation, eine Correlation, genau einen logischen Providerlauf, genau einen Account-Draft nach expliziter Adoption, servervalidierte Jurisdiction, durable Nutzerentscheidung, genau einen Handoff und einen bestehenden Review-Queue-Eintrag. Cross-Session-/Cross-Account-Zugriff, PII-Leak, Silent Merge und Auto-Publish bleiben ausgeschlossen.

**URL-Pfad:**

`Guest → redacted Claim → Resume → Login → Adoption → Draft → Link Analysis → Source Result → Handoff → Review`

Der Test beweist, dass URL/Slug nie als Fachtext geplant wird, der Claim rekursiv PII-frei und sessiongebunden ist, Linkanalyse erst mit echter Draft-ID startet, kein verfälschter/sensitiver Fetch stattfindet, Source-Provenienz erhalten bleibt und Adoption, Analyse sowie Handoff idempotent sind.

## 9. Reuse-versus-Rewrite und PR-Disposition

| PR | Isolierbarkeit / Entscheidung | Disposition nach Extraction |
| --- | --- | --- |
| `#627` | 49 Dateien, ältere Planner- und Source-Verantwortung vermischt; Planner nur Vergleich, Source-Runtime in C8 wiederverwenden | nach C1/C8 schließen; nicht as-is mergen |
| `#713` | 50 Dateien und 17 Commits; getestete C1-/C2-Hunks wertvoll, aber Planner, mobile UI, Auth-Copy und Workstates vermischt | C1 und C2 extrahieren, danach schließen; nicht as-is mergen |
| `#724` | neun eigene Dateien und fachlich relativ kohärent, aber auf `#713` gestapelt | Security-Hunks in C3 wiederverwenden; wegen gestapelter Base nicht as-is mergen |
| `#682` | 100 Dateien und mehrere geerbte Runtimes; enthält wertvolle Korrekturevidence C1/C3–C9 | Reference-only, hunkgenau extrahieren, danach schließen; nie as-is mergen |
| `#725` | acht eigene Dateien und kohärente Notification-Verantwortung, aber auf `#724` gestapelt | C10 extrahieren; nicht as-is mergen |
| `#727` | 49 Dateien überwiegend geerbt; echter Mehrwert auf Progress-Hunks begrenzt | C11/C12 extrahieren; danach schließen; nicht as-is mergen |
| `#708` | 61 Dateien über fünf Producer/Runtime-Grenzen | G1–G5 separat extrahieren; nicht as-is mergen |

Von den aufgeführten Create-/Guard-Quell-PRs ist keiner auf aktuellem `main` sicher as-is mergebar. „Reuse“ bedeutet getestete Symbole, Hunks und Regressionen übernehmen; „Rewrite“ ist nur für notwendige Anpassung an den dann aktuellen Main-Contract zulässig und muss gegen die Source-Evidence differenziell getestet werden.

## 10. Blocking Dependencies und Ziel-Branchgraph

```text
main (C1, C2, C3A und C3B gemergt; C3B done über PR #744 auf c697fe225339e8f9e923b37506d84214d69068a2)
  └─ C3C Guest Claim/PII/Safety (codex_ready; preflight_only; implementation_authorized=false)
       └─ C3D Guest Ephemeral UI (blocked)
            └─ merge → refreshed main
                 └─ C4 Resume/Adoption/Draft Binding (C4–C12 nicht autorisiert)
                      └─ C5 Citizen Context/Place
                           └─ C6 Existing Topic/Stance
                                └─ C7 Jurisdiction
                                     └─ C8 Source/Link Analysis

current/refreshed main
  └─ G1 Shared Public Question Guard
       ├─ G2 Participation
       ├─ G3 Anlassraum
       ├─ G4 QR
       └─ G5 Material

refreshed main after C6–C8 + G1
  └─ C9 Handoff/Review Persistence
       └─ C10 Operator Notifications
            └─ C11 Progress Event Store/Stream
                 └─ C12 Truthful Progress UX
                      └─ final synthetic Text + URL lifecycle gate
```

Jede Kante `merge → refreshed main` bedeutet: kein abhängiger Branch wird auf einem offenen PR gestapelt. Vor jedem neuen Slice werden `origin/main`, der eigene operative Task, der Größen-/Ownership-Preflight und sämtliche noch offenen P0/P1-Abhängigkeiten erneut geprüft.

## 11. Nicht autorisiert

Dieses Runbook autorisiert weder den C3-Parent noch C3B zu einer neuen oder doppelten Implementierung noch C3C oder C3D zur Implementierung; für C3C ist ausschließlich der Preflight autorisiert. C3A ist über PR `#740` gemergt; C3B ist über PR `#744`, Implementation Head `c697fe225339e8f9e923b37506d84214d69068a2`, als `main@91ac96aa8dc12ab38e4912b6e4d29807f124cde4` gemergt und `done`. C3C ist `codex_ready` und `preflight_only`, `IMPLEMENTATION_AUTHORIZED=false`; C3D bleibt `blocked`. C4–C12 und G1–G5 bleiben nicht autorisiert. Dieses Runbook autorisiert kein Deployment, keine Production-DB-Arbeit, keine Secret-/Provideraktivierung und keine Änderung an `#590`, `#682`, `#724` oder `#727`. Produktweite Parallel-Lanes und Production Gates werden ausschließlich im Master-Roadmap-Dokument eingeordnet.
