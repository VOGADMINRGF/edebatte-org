# C4B Fresh Post-C4B2 Preflight — Authenticated Guest Adoption Draft Resume

```text
BASE_MAIN_SHA=95bf5cdfd389565e521e0d2834588f7b37cc702f
TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
ROLE=C4B
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

SERVER_ONLY_RESUME_POSSIBLE=true
NO_BROWSER_LOCATOR_PROVEN=true
POST_ORDINARY_EXPIRY_RESUME_PROVEN=true
POST_SAVE_PRE_COMPLETION_RECOVERY_PROVEN=true
POST_COMPLETION_REPLAY_PROVEN=true
DETERMINISTIC_DRAFT_IDENTITY_PROVEN=true
DETERMINISTIC_DRAFT_PAYLOAD_PROVEN=true
SAVE_BEFORE_COMPLETION_ORDER_PROVEN=true
DUPLICATE_DRAFT_CREATION_CLOSED=true
CROSS_ACCOUNT_RESUME_CLOSED=true
WRONG_SESSION_RESUME_CLOSED=true
POST_C3A_RESUME_CLOSED=true
STALE_GENERATION_RESUME_CLOSED=true
ROUTE_SECURITY_MODEL_PROVEN=true
NEW_ROUTE_SECURITY_SCOPE_REQUIRED=true
BROWSER_LOCATOR_REQUIRED=false
NEW_COLLECTION_REQUIRED=false
NEW_INDEX_REQUIRED=false
MONGO_TRANSACTION_REQUIRED=false
RECEIPT_COLLECTION_REQUIRED=false
SECOND_RECOVERY_SOURCE_REQUIRED=false
SERVER_DRAFT_RUNTIME_CHANGE_REQUIRED=false
NO_NEW_FOUNDATIONAL_PREREQUISITE=true
API_BOUNDARY_COUNT=1
CORE_CONTRACT_COUNT=1
PLANNED_IMPLEMENTATION_FILES=apps/web/src/app/api/create/adoption-resume/route.ts;apps/web/src/features/create/createGuestAdoptionPreparation.ts;apps/web/src/features/create/createRouteSecurity.ts;apps/web/tests/create-guest-adoption-preparation.contract.test.ts;apps/web/tests/create-guest-adoption-resume.route.test.ts;apps/web/tests/create-route-security.contract.test.ts
PLANNED_RUNTIME_FILES=3
PLANNED_TEST_FILES=3
NEW_BLOCKER=
PREREQUISITE_ROLE=
PREREQUISITE_TASK=
PREREQUISITE_CONTRACT=
```

## Actual merged runtime audited

The audit used `apps/web/src/features/create/createGuestAdoptionPreparation.ts`, `createAnonymousSession.ts`, `createRouteSecurity.ts`, `apps/web/src/server/serverDrafts.ts`, `apps/web/src/app/api/create/save/route.ts`, `apps/web/src/lib/server/auth/sessionUser.ts`, and their C3A/C4A1/C4B0/C4B1/C4B2, route-security, create-save, and server-draft contract tests. This conclusion is based on the merged runtime, not only the governance evidence.

`getSessionUser(req)` provides the canonical live authenticated account. `verifyAnonymousSession` provides the signed, expiry-checked C3A session from its HttpOnly `/api/create` cookie. C4B0's `claimGuestAdoptionPreparationForAuthenticatedAccount` resolves an unclaimed slot to one account-bound adoption, replays an active same-account claim, rejects a foreign account, and returns the completed adoption's stored `draftId` to the same account. C4B1 binds the deterministic adoption key before any draft save. C4B2's `discoverDraftBoundGuestAdoptionForAuthenticatedAccount` resolves only the unique current claimed, account-bound, live draft-recovery generation after ordinary claim expiry.

## Safe server-only sequence

The future `POST /api/create/adoption-resume` accepts exactly JSON `{}`. It must first verify the authenticated account and C3A session, then apply the narrow shared route-security scope. It then calls the existing claim primitive.

- An unclaimed slot yields the exact claimed generation; bind C4B1 recovery before any save.
- An active ordinary claim replays only to its owning account; bind is idempotent and supplies the same adoption-scoped key.
- If ordinary claim recovery has expired, C4B2 discovery supplies the exact live draft-bound generation without an adoption ID from the browser.
- A completed same-account generation is returned by the claim primitive with its authoritative stored `draftId`; it is replayed without rediscovery, decrypt, another save, or another completion.
- For a claimed generation, construct one fixed minimal canonical create draft from the normalized recovered claim: `text`, `textOriginal`, and `textPrepared` are that claim; all optional source, locale, metadata, material, and time-varying fields are omitted. Use `CANONICAL_CREATE_DRAFT_KIND` and the C4B1 adoption-scoped idempotency key. Save first, require a successful exact `draftId`, then call exact adoption completion with that same `adoptionId` and `draftId`.

This order never removes ciphertext or `draftRecovery` before the draft has been durably saved. `saveUserScopedServerDraft` derives its deterministic ObjectId from user, kind, and idempotency key; it verifies the stable payload hash on normal and duplicate-key replay. The fixed recovered-claim payload contains no retry-time value, so its payload hash is identical across retries. Completion then atomically stores the exact draft ID, removes ciphertext and draft recovery, and preserves the completed adoption for same-account replay.

## Crash and isolation matrix

| Boundary | Recoverable | Authoritative source | Duplicate/data-loss result | Fail closed |
| --- | --- | --- | --- | --- |
| after authentication, before claim | yes | unclaimed C4A1 slot | no draft yet | yes |
| after claim, before bind | only while ordinary claim is live | C4B0 account-bound claim | no draft yet | yes after ordinary expiry |
| after bind, before save | yes through C4B2 while C3A is live | C4B1 recovery plus C4B2 discovery | no draft yet | yes |
| during save | yes | deterministic server-draft ObjectId/key | duplicate creation closed | yes on conflict |
| after save, before completion | yes | C4B2 discovery plus deterministic draft save | same draft converges, then exact completion | yes |
| during completion | yes | exact completion CAS and completed replay | no alternate draft accepted | yes |
| after completion, before response | yes | C4B0 completed same-account replay | stored exact draftId returned; no decrypt/save | yes |

Wrong account, wrong/missing/expired C3A, malformed recovery, expired slot, completed generation under another account, and stale superseded generations fail closed. The slot is uniquely keyed by the C3A binding; there is no account-global latest-draft or latest-adoption lookup.

## Route and persistence boundary

`createRouteSecurity` needs one new narrow `create_guest_adoption_resume` scope with an empty allowed-field set and its own bounded actor/IP/C3A-session/client rate limits. Its existing provenance, CSRF, origin, JSON UTF-8, bounded-body, honeypot, abuse, duplicate/replay, and fail-closed persistent-limiter controls can be reused. The route must additionally require `Object.keys(payload).length === 0`, thereby rejecting null, arrays, scalars, malformed JSON, missing body, oversized input, and every unknown key. The existing honeypot header remains enforced; no new honeypot input is introduced.

No collection, index, transaction, receipt, secondary recovery truth, browser storage/cookie/query locator, or server-draft runtime change is required. The one proposed core contract is the server-only C4B orchestration in the existing guest-adoption preparation domain; it composes the existing primitives and existing `saveUserScopedServerDraft` rather than creating an additional draft format or persistence path. C4B implementation itself is not authorized by this preflight.

All existing contracts remain required: `NO_PREPARATION_BROWSER_CARRIER_V1`, `SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1`, `SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1`, `DURABLE_REPREPARE_REVOCATION_BARRIER_V1`, `PREBOUND_ADOPTION_DRAFT_RECOVERY_V1`, `DRAFT_BOUND_RECOVERY_V1`, and `DRAFT_BOUND_ADOPTION_DISCOVERY_V1`.
