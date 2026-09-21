# T2C1 Fresh-Main Preflight — ResearchPlan Revision Persistence

Date: 2026-09-21

```text
TRACK=T2
PARENT_SLICE=T2C
SLICE=T2C1
BASE_MAIN_SHA=e9d9d649ecb94a0202a1d0f4ec8243e250fb6e08
PREFLIGHT_RESULT=PASS_BOUNDED_SUBORDINATE_STORE_DECISION
PLAN_REVISION_STORE_OWNER=core/research/researchPlanRevisionStore.ts
PLAN_REVISION_COLLECTION=researchPlanRevisions
NEW_PLAN_REVISION_COLLECTION_DECISION=approved_by_preflight
T2C1_IMPLEMENTATION_AUTHORIZED=false
T2C2_IMPLEMENTATION_AUTHORIZED=false
T2C3_IMPLEMENTATION_AUTHORIZED=false
NEW_RESEARCH_RUN_RUNTIME_AUTHORIZED=false
NEW_RESEARCH_RUN_COLLECTION_AUTHORIZED=false
PROVIDER_EXECUTION_AUTHORIZED=false
AUTO_TRUTH=false
AUTO_PUBLISH=false
DECISION_ACTIVATION=false
NEXT_ALLOWED_STEP=T2C1_IMPLEMENTATION_AUTHORIZATION
```

## 1. Purpose and result

This preflight consumes the merged T2C split decision and answers only the T2C1
question: where one immutable/versioned T2B `ResearchPlan` revision may be stored
without creating a second Dossier, ResearchTask, Evidence or execution truth.

Fresh-main inspection still finds no canonical durable owner for complete
`ResearchPlan` revisions. Existing stores are semantically insufficient:

- `researchTasks` / `researchContributions` own task/community state;
- `dossier_revisions` owns Dossier mutation provenance/hash-chain entries, not
  replayable ResearchPlan snapshots;
- `run_receipts` owns Analyze provenance receipts, not mutable or versioned T2
  domain input;
- `alpha2_runs` owns durable execution/lease/checkpoint/recovery truth, not T2
  plan content.

The bounded storage decision is therefore a new subordinate append-only
collection named `researchPlanRevisions`, owned only by
`core/research/researchPlanRevisionStore.ts`.

This is not authorization to write the implementation yet. A separate
fresh-main implementation-authorization slice must consume this document before
any persistence code is written.

## 2. Fresh-main canonical truths

### 2.1 T2B remains the plan-contract owner

`core/research/researchPlanContract.ts` remains the canonical type/validation
owner for `ResearchPlan` and `ResearchWorkItem`.

Persistence must not fork or weaken that contract. The persisted plan payload is
an exact schema-valid T2B `ResearchPlan`; persistence may wrap it in revision
metadata but may not create a second plan schema with independent semantics.

Persisting a plan does not:

- satisfy a source gap;
- resolve a contradiction;
- prove source-family independence;
- verify freshness;
- satisfy challenge, consensus/dissent or actor-conflict requirements;
- verify Evidence;
- complete a ResearchTask;
- mark a Dossier decision-ready;
- authorize publish, vote or decision activation.

### 2.2 ResearchTask remains the task/community owner

`core/research/store.ts` continues to own the canonical collections
`researchTasks` and `researchContributions`.

`saveTask()` intentionally does not own `dossierBinding`; the explicit T2A
binding path remains authoritative. T2C1 must not embed a complete multi-task
ResearchPlan into one ResearchTask or mutate task state while persisting a plan.

A persisted ResearchPlan revision may reference canonical ResearchTask IDs, but
those IDs remain references only.

### 2.3 Current Dossier head remains authoritative

`features/dossier/db.ts` owns `dossiers` and its canonical head fields
`revisionSeq` and `lastRevisionHash`.

`features/dossier/researchTaskBinding.ts` already defines the fail-closed T2A
binding semantics against the current Dossier head. T2C1 must preserve the same
meaning:

```text
dossierId
dossierRevisionSeq
dossierRevisionHash
```

A plan revision may be persisted only when its T2B `binding` exactly matches a
valid current Dossier head. Missing or malformed head state is a hard failure.

### 2.4 `dossier_revisions` is not a plan snapshot store

`features/dossier/db.ts` uses `dossier_revisions` for Dossier mutation history
and revision-hash chaining. Its records describe entity/action/diff metadata and
advance the Dossier head.

T2C1 must not place complete ResearchPlan payloads into that collection and must
not advance the Dossier revision chain merely because an execution plan was
persisted.

ResearchPlan persistence is subordinate operational planning state bound to a
Dossier revision, not a new Dossier content revision.

### 2.5 Analyze RunReceipt remains provenance only

`apps/web/src/lib/db/runReceiptsRepo.ts` owns `run_receipts`, keyed around receipt
identity/hash and snapshot provenance.

T2C1 must not repurpose Analyze receipts as ResearchPlan revision state.

### 2.6 Alpha2 remains the sole durable run owner

`apps/web/src/features/agenticRuntime/alpha2RunLedgerContract.ts` and
`alpha2MongoRunLedger.ts` remain the canonical run/lease/CAS/recovery owner.
The durable collection is `alpha2_runs`.

T2C1 must not create any:

- `research_runs`;
- `research_checkpoints`;
- `research_leases`;
- T2-specific scheduler/runtime;
- second idempotency/run ledger.

T2C2 may later bind one persisted plan-revision reference into Alpha2. That is
explicitly outside T2C1.

## 3. Collision result

Fresh-main code search finds no existing `researchPlanRevisions` collection and
no open PR/issue claiming canonical ResearchPlan revision persistence.

The new collection is therefore permitted only because the domain concept has no
durable owner yet. It must remain subordinate to the existing T2B plan contract,
Dossier revision head and ResearchTask identities.

## 4. Canonical owner decision

### Collection

```text
researchPlanRevisions
```

### Store owner

```text
core/research/researchPlanRevisionStore.ts
```

This module is the only authorized collection/index/read/write owner for
ResearchPlan revisions.

A Dossier-facing gate may later live in:

```text
features/dossier/researchPlanRevisionPersistence.ts
```

That file may orchestrate current-head and ResearchTask-binding checks, but it
must not own a second collection or duplicate the revision store.

## 5. Persisted record contract

The implementation authorization may permit a record equivalent to:

```ts
type ResearchPlanRevisionRecord = {
  schemaVersion: "research.plan.revision.v1";
  revisionId: string;
  planId: string;
  revisionSeq: number;
  previousRevisionId: string | null;
  planHash: string;
  binding: ResearchTaskDossierBinding;
  researchTaskIds: string[];
  plan: ResearchPlan;
  createdAt: Date;
};
```

Hard rules:

- `plan` must pass the canonical T2B validator before persistence;
- `binding` and `researchTaskIds` are denormalized lookup fields copied from the
  validated plan and must equal the payload values;
- `revisionId` and `planHash` are deterministic, not random identities;
- `createdAt` is server-owned metadata and is not included in `planHash`;
- no provider output, Evidence assessment, execution status, checkpoint, lease,
  publishability or decision state belongs in this record;
- no prompt, secret or provider credential belongs in this record.

## 6. Canonical hashing and identity

`planHash` must be SHA-256 over a canonical UTF-8 serialization of the complete
validated `ResearchPlan`.

Canonical serialization requirements:

- recursively stable object-key order;
- array order is preserved exactly because T2B arrays may be semantically
  ordered;
- no clock/random fields;
- no Mongo `_id` participates in semantic identity.

`revisionId` must be deterministic from stable revision semantics. One acceptable
contract is SHA-256 over:

```text
research-plan-revision-v1\n<planId>\n<revisionSeq>\n<planHash>\n<dossierRevisionHash>
```

The implementation authorization must pick exactly one deterministic recipe and
test it with fixed vectors.

## 7. Append-only and idempotency semantics

Normal product/runtime code may only append or read plan revisions. It may not
update a persisted plan payload in place.

Required behavior:

1. validate the T2B ResearchPlan;
2. validate exact current Dossier binding;
3. validate referenced ResearchTasks and their Dossier bindings;
4. compute canonical `planHash`;
5. if the same `planId + planHash` already exists, return that exact revision as
   an idempotent success;
6. otherwise append the next revision for that `planId`;
7. never overwrite an older revision;
8. never reinterpret an older payload through a newer schema silently.

Concurrent writers must be serialized by database constraints. A collision on
`planId + revisionSeq` requires reread/retry; it must not become an overwrite.

## 8. Required indexes

The first implementation must create only the indexes needed for identity,
idempotency and bounded lookup:

```text
unique: revisionId
unique: planId + revisionSeq
unique: planId + planHash
index:  binding.dossierId + createdAt desc
index:  researchTaskIds
```

No TTL index is authorized.

The implementation may use Mongo `_id` as storage identity, but `_id` is not the
semantic plan revision identity.

## 9. Dossier freshness gate

Before every new append, the Dossier-facing orchestration layer must load the
current canonical Dossier head and require exact equality with the plan binding:

```text
plan.binding.dossierId == current.dossierId
plan.binding.dossierRevisionSeq == current.revisionSeq
plan.binding.dossierRevisionHash == current.lastRevisionHash
```

If any field is missing, malformed or stale, persistence fails closed.

An already persisted historical revision remains replayable after the Dossier
advances. Historical replay must not be confused with authorization to start a
new run against the stale revision.

## 10. ResearchTask reference gate

Every `ResearchPlan.researchTaskIds` entry must resolve to an existing canonical
ResearchTask before a new revision is appended.

For each referenced task:

- `dossierBinding` must exist and be valid;
- task binding must exactly equal the plan binding;
- missing, malformed or conflicting binding blocks persistence;
- persistence must not alter task status or task binding.

This ensures one plan revision cannot silently combine tasks bound to different
Dossier revisions.

## 11. Replay contract

The store must provide read operations sufficient for deterministic later T2C2
binding, at minimum:

```text
getResearchPlanRevisionById(revisionId)
getLatestResearchPlanRevision(planId)
listResearchPlanRevisions(planId, boundedLimit)
```

A read must return the exact persisted plan payload for that revision. Unknown
`schemaVersion` values fail closed rather than being auto-coerced.

Replay does not revalidate historical truth against the current Dossier head; it
returns the historical artifact. Any new execution authorization must perform a
separate current-head freshness check.

## 12. Retention and deletion lifecycle

ResearchPlan revisions are audit/replay artifacts subordinate to the Dossier.
Therefore:

- no automatic TTL is allowed;
- no per-run cleanup is allowed;
- normal update/delete APIs are not allowed;
- ordinary ResearchTask archival must not delete historical plan revisions;
- the collection owner is also the deletion-semantics owner.

The first implementation may expose an internal, explicitly named purge helper
scoped only by `dossierId`, but it must not wire that helper to an unauthenticated
or general product route. Until a canonical Dossier erasure workflow invokes it,
records remain retained with the Dossier lifecycle.

Any future erasure integration must delete subordinate plan revisions only as
part of an explicit canonical Dossier/privacy deletion action and must never
silently rewrite surviving revision identities.

## 13. Migration and backward compatibility

No migration/backfill of historical plans is required because fresh-main has no
canonical persisted ResearchPlan store.

Implementation requirements:

- create indexes idempotently/lazily using the existing core Mongo pattern;
- do not scan or transform `researchTasks`, `researchContributions`,
  `dossier_revisions`, `run_receipts` or `alpha2_runs`;
- existing in-memory T2B `ResearchPlan` callers remain valid;
- persistence is opt-in through the new store/gate, not a global side effect;
- `schemaVersion = research.plan.revision.v1` is mandatory on new records;
- unknown future versions fail closed until an explicit migration/reader exists.

No destructive migration is authorized.

## 14. Security and privacy boundary

The store persists only the already validated ResearchPlan domain payload plus
revision metadata.

It must not add:

- provider prompts/responses;
- auth tokens, API keys or secrets;
- raw browser/session state;
- hidden model chain-of-thought;
- new user-profile identifiers;
- external fetch side effects.

Persistence alone performs no network/provider execution.

## 15. Future implementation path budget

A later implementation-authorization slice may authorize at most these paths:

1. `core/research/researchPlanRevisionStore.ts`
   - canonical collection/index/hash/append/read owner;
2. `features/dossier/researchPlanRevisionPersistence.ts`
   - current Dossier head + ResearchTask binding gate only;
3. `apps/web/tests/research-plan-revision-persistence.contract.test.ts`
   - deterministic Mongo-mocked contract tests;
4. `.github/workflows/web-ci.yml`
   - one focused T2C1 contract invocation only.

No existing T2B schema path needs to change unless the separate authorization
proves a concrete compile-time need. A fifth path requires a new preflight.

## 16. Required implementation tests

The later T2C1 implementation must prove at least:

- first append creates revision 1;
- identical retry returns the existing revision without duplicate insert;
- changed plan appends revision 2 and preserves revision 1 byte-for-byte at the
  semantic payload level;
- concurrent sequence collision retries without overwrite;
- invalid T2B plan is rejected;
- stale Dossier revision is rejected;
- malformed Dossier head is rejected;
- missing ResearchTask is rejected;
- ResearchTask bound to another Dossier revision is rejected;
- unknown schema version fails closed on read;
- no requirement/task/Dossier state is auto-promoted;
- no writes touch Dossier revisions, ResearchTask status, RunReceipt or Alpha2;
- fixed canonical-hash vectors are stable.

## 17. Explicit non-goals

T2C1 does not authorize:

- Alpha2 research-run creation;
- run/checkpoint/lease/recovery logic;
- provider execution or search/fetch;
- model-call/cost metering;
- closing ResearchPlan requirements;
- evidence verification or promotion;
- source independence inference;
- freshness inference from successful persistence;
- Dossier finding creation;
- auto-publish, auto-vote or decision activation;
- T9/G6 runtime work;
- changes to #629 or #644 owners.

## 18. T2C2/T2C3 dependency result

T2C2 remains blocked until a stable plan-revision reference exists on merged
main.

T2C3 remains a separate metering responsibility and may be preflighted only if it
does not modify the T2C1 owner or bypass Alpha2's current hard budget gates.

T2D remains blocked on full T2C acceptance.

## 19. Next allowed step

```text
NEXT_ALLOWED_STEP=FRESH_MAIN_T2C1_IMPLEMENTATION_AUTHORIZATION
T2C1_IMPLEMENTATION_AUTHORIZED=false
T2C2_IMPLEMENTATION_AUTHORIZED=false
T2C3_IMPLEMENTATION_AUTHORIZED=false
T2D_BLOCKED_ON_T2C=true
```

A separate authorization must re-check fresh `main`, open PR collisions and this
exact owner/collection decision. Only after that authorization is merged may the
four-path T2C1 implementation branch be created.
