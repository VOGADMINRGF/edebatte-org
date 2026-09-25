# C4A1 Re-Preflight PASS — Separate Implementation Authorization

```text
BASE_MAIN_SHA=a60ce5ee982c99b403966e32aa0ec4d28ee33544
TASK=CREATE-GUEST-ADOPTION-PREPARATION-SERVER-FOUNDATION-01
RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
SECURITY_PREFLIGHT=PASS
PERSISTENCE_PREFLIGHT=PASS
ATOMICITY_PREFLIGHT=PASS
STALE_STATE_PREFLIGHT=PASS
SESSION_BINDING_PREFLIGHT=PASS
ABUSE_PREFLIGHT=PASS
PRIVACY_PREFLIGHT=PASS
SERVER_ONLY_PREFLIGHT=PASS
SIZE_PREFLIGHT=PASS
COLLISION_RESULT=NONE
OPEN_PR_COLLISIONS=NONE
SPLIT_REQUIRED=false
```

Historical evidence remains unchanged: `PREVIOUS_PREFLIGHT_RESULT=FAIL_BLOCKED`, `PREVIOUS_BLOCKER=DURABLE_FAILED_REPREPARE_REVOCATION`. The approved `DURABLE_REPREPARE_REVOCATION_BARRIER_V1` resolves that proof: a committed atomic binding-slot barrier replaces the prior locator with a fresh server UUID in `state="preparing"` and no payload before C3C safety or encryption. Barrier-write failure leaves the old state and carrier authoritative; post-barrier safety, encryption, or final-CAS failure leaves a non-consumable `preparing` slot, clears the carrier, and cannot resurrect the older locator. Finalization is CAS on binding hash, preparation ID, and `preparing`; a superseded request modifies zero documents.

The durable document is a discriminated union: `preparing` contains only version, preparation ID, binding hash, state, createdAt and expiresAt; `prepared` additionally contains an `AtRestEnvelope`. There is no raw claim, fingerprint, operation ID, identity, raw session ID, IP, return URL, or analytics metadata. Read/decrypt succeeds only for `prepared`, exact locator, matching verified C3A-session binding, logical unexpired `expiresAt`, and the existing purpose `create.guest-adoption-preparation`; all other cases fail closed. TTL remains `min(15 minutes, verified session lifetime)` with awaited unique preparation ID, unique binding-hash, and `expiresAt` TTL indexes.

The implementation reuses server-only At-Rest encryption without modification, C3C `inspectGuestClaim` before encryption, and C3B `enforceCreateMutationSecurity`/verified Guest subject conventions. It adds only the distinct persistent `create_guest_adoption_preparation` limiter scope. There is one API boundary, `POST /api/create/adoption-preparation`; success is `{ ok: true, status: "prepared" }` and no public locator or crypto metadata is exposed. No visible UI, Login navigation, browser persistence, C4B/C4C behavior, provider, production activation, or production secret provisioning is authorized.

```text
EXACT_IMPLEMENTATION_FILES=6
MODIFY=apps/web/src/features/create/createRouteSecurity.ts;apps/web/tests/create-route-security.contract.test.ts
ADD=apps/web/src/features/create/createGuestAdoptionPreparation.ts;apps/web/src/app/api/create/adoption-preparation/route.ts;apps/web/tests/create-guest-adoption-preparation.contract.test.ts;apps/web/tests/create-guest-adoption-preparation.route.test.ts
RUNTIME_FILES=3
TEST_FILES=3
API_BOUNDARY_COUNT=1
CORE_CONTRACT_COUNT=2
SECURITY_DOMAIN_COUNT=5
CODE_MERGE_WITHOUT_PROD_SECRET_SAFE=true
PRODUCTION_SECRET_PROVISIONED=false
PRODUCTION_ENABLED=false
PRODUCTION_SECRET_STILL_SEPARATE_GATE=true
AT_REST_REGRESSIONS=PASS;13/13
C3A_REGRESSIONS=PASS;11/11
C3B_REGRESSIONS=PASS;46/46
C3C_REGRESSIONS=PASS;47/47
C3D_REGRESSIONS=PASS;13/13
GOVERNANCE_TESTS=PASS;4/4
OPENTASKS_CONTROL_PLANE_TESTS=PASS;126/126
```

The future implementation must satisfy all 68 frozen adversarial cases, including barrier/write/finalize failure ordering, manual stale-locator replay, restart, CAS supersession, strict body/security/limiter handling, logical expiry, no sensitive logging, and unchanged C3C/C3D/UI/downstream boundaries. It is authorized once only; a seventh file, migration, UI change, or any broader contract requires renewed governance.
