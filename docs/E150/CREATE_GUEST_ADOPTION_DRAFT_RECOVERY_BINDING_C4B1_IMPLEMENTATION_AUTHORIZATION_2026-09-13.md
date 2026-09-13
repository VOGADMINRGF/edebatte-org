# C4B1 Implementation Authorization — Prebound Draft Recovery

```text
BASE_MAIN_SHA=2759c11c9d3c6811a6ea8297a5a626a55229f21f
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-BINDING-01
ROLE=C4B1
PREFLIGHT_PR=773
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
SELECTED_RECOVERY_MODEL=PREBOUND_ADOPTION_DRAFT_RECOVERY_V1
DRAFT_BOUND_RECOVERY_MODEL=DRAFT_BOUND_RECOVERY_V1
BINDING_BEFORE_SAVE=true
TOP_LEVEL_EXPIRES_AT_EXTENDED_ON_BIND=true
SERVER_DRAFT_RUNTIME_CHANGE_REQUIRED=false
MONGO_TRANSACTION_REQUIRED=false
NEW_COLLECTION_REQUIRED=false
NEW_INDEX_REQUIRED=false
CORE_CONTRACT_COUNT=1
API_BOUNDARY_COUNT=0
AUTHORIZED_IMPLEMENTATION_FILES=2
AUTHORIZED_RUNTIME_FILES=1
AUTHORIZED_TEST_FILES=1
```

Authorized only: `apps/web/src/features/create/createGuestAdoptionPreparation.ts` and `apps/web/tests/create-guest-adoption-preparation.contract.test.ts`. The implementation may add the server-only exact-adoption draft-recovery bind, C3A-bounded top-level TTL extension, server-derived adoption-scoped idempotency material, draft-bound recovery, barrier serialization, and exact bound completion. It must preserve ordinary claim TTL, C4B0/C3A contracts, no browser carrier, and all generation/account boundaries.

No serverDraft change, API route, transaction, migration, collection/index, receipt collection, C4B/C4C work, deployment, production activation, or auto-publish is authorized. C4B and C4C remain blocked; C5–C12 remain unauthorized.
