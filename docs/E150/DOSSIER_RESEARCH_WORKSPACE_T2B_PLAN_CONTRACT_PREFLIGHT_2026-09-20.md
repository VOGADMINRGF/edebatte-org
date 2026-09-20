# T2B Fresh-Main Preflight — Pure ResearchPlan / WorkItem Contract

Date: 2026-09-20

Parent task: `DOSSIER-RESEARCH-WORKSPACE-01`

Slice: `T2B_RESEARCH_PLAN_CONTRACT`

Fresh-main basis: `main@54ae51c31ae4200bd6707e148266b94ab70ef8b1`

```text
TASK_PREFLIGHT=PASS
PARENT_PREFLIGHT_PR=928
T2A_AUTHORIZATION_PR=932
T2A_IMPLEMENTATION_PR=944
T2A_DEPENDENCY=PASS
CANONICAL_OWNER_DISCOVERY=PASS
RESEARCH_PLAN_RUNTIME_FOUND=false
EVIDENCE_VOCABULARY_REUSE=PASS
COLLISION_PREFLIGHT=PASS_WITH_SEMANTIC_BOUNDARIES
PERSISTENCE_REQUIRED=false
PROVIDER_EXECUTION_REQUIRED=false
SIZE_GATE=PASS
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
NEXT_SAFE_WORK=T2B_SEPARATE_IMPLEMENTATION_AUTHORIZATION_ONLY
```

## 1. Decision

T2A is integrated on the fresh-main basis and closes the canonical owner gap: an
existing `ResearchTask` can now carry an immutable snapshot binding to the
canonical Dossier head without a second task or dossier store.

T2B can therefore be implemented as a pure deterministic domain contract only.
No existing canonical `ResearchPlan` runtime/store was found on current main.
The smallest safe next slice is a new `core/research` contract that references:

- the canonical Dossier snapshot already bound on `ResearchTask`;
- canonical `ResearchTask` IDs;
- existing Source/Evidence vocabulary by reference only.

T2B must not persist, fetch, execute providers, create checkpoints, verify
evidence, infer research success, publish, activate a decision or compute a
political recommendation/ranking.

This document is preflight evidence only. A separate bounded implementation
authorization is required before code is written.

## 2. Binding upstream contracts

### T2A owner binding is integrated

`core/research/types.ts` now contains `ResearchTaskDossierBinding`:

```text
dossierId
dossierRevisionSeq
dossierRevisionHash
```

and `ResearchTask.dossierBinding?` remains additive for legacy unbound tasks.
The binding owner is `core/research`; canonical Dossier identity/revision remains
owned by `features/dossier`.

T2B must reference this exact snapshot. It may not invent an independent
`planDossierId`, revision counter, synthetic hash or auto-rebind semantics.

### T0 ownership remains binding

The accepted architecture owner is:

```text
ResearchObject
canonicalOwner = Dossier + ResearchTask
canonicalReference = dossier ID
allowedReferences = Dossier, ResearchTask, ResearchArtifact
forbiddenOwnershipDuplication = second research store
laterTaskOwner = T2
```

T2B therefore defines plan structure around existing owners; it does not become
an autonomous truth owner.

## 3. Fresh repository findings

### No canonical ResearchPlan runtime/store exists

Fresh-main search found the T2 governance documents but no product/runtime
`ResearchPlan` or T2 `WorkItem` owner. The only unrelated `WorkItems` naming found
belongs to account/create presentation logic and is not a research-domain owner.

This absence permits a new pure contract module, but it does not authorize a new
collection, run ledger or execution runtime. Those belong to T2C and require a
separate persistence decision.

### Canonical evidence/source vocabulary already exists

`features/analyze/atomicClaimSourceRelationContract.ts` already owns:

- `SourceArtifact` / `SourceArtifactType`;
- `SourceSegment`;
- `SourceFamily` and source lineage;
- `ClaimSourceRelation` and relation types including contradiction/counterexample;
- source-independence states;
- `EvidenceAssessment` including counterevidence, freshness and human review;
- publication/evidence verification semantics.

T2B may express requirements against this vocabulary and may carry canonical
artifact/source-family IDs as references. It must not duplicate these schemas or
promote a candidate/reference/requirement to verified evidence.

### T-track quality addendum is binding

T2 ResearchPlan/WorkItems must be capable of representing research requirements
for:

- coverage gaps;
- source challenges;
- intra-actor conflict;
- missing-question/scope review inputs;
- contradiction and consensus/dissent;
- no hidden false binary or omitted material perspective.

These are planning/review requirements only. T2B does not resolve them.

## 4. Proposed pure contract boundary

A future T2B implementation may define a deterministic contract equivalent in
intent to the following concepts.

### ResearchPlan

A plan must reference exactly one canonical Dossier binding and one or more
canonical ResearchTask IDs:

```text
planId
binding: ResearchTaskDossierBinding
researchTaskIds[]
workItems[]
completenessCriteria[]
planReviewState
```

`planReviewState` may describe only plan quality/readiness for human-approved
execution, for example:

```text
draft | needs_human_review | reviewed_for_execution
```

It must never mean factual truth, Dossier completeness, publication readiness or
decision readiness.

### WorkItem

Each WorkItem must be bounded and reviewable and may include:

```text
workItemId
researchTaskId
question
rationale
inclusionCriteria[]
exclusionRationales[]
sourceRequirements[]
sourceGaps[]
artifactReferences[]
contradictionRequirements[]
consensusDissentRequirements[]
challengeRequirements[]
actorConflictRequirements[]
freshnessRequirements[]
humanReviewState
```

A WorkItem must reference one of the plan's canonical ResearchTask IDs. Empty or
foreign task references fail closed.

### Source requirements are requirements, not evidence

A source requirement may express only what research still needs, e.g.:

```text
role = primary | secondary
requiredArtifactTypes[]
requiredSourceFamilyCount
independenceRequirement = independent | multiple_families | review_required
lineageRequirement = original_preferred | provenance_required | review_required
counterevidenceRequirement = required | review_required
freshnessRequirement = current_required | explicit_cutoff | review_required
```

Canonical `SourceArtifact` IDs may appear only as explicit references supplied to
the plan. Presence of an artifact ID does not satisfy a requirement by itself
and cannot imply retrieval, verification, independence, freshness or support.

## 5. Deterministic invariants

The pure contract/validator must fail closed when any of the following holds:

1. Dossier binding is missing or malformed;
2. no canonical ResearchTask IDs are present;
3. ResearchTask IDs are duplicated or blank;
4. a WorkItem references a task outside the plan;
5. WorkItem/question/rationale is blank;
6. inclusion/exclusion/source-gap rationale is represented as an empty truthy placeholder;
7. source role is outside the explicit primary/secondary vocabulary;
8. independence, lineage, counterevidence or freshness requirement is malformed;
9. artifact/source-family reference arrays contain blank or duplicate IDs;
10. contradiction/consensus-dissent requirements are silently auto-resolved;
11. human review is represented as provider/model confidence;
12. a plan declares factual/evidence/publication/decision readiness;
13. implicit jurisdiction, locale, source family or evidence quality is fabricated;
14. a numeric quality score or political desirability/ranking is introduced.

Validation must be deterministic and side-effect free.

## 6. Completeness semantics

T2B may define **criteria**, not execution completeness.

A completeness criterion may contain only identifiers, descriptions, required
WorkItem references and whether human review is mandatory. T2B must not mark the
criterion fulfilled from task status, contribution presence, SourceArtifact
presence, model output or provider confidence.

Evaluation of progress/runs/checkpoints belongs to T2C.

Therefore:

```text
PLAN_STRUCTURE_VALID != RESEARCH_COMPLETE
RESEARCH_COMPLETE != EVIDENCE_VERIFIED
EVIDENCE_VERIFIED != DOSSIER_READY
DOSSIER_READY != DECISION_READY
```

## 7. Explicit unknown semantics

Unknown or unresolved values remain explicit. T2B must not infer:

- Germany or German language;
- municipal/state/federal jurisdiction;
- primary/secondary status from URL/provider type alone;
- source independence from different URLs alone;
- consensus from repeated claims;
- freshness from a present timestamp without the required cutoff/context;
- contradiction resolution from majority/counting;
- actor position consistency from one source.

Low-data plans must remain valid with visible source gaps and human-review needs.

## 8. Collision preflight

### PR #912 — research finding → review-first Dossier candidate

#912 is a pre-Dossier/topic-handoff path and remains semantically distinct from a
ResearchPlan already bound to a canonical Dossier/ResearchTask. T2B must not use
#912 as its store or absorb its cron/handoff behavior.

### PR #935 and #938/#940/#941/#943 — Source/Swipe readiness stacks

These branches define Source vote-readiness and Swipe question/finalizer quality.
They are not T2 ResearchPlan owners. T2B may not depend on their release states,
ranking hints or public-vote finalization. Any source/evidence references must
remain canonical Evidence/Source references, not Swipe release truth.

### PR #872/#846/#844/#843/#839 — public Dossier cockpit variants

These are public projection/UI surfaces. T2B has no UI/readmodel scope. T2D is
the later owner for projecting canonical research state.

### PR #841 — historical T0→T8 integration draft

This remains non-authoritative relative to serial current-main implementation.
T2B must be implemented from fresh main, not copied wholesale from #841.

No open PR is accepted as a competing canonical `core/research` ResearchPlan
owner by this preflight.

## 9. Proposed exact implementation boundary

A later T2B implementation can be bounded to at most three paths:

1. `core/research/researchPlanContract.ts`
   - pure types/constants/validator only;
   - imports `ResearchTaskDossierBinding` from the existing research owner;
   - may import canonical Source/Evidence type vocabulary for type-level reference;
   - no DB, network, provider, clock or random side effects.
2. `apps/web/tests/research-plan-contract.test.ts`
   - focused deterministic positive/negative contract fixtures.
3. `.github/workflows/web-ci.yml`
   - only the minimal focused T2B contract invocation.

No modification to `core/research/store.ts`, Dossier persistence, API routes,
packages, browser state or provider configuration is required.

```text
TOTAL_CHANGED_FILES_MAX=3
NEW_DOMAIN_CONTRACT_FILES_MAX=1
FOCUSED_TEST_FILES_MAX=1
CI_FILES_MAX=1
DB_READS=0
DB_WRITES=0
NEW_DB_COLLECTIONS=0
NEW_SCHEMA_MIGRATIONS=0
NEW_API_ROUTES=0
NEW_PROVIDER_CALLS=0
NEW_QUEUES=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
NEW_UI_SURFACES=0
```

## 10. Required focused tests

A later implementation authorization should require at least:

1. one valid dossier-bound multi-WorkItem plan;
2. legacy/unbound ResearchTask cannot be represented as a canonical T2B plan without an explicit binding;
3. malformed dossier revision sequence/hash fails closed;
4. empty/duplicate task IDs fail closed;
5. WorkItem referencing an unknown task fails closed;
6. blank question/rationale fails closed;
7. source gap remains explicit and cannot be auto-satisfied by artifact presence;
8. primary/secondary source requirements remain distinct;
9. same-family sources cannot satisfy an `independent` requirement by declaration alone;
10. contradiction and counterevidence requirements remain open requirements;
11. consensus/dissent cannot be auto-resolved by counts;
12. freshness requirement is explicit and has no implicit current/fresh default;
13. challenge and intra-actor conflict requirements can remain unresolved;
14. unknown jurisdiction/locale remains unknown; no `de`/Germany/municipal default;
15. plan review state cannot encode evidence verification/publication/decision readiness;
16. no numeric research-quality/desirability/political ranking is present;
17. deterministic validation returns identical result for identical input;
18. validator performs no persistence/provider/network action.

## 11. Explicit non-scope

T2B does not authorize:

- persistence of plans or WorkItems;
- plan revision history;
- runs/checkpoints/retry/recovery;
- budget/cost accounting;
- provider/model/search/source fetch execution;
- evidence verification or claim-source promotion;
- autonomous source-role or independence classification;
- Dossier mutation/revision append;
- public/admin workspace/readmodel projection;
- contribution acceptance automation;
- graph merge;
- publication, voting or decision activation;
- political preference inference, recommendation or ranking;
- changes to `docs/E150/OpenTasks.md` from a partial connector read.

These remain T2C/T2D or later-task responsibilities.

## 12. Stop conditions

Return to preflight with `FAIL_SCOPE_EXPANSION` if implementation requires any of:

- a fourth changed file;
- changes to `core/research/store.ts`;
- Dossier DB/schema writes;
- a new collection or migration;
- API/UI routes;
- network/provider execution;
- run/checkpoint state;
- package or browser persistence changes;
- evidence/truth promotion;
- publication, voting or decision activation.

## 13. Next safe action

```text
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
T2B_IMPLEMENTATION_AUTHORIZED=false
NEXT_ALLOWED_STEP=FRESH_MAIN_T2B_BOUNDED_IMPLEMENTATION_AUTHORIZATION
```

The authorization must repeat the exact three-file maximum and preserve the
pure-contract/no-persistence/no-execution boundary.