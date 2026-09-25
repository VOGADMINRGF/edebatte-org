# C4B2 Implementation Authorization — Draft-Bound Adoption Discovery

```text
BASE_MAIN_SHA=6d8188dd76733fc1044978963943bf4e52e06f37
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-DISCOVERY-01
ROLE=C4B2
PREFLIGHT_PR=781
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
CONTRACT=DRAFT_BOUND_ADOPTION_DISCOVERY_V1
SERVER_DISCOVERY_POSSIBLE=true
UNIQUE_SLOT_RESOLUTION_PROVEN=true
POST_ORDINARY_EXPIRY_DISCOVERY_PROVEN=true
POST_C3A_FAIL_CLOSED=true
CROSS_ACCOUNT_DISCOVERY_CLOSED=true
STALE_GENERATION_DISCOVERY_CLOSED=true
BROWSER_LOCATOR_REQUIRED=false
NEW_COLLECTION_REQUIRED=false
NEW_INDEX_REQUIRED=false
MONGO_TRANSACTION_REQUIRED=false
SERVER_DRAFT_RUNTIME_CHANGE_REQUIRED=false
CORE_CONTRACT_COUNT=1
API_BOUNDARY_COUNT=0
AUTHORIZED_IMPLEMENTATION_FILES=2
AUTHORIZED_RUNTIME_FILES=1
AUTHORIZED_TEST_FILES=1
```

Authorized only: `apps/web/src/features/create/createGuestAdoptionPreparation.ts` and `apps/web/tests/create-guest-adoption-preparation.contract.test.ts`. The implementation may add one server-only core helper that, from the verified C3A session and authenticated account binding, discovers the exact active draft-bound generation on the unique existing authoritative C4A1/C4B0 slot. It may return server-side `preparationId`, `adoptionId`, `claim`, `draftIdempotencyKey`, and `recoveryExpiresAtMs` only.

The helper must require prepared/claimed state, matching account binding, canonical live `draftRecovery`, live top-level expiry, and ciphertext; it must fail closed for invalid/missing session, wrong account, malformed/expired recovery, completed or superseded state, missing ciphertext, decrypt/normalization failure, inconsistency, ambiguity, and post-C3A expiry. It preserves all C3A, C4B0, C4B1, and reprepare/completion contracts.

Not authorized: any browser/storage/URL/cookie locator, account-global draft/adoption lookup, second recovery truth, receipt/recovery collection, collection/index, transaction, serverDraft change, API route, C4B/C4C work, C5–C12, provider/secret/deploy, production activation, or auto-publish. C4B remains blocked; C4C remains blocked.
