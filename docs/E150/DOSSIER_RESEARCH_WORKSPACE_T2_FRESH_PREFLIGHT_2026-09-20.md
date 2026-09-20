# T2 Fresh-Main Preflight — Dossier Research Workspace

Date: 2026-09-20

Task: `DOSSIER-RESEARCH-WORKSPACE-01`

Fresh-main basis: `main@1630c41e64b2d34a298d87183bab211e4f924d79`

```text
TASK_PREFLIGHT=PASS
DEPENDENCY_T1=PASS
CANONICAL_OWNER_DISCOVERY=PASS
COLLISION_PREFLIGHT=PASS_WITH_SEMANTIC_BOUNDARIES
SIZE_GATE=FAIL_SPLIT_REQUIRED
IMPLEMENTATION_AUTHORIZED=false
PARENT_SAFE_TO_IMPLEMENT=false
NEXT_SAFE_WORK=T2A_RESEARCH_OWNER_BINDING_PREFLIGHT_ONLY
```

## 1. Decision

T1 is integrated on the exact fresh-main basis above, so the hard dependency for
starting T2 governance is closed. The T2 parent itself is **not** safe to
implement as one slice.

The roadmap definition combines several independently risky responsibilities:

- a dossier-bound systematic `ResearchPlan`;
- work items and research questions;
- source gaps and explicit inclusion/exclusion rationale;
- primary/secondary source mix, independence, contradiction and
  consensus/dissent handling;
- freshness and artifact references;
- persistent runs/checkpoints and completeness;
- retry/recovery;
- human gates;
- budget/cost;
- later workspace/readmodel projection.

Putting all of these into one implementation would cross canonical research,
dossier, evidence, persistence/recovery and UI boundaries at once. The parent
therefore fails the size gate and must be decomposed before code is authorized.

This document is a preflight record only. It does not modify
`docs/E150/OpenTasks.md`, does not authorize runtime, and does not mark T2 done.

## 2. Binding upstream contracts

T2 must preserve the already accepted T0 ownership contract and the integrated
T1 result.

T0 fixes `ResearchObject` ownership as:

```text
canonicalOwner = Dossier + ResearchTask
canonicalReference = dossier ID
allowedReferences = Dossier, ResearchTask, ResearchArtifact
forbiddenOwnershipDuplication = second research store
laterTaskOwner = T2
```

The accepted T0 owner review explicitly requires `Dossier + ResearchTask` to
remain canonical owners. T2 therefore may enrich or bind those owners but may
not create a parallel dossier ID, parallel research truth, parallel evidence
graph or autonomous truth/publish owner.

T1 is now merged and supplies the deterministic topic/system-question
qualification boundary. T2 consumes the resulting bounded research scope; it
does not reclassify political questions, infer citizen preferences, or override
Public Question Guard states.

## 3. Fresh repository findings

### 3.1 Canonical dossier truth already exists

`features/dossier/schemas.ts` and `features/dossier/db.ts` already own the
persisted dossier graph and its canonical `dossierId`:

- `dossiers`
- `dossier_sources`
- `dossier_claims`
- `dossier_findings`
- `dossier_edges`
- `open_questions`
- `dossier_revisions`
- `dossier_disputes`
- `dossier_suggestions`

The dossier revision chain is already append-only/hash-linked at its owner.
T2 must reference this ID/revision truth. It must not introduce `researchDossier`,
`researchDossiers`, a second dossier revision namespace, or a second public
readiness owner.

### 3.2 Canonical research runtime already exists

`core/research/types.ts` and `core/research/store.ts` already own:

- `ResearchTask`;
- `ResearchContribution`;
- persistent `researchTasks`;
- persistent `researchContributions`;
- task lifecycle `open | in_progress | completed | archived`;
- source links to existing analysis/question/knot/eventuality inputs.

This is the existing ResearchTask owner T0 refers to. T2 must extend or compose
this owner instead of creating a new `dossierResearchTasks` collection.

### 3.3 Owner gap: no durable dossier/revision binding on ResearchTask

The current `ResearchTask` / `ResearchTaskSource` contract has no explicit
`dossierId` or dossier revision binding, and `core/research` contains no such
field. Therefore the T0 invariant "ResearchObject = Dossier + ResearchTask,
canonicalReference = dossier ID" is architectural but not yet represented by a
durable T2 binding.

This gap must be closed before a ResearchPlan can claim canonical dossier
ownership. A plan that stores an unrelated dossier ID only in a new T2 object
would create exactly the parallel ownership T0 forbids.

### 3.4 Evidence/artifact truth already exists

`features/analyze/atomicClaimSourceRelationContract.ts` already defines
`SourceArtifact`, `SourceSegment`, source lineage and evidence assessment
vocabulary. `features/dossier/schemas.ts` already persists dossier sources,
claims/findings/citations and open questions.

T2 may reference source/artifact IDs and express a **research gap**. It may not
promote a fetched source, task contribution or model result to verified evidence.
Evidence verification remains with the canonical claim/evidence owners.

### 3.5 No canonical T2 run/checkpoint owner was found

On the fresh-main basis, repository search found the existing `core/research`
task/contribution store but no canonical `ResearchPlan`/`ResearchRun` checkpoint
model covering the T2 requirements for retries, checkpoints, completeness and
budget/cost.

That absence is not permission to create a collection ad hoc. The later
persistence slice must first decide whether existing ResearchTask state,
existing orchestration/run receipts, or a narrowly subordinate research-run
record is the canonical extension. Any new collection requires its own explicit
authorization and proof that it is subordinate state rather than a second
research truth.

## 4. Collision findings

### Fresh-main drift #910 / #911 / #913 — Open Data source runtime and candidate bridge

While #928 was running, `main` advanced through merged PRs #910, #911 and #913.
Their changed paths were checked before this refresh.

PR #910 changed only:

- `features/feeds/openDataConnector.ts`;
- `features/feeds/connectors/abgeordnetenwatch.ts`;
- `apps/web/tests/abgeordnetenwatch-open-data.contract.test.ts`;
- `apps/web/package.json`.

PR #911 changed only:

- `features/feeds/openDataEventStore.ts`;
- `features/feeds/openDataRuntime.ts`;
- `apps/web/tests/open-data-runtime.contract.test.ts`;
- `apps/web/package.json`.

PR #913 changed only:

- `features/feeds/openDataCandidateBridge.ts`;
- `apps/web/tests/open-data-candidate-bridge.contract.test.ts`;
- `apps/web/package.json`.

None changes `core/research/types.ts`, `core/research/store.ts`,
`features/dossier/schemas.ts`, `features/dossier/db.ts`, the T0 ownership
contract or this T2 preflight. There is therefore no direct T2A owner collision.
The Open Data connector/runtime/candidate path is source/candidate infrastructure
only and must not become a T2 ResearchPlan, evidence-verification or
Dossier/ResearchTask ownership store.

### PR #912 — research findings to review-first dossier draft

Open PR #912 changes:

- `features/research/topicHandoff.ts`
- operator/topic-handoff cron routes;
- a backfill script;
- its focused contract;
- `apps/web/package.json`.

It does **not** currently change `core/research/types.ts`,
`core/research/store.ts`, `features/dossier/schemas.ts` or the T0 architecture
contract. There is therefore no direct file collision with the proposed T2A
owner-binding preflight.

There is a semantic boundary: #912 is a review-first *research-finding → dossier
candidate* handoff. T2 is a *research workspace already bound to one canonical
dossier*. T2 must not absorb #912's autonomous topic-handoff/cron ownership, and
#912 must not become the T2 ResearchPlan store.

### PR #872 — public Dossier Decision Cockpit

Open PR #872 changes only the dossier public UI/cockpit and its focused test. It
has no direct file collision with the T2A owner-binding foundation. T2 must not
couple the foundation to #872's public UI; a later readmodel projection can
consume canonical T2 state after the domain and persistence contracts exist.

### Other historical research/create stacks

Large historical Create/provider stacks remain reference-only for T2. Provider
or feed activation, source acquisition expansion, auto-research and public UI
convergence are explicitly outside this preflight.

## 5. Required T2 decomposition

The parent must be split into the following ordered responsibilities. These are
decomposition targets, **not implementation authorizations**.

### T2A — canonical ResearchTask ↔ Dossier binding / owner hardening

Goal: prove the smallest additive way for the existing `ResearchTask` owner to
carry an explicit canonical dossier ID plus revision binding without creating a
second store or breaking existing community research tasks.

Preflight must inspect at minimum:

- `core/research/types.ts`;
- `core/research/store.ts`;
- `features/dossier/schemas.ts` / canonical `dossierId` and revision semantics;
- T0 ownership contract and tests;
- existing ResearchTask API/UI callsites for backwards compatibility;
- open PR collision surface.

Expected properties:

- old non-dossier ResearchTasks remain valid;
- dossier-bound tasks cannot silently change dossier ownership;
- revision binding is explicit/stale-detectable;
- no second collection is introduced by default;
- no evidence or publication semantics are added.

`IMPLEMENTATION_AUTHORIZED=false` until a separate positive T2A preflight and
separate authorization exist.

### T2B — pure ResearchPlan / WorkItem contract

Only after T2A owner binding is integrated. Define a deterministic plan contract
that references the canonical dossier/revision and canonical ResearchTask IDs.
It must model questions, source gaps, inclusion/exclusion rationale,
primary/secondary mix, independence/lineage needs, contradiction,
consensus/dissent, freshness requirements, artifact references, completeness
criteria and human-review states without claiming research success or truth.

No provider execution, persistence, fetch, publish or decision activation belongs
in the pure-contract slice.

### T2C — persistence, runs/checkpoints, retry/recovery and budget/cost

Only after T2B. Decide and authorize the canonical subordinate persistence path
for plan revisions and execution state. Required properties include
idempotency/replay, bounded retry, crash/restart recovery, stale revision
rejection, checkpoint ownership, cost/budget ceilings, human escalation and no
auto-truth/auto-publish.

A new collection is **not pre-authorized**. If unavoidable, it requires a fresh
collision/data-lifecycle/migration decision.

### T2D — dossier research workspace/readmodel projection

Only after T2C. Project canonical T2 state into existing dossier/admin surfaces.
No second workspace truth, no synthetic completeness, no fake provider progress,
no hidden unresolved gaps and no decision activation.

## 6. Parent acceptance requirements

T2 cannot be globally done until the decomposed work collectively demonstrates:

1. exactly one canonical dossier ID and explicit dossier revision binding;
2. existing `ResearchTask` ownership retained;
3. systematic plan with bounded WorkItems/questions;
4. explicit source gaps and inclusion/exclusion rationales;
5. primary/secondary source role and independence/lineage handling;
6. contradiction and consensus/dissent remain visible;
7. freshness requirements and artifact/source references are explicit;
8. plan/run/checkpoint lifecycle is revision-bound and idempotent;
9. retry/recovery is bounded and restart-safe;
10. completeness never means factual truth or decision readiness;
11. human gates are explicit and cannot be overridden by provider confidence;
12. budget/cost ceilings fail closed;
13. unresolved material research gaps remain visible downstream;
14. no automatic publication, decision activation, evidence verification or
    political recommendation/ranking is introduced;
15. tests prove stale binding, duplicate delivery, partial progress, recovery,
    source conflict, low-data and human-gate cases.

## 7. Forbidden shortcuts

The following are forbidden by this preflight:

- second dossier/research/evidence truth store;
- storing a free-standing dossier ID only inside a new T2 plan while canonical
  ResearchTasks remain unbound;
- treating ResearchContribution or SourceArtifact presence as verified evidence;
- treating task completion as dossier completeness or decision readiness;
- provider/model confidence overriding human or evidence gates;
- auto-resolving contradictions or consensus;
- auto-publish, auto-activation or auto-vote;
- implementation in `docs/E150/OpenTasks.md` from a partial/truncated read;
- pulling #912 or #872 wholesale into T2.

## 8. Next authorized action

Only the following next action is authorized by this preflight record:

```text
T2A_RESEARCH_OWNER_BINDING_PREFLIGHT_ONLY=true
T2A_IMPLEMENTATION_AUTHORIZED=false
T2B_IMPLEMENTATION_AUTHORIZED=false
T2C_IMPLEMENTATION_AUTHORIZED=false
T2D_IMPLEMENTATION_AUTHORIZED=false
```

The T2A preflight must be created from the then-current `main`, verify exact
callsite compatibility and collision state, and produce an explicit bounded file
list before any owner-hardening code is written.
