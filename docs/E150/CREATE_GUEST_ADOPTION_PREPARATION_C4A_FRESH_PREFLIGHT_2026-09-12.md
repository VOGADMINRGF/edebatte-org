# C4A Fresh Preflight Evidence

```text
BASE_MAIN_SHA=232f390df68e9b46a01082a73d9f3259f4a61e38
TASK=CREATE-GUEST-ADOPTION-PREPARATION-FOUNDATION-01
RESULT=FAIL_SPLIT_REQUIRED
COLLISION_RESULT=SPLIT_REQUIRED
BLOCKING_COLLISION=VISIBLE_PRE_SUBMIT_INTENT_CANNOT_TRUTHFULLY_COMPLETE_BEFORE_C4B
CORE_CONTRACT_COUNT=3
SECURITY_DOMAIN_COUNT=5
```

Positive findings: the merged At-Rest interface is reusable without modification; `inspectGuestClaim` is reusable; C3D remains ephemerally unchanged with no browser persistence; plaintext is claim-only UTF-8 and is never persisted; the candidate durable core-Mongo preparation stores only the structured encrypted envelope, a domain-separated anonymous-session binding hash, opaque server preparation ID and logical expiry. C3B mutation security is reusable, with a new finite preparation limiter scope to be verified. Runtime invocation without At-Rest configuration must fail closed; no production secret is required for a code merge.

The server preparation/carrier foundation and the visible Guest intent/Login transition are independent contracts. A visible pre-submit action would be a dead-end before C4B can consume the preparation; post-submit continuity would violate C3D clearing. Therefore C4A is a blocked decomposition parent. C4A1 is registered only for a fresh preflight; C4B follows C4A1 done; C4C follows C4B done.

## Selected flow and persistence findings

```text
SELECTED_C4A_FLOW=MODEL_C_SERVER_PREPARATION_FOUNDATION_WITH_VISIBLE_INTENT_DEFERRED
VISIBLE_GUEST_INTENT_IN_C4A=false
LOGIN_NAVIGATION_IN_C4A=false
ACTIVE_PREPARATION_CARDINALITY=one_active_preparation_per_anonymousSessionBindingHash
PREPARATION_IDEMPOTENCY_KEY=anonymousSessionBindingHash_with_atomic_unique_upsert
SAME_CLAIM_RETRY_BEHAVIOR=safe_bounded_replace_without_persisted_claim_fingerprint
CHANGED_CLAIM_BEHAVIOR=atomically_replace_prior_active_preparation
CLAIM_FINGERPRINT_REQUIRED=false
FAILED_REPREPARE_STALE_PAYLOAD_POLICY=invalidate_prior_active_preparation_before_returning_failure
FAILED_REPREPARE_CARRIER_POLICY=clear_transition_carrier_on_every_failed_explicit_reprepare
```

MODEL_A, a visible pre-submit Continue/Login action, is not truthful before C4B can consume a preparation. MODEL_B, a post-submit continuation, violates C3D’s accepted-text clearing and no-retained-`operationId` contract. The selected MODEL_C has no read-then-write authority: the session-binding key is atomically uniquely upserted. A failed attempt to prepare claim B invalidates claim A’s active preparation and clears its carrier before returning failure, so claim A cannot remain silently adoptable through a stale carrier.

## Transition carrier and session binding

```text
TRANSITION_CARRIER_MODEL=opaque_host_only_HttpOnly_cookie
TRANSITION_COOKIE_NAME=edebatte_create_adoption_preparation
TRANSITION_COOKIE_HTTP_ONLY=true
TRANSITION_COOKIE_SAME_SITE=Lax
TRANSITION_COOKIE_SECURE_MODEL=NODE_ENV_production
TRANSITION_COOKIE_PATH=/
TRANSITION_COOKIE_CONTENT=opaque_server_generated_preparationId_only
URL_TOKEN_REQUIRED=false
BROWSER_STORAGE_REQUIRED=false
ANON_SESSION_BINDING_SOURCE=verified_C3A_anonymous_session_id
ANON_SESSION_BINDING_MODEL=SHA256_domain_separated_edebatte:create:adoption-preparation:anon-session:v1
RAW_ANON_SESSION_ID_PERSISTED=false
ANON_COOKIE_PATH=/api/create
LOGIN_PAGE_RECEIVES_ANON_COOKIE=false
FUTURE_C4B_API_CAN_RECEIVE_ANON_COOKIE=true
```

The transition carrier contains no raw claim, ciphertext, At-Rest envelope, anonymous-session ID, binding hash, or account identity.

## Expiry, durable document, and security reuse

```text
TEMP_PREPARATION_TTL=maximum_15_minutes
ANON_SESSION_EXPIRY_CAP=true
TTL_EFFECTIVE_FORMULA=min_15_minutes_remaining_verified_anonymous_session_lifetime
TTL_INDEX=expiresAt_ascending_expireAfterSeconds_0
LOGICAL_EXPIRY_CHECK_REQUIRED=true
CLEANUP_OWNER=Mongo_TTL_monitor_plus_server_side_expiry_rejection
TTL_MONITOR_LAG_SAFE=true
RESTART_RECOVERY=durable_core_Mongo_document
ORPHAN_CLEANUP=TTL_index_after_logical_expiry
CRASH_SAFETY=no_process_memory_authority
TEMP_PREPARATION_SCHEMA=version,preparationId,anonymousSessionBindingHash,encryptedPayload,createdAt,expiresAt
PLAINTEXT_PERSISTED=false
ENCRYPTED_PAYLOAD_STORAGE_MODEL=structured_AtRestEnvelope
PREPARATION_ID_SOURCE=server_generated_UUIDv4
PREPARATION_ID_CLIENT_CONTROL=false
DATABASE=core_MongoDB
COLLECTION=create_guest_adoption_preparations
C4A1_PREFLIGHT_MUST_REVERIFY=true
C3B_SECURITY_REUSE=true
C3B_REUSED_SYMBOLS=enforceCreateMutationSecurity;getVerifiedGuestClaimSubject;createMutationRequestHeaders
NEW_RATE_LIMIT_SCOPE_REQUIRED=true
RATE_LIMIT_SCOPE=create_guest_adoption_preparation
RATE_LIMIT_FILES_REQUIRED=apps/web/src/features/create/createRouteSecurity.ts
C3C_SAFETY_REUSE=true
C3C_SAFETY_FUNCTION=inspectGuestClaim
C3C_RESULT_SCHEMA_CHANGE_REQUIRED=false
C3C_PERSISTENCE_CHANGE_REQUIRED=false
AT_REST_INTERFACE_REUSE=true
AT_REST_HELPER_MODIFICATION_REQUIRED=false
TEMP_PLAINTEXT_SCHEMA=validated_normalized_guest_claim_string_only
TEMP_SERIALIZATION=UTF8_Uint8Array_via_encodeAtRestUtf8
RAW_PLAINTEXT_FIELDS=claim_only
MISSING_AT_REST_CONFIG_BEHAVIOR=fail_closed_generic_preparation_unavailable
PLAINTEXT_FALLBACK_ALLOWED=false
```

The candidate C4A1 database contract is one unique `preparationId`, one unique `anonymousSessionBindingHash`, and a TTL index on `expiresAt`; the database, collection, and indexes must be reverified by its task-specific preflight. Mongo TTL deletion timing is not an authorization or validity boundary: the server must check `expiresAt` logically. The listed C3B rate-limit scope is preliminary preflight input only, not implementation authorization.

```text
AT_REST_FOCUSED_TESTS=PASS; 13/13
C3A_REGRESSIONS=PASS; 11/11
C3B_REGRESSIONS=PASS; 36/36
C3C_REGRESSIONS=PASS; 47/47
C3D_REGRESSIONS=PASS; 13/13
GOVERNANCE_TESTS=PASS; 4/4
OPENTASKS_CONTROL_PLANE_TESTS=PASS; 126/126
```
