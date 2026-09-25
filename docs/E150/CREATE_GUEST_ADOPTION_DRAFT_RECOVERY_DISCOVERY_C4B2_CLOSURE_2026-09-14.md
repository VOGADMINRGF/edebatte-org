# C4B2 Closure — Draft-Bound Adoption Discovery

```text
BASE_MAIN_SHA=f7598ec1bd1fba20540f9c5a1790904403f1e66b
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-DISCOVERY-01
ROLE=C4B2
CONTRACT=DRAFT_BOUND_ADOPTION_DISCOVERY_V1
PREFLIGHT_PR=781
IMPLEMENTATION_AUTHORIZATION_PR=782
IMPLEMENTATION_PR=783
IMPLEMENTATION_HEAD=77311cda66229037a6437b48d0729d051bf992f4
IMPLEMENTATION_MERGE=f7598ec1bd1fba20540f9c5a1790904403f1e66b
FINAL_EXACT_HEAD_REVIEW=P0=0,P1=0,P2=0
STATUS=done
IMPLEMENTED=true
DONE=true
PREFLIGHT_AUTHORIZED=false
PREFLIGHT_AUTHORIZATION_CONSUMED=true
NEW_PREFLIGHT_DISPATCH_ALLOWED=false
IMPLEMENTATION_AUTHORIZED=false
IMPLEMENTATION_AUTHORIZATION_CONSUMED=true
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
REVIEW_REPAIR_AUTHORIZED=false
```

PR `#783` merged the single server-only core helper `discoverDraftBoundGuestAdoptionForAuthenticatedAccount` in the existing guest-adoption preparation domain. Using only verified C3A session binding and authenticated account binding, it resolves the unique authoritative C4A1/C4B0 slot and returns only server-side `preparationId`, `adoptionId`, `claim`, `draftIdempotencyKey`, and `recoveryExpiresAtMs`. No browser carrier, locator, recovery token, API boundary, collection, index, transaction, or server-draft change was introduced.

The merged implementation proves exact discovery after ordinary claim expiry while the C3A-bounded draft-recovery window remains live. It fails closed for wrong account or C3A session, missing verified binding, malformed account or draft-recovery state, missing adoption/ciphertext, unsupported recovery version, invalid or expired deadlines, completed or superseded generation, decrypt failure, normalization failure, inconsistency, ambiguity, and post-C3A expiry. Discovery remains read-only and does not extend the ordinary claim, draft-recovery, C3A, or authoritative-slot lifetime.

```text
DRAFT_BOUND_ADOPTION_DISCOVERY_V1=true
DISCOVERY_HELPER=discoverDraftBoundGuestAdoptionForAuthenticatedAccount
SERVER_DISCOVERY_POSSIBLE=true
UNIQUE_SLOT_RESOLUTION_PROVEN=true
POST_ORDINARY_EXPIRY_DISCOVERY_PROVEN=true
RECOVERY_WITHIN_SESSION_BOUND=true
RECOVERY_WITHIN_TOP_LEVEL_BOUND=true
POST_C3A_FAIL_CLOSED=true
CROSS_ACCOUNT_DISCOVERY_CLOSED=true
STALE_GENERATION_DISCOVERY_CLOSED=true
CORRUPT_CIPHERTEXT_FAIL_CLOSED=true
NORMALIZATION_FAIL_CLOSED=true
DISCOVERY_READ_ONLY=true
BROWSER_LOCATOR_REQUIRED=false
NEW_COLLECTIONS=0
NEW_INDEXES=0
MONGO_TRANSACTION_USED=false
SERVER_DRAFT_RUNTIME_CHANGED=false
CORE_CONTRACT_COUNT=1
API_BOUNDARY_COUNT=0
FOCUSED_TESTS=58/58 PASS

NO_PREPARATION_BROWSER_CARRIER_V1_PRESERVED=true
SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1_PRESERVED=true
SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1_PRESERVED=true
DURABLE_REPREPARE_REVOCATION_BARRIER_V1_PRESERVED=true
PREBOUND_ADOPTION_DRAFT_RECOVERY_V1_PRESERVED=true
DRAFT_BOUND_RECOVERY_V1_PRESERVED=true
DRAFT_BOUND_ADOPTION_DISCOVERY_V1_PRESERVED=true

PARENT_C4B_BLOCKER=DRAFT_BOUND_ADOPTION_NOT_SERVER_DISCOVERABLE_AFTER_ORDINARY_CLAIM_EXPIRY
PARENT_C4B_BLOCKER_RESOLVED=true
PARENT_C4B_BLOCKER_RESOLVED_BY=C4B2
PARENT_NEXT_ACTION=C4B_FRESH_POST_C4B2_PREFLIGHT
```

The parent C4B blocker `DRAFT_BOUND_ADOPTION_NOT_SERVER_DISCOVERABLE_AFTER_ORDINARY_CLAIM_EXPIRY` is resolved by C4B2. C4B is now authorized only for `C4B_FRESH_POST_C4B2_PREFLIGHT`; its implementation remains unauthorized. C4C remains blocked, C5–C12 remain unauthorized, and production activation and auto-publish remain unauthorized.
