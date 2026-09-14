# C4B Implementation Authorization — Authenticated Guest Adoption Draft Resume

```text
BASE_MAIN_SHA=8f7d5710cfacaedae9773a09347aabf22f36c7db
TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
ROLE=C4B
PREFLIGHT_PR=785
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

STATUS=codex_ready
AUTHORIZATION=implementation_authorized
PREFLIGHT_AUTHORIZED=false
PREFLIGHT_AUTHORIZATION_CONSUMED=true
NEW_PREFLIGHT_DISPATCH_ALLOWED=false
IMPLEMENTATION_AUTHORIZED=true
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=true
IMPLEMENTED=false
DONE=false
NEXT_ACTION=C4B_IMPLEMENTATION

AUTHORIZED_IMPLEMENTATION_FILES=6
AUTHORIZED_RUNTIME_FILES=3
AUTHORIZED_TEST_FILES=3
API_BOUNDARY_COUNT=1
CORE_CONTRACT_COUNT=1
NEW_ROUTE_SECURITY_SCOPE_REQUIRED=true
BROWSER_LOCATOR_REQUIRED=false
NEW_COLLECTION_REQUIRED=false
NEW_INDEX_REQUIRED=false
MONGO_TRANSACTION_REQUIRED=false
RECEIPT_COLLECTION_REQUIRED=false
SECOND_RECOVERY_SOURCE_REQUIRED=false
SERVER_DRAFT_RUNTIME_CHANGE_REQUIRED=false
```

The sole authorized API boundary is `POST /api/create/adoption-resume`. It accepts `application/json` with exactly `{}`; no request field, browser locator, recovery metadata, user identity, adoption identity, draft identity, claim, or idempotency key is authorized. Authority derives only from the verified C3A HttpOnly session, canonical authenticated account session, and existing C4A1/C4B0/C4B1/C4B2 server state.

The sole core orchestration contract composes the existing claim, pre-bind, discovery, deterministic canonical draft save, and exact completion primitives. It must save the recovered normalized claim as `text`, `textOriginal`, and `textPrepared` with `CANONICAL_CREATE_DRAFT_KIND` and the C4B1 adoption-scoped idempotency key, then complete only after the successful exact server-draft result. Completed same-account replay must return the stored authoritative `draftId` without decrypting, saving, rebinding, or guessing.

Authorized files only:

- `apps/web/src/app/api/create/adoption-resume/route.ts`
- `apps/web/src/features/create/createGuestAdoptionPreparation.ts`
- `apps/web/src/features/create/createRouteSecurity.ts`
- `apps/web/tests/create-guest-adoption-preparation.contract.test.ts`
- `apps/web/tests/create-guest-adoption-resume.route.test.ts`
- `apps/web/tests/create-route-security.contract.test.ts`

The new route-security scope may only reuse C3B's existing origin, CSRF/provenance, JSON UTF-8, bounded-body, honeypot-header, persistent actor/IP/session/client limiter, duplicate/replay, abuse, and fail-closed infrastructure with an empty allowed-field set. No `serverDrafts.ts` modification, new schema, collection, index, transaction, receipt/recovery source, cookie, storage, URL/query carrier, C4C, C5–C12, provider, deploy, production activation, or auto-publish is authorized.

All binding contracts remain mandatory: `NO_PREPARATION_BROWSER_CARRIER_V1`, `SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1`, `SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1`, `DURABLE_REPREPARE_REVOCATION_BARRIER_V1`, `PREBOUND_ADOPTION_DRAFT_RECOVERY_V1`, `DRAFT_BOUND_RECOVERY_V1`, and `DRAFT_BOUND_ADOPTION_DISCOVERY_V1`. C4C remains blocked; C5–C12 remain unauthorized; production remains blocked.
