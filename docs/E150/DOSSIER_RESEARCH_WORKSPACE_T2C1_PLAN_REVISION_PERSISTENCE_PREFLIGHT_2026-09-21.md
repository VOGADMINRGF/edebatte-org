# T2C1 Fresh Preflight — ResearchPlan Revision Persistence

Date: 2026-09-21

```text
TRACK=T2
SLICE=T2C1
BASE_MAIN_SHA=e9d9d649ecb94a0202a1d0f4ec8243e250fb6e08
PARENT_T2C_RESULT=FAIL_SPLIT_REQUIRED
PREFLIGHT_RESULT=PASS_OWNER_DECISION
CANONICAL_PLAN_REVISION_OWNER=research_plan_revisions
T2C1_IMPLEMENTATION_AUTHORIZED=false
T2C2_IMPLEMENTATION_AUTHORIZED=false
T2C3_IMPLEMENTATION_AUTHORIZED=false
NEW_RESEARCH_RUN_RUNTIME_AUTHORIZED=false
NEW_EXECUTION_LEDGER_AUTHORIZED=false
PROVIDER_EXECUTION_AUTHORIZED=false
AUTO_TRUTH=false
AUTO_PUBLISH=false
DECISION_ACTIVATION=false
```

## 1. Result

Fresh-main inspection confirms the parent T2C finding: the repository has no canonical durable owner for complete immutable/versioned `ResearchPlan` revisions.

T2C1 therefore decides the narrow canonical persistence owner:

```text
collection = research_plan_revisions
role       = subordinate immutable/versioned ResearchPlan artifact store
owner      = core/research
```

This is **not** a second Research runtime, Evidence store, Dossier store, task store, run ledger or checkpoint store. It stores only versioned T2B `ResearchPlan` content plus the minimum binding/integrity metadata required to replay an exact historical plan revision.

This preflight does **not** authorize implementation yet. Per the parent T2C split contract, code may be written only after this owner decision is merged and a separate T2C1 implementation-authorization step validates the then-current main and exact implementation boundary.

## 2. Fresh-main evidence

### 2.1 T2B remains the plan-structure owner

`core/research/researchPlanContract.ts` defines the side-effect-free `ResearchPlan` contract. Its canonical plan content includes:

- `planId`;
- exact `ResearchTaskDossierBinding`;
- `researchTaskIds`;
- WorkItems and open requirements;
- completeness criteria as criteria only;
- human-review state;
- jurisdiction/locale context without implicit defaults.

The contract deliberately does not own persistence, execution, verified Evidence, publication readiness or decision readiness.

T2C1 must persist this contract without promoting any open requirement merely because a revision was saved.

### 2.2 `researchTasks` / `researchContributions` cannot own whole plans

`core/research/store.ts` owns exactly the existing `researchTasks` and `researchContributions` collections.

A ResearchPlan may reference multiple canonical ResearchTask IDs. Embedding the complete plan into one task would therefore create an arbitrary task-level SSOT for a multi-task object. Generic `saveTask()` also deliberately excludes the immutable dossier binding from ordinary writes.

Result: existing ResearchTask persistence remains task/community truth and is not extended into a plan-revision store.

### 2.3 Dossier persistence cannot own executor-plan content

`features/dossier/db.ts` owns canonical Dossier truth, including:

- `dossiers`;
- `dossier_sources`;
- `dossier_claims`;
- `dossier_findings`;
- `dossier_edges`;
- `open_questions`;
- `dossier_revisions`;
- dispute/suggestion collections.

Its Dossier revision chain records entity mutations and advances canonical Dossier revision sequence/hash. A T2 `ResearchPlan` is an execution/research artifact bound **to** one exact Dossier revision; it is not itself canonical Dossier evidence or a Dossier content mutation.

Persisting a full plan in `dossier_revisions` would conflate audit events with replayable plan content and would incorrectly make plan persistence part of Dossier truth.

Result: Dossier collections remain references/binding targets, not the plan-content owner.

### 2.4 Analyze `run_receipts` remains provenance, not plan persistence

The parent T2C preflight already established that Analyze `run_receipts` stores final provenance/receipt identity and is not a mutable or versioned T2 plan owner.

Result: T2C1 does not reuse or extend `run_receipts`.

### 2.5 Alpha2 remains the only durable execution ledger

The Alpha-Foxtrott 2.0 control plane already owns durable run/checkpoint/lease/recovery state in `alpha2_runs`, including `kind: "research"`.

T2C1 therefore must not write full ResearchPlan content into `alpha2_runs`, nor create any of:

- `research_runs`;
- `research_checkpoints`;
- `research_leases`;
- another retry/recovery ledger.

Later T2C2 may carry only a stable plan-revision reference into Alpha2.

## 3. Canonical owner decision

The narrow subordinate collection is:

```text
research_plan_revisions
```

It is owned by `core/research` because `ResearchPlan` itself is owned by `core/research/researchPlanContract.ts`.

No new top-level domain is introduced. The semantic relationship is:

```text
canonical Dossier revision
        ↓ immutable binding
ResearchPlan revision  ← references → canonical ResearchTask IDs
        ↓ stable ref only
Alpha2 research run (T2C2, later)
```

Plan persistence does not alter Dossier truth, task status, Evidence truth or Alpha2 execution state.

## 4. Proposed immutable revision record

A later implementation authorization may permit a record equivalent to:

```text
ResearchPlanRevisionRecord {
  revisionId
  planId
  revisionSeq
  planHash
  plan
  dossierId
  dossierRevisionSeq
  dossierRevisionHash
  researchTaskIds[]
  createdAt
  createdBy?        // opaque actor reference only when already available/allowed
  supersedesRevisionId?
}
```

Hard rules:

- `plan` must validate against the canonical T2B `ResearchPlan` validator before persistence;
- `planHash` must be deterministic from canonical serialized plan content;
- stored `dossier*` and `researchTaskIds` are integrity/index fields derived from the validated plan and must match it exactly;
- an existing revision record is immutable;
- same semantic revision write is idempotent;
- changed content creates a new revision, never an in-place overwrite;
- no field marks requirements/evidence/claims/dossier/publication/decision state as satisfied merely from persistence.

## 5. Identity and idempotency

The implementation authorization should require deterministic identity semantics with both logical and content identity:

- `planId` = stable logical ResearchPlan identity;
- `revisionSeq` = monotonically increasing plan-local revision number;
- `planHash` = immutable content identity for that exact validated plan payload;
- `revisionId` = stable stored revision reference used later by T2C2.

At minimum these invariants must hold:

1. same `planId + planHash` returns the already-persisted revision;
2. same `planId + revisionSeq` cannot point to different content;
3. same `revisionId` cannot point to different content;
4. a new revision must bind to an existing exact Dossier `revisionSeq + hash`;
5. stale callers cannot overwrite the latest revision;
6. replay by `revisionId` returns the exact historical validated plan content.

## 6. Index decision

A later implementation authorization may permit only the indexes needed for identity, replay and binding:

```text
unique { revisionId: 1 }
unique { planId: 1, revisionSeq: 1 }
unique { planId: 1, planHash: 1 }
       { dossierId: 1, dossierRevisionSeq: -1 }
       { researchTaskIds: 1 }
       { createdAt: -1 }
```

No text/search/vector/TTL index is authorized by this preflight.

## 7. Lifecycle / retention decision

ResearchPlan revisions are audit/replay artifacts, not ephemeral queue state.

Therefore:

- no TTL deletion;
- no automatic pruning of superseded revisions;
- ordinary plan replacement creates another immutable revision;
- Dossier archival does not by itself delete historical plan revisions;
- deletion, legal erasure or retention-policy handling must be driven by the same explicit repository/account-data lifecycle authority that owns deletion of the referenced canonical Dossier/Research data, not by a T2 worker or provider;
- until that lifecycle owner explicitly authorizes a destructive path, T2C1 is preserve-by-default and fail-closed.

This avoids inventing a new autonomous deletion owner. A later implementation may expose no ad-hoc delete API for plan revisions.

## 8. Migration and backward compatibility

Fresh main contains no canonical persisted ResearchPlan revision collection.

Therefore the initial implementation requires:

- no historical backfill presented as canonical truth;
- no synthetic conversion of existing ResearchTasks, Dossier revisions, run receipts or Alpha2 runs into plans;
- new plan revision records are written only from schema-valid T2B `ResearchPlan` input;
- legacy/unpersisted plans remain explicitly unpersisted;
- readers must tolerate absence of persisted plans;
- no existing collection is renamed or migrated;
- no destructive schema migration is required.

If later product code needs to associate historical research work, that must be a separate explicit migration/reconciliation slice with human-review semantics.

## 9. Staleness and write preconditions

Before saving a new revision, implementation must fail closed unless it can prove:

1. the ResearchPlan contract validates;
2. the bound Dossier exists;
3. the bound Dossier current revision sequence/hash still matches the plan binding at write time;
4. every referenced canonical ResearchTask exists;
5. every task's immutable Dossier binding, where T2 requires it, is compatible with the plan binding;
6. the caller's expected latest plan revision still matches current persisted state when appending a changed revision.

A stale Dossier or stale expected plan revision must return a typed conflict/review result, not silently create or overwrite a revision.

## 10. Explicit non-truth semantics

```text
PLAN_PERSISTED          != RESEARCH_EXECUTED
RESEARCH_EXECUTED       != REQUIREMENT_SATISFIED
REQUIREMENT_SATISFIED   != EVIDENCE_VERIFIED
EVIDENCE_VERIFIED       != DOSSIER_READY
DOSSIER_READY           != DECISION_READY
```

Persistence may never:

- close source gaps;
- resolve contradictions;
- infer source independence;
- infer consensus/dissent;
- promote task status;
- create Source/Evidence truth;
- mutate Dossier findings/claims;
- start Alpha2 execution;
- call providers;
- publish, vote or activate a decision.

## 11. Collision boundary

T2C1 must not absorb or duplicate:

- `core/research/store.ts` task/community ownership;
- `features/dossier/db.ts` Dossier content/revision truth;
- Analyze `run_receipts` provenance receipts;
- Alpha2 `alpha2_runs` execution/checkpoint/lease/recovery truth;
- #912 finding/topic handoff;
- #872 Dossier cockpit/readmodel;
- C13 Source/Segment acquisition or Evidence semantics;
- #629/E150 provider orchestration;
- any Swipe/public release authority.

The collection name and code owner must be rejected if an exact-head re-check discovers another canonical ResearchPlan revision owner before implementation.

## 12. Proposed later implementation boundary

After this preflight is merged and a separate implementation authorization is issued from fresh main, T2C1 should remain narrowly bounded, preferably to:

1. `core/research/researchPlanRevisionStore.ts`
   - record contract;
   - deterministic hash/canonicalization helper;
   - collection/index initialization;
   - append/idempotent-get/read operations only;
   - no provider/runtime execution.
2. `apps/web/tests/research-plan-revision-store.contract.test.ts`
   - deterministic persistence/idempotency/staleness fixtures.
3. minimal CI invocation only if the existing contract test pattern does not already pick up the test.

Changes to Alpha2, Dossier mutation APIs, provider adapters, UI, public routes and `OpenTasks.md` are not part of T2C1 implementation.

## 13. Required focused tests for later authorization

At minimum:

1. valid first revision persists and replays exactly;
2. invalid ResearchPlan never writes;
3. same `planId + planHash` is idempotent;
4. same `planId + revisionSeq` with different hash fails closed;
5. changed valid content appends a new immutable revision;
6. previous revision remains byte/semantically replayable;
7. stale expected latest revision fails closed;
8. stale Dossier sequence/hash fails closed;
9. missing Dossier fails closed;
10. missing canonical ResearchTask fails closed;
11. plan/task Dossier binding conflict fails closed;
12. multiple tasks remain one plan revision without choosing one task as owner;
13. persistence does not change ResearchTask status;
14. persistence does not change Dossier revision/hash/content;
15. persistence does not create Evidence/Source truth;
16. persistence does not create Alpha2 run/checkpoint/lease state;
17. no provider/network execution occurs;
18. no TTL/pruning behavior exists;
19. unknown jurisdiction/locale remains unknown;
20. deterministic plan hash is stable for canonical equivalent input and changes for semantic content change.

## 14. Next allowed step

```text
NEXT_ALLOWED_STEP=MERGE_T2C1_PREFLIGHT_THEN_FRESH_MAIN_T2C1_IMPLEMENTATION_AUTHORIZATION
T2C1_IMPLEMENTATION_AUTHORIZED=false
T2C2_IMPLEMENTATION_AUTHORIZED=false
T2C3_IMPLEMENTATION_AUTHORIZED=false
T2D_BLOCKED_ON_T2C=true
```

Do not implement `research_plan_revisions` from this branch. After merge, a separate authorization must re-check current main, open-PR collisions, exact file boundaries and the collection/index decision before code is written.
