# C9 Canonical Handoff + Review Persistence — Implementation Authorization

Date: 2026-09-19

```text
TASK=CREATE-CANONICAL-HANDOFF-REVIEW-PERSISTENCE-01
ROLE=C9
MODE=IMPLEMENTATION_AUTHORIZATION
BASE_MAIN_SHA=7dd8bf669cc036c44a6990c72fd1c005cb5720ce
SOURCE_PREFLIGHT_PR=#904
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=true
C10_C12_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Authorized implementation objective

C9 may harden the existing Create handoff/review path so durable review persistence is bound to one authenticated canonical account draft, current server-derived Create semantics and the existing review owner.

The implementation must not create a second handoff/review truth.

Canonical durable review owner remains:

`create_handoff_review_items`

Canonical account draft owner remains:

`drafts`

## Canonical draft resolution

Preferred binding is an explicit canonical account `draftId` when supplied.

For compatibility with the current caller, implementation may use one bounded server-side fallback when no explicit canonical `draftId` is supplied:

- query only the authenticated actor's canonical open `drafts` records;
- candidate text must exactly match one of the canonical stored text variants;
- exactly one candidate is required;
- zero candidates -> fail closed;
- more than one candidate -> fail closed as ambiguous;
- legacy `contribution_drafts` are not accepted for new C9 persistence;
- finalized drafts are not accepted;
- the fallback may not create, mutate or select a draft by fuzzy similarity.

This fallback is an account-draft resolver, not a second draft truth.

## Server-authoritative handoff reconstruction

The durable C9 handoff must not trust browser-supplied planner/graph/stance/source-grounding structures as canonical.

After canonical draft resolution, C9 reconstructs the review handoff from the canonical draft's persisted `analysis.intelligentFollowup` plus the user's bounded selected action.

The server-derived result must carry:

- C6 planner/stance and graph-match state from canonical draft analysis;
- C7 jurisdiction confirmation from canonical draft analysis, then revalidate it against the current server-side jurisdiction owner before persistence;
- C8 source evidence only as bounded ids/hashes/status references from the same canonical draft;
- current G1 Public Question Guard binding for generated open-question review items.

Raw fetched source bodies, signed URLs, credentials and secret-bearing material must never be copied into C9 review persistence.

## G1 binding

C9-generated open questions must be bound to the current Public Question Guard contract.

Initial Create-produced question guards remain review-first. Provider/self-authored question text may not self-certify actor extraction. Missing or stale guard-contract evidence must not be persisted as a release-ready condition.

C9 itself never publishes a question.

## Mutation security

`POST /api/create/handoffs` must run through the shared C3B mutation-security implementation with a new dedicated scope:

`create_handoff_persistence`

That scope must include Origin/Fetch-Metadata/CSRF, honeypot, JSON Content-Type, measured body limit, persistent rate/risk gates and malformed/unknown-field fail-closed parsing.

The browser runtime bridge must use the existing `createMutationRequestHeaders()` helper. No parallel CSRF/header contract is permitted.

## Idempotency and identity conflict

Existing logical handoff ids may remain stable for compatibility, but persistence must atomically protect identity.

For the same logical handoff id:

- same actor + same canonical draft -> idempotent replay/update is allowed;
- different actor -> fail closed;
- different canonical draft -> fail closed;
- concurrent cross-identity upsert must not overwrite an existing record;
- duplicate-key races are treated as identity conflict, not success.

Durable success is returned only after the canonical review record is stored.

## Authorized files

Runtime/owner files, maximum 7:

1. `apps/web/src/app/api/create/handoffs/route.ts`
2. `apps/web/src/features/create/createRouteSecurity.ts`
3. `apps/web/src/features/create/createHandoffReviewQueueRuntimeBridge.ts`
4. `apps/web/src/features/create/createHandoff.ts`
5. `apps/web/src/features/create/createHandoffPersistenceContract.ts`
6. `apps/web/src/features/create/persistedHandoffReviewQueue.ts`
7. `apps/web/src/server/createHandoffDraftBinding.ts` — new bounded canonical read adapter over `drafts`; no second writer

Test/CI files, maximum 3:

8. `apps/web/tests/create-handoff-c9.contract.test.ts` — new focused C9 route/persistence/binding test
9. `apps/web/tests/create-handoff-security.contract.test.ts` — new focused mutation-security/bridge test
10. `.github/workflows/web-ci.yml` — add only the two C9 tests to Focused Create runtime contracts

```text
RUNTIME_FILES_MAX=7
TEST_CI_FILES_MAX=3
TOTAL_CHANGED_FILES_MAX=10
NEW_DB_COLLECTIONS=0
NEW_SCHEMA_MIGRATIONS=0
NEW_PACKAGES=0
NEW_PUBLIC_ROUTES=0
NEW_BROWSER_PERSISTENCE=0
```

No `CreateClient.tsx` or `CreateVisualFollowup.tsx` edit is authorized by this implementation. If explicit Draft-ID UI plumbing is later desired, it belongs in a separately reviewed bounded follow-up and is not required for C9 correctness because the fallback is exact, actor-scoped and ambiguity-fail-closed.

## Required implementation behavior

The implementation must prove:

1. unauthenticated request fails before persistence;
2. bad Origin/CSRF/Content-Type/body size/malformed body fails through shared C3B security;
3. explicit foreign/finalized/noncanonical draft fails;
4. fallback draft resolution is exact and requires exactly one actor-owned open canonical match;
5. canonical draft without valid persisted intelligent-followup truth fails closed;
6. persisted handoff is rebuilt from canonical followup rather than browser planner/graph payload;
7. C7 confirmation is revalidated server-side;
8. generated open questions carry current G1 guard binding and remain review-first;
9. C8 evidence is persisted only as bounded references/hashes/status;
10. same actor + same draft + same handoff replay is idempotent;
11. cross-actor or cross-draft same-id attempt fails without overwrite;
12. persistence failure cannot produce a success response;
13. dossier runtime projection, when created, remains review-only/non-public;
14. no notification, approval, graph activation, vote activation or publication is required for C9 success.

## Explicit exclusions

- C10 notifications
- C11 progress events/stream
- C12 progressive-transparency UI
- new review queue
- new DB collection
- new browser persistence
- source fetching/provider execution
- auto approval
- auto publication
- public Question release
- Topic/Poll/Vote/Graph activation

## Authorization result

```text
C9_IMPLEMENTATION_AUTHORIZED=true
SERVER_AUTHORITATIVE_DRAFT_BINDING=true
SERVER_REBUILDS_HANDOFF=true
G1_BINDING_REQUIRED=true
C3B_ROUTE_SECURITY_REQUIRED=true
ZERO_PARALLEL_TRUTH=true
NEXT_AFTER_MERGE=C9_CLOSURE_THEN_C10_FRESH_REVALIDATION
```

C9 is not done until the implementation passes focused tests, exact-head Web CI, drift check, review, merge and post-merge closure evidence.
