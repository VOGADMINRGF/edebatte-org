# G1 Implementation Authorization — Shared Public Question Guard & Evidence

Date: 2026-09-20

```text
TRACK=G
SLICE=G1
TASK=SHARED-PUBLIC-QUESTION-GUARD-EVIDENCE-01
SOURCE_PREFLIGHT=docs/E150/PUBLIC_QUESTION_GUARD_G1_FRESH_PREFLIGHT_2026-09-17.md
SOURCE_PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
BASE_MAIN_SHA=54ae51c31ae4200bd6707e148266b94ab70ef8b1
PREVIOUS_OPEN_TASKS_SINGLE_WRITER_CONFLICT_PR=777
PREVIOUS_SINGLE_WRITER_CONFLICT_STATUS=merged_closed
IMPLEMENTATION_AUTHORIZED=true
TOTAL_CHANGED_FILES_MAX=4
NEW_API_BOUNDARIES_AUTHORIZED=false
NEW_COLLECTIONS_AUTHORIZED=false
NEW_INDEXES_AUTHORIZED=false
NEW_BROWSER_STORAGE_AUTHORIZED=false
NEW_COOKIES_AUTHORIZED=false
NEW_PROVIDER_CALLS_AUTHORIZED=false
NEW_PUBLISH_PATHS_AUTHORIZED=false
PRODUCER_RUNTIME_CHANGES_AUTHORIZED=false
G2_G3_G4_G5_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Authorized boundary

This authorization consumes the positive G1 Fresh Preflight and authorizes only
the shared Public Question Guard/Evidence hardening. The previous OpenTasks
single-writer collision identified by that preflight, PR #777, is merged and
closed. Current-main collision search found no competing open PR claiming the two
G1 core paths as a canonical implementation owner.

The implementation may change at most these four paths:

1. `apps/web/src/features/create/safety/publicQuestionGeneralization.ts`
   - add an explicit actor/entity extraction trust boundary;
   - keep original and candidate safety decisions separately referencable;
   - carry reviewable original/candidate/actor/procedure/evidence context;
   - preserve all existing fail-closed person, accusation/character/sanction,
     fact/truth, moderation/factcheck and no-inference guards.
2. `apps/web/src/features/create/safety/questionGuardReviewPersistence.ts`
   - generic shared reservation → side-effect → durable audit evidence →
     versioned/CAS-compatible release primitive;
   - stale evidence/version mismatch fails closed;
   - no producer-specific store or release authority.
3. `apps/web/tests/public-question-generalization.contract.test.ts`
   - extend focused Guard contracts for extraction trust, original/candidate
     separation and procedure-review non-override semantics.
4. `apps/web/tests/question-guard-review-persistence.contract.test.ts`
   - focused ordering, audit-before-release, failure and stale/CAS contracts.

No fifth path is authorized by this document.

## Canonical safety and extraction semantics

`draft_allowed` may be exposed only when actor/entity extraction is independently
and explicitly supported by an allowlisted trust source. A candidate-producing
provider may not self-attest its own extraction as independently complete.

Allowed trust-source categories are restricted to explicit canonical/human
sources represented by the contract, such as a canonical entity registry,
canonical actor graph or documented human review. Missing, incomplete, unknown,
unverified or self-attested extraction remains `review_required`.

No inferred actor identity, affiliation, ideology, trustworthiness, bias or
political preference is authorized.

## Original and candidate decisions remain distinct

The shared result must keep separately referencable:

- original safety decision;
- candidate safety decision;
- unchanged reviewable original input;
- evaluated candidate;
- actor/procedure context;
- evidence references.

A safer-looking rewritten candidate cannot erase or override a blocked,
moderation-required or factcheck-required original. Higher safety blocks always
win.

## Procedure review boundary

Entity-specific formal procedures may move from `review_required` toward a draft
state only through explicit evidence-bound human review and only when every
higher-priority safety/extraction gate is satisfied.

Procedure review may never override:

- person targeting;
- accusation/character/sanction safety;
- fact/truth-question blocking;
- moderation/factcheck-required origin;
- incomplete/untrusted extraction;
- stale or missing audit evidence.

## Durable audit-before-release ordering

The shared persistence helper must fail closed and preserve this ordering:

1. persist a review-required reservation;
2. complete required shared side effect(s);
3. persist durable review/audit evidence bound to the evaluated record/guard
   version;
4. only then persist a released/draft-allowed state through a second
   versioned/CAS-compatible write.

Reservation, side-effect, audit or release failure must never make
`draft_allowed` externally visible.

The helper remains producer-neutral. It may not introduce a new collection,
route, queue, scheduler or producer-specific release adapter.

## Stale evidence and recovery

Audit evidence must be bound to the exact evaluated question/candidate and guard
version. A changed input, changed candidate or changed guard/version cannot reuse
old evidence as current authorization.

Intermediate failure must remain reconstructably blocked/review-required. G1 may
provide generic recovery-compatible primitives, but it does not authorize an
automatic retry worker or producer-specific recovery runtime.

## Required focused tests

The implementation must prove at least:

1. neutral already-generalized decision question;
2. named company/party target requiring valid generalization;
3. person targeting remains blocked;
4. accusation/character/sanction remains blocked;
5. fact/truth question remains blocked from preference-vote conversion;
6. factual unsafe origin cannot be laundered by a normative safe-looking candidate;
7. moderation/factcheck-required origin stays outside normal draft path;
8. missing extraction is review-required;
9. incomplete/unverified extraction is review-required;
10. candidate-provider self-attestation is not independent extraction evidence;
11. independently complete allowlisted extraction with evidence can satisfy only
    the extraction gate;
12. entity-specific procedure remains review-required without explicit human
    review;
13. evidence-bound human procedure resolution may proceed only when all higher
    safety gates pass;
14. procedure resolution cannot override person/safety/fact blocks;
15. reservation occurs before side effect, audit before release;
16. reservation/side-effect/audit/release failures all fail closed;
17. stale/mismatched record or guard version cannot reuse old evidence;
18. CAS/version conflict cannot silently expose release;
19. `noAutoPublish=true`, `noPositionInference=true` and
    `noBiasOrTrustInference=true` remain invariant.

## Explicit non-scope

This authorization does not permit:

- Participation producer changes (G2);
- Anlassraum producer changes (G3);
- QR/Public Entry changes (G4);
- Material Producer/Review integration (G5);
- Create handoff, canonical-topic or producer release adapters;
- QR set/resolve/vote/protocol/summary/studio changes;
- public voting or publication activation;
- new collection/index/API/queue/provider call;
- browser storage or cookie changes;
- Voxy producer state;
- political preference, desirability or trust ranking;
- resurrection/cherry-pick of historical PR #708 as implementation authority.

## Stop conditions

Return to fresh preflight with `FAIL_SCOPE_EXPANSION` if implementation requires:

- a fifth changed path;
- any producer-specific runtime;
- a new collection/index/API route/queue/provider call;
- public release/publish/vote activation;
- a second Question/Safety/Review source of truth;
- weakening original-input safety through candidate rewriting;
- self-attested extraction as independent evidence.

## Merge gate

The implementation PR may merge only when:

- based/refreshed on then-current `main`;
- diff remains exactly within the four authorized paths;
- exact-head Web CI is green;
- zero unresolved review threads remain;
- failure-ordering/stale/CAS tests are green;
- no G2–G5 producer scope or auto-publish is introduced.

```text
AUTHORIZATION_RESULT=IMPLEMENTATION_AUTHORIZED
NEXT_ALLOWED_STEP=FRESH_MAIN_G1_SHARED_GUARD_EVIDENCE_IMPLEMENTATION
G2_G3_G4_G5_AUTHORIZED=false
AUTO_PUBLISH=false
```
