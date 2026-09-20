# C6 — Existing-Topic Match and Explicit Stance — Fresh Preflight

Stand: 2026-09-18

```text
TASK=CREATE-EXISTING-TOPIC-MATCH-EXPLICIT-STANCE-01
ROLE=C6
BASE_MAIN=6877e79c93e228eea9dc407e62944ce0dabd81f0
C5_DEPENDENCY=done
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
NEW_API=false
NEW_PERSISTENCE=false
NEW_COOKIE=false
NEW_BROWSER_STORAGE=false
SILENT_MERGE_ALLOWED=false
AUTO_PUBLISH=false
C7_INCLUDED=false
C8_INCLUDED=false
C9_DURABLE_PERSISTENCE_INCLUDED=false
```

## 1. Mission

C6 adds a review-first, explicit citizen decision for an existing-topic match.

The match runtime may classify a result as related or a possible counterposition, but it MUST NOT infer the citizen's own stance. A citizen stance exists only after an explicit user choice.

Allowed citizen choices are exactly:

- `count_my_position` — support / count with the existing position;
- `count_as_opposition` — oppose / counterposition;
- `add_as_nuance` — add nuance;
- `keep_separate` — continue as a separate/new position.

No choice means `null` / unknown. Re-render, match relation, planner stance or a suggested action MUST NOT manufacture a citizen stance.

## 2. Fresh-main audit

C5 is merged and closed on current main.

Current main already contains:

- `existingTopicMatches.ts` — existing match/read-model foundation;
- `existingTopicMatchesRuntimeBridge.ts` — runtime resolution from existing server-owned topic/context references;
- `ExistingTopicMatchesPanel.tsx` — current match presentation;
- `CreateVisualFollowup.tsx` — current integration point for match interaction and handoff preparation;
- `createHandoffDrafts.ts` — review-first preparatory handoff draft;
- `createHandoffReviewQueue.ts` — in-memory/review preparation object;
- `createHandoffReviewQueueRuntimeBridge.ts` and `createHandoff.ts` — later runtime/persistable handoff boundary.

The existing main does NOT yet contain the explicit C6 decision state in the panel, preparatory draft or review item.

The current architecture therefore permits a smaller extraction than the historical #682 file list: direct `CreateClient.tsx` changes are not required because match interaction now lives in `CreateVisualFollowup.tsx`.

## 3. Historical evidence

Primary source remains PR #682 with C6-relevant source commits:

- `28e08cd6`;
- `a12978a5`;
- `843a68a6`;
- `e0449a3b`;
- `9a183863`.

Whole-commit cherry-pick is prohibited.

Historical evidence proves:

- explicit four-choice UI;
- `normalizeCreateExistingMatchDecision`;
- canonical author-standpoint wording;
- possible opposing relation detection;
- decision-to-preparatory-target mapping;
- explicit decision carried into the preparatory handoff draft/review item;
- no selection remains null;
- no auto-create, auto-publish or silent merge.

Historical #682 also carries the decision into `/api/create/handoffs` and durable persistence. That portion is explicitly C9 in the current master plan and MUST NOT be copied in C6.

## 4. Authorized implementation candidate boundary

A later implementation authorization may permit changes only in these runtime files:

1. `apps/web/src/features/create/createExistingMatchDecision.ts` — new
   - normalize the allowlisted decision;
   - derive a human-readable author standpoint;
   - null for absent/invalid choice.

2. `apps/web/src/features/create/ExistingTopicMatchesPanel.tsx`
   - expose exactly four explicit choices;
   - possible counterposition is descriptive only;
   - selection stays draft-only;
   - no silent merge/count/publish side effect.

3. `apps/web/src/features/create/existingTopicMatchesRuntimeBridge.ts`
   - relation inference may mark `related` versus `opposing`;
   - relation inference MUST NOT populate citizen decision/stance.

4. `apps/web/src/features/create/CreateVisualFollowup.tsx`
   - own current UI decision state by match ID;
   - map explicit decision to preparatory target;
   - pass explicit decision into the existing preparatory handoff draft;
   - repeated choice replaces the same local match decision rather than creating a duplicate position.

5. `apps/web/src/features/create/createHandoffDrafts.ts`
   - optional `existingMatchDecision`;
   - canonical `authorStandpoint` only from explicit allowlisted decision;
   - existing server-owned match ID/title remain the reference;
   - absent decision remains null.

6. `apps/web/src/features/create/createHandoffReviewQueue.ts`
   - carry the explicit decision and related match ID in the preparatory review object;
   - retain `autoCreate=false`, `autoPublish=false`.

No other runtime file is authorized by this preflight.

In particular, C6 MUST NOT modify:

- `apps/web/src/features/create/createHandoff.ts`;
- `apps/web/src/features/create/createHandoffReviewQueueRuntimeBridge.ts`;
- `apps/web/src/app/api/create/handoffs/route.ts`;
- persisted handoff/review repositories;
- save routes or DB schemas.

Those durable/runtime mapping responsibilities remain C9.

## 5. Focused test boundary

A later implementation authorization may add/extend only:

1. `apps/web/tests/create-existing-counterposition-choice.contract.test.tsx` — new;
2. `apps/web/tests/create-existing-topic-matches-runtime-bridge.test.ts`;
3. `apps/web/tests/create-handoff-drafts.test.ts`;
4. `apps/web/tests/create-handoff-review-queue.test.ts`.

No persistence-route test belongs to C6.

## 6. Mandatory acceptance

Must prove all of the following:

- support choice produces `count_my_position`;
- opposition choice produces `count_as_opposition`;
- nuance choice produces `add_as_nuance`;
- separate/new choice produces `keep_separate`;
- no user selection produces null/unknown;
- an inferred `opposing` relation does not become a citizen stance;
- invalid/unrecognized decision normalizes to null;
- decision references the selected existing match ID/title, not client-invented replacement identity;
- changing the choice updates the same match decision state rather than duplicating a position;
- preparatory draft keeps `autoCreate=false` and `autoPublish=false`;
- preparatory review item keeps review-first semantics;
- no C7 jurisdiction logic;
- no C8 source analysis;
- no durable C9 API/DB persistence;
- no silent merge.

Human acceptance must confirm that the four choices and the "possible counterposition" wording are understandable without implying that eDebatte has chosen a political stance for the user.

## 7. Size gate

Expected maximum:

- runtime files: 6;
- focused tests: 4;
- new API boundaries: 0;
- new persistence boundaries: 0;
- new browser carriers: 0;
- external providers: 0.

This remains inside the Create slice gate.

## 8. Merge gate for later runtime

Any future C6 runtime PR must pass on exact head:

- `git diff --check`;
- repository integrity guards;
- Web Critical Guardrails;
- Production Guardrails;
- focused Create runtime contracts;
- Create save domain contracts;
- focused C6 match/decision/handoff tests;
- lint;
- typecheck;
- build.

C6 is not done until a post-merge closure records exact runtime head, merge SHA and exact-head CI success.

## 9. Result

```text
C5_MERGED=true
CURRENT_MAIN_AUDITED=true
EXISTING_MATCH_RUNTIME_REUSED=true
EXPLICIT_STANCE_ONLY=true
NO_SELECTION_IS_NULL=true
RELATION_IS_NOT_USER_STANCE=true
PREPARATORY_HANDOFF_ONLY=true
C9_PERSISTENCE_EXCLUDED=true
IMPLEMENTATION_AUTHORIZED=false
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
```

## 10. Next legal action

After this preflight merges with exact-head CI success, exactly one governance-only C6 implementation-authorization PR may be opened.

C6 runtime implementation remains unauthorized until that separate authorization merges.

C7–C12 remain implementation-unauthorized.
