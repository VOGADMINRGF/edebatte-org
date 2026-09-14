# C4B2 Registration — Draft Recovery Discovery

```text
BASE_MAIN_SHA=f4f65732b517191710f2f08b86276acc194082e2
PARENT_TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
PARENT_PREFLIGHT_PR=779
PARENT_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
PARENT_BLOCKER=DRAFT_BOUND_ADOPTION_NOT_SERVER_DISCOVERABLE_AFTER_ORDINARY_CLAIM_EXPIRY
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-DISCOVERY-01
ROLE=C4B2
CONTRACT=DRAFT_BOUND_ADOPTION_DISCOVERY_V1
STATUS=codex_ready
AUTHORIZATION=preflight_only
PREFLIGHT_AUTHORIZED=true
PREFLIGHT_AUTHORIZATION_CONSUMED=false
NEW_PREFLIGHT_DISPATCH_ALLOWED=true
IMPLEMENTATION_AUTHORIZED=false
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
IMPLEMENTED=false
DONE=false
NEXT_ACTION=C4B2_FRESH_PREFLIGHT
```

C4B2 is a prerequisite of C4B, not the C4B route. Its future preflight may investigate only whether the unique existing authoritative C4A1/C4B0 slot can provide exact server-side discovery of the currently active draft-bound adoption from verified C3A session binding plus authenticated account binding. It must not select or implement a solution. The server-only candidate result is `preparationId`, `adoptionId`, `claim`, `draftIdempotencyKey`, and `recoveryExpiresAtMs`; none is a browser output contract.

The preflight must prove or reject unique slot resolution after ordinary claim expiry, no-ID active-generation recovery while the C3A-bounded window is live, deterministic same-generation retry after bind/crash/lost response, deterministic adoption-scoped draft identity, post-C3A fail-closed behavior, and no stale-generation resurrection after supersession. It must fail closed for wrong account/session, missing verified C3A binding, malformed or expired recovery, expired top-level slot, completed/superseded generation, missing ciphertext, decrypt/normalization failure, and ambiguous/multiple candidates.

It preserves `NO_PREPARATION_BROWSER_CARRIER_V1`, `SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1`, `SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1`, `DURABLE_REPREPARE_REVOCATION_BARRIER_V1`, `PREBOUND_ADOPTION_DRAFT_RECOVERY_V1`, and `DRAFT_BOUND_RECOVERY_V1`. No browser or storage/URL/cookie locator, account-global/latest-draft or latest-adoption guessing, second recovery source, receipt/recovery collection, new collection/index, transaction, serverDraft runtime modification, API boundary, C4B/C4C implementation, production activation, or auto-publish is authorized. If any is required, the future preflight must return a new `FAIL_SPLIT_REQUIRED` blocker rather than broaden scope.

The future audit must inspect the actual merged C4A1/C4B0/C4B1 slot schema, bindings, claim/replay, draft recovery, expiry, supersession, completion, and database query/index capabilities. It must report `PREFLIGHT_RESULT`, `SERVER_DISCOVERY_POSSIBLE`, `UNIQUE_SLOT_RESOLUTION_PROVEN`, `POST_ORDINARY_EXPIRY_DISCOVERY_PROVEN`, `POST_C3A_FAIL_CLOSED`, `CROSS_ACCOUNT_DISCOVERY_CLOSED`, `STALE_GENERATION_DISCOVERY_CLOSED`, `BROWSER_LOCATOR_REQUIRED`, `NEW_COLLECTION_REQUIRED`, `NEW_INDEX_REQUIRED`, `MONGO_TRANSACTION_REQUIRED`, `SERVER_DRAFT_RUNTIME_CHANGE_REQUIRED`, `API_BOUNDARY_COUNT`, `CORE_CONTRACT_COUNT`, and `PLANNED_IMPLEMENTATION_FILES`. It cannot authorize implementation.
