# C3C Guest Claim / PII / Single-Flight Preflight

Stand: 2026-09-11

## 1. Ergebnis und damaliger Governance-Stand

```text
BASE_MAIN_SHA=c3ff4b01ada66e397c61e7b597ac20ce12e136fb
TASK=CREATE-GUEST-CLAIM-PII-SAFETY-01

C3C_STATUS=codex_ready
C3C_AUTHORIZATION=preflight_only
C3C_IMPLEMENTATION_AUTHORIZED=false

PREFLIGHT_RESULT=PASS
BLOCKING_COLLISIONS=NONE
```

Der dokumentierte Status ist der Stand während des read-only Preflights. Dieses Dokument implementiert C3C nicht und erteilt selbst keine Implementierungsfreigabe. Die anschließende Governance-Autorisierung bleibt auf die exakte Sieben-Dateien-Grenze in Abschnitt 5 beschränkt.

## 2. Architektur- und Collision-Evidence

Der Preflight wurde auf dem exakten, sauberen `origin/main`-Stand `c3ff4b01ada66e397c61e7b597ac20ce12e136fb` in einem isolierten Detached-Worktree ausgeführt. Die konkrete Main-Architektur wurde symbol- und implementierungsbezogen geprüft:

| Komponente | Disposition | Begründung |
| --- | --- | --- |
| `apps/web/src/features/create/createAnonymousSession.ts` | REUSE | C3A stellt die signierte, servergenerierte anonyme Session samt UUID-, HMAC- und Expiry-Prüfung bereit. Die verifizierte Session ist der server-authoritative Ausgangspunkt für das Guest-Subject. |
| `apps/web/src/features/create/createMutationSecurityContract.ts` | REUSE | Vorhandene Same-Origin-, Fetch-Metadata-, CSRF-, Honeypot- und Client-Signal-Verträge bleiben kanonisch. |
| `apps/web/src/features/create/createRouteSecurity.ts` | EXTEND | C3B stellt Content-Type-, gemessene Body-Size-, Unknown-Field-, Abuse- und persistente Rate-Limit-Gates bereit. Nur ein isolierter Guest-Claim-Scope mit minimaler Body-Allowlist wird ergänzt. |
| `apps/web/src/utils/persistentRateLimit.ts` | REUSE | Die vorhandene Mongo-/TTL-basierte Rate-Limit-Infrastruktur bleibt unverändert; es entsteht kein zweites Limit-System. |
| `apps/web/src/features/create/createOrchestrationSingleFlight.ts` | EXTEND | Die vorhandene Collection `create_orchestration_claims` besitzt Unique-Key-, TTL- und Lease-Indizes sowie atomare Acquisition, stale-Lease-Recovery, Restart-/Multi-Instance-Verhalten und ein In-Memory-Testrepository. Der bestehende Auth-Planner-Default bleibt unverändert; C3C ergänzt Guest-Operation, fail-fast Active-Policy und festen gespeicherten Fehlercode. |
| `apps/web/src/features/create/safety/createSafetyLexicon.ts` | REUSE PARTIAL | Nur die vorhandenen leaf-level E-Mail-, Telefon-, Straßen- und Postleitzahl-Detektoren werden wiederverwendet. |
| `apps/web/src/features/create/safety/createInputSafety.ts` und `createClaimSafety.ts` | IGNORE | Die Modelle sind nicht rekursiv und enthalten breite beziehungsweise texttragende Resultate. Sie sind keine sichere persistierte C3C-Claim- oder Response-Allowlist. |
| `apps/web/src/features/create/linkIntake.ts` | IGNORE | Der Client-Helper klassifiziert Link-Input für bestehende UI-Semantik, bietet aber keinen rekursiven Secret-/Signed-URL-Guard. C3C prüft URLs serverseitig und startet keine Linkanalyse. |
| Historischer PR `#682`, insbesondere altes `/api/create/intake` | REPLACE | Der Pfad ist nur als Source-Evidence relevant. Client-Correlation, Planner-Aufruf, breites Result-Modell, Browserpersistenz, Adoption und Resume dürfen nicht übernommen werden. Der neue gleichnamige Endpunkt ist ausschließlich Claim-only. |
| `CreateClient.tsx`-`localStorage` und `createHandoff.ts`-`sessionStorage` | IGNORE | Diese vorhandenen Browserpfade schneiden die server-only C3C-Grenze nicht. C3C ändert keine UI- oder Browserpersistenzdatei; Guest-UI bleibt C3D. |
| Bestehende generische Logger und Telemetrie-Helfer | IGNORE | Sie garantieren keine rekursive Secret-/Signed-URL-Redaction für beliebige Payloads. C3C übergibt weder Input noch Fehlerobjekte; zulässig sind ausschließlich servergenerierte UUID und fester Safe-Code. |

```text
COLLISION_RESULT=PASS; replace historical #682 /api/create/intake behavior with a claim-only route. Do not copy client correlation, Planner call, broad result, or browser persistence. Reuse only suitable leaf PII detectors; ignore unsafe broad claim/result models and UI persistence paths.
BLOCKING_COLLISIONS=NONE
```

### Reuse-, Extend- und New-Zusammenfassung

REUSE:

- C3A Anonymous-Session-Verifier;
- C3B CSRF-/Provenance-/Body-Size-/Parser-/Abuse-/Persistent-Rate-Limit-Gates;
- Mongo-backed `create_orchestration_claims`;
- vorhandene TTL-/Lease-Indizes und das Testrepository;
- `crypto.randomUUID` und `stableHash`;
- vorhandene E-Mail-/Telefon-/Straßen-/Postleitzahl-Detektorkonstanten.

EXTEND:

- `createRouteSecurity.ts` um einen isolierten Guest-Claim-Scope;
- `createOrchestrationSingleFlight.ts` um Guest-Operation, fail-fast Active-Policy und feste Fehlerpersistenz bei unveränderten bestehenden Defaults;
- vorhandene Route-Security-Tests um den neuen Scope.

NEW:

- rekursiver Guest-Claim-Safety-Guard;
- Claim-only `POST /api/create/intake`;
- fokussierte Safety- und Route-Tests.

## 3. Single-Flight- und Correlation-Vertrag

```text
SINGLE_FLIGHT_ARCHITECTURE=PASS
SERVER_CORRELATION=PASS
```

Single Flight verwendet die vorhandene persistente Mongo-Koordination mit atomarer Unique-Key-Acquisition. Der sichere Key wird aus dem verifizierten server-session-abgeleiteten Subject und einem normalisierten Input-Digest gebildet; er enthält weder rohen Guest-Input noch clientbestimmte Identifikatoren. Eine aktive gleichartige Guest-Claim-Operation liefert deterministisch einen festen Active-Claim-Fehler. Lease und Wartezeit sind begrenzt, das vorhandene gespeicherte Result besitzt eine TTL von 15 Minuten, stale Leases sind recoverable und Storage-Fehler scheitern fail-closed. Damit sind Process-Restart und mehrere Instanzen abgedeckt; eine rein process-lokale Sperre wird nicht eingeführt.

Die authoritative Correlation ist eine operation-scoped UUIDv4 aus `crypto.randomUUID`, die ausschließlich serverseitig nach erfolgreicher Ownership-Acquisition erzeugt wird. Client-Correlation ist im minimalen Request-Schema nicht erlaubt und kann weder Claim-Identität, Single-Flight-Key, Replay-Namespace, persistierte Metadaten noch die Response-Correlation überschreiben. Die UUID enthält keine PII, Secrets oder Signed-URL-Bestandteile. Sie darf als opaker Wert im streng allowlisteten Result und gegebenenfalls zusammen mit einem festen Safe-Code im Log erscheinen.

## 4. Rekursive Safety- und Leak-Gates

### Rekursive PII-Erkennung

```text
RECURSIVE_PII_GUARD=PASS
```

Der Guard traversiert ausschließlich Plain-JSON-Werte (`object`, `array`, `string`, endliche `number`, `boolean`, `null`) und behandelt unbekannte Prototypen, Funktionen, Symbole, BigInt, Zyklen oder andere nicht unterstützte Strukturen fail-closed. Verbindliche Grenzen sind:

- maximale Rekursionstiefe: 12;
- maximal 2.048 traversierte Nodes;
- maximal 128 Keys pro Objekt;
- maximal 256 Einträge pro Array;
- maximal 10.000 inspizierte Zeichen pro String.

Objekte und Arrays werden vollständig innerhalb dieser Budgets rekursiv geprüft. Strukturell sensitive Keys erkennen insbesondere explizite Namen, Vor-/Nachnamen, Geburtsdatum und sensitive User-Identifier. Leaf-Detektoren prüfen E-Mail, plausible Telefonnummer, Straßen-/Adress- und Postleitzahlfragmente sowie valide IPv4-/IPv6-Werte. Grenzüberschreitung oder nicht sicher entscheidbare Struktur stoppt ohne Persistenz und ohne unsichere Response.

### Rekursive Secret-Erkennung

```text
RECURSIVE_SECRET_GUARD=PASS
```

Strukturelle Key-Erkennung und gezielte Wertmuster decken mindestens `authorization`, Bearer-Credentials, `cookie`, `set-cookie`, `api_key`, `apikey`, `secret`, `token`, `access_token`, `refresh_token`, `session`, `password`, `client_secret`, `private_key`, `signature`, `sig`, `x-amz-signature`, `x-goog-signature`, SAS-Token und JWT-artige Werte ab. Überbreite generische Freitext-Regeln werden vermieden; bei strukturell credentialtypischen Keys gilt fail-closed.

### Signed-URL-Erkennung

```text
SIGNED_URL_GUARD=PASS
```

URL-Kandidaten werden unabhängig vom Hostnamen geprüft. Percent-Encoding wird höchstens viermal rekursiv normalisiert. Malformed Encoding oder nach dem Budget weiter veränderlicher Inhalt scheitert fail-closed. Geprüft werden URL-Userinfo und normalisierte Query-Keys für AWS-S3-Presigned-Parameter, Google-Signed-URL-Parameter, Azure SAS sowie generische Signature-, Credential-, Auth- und Token-Parameter.

### Persistenz- und Response-Allowlist

Persistierter Claim/Result und öffentliche API-Response besitzen getrennte minimale Allowlist-Schemas. Beide werden vor ihrer jeweiligen Grenze rekursiv geprüft. Ausgeschlossen sind roher Guest-Text, Source-Input, sensitive oder signierte URLs, Planner-Prompt/-Trace, Providerantwort, Token, Credential, Secret, beliebige Fehlermeldungen und beliebige Metadatenblobs.

Die folgenden drei Shapes sind geschlossene positive Allowlists. Sie besitzen keine Index-Signature, kein Passthrough und keine optionalen oder freien Metadatenfelder. Die Runtime konstruiert jedes Objekt feldweise; sie spreadet oder serialisiert weder das interne Single-Flight-Record noch ein fremdes Result-Objekt. UUID- und Timestamp-Felder werden zusätzlich semantisch validiert.

**A. Persistiertes Guest-Claim-Result**

```ts
type PersistedGuestClaimResult = {
  version: 1;
  status: "accepted";
  operationId: string; // servergenerierte UUIDv4
  createdAt: string; // servergenerierter ISO-8601-Zeitstempel
};
```

Das ist ausschließlich der typisierte Inhalt des vorhandenen `result`-Felds im bestehenden Single-Flight-Record. Ein abgewiesener oder fehlgeschlagener Lauf erzeugt kein persistiertes Result-Objekt; die vorhandene äußere Claim-Record-Struktur darf dafür nur einen festen allowlisteten `failureCode` speichern. `operationId` ist die authoritative Server-Correlation. Weitere Keys, insbesondere `metadata`, Payload-/Text-Echo, URL, Provider-/Planner-Result, Validation-Details, Client-Correlation, PII oder Secrets, sind schemawidrig.

**B. Erfolgreiche öffentliche Response**

```ts
type GuestClaimSuccessResponse = {
  ok: true;
  operationId: string; // exakt die servergenerierte UUIDv4 des Results
  status: "accepted";
};
```

Die Response wird explizit aus den drei Feldern konstruiert. Das persistierte Result wird nicht direkt zurückgegeben oder gespreadet; insbesondere `version` und `createdAt` bleiben intern. Zusätzliche oder unbekannte Keys sind verboten.

**C. Öffentliche Failure-Response**

```ts
type GuestClaimPublicErrorCode =
  | "CREATE_INVALID_REQUEST"
  | "CREATE_REQUEST_REJECTED"
  | "CREATE_REQUEST_TOO_LARGE"
  | "CREATE_RATE_LIMITED"
  | "CREATE_RATE_LIMIT_UNAVAILABLE"
  | "CREATE_GUEST_CLAIM_IN_PROGRESS"
  | "CREATE_GUEST_CLAIM_UNAVAILABLE"
  | "CREATE_GUEST_UNSAFE_RESPONSE"
  | "CREATE_GUEST_INTERNAL_ERROR";

type GuestClaimFailureResponse = {
  ok: false;
  errorCode: GuestClaimPublicErrorCode;
  message: "Die Anfrage konnte nicht verarbeitet werden.";
};
```

Die Failure-Response besitzt exakt diese drei Keys. `Retry-After` darf bei einem Rate-Limit ausschließlich als HTTP-Header erscheinen und erweitert den JSON-Body nicht. Failure-Bodies enthalten keine `operationId`, Client-Correlation, freien Meldungen oder internen Felder. Alle nicht allowlisteten Fehler werden serverseitig auf `CREATE_GUEST_INTERNAL_ERROR` abgebildet.

```text
SAFE_FAILURE_ALLOWLIST=PASS
```

Öffentlich zulässig sind nur die bestehenden festen C3B-Fehlercodes sowie:

- `CREATE_GUEST_CLAIM_IN_PROGRESS`;
- `CREATE_GUEST_CLAIM_UNAVAILABLE`;
- `CREATE_GUEST_UNSAFE_RESPONSE`;
- `CREATE_GUEST_INTERNAL_ERROR`.

Explizit verboten sind `exception.message`, Stacktraces, DB-/Provider-Fehlertexte, URLs, rohe Validierungswerte und beliebige oder PII-tragende Metadaten.

```text
LOGGING_SAFETY=PASS
BROWSER_PERSISTENCE_ABSENCE=PASS
NO_ADOPTION=PASS
NO_RESUME=PASS
NO_ACCOUNT_DRAFT=PASS
NO_DB_MIGRATION=PASS
NO_PROVIDER_SECRET_DEPENDENCY=PASS
```

C3C loggt weder Claim-Input noch abgewiesene Payloads, rohe URLs oder Exception-Objekte. Der Slice führt keine Browserpersistenz, Adoption, Resume- oder Account-Draft-Semantik ein. Er verwendet die bestehende Mongo-Collection und ihre Indizes ohne Schema-/Migration und benötigt keine Provider-, Secret-, Deployment- oder Production-Aktivierung.

## 5. Exakte Implementierungsgrenze und Size Gate

```text
PROPOSED_FILES_CHANGED_COUNT=7
PROPOSED_NEW_FILES_COUNT=4
ESTIMATED_RUNTIME_LOC_DELTA≈+450
ESTIMATED_TEST_LOC_DELTA≈+700
SIZE_GATE=PASS_SINGLE_SLICE
```

MODIFY:

1. `apps/web/src/features/create/createRouteSecurity.ts`
2. `apps/web/src/features/create/createOrchestrationSingleFlight.ts`

ADD RUNTIME:

3. `apps/web/src/features/create/safety/createGuestClaimSafety.ts`
4. `apps/web/src/app/api/create/intake/route.ts`

TEST-ONLY:

5. `apps/web/tests/create-route-security.contract.test.ts`
6. `apps/web/tests/create-guest-claim-safety.contract.test.ts`
7. `apps/web/tests/create-guest-claim.route.test.ts`

Jede weitere Runtime- oder Testdatei benötigt eine neue Collision-/Size-Entscheidung. Die Umsetzung erzeugt keinen Planner-Lauf und keine Intake-Workflow-Ausführung über den Claim-only-Transportvertrag hinaus.

## 6. Verbindlicher Testplan

Die C3C-Implementierung muss mindestens folgende fokussierte Regressionen belegen:

- gleiche Guest-Claim-Operation parallel: genau ein Owner, der aktive Konkurrent erhält den festen sicheren Fehler;
- verschiedene Guests bleiben unabhängig;
- Lock-/Storage-Fehler fail-closed;
- Lease-Timeout, Expiry und stale Recovery;
- clientseitig gespoofte Correlation wird abgewiesen und niemals authoritative;
- verschachtelte PII in Objekt und Array wird abgewiesen;
- verschachtelte Secrets, Bearer, Cookie und JWT werden abgewiesen;
- AWS-, Google-, Azure-SAS- und generische Signed-/Token-URL werden abgewiesen;
- sichere verschachtelte Payload innerhalb aller Budgets wird akzeptiert;
- maximale Tiefe, Traversierung, Key-, Array- und Stringgrenzen scheitern deterministisch;
- Exception-Message, Stack, DB-/Provider-Body, PII, Secret und Signed URL erscheinen weder in Response noch Log;
- jede öffentliche Failure-Response gehört zur festen Allowlist;
- persistiertes Result besitzt exakt die Keys `version`, `status`, `operationId`, `createdAt` mit den festgelegten Typen und Literalwerten;
- erfolgreiche Response besitzt exakt die Keys `ok`, `operationId`, `status` und enthält keine internen Result-Felder;
- Failure-Response besitzt exakt die Keys `ok`, `errorCode`, `message` und der Code gehört zur festen Enum-Allowlist;
- zusätzliche oder unbekannte Keys sowie `metadata` werden vor Persistenz beziehungsweise Return abgewiesen;
- Payload-/Text-Echo, URLs, PII, Secrets und Signed URLs fehlen in Result und jeder Response;
- Provider-/Planner-Resultate und interne Validation-Werte werden niemals serialisiert;
- clientseitige Correlation fehlt in Persistenz und Response und kann die servergenerierte `operationId` nicht überschreiben;
- keine Browserpersistenz, Adoption, Resume-, Account-Draft-, Planner- oder Auto-Publish-Semantik wird eingeführt.

C3A-Regressionen:

- `tests/create-anonymous-session.route.test.ts`;
- `tests/persistent-rate-limit.test.ts`.

C3B- und Create-Regressionen:

- `tests/create-route-security.contract.test.ts`;
- `tests/create-abuse-guard.contract.test.ts`;
- `tests/create-antispam-client.contract.test.ts`;
- `tests/create-mode.save.route.test.ts`;
- `tests/create-intelligent-followup.route.test.ts`;
- `tests/create-link-analysis.auth-contract.test.ts`;
- `tests/create-planner-degraded-ui.contract.test.tsx`;
- `tests/create-voxy-support-recovery.contract.test.tsx`;
- `tests/create-curated-dialog-workspace.contract.test.tsx`;
- `tests/create-chat-first-mobile-dialog-experience.contract.test.tsx`.

## 7. Reproduzierbare Preflight-Validierung

Governance-Preflight:

```bash
node --test scripts/codex-task-preflight.test.mjs
```

Ergebnis: `PASS`; 4/4 Tests.

OpenTasks-/Alpha2-Control-Plane:

```bash
pnpm -C apps/web exec vitest run \
  tests/alpha2-agent-fleet.contract.test.ts \
  tests/alpha2-control-plane-contracts.contract.test.ts \
  tests/alpha2-durable-orchestrator.contract.test.ts \
  tests/alpha2-human-gate-immutability.contract.test.ts \
  tests/alpha2-mongo-run-ledger-policy.contract.test.ts \
  tests/alpha2-opentasks-eligibility.contract.test.ts \
  tests/alpha2-outcome-persistence-hardening.contract.test.ts \
  tests/alpha2-review-auth-boundary.contract.test.ts \
  tests/alpha2-review-hardening.contract.test.ts
```

Ergebnis: `PASS`; 9 Dateien, 126/126 Tests.

Relevante bestehende Anonymous-Session-/Create-Regressionen:

```bash
pnpm -C apps/web exec vitest run \
  tests/create-anonymous-session.route.test.ts \
  tests/persistent-rate-limit.test.ts \
  tests/create-abuse-guard.contract.test.ts \
  tests/create-route-security.contract.test.ts \
  tests/create-antispam-client.contract.test.ts \
  tests/create-mode.save.route.test.ts \
  tests/create-orchestration-single-flight.contract.test.ts \
  tests/create-input-safety.contract.test.ts \
  tests/create-input-safety-lexicon.contract.test.ts \
  tests/create-input-safety-telemetry.contract.test.ts \
  tests/create-claim-safety.contract.test.ts \
  tests/create-link-intake-clarification.contract.test.tsx \
  tests/create-intelligent-followup.route.test.ts \
  tests/create-link-analysis.auth-contract.test.ts \
  tests/create-planner-degraded-ui.contract.test.tsx \
  tests/create-voxy-support-recovery.contract.test.tsx \
  tests/create-curated-dialog-workspace.contract.test.tsx \
  tests/create-chat-first-mobile-dialog-experience.contract.test.tsx
```

Ergebnis: `PASS`; 18 Dateien, 172/172 Tests.

Whitespace-/Repository-Gate:

```bash
git diff --check
```

Ergebnis: `PASS`. Der read-only Preflight erzeugte keine getrackten Runtime- oder Dokumentationsänderungen.

### Revision-bound Clean-Base-Evidence

Der eigentliche read-only Preflight lief in einem frischen, isolierten Detached-Worktree auf exakt `c3ff4b01ada66e397c61e7b597ac20ce12e136fb`. Die folgende Prüfung wurde für denselben Commit in einem erneut frisch erzeugten Detached-Worktree reproduziert:

```bash
git rev-parse HEAD
git diff --quiet c3ff4b01ada66e397c61e7b597ac20ce12e136fb --
git status --porcelain
```

Revision-bound Ergebnis:

```text
HEAD=c3ff4b01ada66e397c61e7b597ac20ce12e136fb
GIT_DIFF_QUIET_BASE_EXIT=0
GIT_STATUS_PORCELAIN=
TASK_PRODUCED_TRACKED_CHANGES=false
```

Das leere `git status --porcelain` gilt für den isolierten Preflight-Worktree, nicht für den primären Arbeitsbaum. Im primären Arbeitsbaum bestand bereits vor dem C3C-Preflight die fremde Änderung `apps/web/next-env.d.ts`. Sie lag außerhalb des Tasks, wurde weder in den Preflight-Worktree übernommen noch verändert und ist nicht Teil der C3C-Evidence oder der Governance-PR. Damit wird keine globale Sauberkeit des primären Arbeitsbaums behauptet.

```text
GOVERNANCE_TESTS=PASS; 4/4
OPENTASKS_CONTROL_PLANE_TESTS=PASS; 9 files, 126/126
RELEVANT_EXISTING_TESTS=PASS; 18 files, 172/172
DIFF_CHECK=PASS
```

## 8. Empfehlung und fortgeltende Ausschlüsse

```text
IMPLEMENTATION_AUTHORIZATION_RECOMMENDATION=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
EXACT_BLOCKERS_IF_ANY=NONE
```

Die separate Governance darf ausschließlich die sieben Dateien in Abschnitt 5 autorisieren. Dieses Evidence-Dokument implementiert C3C nicht. Es aktiviert weder Production/Output noch C3D oder C4–C12 und autorisiert keine Schema-/Migration-, Provider-, Secret-, Deployment- oder Auto-Publish-Änderung.
