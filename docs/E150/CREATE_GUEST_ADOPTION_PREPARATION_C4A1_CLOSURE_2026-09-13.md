# C4A1 Closure Evidence — Guest Adoption Preparation Server Foundation

Stand: 2026-09-13

## Abschlussstatus

```text
TASK=CREATE-GUEST-ADOPTION-PREPARATION-SERVER-FOUNDATION-01
STATUS=done
IMPLEMENTED=true
DONE=true

IMPLEMENTATION_PR=762
IMPLEMENTATION_HEAD=d503e97848dbfb8726b2a3a930748f9667b984c8
MERGE_SHA=7bb2488ffd26a94a0ba35ee2e5ef84ae53c9c23d
MERGE_PARENT_1=73412faec04e4ebc91fac46508a5adfd616ff024
MERGE_PARENT_2=d503e97848dbfb8726b2a3a930748f9667b984c8
MERGE_SIGNATURE_VERIFIED=true

IMPLEMENTATION_AUTHORIZATION_CONSUMED=true
IMPLEMENTATION_AUTHORIZED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
REVIEW_REPAIR_AUTHORIZED=false

FINAL_REVIEW_P0=0
FINAL_REVIEW_P1=0
FINAL_REVIEW_P2=0
```

## Verifizierte Evidence

```text
FOCUSED_C4A1_TESTS=58/58_PASS
AT_REST_REGRESSIONS=13/13_PASS
C3A_REGRESSIONS=11/11_PASS
C3B_REGRESSIONS=47/47_PASS
C3C_REGRESSIONS=47/47_PASS
C3D_REGRESSIONS=13/13_PASS
TYPECHECK=PASS
LINT=PASS
BUILD=PASS
GOVERNANCE_TESTS=4/4_PASS
OPENTASKS_ALPHA2_CONTROL_PLANE=126/126_PASS

CREATE_SAVE_SECURITY_REGRESSION=KNOWN_UNRELATED_TIMEOUT
CREATE_SAVE_SECURITY_REGRESSION_FILE=`tests/create-mode.save.route.test.ts`
CREATE_SAVE_SECURITY_REGRESSION_CASE=`deduplicates identical parallel retries into the same canonical draft`
CREATE_SAVE_SECURITY_REGRESSION_TIMEOUT_MS=5000
NEW_C4A1_REGRESSION_ESTABLISHED=false
```

Der isolierte Timeout ist vorbestehend und nicht mit C4A1 verbunden; er begründet keine neue C4A1-Runtime-Regression.

## Finaler Sicherheits- und Lifecycle-Vertrag

Die abgeschlossene Foundation folgt `DURABLE_REPREPARE_REVOCATION_BARRIER_V1` und `NO_PREPARATION_BROWSER_CARRIER_V1`. Der Lifecycle ist ausschließlich `preparing -> prepared`.

- Ein autoritativer Slot pro anonyme Session-Bindung.
- Die verifizierte anonyme C3A-Session ist die einzige Browser-Transition-Bindung.
- Kein `preparationId`-Cookie, kein URL-/Query-Locator und kein Carrier in `localStorage`, `sessionStorage` oder IndexedDB.
- Binding-only-Lookup über `anonymousSessionBindingHash`.
- Verschlüsselter Payload nur im Zustand `prepared`.
- Dauerhafte Revocation-Barriere; Fehler nach gesetzter Barriere sind fail-closed.
- Exact-attempt-CAS-Finalisierung; eine stale Finalisierung kann keinen superseded State wiederbeleben.
- Logische Expiry und TTL-Cleanup.

## Abhängigkeitsstatus

```text
C4_PARENT=blocked
C4A_DECOMPOSITION_PARENT=blocked

C4B_TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
C4B_STATUS=codex_ready
C4B_AUTHORIZATION=preflight_only
C4B_PREFLIGHT_AUTHORIZED=true
C4B_IMPLEMENTATION_AUTHORIZED=false

C4C_TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
C4C_STATUS=blocked
C4C_AUTHORIZATION=none

C5_C12_IMPLEMENTATION_AUTHORIZED=false
```

## Fortgeführter C4B-Vertrag

Der ausschließlich für einen frischen Preflight freigegebene C4B-Vertrag lautet:

```text
authenticated session
+ verified C3A anonymous session
-> derive binding
-> binding-only load current prepared slot
-> expiry validation
-> decrypt
-> authenticated adoption
-> atomic one-time consume
-> exactly one CanonicalServerDraftDoc
-> safe continuation using server-generated draft ID
```

Der C4B-Preflight muss `getSessionUser(req)`, cross-account fail-closed, Replay/Idempotenz, one-time consume, einen minimierten unveränderlichen Receipt, Reuse von `saveUserScopedServerDraft` sowie Cleanup und Failure-Recovery abdecken.

Nicht autorisiert sind C4C-UX, ein Browser-Preparation-Locator, Planner, `createHandoff`, C5–C9 und Production-Aktivierung. Production bleibt separat gegated. `CREATE-ANONYMOUS-SOURCE-INTAKE-01` wird durch diese Closure nicht registriert.
