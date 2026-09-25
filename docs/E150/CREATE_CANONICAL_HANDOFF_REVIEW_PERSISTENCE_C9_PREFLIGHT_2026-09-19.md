# C9 Canonical Handoff + Review Persistence — Fresh Preflight

Date: 2026-09-19

```text
TASK=CREATE-CANONICAL-HANDOFF-REVIEW-PERSISTENCE-01
ROLE=C9
MODE=FRESH_PREFLIGHT
BASE_MAIN_SHA=34ef79f3863834a1e0a93eb92afb2712cd8c80a7
C8_CLOSURE_PR=#902
C8_STATUS=done
G1_STATUS=done
C6_STATUS=done
C7_STATUS=done
C9_PREFLIGHT=PASS
C9_IMPLEMENTATION_AUTHORIZED=false
C10_C12_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Result

Current main already contains a durable Create handoff/review world, but it is not yet sufficient for C9 completion.

The existing route authenticates and checks organization/region access, but the mutation currently accepts the logical handoff payload, handoff id, source text, planner/graph structures and review content from the browser. The route does not yet run through the shared C3B Create mutation-security boundary and does not verify the handoff against a real authenticated canonical `drafts` record before durable review persistence.

The current durable owner remains:

`create_handoff_review_items`

No second handoff/review queue or collection is required or permitted.

## Canonical ID finding

`CreateHandoffReviewQueueItem.sourceDraftId` is the id of a local handoff draft. It is not the canonical authenticated account draft id from C4/C8.

The Create client separately holds `savedDraftId`, which is the canonical server draft id returned by `/api/create/save`.

C9 must keep these identities separate:

```text
canonicalDraftId = authenticated server-authoritative drafts._id
handoffId = deterministic logical review/handoff id
```

They must never be silently treated as interchangeable.

## Current reusable owners

Reusable current-main owners are:

- `apps/web/src/features/create/createHandoff.ts`
- `apps/web/src/features/create/createHandoffDrafts.ts`
- `apps/web/src/features/create/createHandoffReviewQueue.ts`
- `apps/web/src/features/create/createHandoffReviewQueueRuntimeBridge.ts`
- `apps/web/src/features/create/createHandoffPersistenceContract.ts`
- `apps/web/src/features/create/persistedHandoffReviewQueue.ts`
- `apps/web/src/app/api/create/handoffs/route.ts`
- `apps/web/src/server/serverDrafts.ts`
- `apps/web/src/server/createDraftSourceEvidence.ts`
- `apps/web/src/features/create/createRouteSecurity.ts`

Existing read/access enforcement in `/api/create/handoffs/[handoffId]` remains reusable and is not an implementation target unless a regression requires a bounded test-only adjustment.

## Required C9 invariants

### Authenticated canonical draft first

Before durable handoff/review persistence:

1. a valid authenticated user must exist;
2. the request must provide the canonical account `draftId` separately from the logical handoff id;
3. `verifyCreateDraftBinding` must prove the draft belongs to the same authenticated user and remains a live canonical `drafts` record;
4. source text used for the handoff must match canonical draft truth accepted by the binding contract;
5. failure is fail-closed with no review item, dossier runtime draft, notification or public side effect.

### C3B security remains binding

`POST /api/create/handoffs` is a Create mutation and must not be weaker than C3B/C8 routes.

C9 must add/use a dedicated `create_handoff_persistence` mutation-security scope with:

- Origin/CSRF provenance;
- honeypot;
- supported JSON Content-Type;
- real streamed body-size enforcement;
- persistent actor/IP/session/client rate/risk gates;
- malformed/unknown-field fail-closed handling.

### Server-authoritative prior-stage binding

C9 must bind durable handoff evidence to prior canonical stages rather than reconstructing them from free browser text:

- canonical authenticated draft binding from C4/C8;
- C7 jurisdiction confirmation revalidated server-side where supplied;
- C8 source evidence read from the same canonical draft and copied only as bounded references/status, never raw fetched bodies, secrets or signed URLs;
- existing Create stance/topic/handoff structures may remain review input, but they may not override canonical draft/user ownership or current guard/security state.

### Idempotency and ownership

The current Mongo repo upserts by `_id = handoffId`. C9 must prevent a browser-controlled or cross-user id collision from overwriting another actor's durable review record.

Required behavior:

- logical handoff id is deterministic/retry-safe;
- existing record with same id and same actor/canonical draft may be replayed idempotently;
- existing record with same id but different actor or canonical draft must fail closed;
- durable success is returned only after the canonical review record exists;
- retries must not create duplicate logical review work;
- no false success when persistence fails.

### Review-only boundary

C9 may persist review/handoff state and the existing review-draft runtime projection only.

C9 must not:

- publish;
- auto-approve;
- activate Topic/Graph/Poll/Vote/Anlassraum/Participation public state;
- send C10 notifications as a durability prerequisite;
- create a second queue/review store;
- create a new DB collection;
- persist raw external fetched bodies, credentials, secrets or signed URLs.

## Proposed bounded implementation files

Runtime/owner boundary, maximum 8 files:

1. `apps/web/src/app/api/create/handoffs/route.ts`
2. `apps/web/src/features/create/createRouteSecurity.ts`
3. `apps/web/src/features/create/createHandoffReviewQueueRuntimeBridge.ts`
4. `apps/web/src/features/create/createHandoffPersistenceContract.ts`
5. `apps/web/src/features/create/persistedHandoffReviewQueue.ts`
6. `apps/web/src/features/create/CreateVisualFollowup.tsx` — only canonical `savedDraftId` handoff plumbing
7. `apps/web/src/app/create/CreateClient.tsx` — only pass the already existing `savedDraftId`
8. `.github/workflows/web-ci.yml` — only focused C9 test wiring

Focused tests, maximum 3 files:

9. `apps/web/tests/create-handoff.persistence.route.test.ts`
10. `apps/web/tests/create-handoff-review-queue-runtime-bridge.test.ts`
11. `apps/web/tests/create-route-security.contract.test.ts`

No other runtime file is implied. `serverDrafts.ts` and `createDraftSourceEvidence.ts` are read-side canonical owners and should be reused without modification unless implementation proves an unavoidable narrow read-helper gap; such a gap requires a scope-repair authorization before editing.

## Required tests

The implementation must prove at minimum:

1. unauthenticated handoff rejected before persistence;
2. missing canonical draft id rejected;
3. foreign-user canonical draft rejected;
4. finalized/noncanonical/legacy draft rejected;
5. source-text/draft binding mismatch rejected;
6. malformed/oversized/bad-origin/bad-CSRF request rejected by shared mutation security;
7. same actor + same canonical draft + same logical handoff retry is idempotent;
8. same handoff id with different actor rejected;
9. same handoff id with different canonical draft rejected;
10. persistence failure returns failure and no fake success;
11. C7 jurisdiction is server-revalidated;
12. C8 source evidence is represented only by bounded references/status and never raw fetched content;
13. durable record keeps `reviewRequired=true`, `noAutoPublish=true`, `noPublicOfficial=true`, `noAutoFinalization=true`;
14. no C10 notification is required for C9 success;
15. existing dossier runtime projection remains review-only and non-public.

## Size and collision gate

```text
RUNTIME_FILES_MAX=8
TEST_FILES_MAX=3
TOTAL_CHANGED_FILES_MAX=11
NEW_DB_COLLECTIONS=0
NEW_SCHEMA_MIGRATIONS=0
NEW_PACKAGES=0
NEW_PUBLIC_ROUTES=0
NEW_BROWSER_PERSISTENCE=0
AUTO_PUBLISH=false
AUTO_APPROVE=false
C10_SIDE_EFFECTS=0
```

If implementation requires a second handoff queue, new collection, publication, notification dependency, raw source-body persistence or replacement of C4/C7/C8 canonical truth, stop with `FAIL_SCOPE_EXPANSION`.

## Preflight decision

```text
AUTH_DEPENDENCY=PASS
C4_CANONICAL_DRAFT_OWNER=PASS
C7_REVALIDATION_OWNER=PASS
C8_SOURCE_EVIDENCE_OWNER=PASS
G1_DEPENDENCY=PASS
ZERO_PARALLEL_TRUTH=PASS
COLLISION_GATE=PASS_WITH_BOUNDED_UI_PLUMBING
SIZE_GATE=PASS
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
NEXT_ALLOWED_STEP=SEPARATE_C9_IMPLEMENTATION_AUTHORIZATION
```
