# T2C Fresh Preflight — ResearchPlan Persistence + Durable Research Execution

Date: 2026-09-20

```text
TRACK=T2
SLICE=T2C
BASE_MAIN_SHA=7cf5d2082c343aa531ae2a2b312c794cb8008d48
T2A_STATUS=merged
T2B_STATUS=merged
PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
IMPLEMENTATION_AUTHORIZED=false
NEW_RESEARCH_RUN_RUNTIME_AUTHORIZED=false
NEW_RESEARCH_RUN_COLLECTION_AUTHORIZED=false
NEW_PLAN_COLLECTION_AUTHORIZED=false
PROVIDER_EXECUTION_AUTHORIZED=false
AUTO_TRUTH=false
AUTO_PUBLISH=false
DECISION_ACTIVATION=false
```

## 1. Result

T2C must not be implemented as one new Research runtime.

Fresh-main inspection shows that the repository already has a canonical durable
execution control plane in Alpha-Foxtrott 2.0. It already owns Mongo-backed runs,
checkpoints, leases, optimistic versions, recovery, retry timing, attempt
budgets, wall-clock ceilings, human gates and BullMQ dispatch. Its run kind enum
already includes `research`.

The missing T2C work is narrower but still contains three materially different
responsibilities which cannot be safely authorized as one slice:

1. durable immutable/versioned `ResearchPlan` revision persistence;
2. a T2-specific binding from one persisted plan revision to the existing Alpha2
   research run ledger without creating a second run truth;
3. durable model-call / cost metering sufficient to make the existing Alpha2
   `maxModelCalls` and `maxEstimatedCostEur` budget fields executable rather than
   intentionally blocked.

Therefore the parent result is `FAIL_SPLIT_REQUIRED`.

## 2. Canonical truths found on fresh main

### 2.1 T2B now owns only plan structure

Merged T2B provides `core/research/researchPlanContract.ts`.

Its contract is intentionally side-effect free and does not claim execution,
evidence verification, completeness, publication readiness or decision
readiness. Requirement state is limited to open/review semantics.

T2C must preserve that boundary. Persisting a plan does not satisfy the plan.
Starting or completing an executor run does not automatically close a source gap,
contradiction requirement, challenge requirement, actor-conflict requirement or
freshness requirement.

### 2.2 ResearchTask remains the task/community owner

`core/research/types.ts` and `core/research/store.ts` remain the canonical owner
for `ResearchTask` and `ResearchContribution`.

Relevant properties:

- canonical collections are `researchTasks` and `researchContributions`;
- T2A added the immutable/stale-detectable `ResearchTaskDossierBinding`;
- generic `saveTask()` deliberately does not own `dossierBinding`;
- one ResearchPlan may reference multiple canonical ResearchTask IDs.

A multi-task plan must therefore not be silently embedded into one arbitrary
ResearchTask as if that task owned the whole plan.

### 2.3 Analyze RunReceipt is provenance, not a T2 execution ledger

`apps/web/src/lib/db/runReceiptsRepo.ts` owns the existing `run_receipts`
collection for Analyze provenance receipts.

It stores final receipt/provenance identity such as receipt hash and snapshot
reference. It is not a mutable lease/checkpoint/retry owner and must not be
repurposed as T2 plan or execution state.

### 2.4 Alpha2 is already the durable run/checkpoint/recovery owner

The approved foundation decision
`docs/foundation/ALPHA_FOXTROTT_2_RUNTIME_STORAGE_DECISION_2026-08-23.md`
requires:

- MongoDB as durable run/checkpoint/lease/recovery truth;
- BullMQ/Redis only as dispatch/delivery infrastructure;
- persistence before dispatch;
- idempotency key and optimistic version;
- attempt-specific leases/fencing;
- resume only from persisted state;
- persistent `resumeAt` for delayed retry/waiting;
- recovery scans capable of recreating missing queue jobs;
- terminal/review/human-gate runs not automatically redispatched;
- budgets and human gates not bypassed.

Current code implements that architecture through:

- `apps/web/src/features/agenticRuntime/alpha2RunLifecycleContract.ts`;
- `apps/web/src/features/agenticRuntime/alpha2RunLedgerContract.ts`;
- `apps/web/src/features/agenticRuntime/alpha2MongoRunLedger.ts`;
- `apps/web/src/features/agenticRuntime/alpha2DurableOrchestrator.ts`;
- `apps/web/src/features/agenticRuntime/alpha2RuntimeService.ts`.

The canonical durable collection is `alpha2_runs`.

`Alpha2RunRecord` already models:

- `kind: "research"`;
- run/root/parent/child identity;
- idempotency key;
- task identity;
- queued/running/waiting/review/human_gate/failed/completed/cancelled states;
- human gate/history;
- max attempts;
- optional max model calls;
- optional max wall clock;
- optional max estimated cost EUR;
- resume time;
- attempt number;
- checkpoints;
- evidence refs and safe trace/artifact refs;
- last structured error.

The Mongo ledger already provides create-or-get idempotency, optimistic CAS,
lease acquire/renew/release and recoverable-run discovery.

T2C is therefore explicitly forbidden from creating `research_runs`,
`research_checkpoints`, `research_leases` or another parallel execution ledger.

## 3. Important budget truth: cost/model-call metering is not yet executable

The presence of Alpha2 budget fields must not be mistaken for runtime metering.

`alpha2DurableOrchestrator.ts` currently adds the hard execution reasons:

- `durable_model_call_metering_not_available` when `maxModelCalls` is configured;
- `durable_cost_metering_not_available` when `maxEstimatedCostEur` is configured.

This is correct fail-closed behavior.

T2C may reuse it, but must not claim model-call or monetary budget enforcement is
complete until durable usage/debit evidence is actually linked to the run and
checked before further execution.

Max-attempt and wall-clock bounds are existing executable controls; model-call
and cost ceilings remain a separate metering responsibility.

## 4. ResearchPlan persistence decision is still unresolved

Fresh-main inspection found no canonical durable owner for complete T2B
ResearchPlan revisions.

The obvious existing stores are not semantically valid substitutes:

### `researchTasks`

Rejected as the default plan store because one plan can reference multiple tasks.
Embedding the whole plan into one ResearchTask would create ambiguous ownership
and make the chosen task an accidental plan SSOT.

### canonical Dossier document/revision

Rejected as the default execution-plan store. Dossier content/revision truth must
not be polluted with mutable executor/checkpoint state, and a persisted research
plan must remain distinguishable from verified Dossier evidence/findings.

### `run_receipts`

Rejected because Analyze RunReceipt is provenance/output receipt state, not a
lease/checkpoint/run-plan owner.

### `alpha2_runs.payload`

Rejected as the plan-content store. Alpha2 has a strict run schema and owns
execution state. Its safe artifact refs are references, not durable ResearchPlan
content. Expanding its payload to duplicate the whole plan would couple generic
control-plane semantics to T2 domain content and make revision replay harder.

A narrowly subordinate immutable/versioned plan-revision record may therefore be
necessary, but **this parent preflight does not authorize a new collection**.
That decision must be made in T2C1 with explicit schema/index/data-lifecycle,
migration/backward-compatibility and deletion/retention analysis.

## 5. Required split

### T2C1 — ResearchPlan Revision Persistence

Goal: decide and authorize one canonical subordinate durable owner for T2B plan
revisions.

Required properties:

- immutable plan revisions or equivalent append-only/versioned semantics;
- canonical binding to dossier ID + dossier revision seq/hash;
- canonical referenced ResearchTask IDs;
- deterministic plan/revision identity and content hash;
- exact replay of historical plan revision;
- idempotent same-revision write;
- stale dossier or stale plan revision cannot be silently overwritten;
- no requirement state is auto-promoted by persistence;
- no duplicated Evidence or Dossier truth;
- explicit indexes, retention/deletion owner and migration/backward-compatibility
  decision before any new collection is authorized.

T2C1 preflight must compare existing stores again on then-current main. If a new
subordinate collection is still unavoidable, the preflight must name it,
justify why every existing owner is insufficient and bound its lifecycle.

### T2C2 — Alpha2 Research Execution Binding

Only after a stable persisted plan-revision reference exists.

Goal: bind one exact ResearchPlan revision to the existing Alpha2 durable run
truth rather than inventing a T2 executor ledger.

Required properties:

- `Alpha2RunRecord.kind = "research"`;
- stable plan-revision reference carried as a typed/referenceable artifact or
  equivalent narrow binding, not duplicated plan content;
- idempotency includes plan revision identity so replay is deterministic;
- stale plan or dossier revision blocks new execution/resume;
- existing Alpha2 lease/CAS/recovery/checkpoint semantics remain authoritative;
- existing exact-head authorization and OpenTasks/runtime gates are not bypassed;
- research worker outcomes may add refs/checkpoints but may not mark T2B gaps,
  claims or Dossier facts verified merely because a run completed;
- review/human_gate remains a hard stop;
- no new run/checkpoint/lease collection.

### T2C3 — Durable Research Usage / Cost Metering

Goal: close the existing Alpha2 hard block for configured model-call and monetary
budgets with real durable metering.

Required properties:

- usage observations come from executed provider/runtime receipts, never planned
  provider config;
- model-call count and monetary/debit value are durably linked to the exact run
  and attempt/effect identity;
- retries/replay cannot double-debit or double-count the same executed effect;
- missing/unknown provider usage stays unknown and blocks a budget-sensitive next
  effect when the ceiling cannot be proven safe;
- limit check happens before the next external/model effect;
- cost values are not inferred from model names alone;
- human escalation on exhausted/unknown budget;
- no automatic purchase, credit top-up or entitlement change.

Until T2C3 exists, T2 research runs that configure `maxModelCalls` or
`maxEstimatedCostEur` must remain blocked by the current Alpha2 hard gate.

## 6. Open-PR collision analysis

### PR #912 — Research findings → Swipe + review-first Dossier draft

Current changed files are:

- `apps/web/package.json`;
- `apps/web/scripts/backfill-prior-research-topics.ts`;
- `apps/web/src/app/api/cron/operator-digest/route.ts`;
- `apps/web/src/app/api/cron/topic-handoff/route.ts`;
- `apps/web/tests/research-topic-handoff.contract.test.ts`;
- `features/research/topicHandoff.ts`.

This is a research-finding → candidate/handoff path, not T2 plan/run ownership.
T2C must not absorb its scheduler, topic handoff or Dossier draft authority.

### PR #872 — Dossier Decision Cockpit

Current changed files are only:

- `apps/web/src/app/dossier/[id]/ui.tsx`;
- `apps/web/src/components/dossier/DossierDecisionCockpit.tsx`;
- `apps/web/tests/dossier-decision-cockpit.contract.test.tsx`.

It is a readmodel/UI surface with manual acceptance gates. T2C must not change
those paths. T2D may later project canonical T2 state into dossier/admin UI after
T2C is complete.

### PR #520 — Studio/QR convergence

Unrelated to T2C ownership and still carries explicit manual gates. No T2C work
may use it as authorization to alter public release behavior.

## 7. Forbidden shortcuts

T2C must not:

- create a second Research run/checkpoint/lease runtime;
- treat Analyze `run_receipts` as mutable Research execution state;
- use ResearchTask `status: completed` as proof that a ResearchPlan is complete;
- treat an Alpha2 `completed` run as verified Evidence or a complete Dossier;
- infer source independence, freshness, counterevidence resolution or consensus
  from executor success;
- infer cost from provider/model configuration without an executed usage receipt;
- disable Alpha2 hard budget gates merely to make Research runs execute;
- auto-publish, auto-vote, activate decisions or rank political choices;
- absorb #912 or #872 ownership.

## 8. Next allowed step

```text
NEXT_ALLOWED_STEP=FRESH_MAIN_T2C1_PLAN_REVISION_PERSISTENCE_PREFLIGHT
T2C1_IMPLEMENTATION_AUTHORIZED=false
T2C2_IMPLEMENTATION_AUTHORIZED=false
T2C3_IMPLEMENTATION_AUTHORIZED=false
T2D_BLOCKED_ON_T2C=true
```

The next step is a separate T2C1 fresh-main preflight. Only after T2C1 is merged
and separately authorized may plan-persistence code be written. T2C2 must wait
for a stable plan-revision reference. T2C3 may be preflighted in parallel only
if it does not modify T2C1/T2C2 owners, but full T2C acceptance requires all
three responsibilities to close.
