# C6 — Existing-Topic Match and Explicit Stance — Implementation Authorization

Stand: 2026-09-18

```text
TASK=CREATE-EXISTING-TOPIC-MATCH-EXPLICIT-STANCE-01
ROLE=C6
BASE_MAIN=4bd22d91eff5d1ef0ebb4d5551be8aaeb952428b
PREFLIGHT_PR=878
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=true
AUTHORIZATION_SCOPE=EXACT_FILES_ONLY
NEW_API=false
NEW_PERSISTENCE=false
NEW_COOKIE=false
NEW_BROWSER_STORAGE=false
SILENT_MERGE=false
AUTO_PUBLISH=false
C9_DURABLE_PERSISTENCE_INCLUDED=false
```

## Authorized runtime files

1. `apps/web/src/features/create/createExistingMatchDecision.ts` — new
2. `apps/web/src/features/create/ExistingTopicMatchesPanel.tsx`
3. `apps/web/src/features/create/existingTopicMatchesRuntimeBridge.ts`
4. `apps/web/src/features/create/CreateVisualFollowup.tsx`
5. `apps/web/src/features/create/createHandoffDrafts.ts`
6. `apps/web/src/features/create/createHandoffReviewQueue.ts`

No other runtime file is authorized.

## Authorized focused tests

7. `apps/web/tests/create-existing-counterposition-choice.contract.test.tsx` — new
8. `apps/web/tests/create-existing-topic-matches-runtime-bridge.test.ts`
9. `apps/web/tests/create-handoff-drafts.test.ts`
10. `apps/web/tests/create-handoff-review-queue.test.ts`

## Mandatory extraction rules

- Reuse the existing match/runtime architecture on current main.
- Extract only C6 hunks from historical PR #682 / commits `28e08cd6`, `a12978a5`, `843a68a6`, `e0449a3b`, `9a183863`.
- Do not copy unrelated UI restructuring from historical `CreateVisualFollowup.tsx`.
- Do not modify `CreateClient.tsx`; the current architecture owns match interaction in `CreateVisualFollowup.tsx`.
- Do not modify `createContributionPackageContract.ts`; the required ExistingMatchUserDecision union already exists.
- Do not modify `createHandoff.ts`, `createHandoffReviewQueueRuntimeBridge.ts`, `/api/create/handoffs`, save routes or persistence repositories. Those are C9.
- Relation inference (`related` / `opposing`) is descriptive only and MUST NOT create a citizen stance.
- Citizen stance exists only after one of the four explicit UI choices.
- Missing or invalid decision remains null/unknown.
- Repeated selection updates the same per-match local decision, never a duplicate position.
- Preparatory draft/review objects remain `autoCreate=false`, `autoPublish=false`.

## Required behavior

Exactly four citizen decisions:

- `count_my_position`
- `count_as_opposition`
- `add_as_nuance`
- `keep_separate`

Decision target mapping:

- support/opposition -> `opinion_count`
- nuance -> `existing_branch_connection`
- separate -> `new_branch`

The preparatory draft may contain the server-owned selected match reference and canonical author standpoint derived from the explicit decision.

No decision means:

- `existingMatchDecision = null`
- `authorStandpoint = null`
- no implicit support/opposition derived from relation, planner stance or recommendation.

## Merge gate

The runtime PR may merge only after exact-head success for:

- diff check;
- repository integrity guards;
- Web Critical Guardrails;
- Production Guardrails;
- focused Create runtime contracts;
- Create save domain contracts;
- focused C6 tests;
- lint;
- typecheck;
- build.

C6 must not be marked done until a post-merge closure records runtime head, merge SHA and exact-head CI success.

C7–C12 remain implementation-unauthorized.
