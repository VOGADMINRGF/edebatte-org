# T1 Implementation Authorization — Topic Qualification / System Question

Date: 2026-09-20

```text
TASK=TOPIC-QUALIFICATION-SYSTEM-QUESTION-01
ROLE=T1
AUTHORIZATION_KIND=BOUNDED_IMPLEMENTATION
SOURCE_REVALIDATION_PR=903
SOURCE_REVALIDATION_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
BASE_MAIN_SHA=85bb257fe3fc6a92402d740d3f5cd98f21d06ae0
IMPLEMENTATION_AUTHORIZED=true
RUNTIME_AUTHORIZED=false
PROVIDER_AUTHORIZED=false
PERSISTENCE_AUTHORIZED=false
SCHEMA_MIGRATION_AUTHORIZED=false
API_ROUTE_AUTHORIZED=false
QUEUE_AUTHORIZED=false
PUBLISH_AUTHORIZED=false
DECISION_ACTIVATION_AUTHORIZED=false
AUTO_TRUTH_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Authorized boundary

This authorization consumes merged T1 revalidation PR #903 and authorizes only the pure deterministic qualification/review contract and its focused tests.

The later implementation may change at most these four paths:

1. `features/topic/topicQualificationSystemQuestionContract.ts` — new pure deterministic contract.
2. `apps/web/tests/topic-qualification-system-question.contract.test.ts` — focused fixtures and invariants.
3. `apps/web/tests/topic-qualification-system-question.edge.test.ts` — fail-closed/property-style edge cases.
4. `.github/workflows/web-ci.yml` — only if minimal explicit wiring is required to execute those tests, and only the corresponding test-command lines.

No other file is authorized.

```text
CORE_CONTRACT_FILES_MAX=1
FOCUSED_TEST_FILES_MAX=2
CI_FILES_MAX=1
TOTAL_CHANGED_FILES_MAX=4
NEW_DB_COLLECTIONS=0
NEW_SCHEMA_MIGRATIONS=0
NEW_API_ROUTES=0
NEW_PROVIDER_CALLS=0
NEW_QUEUES=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
```

## Canonical ownership

The implementation must import/reference canonical topic-domain types from `@features/topic/canonicalTopicResolutionContract`.

It must not create a second `CanonicalTopic`, `DecisionQuestion` or `JurisdictionContext` owner and must not persist, rename, merge, publish or activate those entities. The T1 output remains a deterministic value referencing canonical IDs. T1 does not perform T2/T3 research and does not claim empirical truth.

## Required contract surface

The pure contract must represent at least:

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

Allowed classifications are exactly:

```text
transient_event
factual_clarification
policy_question
structural_system_question
long_term_societal_choice
```

Review states are exactly:

```text
clear
review_required
blocked_material_scope_error
```

## Fail-closed requirements

The implementation must not return `clear` when any material gate from PR #903 remains unresolved, including missing canonical topic/jurisdiction, unknown classification, missing goal or neutral system question, measure-as-goal substitution, contradictory jurisdiction, unresolved duplicate/cross-language risk, signal-to-evidence promotion, factual/preference category error, normative choice framed as fact-settled, Public Question Guard review/block, unresolved symptom/cause confusion, false binary, omitted material affected groups, hidden material no-change research need, or missing revision/review binding.

No score, confidence or provider result may override these gates.

The system-question boundary must preserve goal-before-measures, explicit scope/horizon, symptom/cause separation, controllable levers as investigation space rather than recommendations, explicit exclusions, materially affected groups, signal/evidence separation, no-change/status-quo research need where material, fact/value-conflict separation, false-binary detection and missing-question/scope review.

## Required deterministic fixtures

The focused tests must include at least:

1. transient event without silent system-question expansion;
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

The Education and Pension fixtures are scope-architecture acceptance fixtures only; they must not encode political recommendations, rankings or empirical policy conclusions.

## Stop conditions

Implementation must stop with `FAIL_SCOPE_EXPANSION` and return to preflight if it requires persistence, database/schema change, API route, queue, provider execution, browser state, package, second canonical Topic owner, publication, feed activation, Poll/TopicRound activation, decision action or any file outside the four-path boundary above.

## Merge gate

A later implementation PR may merge only when rebuilt/refreshed from then-current `main`, within this boundary, with zero unresolved review threads, exact-head Web CI including focused T1 tests green, and no auto-publish or decision action.

```text
AUTHORIZATION_RESULT=IMPLEMENTATION_AUTHORIZED
NEXT_ALLOWED_STEP=FRESH_MAIN_T1_PURE_CONTRACT_IMPLEMENTATION
```
