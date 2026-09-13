# C4B0 Implementation Authorization — Atomic Guest Adoption Consumption

`BASE_MAIN_SHA=612c11a0016975a9640f0a02bd4523da8b9523d9`  
`TASK=CREATE-GUEST-ADOPTION-ATOMIC-CONSUMPTION-CONTRACT-01`  
`PREFLIGHT_PR=767`  
`PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION`

## Authorization

This is governance authorization only. It authorizes one implementation slice for the preflighted `SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1` and `SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1` contract. It authorizes no merge, deploy, production activation, API route, browser carrier, or C4B implementation.

`IMPLEMENTATION_AUTHORIZED=true`  
`IMPLEMENTATION_AUTHORIZATION_CONSUMED=false`  
`NEW_IMPLEMENTATION_DISPATCH_ALLOWED=true`  
`CORE_CONTRACT_COUNT=1`  
`API_BOUNDARY_COUNT=0`

## Exact authorized implementation boundary

Only these two implementation files are authorized:

| File | Kind | Authorized responsibility |
| --- | --- | --- |
| `apps/web/src/features/create/createGuestAdoptionPreparation.ts` | runtime | Adoption sub-contract on the existing authoritative slot; binding-only current-slot claim CAS; domain-separated account binding hash; same-account claimed replay and account-bound claimed payload read; cross-account fail-closed behavior; idempotent completion metadata and completed draft metadata replay; active-claim reprepare exclusion; expired/completed supersession; completion payload cleanup; and anonymous-only reader hardening. |
| `apps/web/tests/create-guest-adoption-preparation.contract.test.ts` | test | Deterministic contract coverage for the approved claim, reprepare, recovery, completion, replay, cross-account, cleanup, reader-hardening, no-carrier, and stale-finalize matrix. |

`AUTHORIZED_IMPLEMENTATION_FILES=2`  
`AUTHORIZED_RUNTIME_FILES=1`  
`AUTHORIZED_TEST_FILES=1`

The recovery deadline is exactly `min(claimNow + 15 minutes, verifiedAnonymousSession.expiresAtMs)`. Post-claim authority always requires both a verified C3A anonymous session and a matching authenticated account binding. Account-only recovery is not authorized. The legacy anonymous-only reader must return `null` without decrypting whenever adoption is `claimed` or `completed`.

## Fixed exclusions

No additional runtime or test file; no HTTP/API route; no draft creation or `serverDrafts` modification; no Mongo transaction infrastructure; no receipt collection; no migration/index; no authenticated UX/login/C4C work; no Planner, C5–C12, publication, provider, secret, deploy, production activation, cookie, query/URL locator, local/session storage, IndexedDB, Cache API, Service Worker, preparation/adoption/receipt locator, or browser token is authorized.

`MONGO_TRANSACTION_REQUIRED=false`  
`RECEIPT_COLLECTION_REQUIRED=false`  
`NO_PREPARATION_BROWSER_CARRIER_V1` and `DURABLE_REPREPARE_REVOCATION_BARRIER_V1` remain binding.

C4B remains `blocked` until this C4B0 slice is implemented and done, then receives a fresh C4B preflight. C4C remains `blocked`; C5–C12 remain unauthorized.
