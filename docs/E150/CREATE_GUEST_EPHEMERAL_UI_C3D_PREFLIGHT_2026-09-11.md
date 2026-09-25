# C3D Preflight Evidence — Create Guest Ephemeral UI

Stand: 2026-09-11

```text
TASK=CREATE-GUEST-EPHEMERAL-UI-01
BASE_MAIN_SHA=6b52215263253593fa01850299bba3439b3c4fe1
TASK_PREFLIGHT=PASS
SECURITY_PREFLIGHT=PASS
PERSISTENCE_PREFLIGHT=PASS
AUTH_ISOLATION_PREFLIGHT=PASS
CLIENT_SERVER_PREFLIGHT=PASS
SIZE_PREFLIGHT=PASS
COLLISION_RESULT=PASS_ISOLATED
BLOCKING_COLLISIONS=NONE
RECOMMENDATION=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
```

## Historischer Preflight-Status

Zum Zeitpunkt der Ausführung galt ausschließlich:

```text
C3D_STATUS=codex_ready
C3D_AUTHORIZATION=preflight_only
C3D_IMPLEMENTATION_AUTHORIZED=false
```

Der positive Preflight selbst war keine Implementierungsautorisierung. Diese Evidence ist revisionsgebunden an den oben genannten Main-Stand und begründet ausschließlich die nachfolgende, separate Governance-Autorisierung.

## Architekturentscheidung

**Wiederverwenden:** C3A `POST /api/create/session`, C3B `createMutationRequestHeaders`, C3C `POST /api/create/intake` und den serverauthoritativen Auth-Discriminator `getCreateEntitlementsForRequest`.

**Isolieren:** die `CreateClient`-`localStorage`-Draft-Restore/-Persistenz, `createHandoff`-`sessionStorage`-Persistenz, authentifizierte Workstates und Draft-/Save-Pfade, Planner/intelligent-followup, Link-/Source-Analyse, Handoff-/Review-Flows und Resume-/Prefill-/Account-Draft-Semantik.

**Ignorieren:** Guest-Query-Prefill, `draftId`-/Resume-/Handoff-Query-Semantik sowie den historischen #682-Guest-Flow.

**Ersetzen:** ausschließlich den unauthentifizierten Redirect-Hunk in `apps/web/src/app/create/page.tsx` durch die isolierte Guest-Komponente. Der authentifizierte `CreateClient`-Pfad bleibt semantisch unverändert; die Server-Entitlements bleiben die einzige Auth-Autorität.

`apps/web/src/features/create/createHandoff.ts` verwendet `window.sessionStorage` und persistiert `CreateHandoffDraft`-Strukturen mit Text und abgeleiteten Create-Daten. C3D darf diese Datei nicht importieren, keine ihrer Read-/Save-/Hook-APIs aufrufen, kein `resumeHref`, `handoffId` oder `createAction` für Guests erzeugen, ihren `STORAGE_KEY` nicht verwenden und ihre Storage-Architektur nicht kopieren.

## Exakte Implementierungsgrenze

```text
IMPLEMENTATION_FILE_COUNT=3
NEW_FILE_COUNT=2
RUNTIME_FILE_COUNT=2
TEST_FILE_COUNT=1
CORE_CONTRACT_COUNT=0
API_BOUNDARY_COUNT=0
ESTIMATED_RUNTIME_LOC=250
ESTIMATED_TEST_LOC=320
```

1. Ändern: `apps/web/src/app/create/page.tsx`
2. Neu, Runtime: `apps/web/src/app/create/GuestCreateEphemeralClient.tsx`
3. Neu, test-only: `apps/web/tests/create-guest-ephemeral-ui.contract.test.tsx`

Keine vierte Datei. Jeder spätere Bedarf einer vierten Datei ist ein Hard Stop und verlangt eine neue Governance-/Collision-Entscheidung.

## Autorisierter späterer Ablauf und Grenzen

Guest-Text darf nur als kontrollierter React-/Runtime-State existieren. Der spätere Ablauf ist: (1) Text in React-State, (2) bestehendes `POST /api/create/session` nach Bedarf, (3) bestehende C3B-Mutation-/Security-Header, (4) bestehendes `POST /api/create/intake` mit `{ claim: <ephemeral guest value> }`, (5) nur die feste sichere C3C-Response behandeln, (6) ausschließlich festen Accepted-/Error-UI-State zeigen, (7) kein dauerhafter Save, (8) keine automatische Fortsetzung. Es entsteht kein neuer API-Endpunkt.

Verboten für Guest-Inhalt und abgeleiteten Rohinhalt sind `localStorage`, `sessionStorage`, IndexedDB, Cache API/CacheStorage, Service-Worker-Persistenz, `document.cookie`-Inhaltspersistenz, URL-Query, URL-Hash, `history.state`, authentifizierte Workstates, Account-Drafts, `createHandoff`, Browser-Draft-Helper sowie Telemetrie oder Console-Logging mit Rohinput. Refresh, Remount und Navigation weg verlieren den Text.

Die Guest-UI darf nur wahrheitsgemäß mitteilen, dass der Request für die aktuelle Operation angenommen wurde. Sie darf weder „gespeichert“, „später fortsetzen“, Account-Zuordnung, Veröffentlichung noch eine öffentliche Einreichung behaupten und keine `operationId` anzeigen. Erfolg und Fehler sind feste sichere Copy; abgewiesene PII-/Secret-Inhalte werden nie zurückgespiegelt.

```text
NO_ADOPTION=true
NO_RESUME=true
NO_ACCOUNT_DRAFT=true
NO_AUTHENTICATED_DRAFT_CROSSOVER=true
NO_PLANNER_INTAKE_SEMANTICS=true
NO_SOURCE_FETCH=true
NO_LINK_ANALYSIS=true
NO_HANDOFF_PERSISTENCE=true
NO_DB_MIGRATION=true
NO_PROVIDER_SECRET_DEPENDENCY=true
NO_PRODUCTION_ACTIVATION=true
```

Guest → Login → Adoption bleibt ausschließlich C4; keine Placeholder-Adoption-Hooks.

## Erforderlicher künftiger Testvertrag

Der neue Test muss mindestens belegen:

1. Guest-Text existiert nur in React-/Runtime-State.
2. Kein `localStorage`-Zugriff für Guest-Inhalt.
3. Kein `sessionStorage`-Zugriff für Guest-Inhalt.
4. Kein IndexedDB-Zugriff.
5. Keine Cache-API-Nutzung.
6. Keine Service-Worker-Persistenz.
7. Kein Guest-Text in URL, Search, Hash oder `history.state`.
8. Remount löscht Guest-Text.
9. Keine `createHandoff`-Nutzung.
10. Kein authentifizierter Draft-/Workstate-Save.
11. Kein Planner-Call.
12. Kein Link-/Source-Analyse-Call.
13. Session-Route vor Claim, wo erforderlich.
14. Wiederverwendung der C3B-Mutation-/Security-Header.
15. Wiederverwendung der C3C-Claim-Route.
16. Abgewiesene PII-/Secret-Eingaben werden nicht gespiegelt.
17. Erfolgscopy behauptet keine Persistenz.
18. Der authentifizierte Create-Zweig bleibt unverändert.
19. Login übernimmt Guest-State nicht stillschweigend.
20. Keine Raw-Console-/Telemetry-Ausgabe.

## Erforderliche Regressionen

- C1/C2: `create-entry-i18n.render.test.tsx`, `create-entry-hierarchy.contract.test.tsx`, `create-curated-dialog-workspace.contract.test.tsx`, `create-mobile-final-polish.contract.test.ts`, `create-i18n-no-mixed-locale.contract.test.tsx`
- C3A: `create-anonymous-session.route.test.ts`, `persistent-rate-limit.test.ts`
- C3B: `create-route-security.contract.test.ts`, `create-abuse-guard.contract.test.ts`, `create-antispam-client.contract.test.ts`, `create-mode.save.route.test.ts`, `create-intelligent-followup.route.test.ts`, `create-link-analysis.auth-contract.test.ts`
- C3C: `create-guest-claim-safety.contract.test.ts`, `create-guest-claim.route.test.ts`, `create-route-security.contract.test.ts`

## Ausgeführte Preflight-Validierung

Auf dem revisionsgebundenen Stand waren der Governance-Test 4/4, die vollständige OpenTasks-/Alpha2-Control-Plane-Suite 9 Dateien / 126 Tests und die relevante C1/C2/C3-Regression-Suite 15 Dateien / 160 Tests erfolgreich. `git diff --check` und Worktree-Status waren sauber. Die Evidence erweitert weder Runtime noch Tests und aktiviert weder Deployment, DB/Migration, Provider/Secrets, Production oder Auto-Publish.
