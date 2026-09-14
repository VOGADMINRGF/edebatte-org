# C4B2 Fresh Preflight — Draft-Bound Adoption Discovery

```text
BASE_MAIN_SHA=5cd0a6eb955e4cbc26c36f07fee7cdbda4938ece
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-DISCOVERY-01
ROLE=C4B2
CONTRACT=DRAFT_BOUND_ADOPTION_DISCOVERY_V1
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
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
API_BOUNDARY_COUNT=0
CORE_CONTRACT_COUNT=1
PLANNED_IMPLEMENTATION_FILES=apps/web/src/features/create/createGuestAdoptionPreparation.ts;apps/web/tests/create-guest-adoption-preparation.contract.test.ts
```

The existing `create_guest_adoption_preparations` slot is unique on `anonymousSessionBindingHash`. A server-only helper can therefore use the verified C3A session binding plus authenticated account binding to locate the one existing slot and require: `state="prepared"`, `adoption.state="claimed"`, matching account binding, canonical `draftRecovery` (`version=1`, date `boundAt`, live date `recoveryExpiresAt`), live top-level `expiresAt`, and ciphertext. Existing runtime validation/decryption/normalization then fails closed before returning `preparationId`, `adoptionId`, `claim`, deterministic `draftIdempotencyKey`, and `recoveryExpiresAtMs`.

This proves the bind → crash/response-loss → ordinary-claim-expiry → retry-before-C3A-expiry case can rediscover the same generation without browser-provided preparation/adoption/draft IDs, claim, token, or locator. The unique binding slot prevents prior/reprepared generations from competing; a superseded generation has been cleared, and a completed generation does not meet the claimed/ciphertext filter. Wrong account or C3A session cannot match both binding hashes. Missing/invalid session, malformed account input, malformed/missing/expired recovery, expired top-level slot, completed/superseded state, missing ciphertext, decryption/normalization failure, and any unexpected ambiguity fail closed. After C3A expiry, verified-session and live-recovery requirements fail.

No browser locator, account-global/latest-draft or latest-adoption guessing, second recovery source, collection/index, transaction, serverDraft runtime change, or API boundary is required. The smallest future implementation is one core contract/helper in `createGuestAdoptionPreparation.ts` and focused coverage in its existing contract test. This preflight authorizes no implementation; C4B remains blocked, C4C remains blocked, C5–C12 remain unauthorized, and production remains blocked.
