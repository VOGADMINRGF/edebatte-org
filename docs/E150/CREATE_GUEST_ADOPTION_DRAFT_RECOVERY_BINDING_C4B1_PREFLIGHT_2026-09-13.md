# C4B1 Fresh Preflight — Durable Adoption-to-Draft Recovery

```text
BASE_MAIN_SHA=b05f4f2c04cdc99e1e13c8a8245151b31bf05b0c
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-BINDING-01
ROLE=C4B1
PARENT_BLOCKER=SAVE_COMPLETED_DRAFT_ID_NOT_RECOVERABLE_AFTER_C4B0_CLAIM_EXPIRY
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
SELECTED_RECOVERY_MODEL=PREBOUND_ADOPTION_DRAFT_RECOVERY_V1
BINDING_BEFORE_SAVE=true
SAVE_BEFORE_BIND_WINDOW_EXISTS=false
ADOPTION_IDEMPOTENCY_KEY_MODEL=server-derived domain-separated stable hash of adoptionId
SERVER_DRAFT_RUNTIME_CHANGE_REQUIRED=false
DRAFT_BOUND_RECOVERY_MODEL=DRAFT_BOUND_RECOVERY_V1
DRAFT_BOUND_RECOVERY_WINDOW=remaining verified C3A session lifetime
POST_C3A_EXPIRY_RECOVERY=false
CLAIM_RECOVERY_CONTRACT_PRESERVED=true
ACTIVE_DRAFT_BOUND_BLOCKS_REPREPARE=true
EXPIRED_DRAFT_BOUND_ALLOWS_REPREPARE=true
COMPLETION_AFTER_ORIGINAL_CLAIM_EXPIRY_SAFE=true
MONGO_TRANSACTION_REQUIRED=false
NEW_COLLECTION_REQUIRED=false
NEW_INDEX_REQUIRED=false
CORE_CONTRACT_COUNT=1
API_BOUNDARY_COUNT=0
IMPLEMENTATION_FILES_PLANNED=2
RUNTIME_FILES_PLANNED=1
TEST_FILES_PLANNED=1
```

The existing slot receives a pre-save, exact-account/adoption CAS draft-recovery binding. It is active only to verified C3A expiry, blocks reprepare while active, and permits reprepare after expiry with metadata/payload cleanup. Same-account server callers may recover claim material only while the bound authority is active; cross-account requests fail closed. Completion after ordinary claim expiry uses exact active bound recovery plus exact draft ID. Stale generations cannot bind or complete a newer slot.

`saveUserScopedServerDraft` already accepts `idempotencyKey`, derives deterministic canonical IDs from user, kind and key, and checks payload conflicts. A server-only versioned adoption-scoped key therefore gives pre-bind crash, insert crash, saved-response-loss and original-claim-expiry retry convergence without a serverDraft change, transaction, collection, index, browser locator, account-global guessing or post-C3A authority.

Planned files only: `apps/web/src/features/create/createGuestAdoptionPreparation.ts` and `apps/web/tests/create-guest-adoption-preparation.contract.test.ts`. Required deterministic coverage includes bind CAS/idempotency/cross-account, C3A-bound recovery, reprepare serialization and cleanup, stale generation, completion after claim expiry, adoption-key stability, save replay/conflict, and existing C4B0 regressions. No implementation is authorized; C4B/C4C remain blocked, C5–C12 unauthorized, and production blocked.
