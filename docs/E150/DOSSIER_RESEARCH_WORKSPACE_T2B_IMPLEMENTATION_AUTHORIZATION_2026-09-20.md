# T2B Implementation Authorization — Pure ResearchPlan / WorkItem Contract

Date: 2026-09-20

```text
TASK=DOSSIER-RESEARCH-WORKSPACE-01
SLICE=T2B_RESEARCH_PLAN_CONTRACT
SOURCE_PREFLIGHT_PR=945
SOURCE_PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
BASE_MAIN_SHA=a754d0832a10a4b5910ffdc2382fa08d119ae5c8
T2A_IMPLEMENTATION_PR=944
T2A_DEPENDENCY=PASS
IMPLEMENTATION_AUTHORIZED=true
TOTAL_CHANGED_FILES_MAX=3
DB_READS_AUTHORIZED=0
DB_WRITES_AUTHORIZED=0
NEW_DB_COLLECTIONS_AUTHORIZED=false
SCHEMA_MIGRATION_AUTHORIZED=false
API_ROUTE_AUTHORIZED=false
PROVIDER_AUTHORIZED=false
NETWORK_FETCH_AUTHORIZED=false
QUEUE_AUTHORIZED=false
RUN_CHECKPOINT_AUTHORIZED=false
UI_AUTHORIZED=false
BROWSER_PERSISTENCE_AUTHORIZED=false
PACKAGE_AUTHORIZED=false
DOSSIER_WRITE_AUTHORIZED=false
EVIDENCE_PROMOTION_AUTHORIZED=false
PUBLISH_AUTHORIZED=false
DECISION_ACTIVATION_AUTHORIZED=false
POLITICAL_RANKING_AUTHORIZED=false
```

## Authorized boundary

This authorization consumes merged T2B preflight PR #945. It authorizes only a
pure deterministic ResearchPlan/WorkItem domain contract that references the
canonical T2A Dossier binding, canonical ResearchTask IDs and existing
Source/Evidence vocabulary by reference.

The implementation may change at most these three paths:

1. `core/research/researchPlanContract.ts`
   - pure types, constants and deterministic validator only;
   - imports `ResearchTaskDossierBinding` from the existing research owner;
   - may import canonical Source/Evidence type vocabulary for type-level
     references only;
   - no DB, filesystem, network, provider, clock or random side effects.
2. `apps/web/tests/research-plan-contract.test.ts`
   - deterministic positive/negative contract fixtures.
3. `.github/workflows/web-ci.yml`
   - only the minimal focused T2B contract invocation.

No fourth path is authorized.

## Canonical ownership

`core/research` remains the canonical ResearchTask owner. The plan contract is a
subordinate planning structure and must not create a second ResearchTask, Dossier
or Evidence source of truth.

Every canonical T2B plan must reference:

- one valid `ResearchTaskDossierBinding` snapshot;
- one or more unique non-empty canonical ResearchTask IDs;
- WorkItems whose `researchTaskId` belongs to that exact plan task set.

No independent plan Dossier ID, Dossier revision counter or synthetic revision
hash is authorized.

## Authorized plan semantics

The contract may expose a plan shape equivalent in intent to:

```text
planId
binding: ResearchTaskDossierBinding
researchTaskIds[]
workItems[]
completenessCriteria[]
planReviewState
```

Allowed plan review states are limited to planning/execution review semantics,
for example:

```text
draft
needs_human_review
reviewed_for_execution
```

These states never mean research completed, evidence verified, Dossier ready,
publication ready or decision ready.

A WorkItem may include bounded reviewable fields for:

- question and rationale;
- inclusion criteria and exclusion rationales;
- source requirements and visible source gaps;
- canonical artifact/source-family references;
- contradiction requirements;
- consensus/dissent requirements;
- source challenge requirements;
- intra-actor conflict requirements;
- freshness requirements;
- human-review state.

## Source/Evidence boundary

Existing canonical vocabulary in
`features/analyze/atomicClaimSourceRelationContract.ts` remains authoritative for
SourceArtifact, SourceSegment, SourceFamily, ClaimSourceRelation,
EvidenceAssessment, independence, counterevidence, freshness and review
semantics.

T2B may describe what a WorkItem requires, but it may not assert that the
requirement has been satisfied. In particular:

- an artifact ID does not prove retrieval;
- two URLs do not prove independent source families;
- a source-family ID does not prove independence;
- a timestamp does not prove freshness;
- repeated claims do not prove consensus;
- majority/counting does not resolve contradiction;
- provider/model confidence is not human review or evidence verification.

Unknown/unresolved remains explicit and fail-closed.

## Deterministic validation requirements

The validator must be side-effect free and reject at least:

1. missing/malformed Dossier binding;
2. non-positive revision sequence or non-64-hex revision hash;
3. missing/blank/duplicate ResearchTask IDs;
4. WorkItem referencing a task outside the plan;
5. blank WorkItem ID, question or rationale;
6. blank/duplicate artifact/source-family references;
7. malformed source role or source requirement;
8. malformed independence/lineage/counterevidence/freshness requirement;
9. empty truthy placeholders presented as inclusion/exclusion/source-gap rationale;
10. shapes that encode factual/evidence/publication/decision readiness;
11. implicit jurisdiction, locale, source-family or evidence-quality defaults;
12. numeric research-quality, political desirability or recommendation ranking.

Validation must return the same result for identical input and must not mutate
its input.

## Completeness semantics

T2B may define only completeness **criteria**. It does not evaluate execution
progress.

A criterion may reference required WorkItems and whether human review is
required. It cannot become fulfilled from task status, contribution presence,
artifact presence, source presence, model output or confidence.

The following separations are invariant:

```text
PLAN_STRUCTURE_VALID != RESEARCH_COMPLETE
RESEARCH_COMPLETE != EVIDENCE_VERIFIED
EVIDENCE_VERIFIED != DOSSIER_READY
DOSSIER_READY != DECISION_READY
```

Execution progress, run/checkpoint state, retries, recovery and budget/cost are
T2C responsibilities and are not authorized here.

## Unknown and low-data semantics

The implementation must not default or infer:

- Germany, German or any other locale;
- municipal/state/federal/EU/global jurisdiction;
- primary/secondary source role from URL/provider alone;
- source independence from distinct URLs;
- consensus from repetition;
- freshness from timestamp presence alone;
- contradiction resolution from counts;
- actor consistency from one source.

A low-data plan with explicit gaps and human-review needs is valid planning
state; it is not a failed state and not a completed research state.

## Required focused tests

The implementation must prove at least:

1. valid dossier-bound multi-WorkItem plan;
2. canonical plan requires explicit Dossier binding;
3. malformed revision sequence/hash fails closed;
4. empty/duplicate task IDs fail closed;
5. WorkItem with foreign task ID fails closed;
6. blank ID/question/rationale fails closed;
7. source gap stays open despite artifact reference presence;
8. primary/secondary requirements remain distinct;
9. independent requirement is not satisfied by same-family/declarative refs;
10. contradiction/counterevidence remain requirements rather than resolutions;
11. consensus/dissent is not auto-resolved by counts;
12. freshness has no implicit current/fresh default;
13. challenge/intra-actor conflict can remain unresolved;
14. unknown jurisdiction/locale remains unknown with no German/municipal default;
15. review state cannot encode evidence/publication/decision readiness;
16. no numeric quality/desirability/political ranking field or result;
17. identical input produces identical validation result;
18. input object is not mutated;
19. validator performs no persistence/provider/network operation.

## Explicit non-scope

This authorization does not permit:

- persistence or revision history for plans/WorkItems;
- new database collection or migration;
- runs/checkpoints/retry/recovery;
- budget/cost accounting;
- provider/model/search/source fetch execution;
- evidence verification or claim/source promotion;
- autonomous source-role/independence classification;
- Dossier mutation/revision append;
- API routes or UI/readmodel projection;
- contribution acceptance automation;
- graph merge;
- publication, voting or decision activation;
- political preference inference, recommendation or ranking.

## Stop conditions

Return to preflight with `FAIL_SCOPE_EXPANSION` if implementation requires:

- a fourth changed path;
- modification of `core/research/store.ts`;
- any DB read/write, collection or migration;
- Dossier DB/schema mutation;
- API/UI changes;
- network/provider execution;
- run/checkpoint state;
- package/browser persistence changes;
- evidence/truth promotion;
- publication, voting or decision action.

## Merge gate

The implementation PR may merge only when:

- based/refreshed on then-current `main`;
- diff remains exactly within the three authorized paths;
- focused T2B contract is wired into Web CI and green;
- full exact-head Web CI including lint/typecheck/build is green;
- zero unresolved review threads remain;
- no persistence/provider/evidence-promotion/publish/decision scope is present.

```text
AUTHORIZATION_RESULT=IMPLEMENTATION_AUTHORIZED
NEXT_ALLOWED_STEP=FRESH_MAIN_T2B_RESEARCH_PLAN_CONTRACT_IMPLEMENTATION
T2C_IMPLEMENTATION_AUTHORIZED=false
T2D_IMPLEMENTATION_AUTHORIZED=false
```
