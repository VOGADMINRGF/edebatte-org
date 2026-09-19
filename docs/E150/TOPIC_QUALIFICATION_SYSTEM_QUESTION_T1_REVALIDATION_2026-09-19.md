# T1 Revalidation — Topic Qualification / System Question after Owner Convergence

Date: 2026-09-19

```text
TASK=TOPIC-QUALIFICATION-SYSTEM-QUESTION-01
ROLE=T1
MODE=FRESH_REVALIDATION
BASE_MAIN_SHA=bbecc048491a85ac71a4c6ad2244043385b8d2b1
SOURCE_PREFLIGHT_PR=864
OWNER_CONVERGENCE_PR=897
OWNER_CONVERGENCE_MERGE=bbecc048491a85ac71a4c6ad2244043385b8d2b1
T0_STATUS=done
PREVIOUS_BLOCKER=CANONICAL_TOPIC_DECISIONQUESTION_OWNER_LOCATION_MUST_BE_SETTLED_BY_MASTER_HARDENING
PREVIOUS_BLOCKER_STATUS=RESOLVED
T1_PREFLIGHT=PASS
T1_IMPLEMENTATION_AUTHORIZED=false
T1_RUNTIME_AUTHORIZED=false
T1_PROVIDER_AUTHORIZED=false
T1_SCHEMA_MIGRATION_AUTHORIZED=false
T1_PUBLISH_AUTHORIZED=false
T1_DECISION_ACTIVATION_AUTHORIZED=false
T1_AUTO_TRUTH_AUTHORIZED=false
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
```

## Revalidation result

PR #897 moved the existing canonical `CanonicalTopic`, `DecisionQuestion` and `JurisdictionContext` contract to the app-independent domain owner:

`features/topic/canonicalTopicResolutionContract.ts`

The former Create-local module is now only a compatibility re-export. Therefore the dependency-direction blocker recorded by T1 preflight #864 is resolved without creating a second Topic, DecisionQuestion or Jurisdiction truth.

No new blocker was found for the originally preferred pure-contract T1 slice.

## Canonical owner boundary

T1 must import and reference the canonical domain types from:

`@features/topic/canonicalTopicResolutionContract`

T1 may create only a qualification/review contract. It may not create, rename, merge, publish or persist a `CanonicalTopic` or `DecisionQuestion`, and it may not activate a `Poll` or `TopicRound`.

The T1 result references canonical IDs and remains a pure deterministic value until a later separately authorized persistence/runtime stage exists.

## Required T1 contract

The bounded implementation must represent at least:

```text
qualificationId
canonicalTopicId
canonicalDecisionQuestionId?
jurisdictionId
classification
rationale
neutralSystemQuestion
primaryGoal
scope
horizon
controllableLevers[]
explicitExclusions[]
affectedGroups[]
signalRefs[]
missingQuestionScopeReview
reviewState
revision
```

Allowed classifications remain exactly:

```text
transient_event
factual_clarification
policy_question
structural_system_question
long_term_societal_choice
```

Review states remain exactly:

```text
clear
review_required
blocked_material_scope_error
```

## Hard fail-closed conditions

The pure contract must never return a releasable/clear qualification when any of these material conditions apply:

- missing canonical topic ID;
- missing jurisdiction ID;
- unknown classification;
- empty primary goal;
- a measure is supplied as the goal without an independently stated goal;
- empty neutral system question;
- contradictory or unresolved jurisdiction state;
- unresolved duplicate-topic risk;
- unresolved cross-language uncertainty;
- a signal is promoted to evidence by T1;
- a factual clarification is turned into a preference ballot;
- a normative choice is represented as if facts alone settle it;
- actor/person targeting remains blocked or review-required under the shared Public Question Guard;
- unresolved symptom/cause confusion;
- unresolved false binary;
- material affected groups are omitted;
- a material no-change/status-quo research need is hidden;
- revision/review binding is missing.

No model confidence, score or provider output may override these gates.

## System-question boundary

T1 prepares the neutral research question and scope only. It does not perform T2/T3 research or claim empirical truth.

The contract must preserve the system-question standard at least through:

- goal before measures;
- explicit current problem scope;
- explicit horizon;
- symptoms separated from candidate causes;
- controllable levers represented as investigation space rather than recommendations;
- explicit exclusions;
- materially affected groups;
- signal/event framing separated from evidence;
- no-change/status-quo perspective recorded as a later research need where material;
- fact conflict separated from value conflict;
- false-binary detection;
- missing-question/scope review.

## Required deterministic fixtures

The implementation tests must cover at minimum:

1. transient event without silent expansion into a system question;
2. factual clarification without preference-ballot conversion;
3. bounded policy question with goal separated from measure;
4. Education / Sachsen-Anhalt structural-system fixture;
5. Pension / long-term societal-choice fixture;
6. ambiguous jurisdiction -> review required;
7. false binary -> review/block;
8. signal-frame domination -> signal remains signal;
9. symptom/cause confusion -> review/block without invented cause;
10. multilingual-equivalent structured input -> same domain decision independent of language-specific regexes;
11. shared Public Question Guard review/block cannot be overridden;
12. duplicate-topic/cross-language uncertainty remain fail-closed.

The Pension and Education fixtures are scope-architecture acceptance fixtures, not political recommendations or empirical rankings.

## Proposed bounded implementation boundary

A later separate implementation authorization may permit exactly:

1. `features/topic/topicQualificationSystemQuestionContract.ts` — new pure deterministic contract only.
2. `apps/web/tests/topic-qualification-system-question.contract.test.ts` — focused fixtures and invariants.
3. `apps/web/tests/topic-qualification-system-question.edge.test.ts` — fail-closed/property-style edge cases.
4. `.github/workflows/web-ci.yml` — only the minimal lines required to execute the two T1 tests in CI, if they are not already covered by an existing test command.

No other file is implied by this revalidation.

```text
CORE_CONTRACT_FILES_MAX=1
FOCUSED_TEST_FILES_MAX=2
CI_FILES_MAX=1
TOTAL_CHANGED_FILES_MAX=4
NEW_DB_COLLECTIONS=0
NEW_SCHEMA_MIGRATIONS=0
NEW_API_ROUTES=0
NEW_PROVIDER_CALLS=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
AUTO_PUBLISH=false
AUTO_DECISION=false
```

If implementation requires persistence, a queue, an API route, provider execution, a second Topic owner, publication or decision activation, it must stop with `FAIL_SCOPE_EXPANSION` and return to preflight.

## Result

```text
OWNER_DEPENDENCY=PASS
ZERO_PARALLEL_CANONICAL_TRUTH=PASS
T1_SCOPE_GATE=PASS
T1_SECURITY_BOUNDARY=PASS
T1_SIZE_GATE=PASS
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
NEXT_ALLOWED_STEP=SEPARATE_T1_IMPLEMENTATION_AUTHORIZATION
```
