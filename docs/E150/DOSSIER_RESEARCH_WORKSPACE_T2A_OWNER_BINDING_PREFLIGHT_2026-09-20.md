# T2A Fresh-Main Preflight — ResearchTask ↔ Dossier Owner Binding

Date: 2026-09-20

Parent task: `DOSSIER-RESEARCH-WORKSPACE-01`

Slice: `T2A_RESEARCH_OWNER_BINDING`

Fresh-main basis: `main@a696754a7c2cae23a863d4e2c8aed1adcac9ad94`

```text
TASK_PREFLIGHT=PASS
PARENT_PREFLIGHT_PR=928
PARENT_RESULT=FAIL_SPLIT_REQUIRED
T1_DEPENDENCY=PASS
CANONICAL_OWNER_DISCOVERY=PASS
CALLSITE_COMPATIBILITY=PASS_WITH_ADDITIVE_BINDING
COLLISION_PREFLIGHT=PASS_WITH_SEMANTIC_BOUNDARIES
PERSISTENCE_PATH=EXISTING_RESEARCH_TASKS_ONLY
NEW_DB_COLLECTIONS_REQUIRED=0
SIZE_GATE=PASS
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
NEXT_SAFE_WORK=T2A_SEPARATE_IMPLEMENTATION_AUTHORIZATION_ONLY
```

## 1. Decision

The T2 parent preflight merged through PR #928 and requires T2A to close the
canonical owner gap before any ResearchPlan/WorkItem implementation begins.

The gap can be closed as one bounded owner-hardening slice without a new
collection, migration, API route, provider call, queue, UI surface or package.
The canonical research owner remains `core/research`; the canonical dossier and
revision owner remains `features/dossier`.

The required operation is not a generic mutable field. A dossier-bound
`ResearchTask` needs one explicit immutable snapshot binding to a canonical
Dossier head. The first binding is allowed only after reading a real current
Dossier from the canonical `dossiers` collection. Rebinding the same task to a
different Dossier or a different revision snapshot must fail closed.

This preflight does not itself authorize code. A separate implementation
authorization is required after this document is integrated.

## 2. Canonical owners found on fresh main

### ResearchTask owner

`core/research/types.ts` defines the current `ResearchTask` and
`ResearchTaskSource` contract.

`core/research/store.ts` owns the persistent collections:

```text
researchTasks
researchContributions
```

Existing task lifecycle is:

```text
open | in_progress | completed | archived
```

Existing community/admin routes and UI import `@core/research`; there is no
separate dossier-research task store.

### Dossier/revision owner

`features/dossier/schemas.ts` defines canonical persisted Dossier state with:

```text
dossierId
revisionSeq?
lastRevisionHash?
lastRevisionAt?
```

`features/dossier/db.ts` owns the `dossiers` collection and updates the canonical
head when the revision hash chain advances. `features/dossier/revisionHash.ts`
uses SHA-256, so a normal canonical revision hash is a 64-character hexadecimal
value.

T2A may read this owner. It may not create a second Dossier ID, second revision
namespace or independent research revision counter.

## 3. Exact owner gap

Current `ResearchTask` has no durable reference to a canonical Dossier or to the
Dossier revision snapshot under which the task was created/bound.

That prevents the accepted T0 invariant

```text
ResearchObject = Dossier + ResearchTask
canonicalReference = dossier ID
```

from being represented durably.

Storing a Dossier ID only inside a future `ResearchPlan` would not solve the
problem: the canonical `ResearchTask` could still float between dossiers and the
plan would become a parallel owner. T2A therefore binds the existing owner
first.

## 4. Proposed binding contract

The additive research-domain type may be exactly equivalent to:

```ts
export interface ResearchTaskDossierBinding {
  dossierId: string;
  dossierRevisionSeq: number;
  dossierRevisionHash: string;
}
```

and `ResearchTask` may expose:

```ts
dossierBinding?: ResearchTaskDossierBinding;
```

The field stays optional so existing non-dossier community ResearchTasks remain
valid and readable without migration/backfill.

A valid canonical binding requires all of:

- non-empty `dossierId`;
- positive integer `dossierRevisionSeq`;
- 64-hex `dossierRevisionHash`;
- matching current canonical Dossier head at binding time.

Missing/malformed revision head fails closed. T2A must not fabricate revision
`0`, synthesize a hash, or silently bind to an unversioned Dossier when the hash
chain is unavailable/disabled.

## 5. Generic save boundary

Adding `dossierBinding` to `ResearchTask` must **not** make the existing generic
`saveTask` operation authoritative for owner binding.

The implementation must change its write input so `dossierBinding` is excluded
from generic create/update input. Existing callers may continue to change title,
description, status, tags, level, hints and other current task metadata, but they
cannot set, clear or replace Dossier ownership through the generic save path.

This preserves backward compatibility for the existing admin/community research
routes and prevents accidental owner mutation from request bodies that are
spread into the current save function.

## 6. Atomic binding operator

`core/research/store.ts` may add one explicit operation such as:

```text
bindResearchTaskToDossier(taskId, canonicalBinding)
```

It must use only the existing `researchTasks` collection.

Required persistence behavior:

1. invalid task ID -> fail closed;
2. no upsert;
3. first binding succeeds only when the field is absent;
4. delivery of the exact same binding is idempotent;
5. a different Dossier ID fails closed;
6. same Dossier but different revision sequence/hash fails closed;
7. malformed pre-existing binding fails closed;
8. concurrent attempts cannot win with two different bindings;
9. `$set` is limited to the binding plus normal `updatedAt` bookkeeping.

The write therefore needs a compare-and-set filter equivalent to:

```text
task ID AND (
  dossierBinding absent
  OR dossierBinding exactly equals requested canonical snapshot
)
```

A generic read-then-write without CAS is insufficient because two concurrent
binders could otherwise reassign canonical ownership.

## 7. Dossier-domain bridge

The research store must not guess whether a free-standing Dossier ID/revision is
canonical. A narrow Dossier-domain bridge is therefore justified:

```text
features/dossier/researchTaskBinding.ts
```

It may:

1. read the exact canonical Dossier from existing `dossiersCol()`;
2. require valid `revisionSeq` and `lastRevisionHash`;
3. construct the canonical `ResearchTaskDossierBinding` snapshot;
4. call the explicit ResearchTask CAS binder;
5. expose a pure stale-check helper comparing an existing binding with a current
   canonical Dossier head.

It may not write Dossier state, append Dossier revisions, verify evidence, create
a ResearchPlan or trigger research/provider execution.

This direction preserves ownership: Dossier validates its current head;
`core/research` owns the task field and its CAS write.

## 8. Staleness semantics

A bound ResearchTask represents the Dossier snapshot under which its research
scope was defined. It does not automatically rebind when the Dossier changes.

A stale check must return stale/fail-closed when any of these differ or are
malformed:

```text
dossierId
dossierRevisionSeq
dossierRevisionHash
```

Later T2B/T2C work may decide how a stale task is superseded/replanned. T2A only
makes staleness detectable; it must not silently update the binding to the newest
revision.

## 9. Callsite compatibility

Fresh-main search shows current research APIs/UI consume `@core/research` and do
not require a Dossier binding for ordinary community ResearchTasks.

The important compatibility rule is therefore:

```text
legacy/unbound ResearchTask = still valid
bound ResearchTask = additive stronger invariant
```

No current route needs to be changed in T2A because no public/admin route is
authorized to create a Dossier binding yet. The binding bridge will be consumed
only by later separately authorized T2 work.

## 10. Collision preflight

### Merged source slices #910 / #911 / #913

These source-intelligence merges touched only `features/feeds`, focused tests and
`apps/web/package.json`. They do not touch the T2A owner boundary.

### Open source slices #915 / #916 / #929

Exact changed-file checks show these remain in Open Data cycle/health/scheduler,
cron tests/routes, package metadata and `vercel.json`. None changes
`core/research/types.ts`, `core/research/store.ts` or Dossier owner files.

### Open PR #912

#912 owns autonomous research-finding → review-first Dossier candidate handoff.
It does not change `core/research/types.ts` or `core/research/store.ts` and must
not become the T2 ResearchPlan/binding owner.

### Open Dossier cockpit work

#872 and older cockpit variants are public projection/UI work. T2A has no UI
scope and must not depend on them.

### Historical T0→T8 integration branch

Old integration PR #841 remains non-authoritative/draft relative to the serial
mainline implementation. T2A must be implemented from current main, not copied
wholesale from that branch.

No open PR was found claiming the two canonical `core/research` owner files for
a competing T2 implementation.

## 11. Proposed exact implementation boundary

A later T2A implementation may be safely bounded to **at most five files**:

1. `core/research/types.ts`
   - additive binding type + optional ResearchTask field only.
2. `core/research/store.ts`
   - exclude binding from generic save input;
   - explicit CAS binding operator on existing `researchTasks` only.
3. `features/dossier/researchTaskBinding.ts`
   - new narrow canonical Dossier-head lookup/binding bridge + stale helper.
4. `apps/web/tests/research-dossier-binding.contract.test.ts`
   - focused owner/CAS/staleness/backward-compatibility tests.
5. `.github/workflows/web-ci.yml`
   - only the minimal focused T2A test invocation.

No other file is implied by this preflight.

```text
TOTAL_CHANGED_FILES_MAX=5
EXISTING_DB_COLLECTION_WRITES=researchTasks
EXISTING_DB_COLLECTION_READS=dossiers
NEW_DB_COLLECTIONS=0
NEW_SCHEMA_MIGRATIONS=0
NEW_API_ROUTES=0
NEW_PROVIDER_CALLS=0
NEW_QUEUES=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
NEW_UI_SURFACES=0
```

## 12. Required focused tests

The implementation authorization should require at least these cases:

1. legacy unbound ResearchTask remains readable/valid;
2. unknown Dossier is rejected;
3. missing revision sequence is rejected;
4. missing/malformed revision hash is rejected;
5. canonical current Dossier head binds successfully;
6. exact same binding replay is idempotent;
7. different Dossier rebind is rejected;
8. same Dossier with different revision sequence/hash rebind is rejected;
9. missing task is not upserted;
10. generic `saveTask` cannot set/rebind/clear the canonical binding;
11. concurrent/conflicting bind shape is protected by CAS filter;
12. stale helper detects Dossier ID/seq/hash change and malformed state;
13. only canonical `dossiers` read + existing `researchTasks` write are used;
14. no task completion, source presence or model confidence is interpreted as
    evidence truth, Dossier completeness or decision readiness.

## 13. Explicit non-scope

T2A does not authorize:

- `ResearchPlan` or WorkItem model;
- research runs/checkpoints;
- provider/search/source execution;
- automatic task seeding from Dossier state;
- contribution acceptance automation;
- evidence verification;
- graph merge;
- source truth promotion;
- Dossier publication;
- Poll/TopicRound/decision activation;
- public workspace projection;
- task auto-rebinding on Dossier revision;
- migration/backfill of existing tasks;
- new database collection;
- changes to `docs/E150/OpenTasks.md` from a partial connector read.

## 14. Stop conditions

Return to preflight with `FAIL_SCOPE_EXPANSION` if implementation requires any
of:

- a sixth changed file;
- a new collection or migration;
- modifying `features/dossier/db.ts` or `features/dossier/schemas.ts` rather than
  consuming their existing owner contract;
- changing existing research API/UI routes;
- provider/runtime orchestration;
- ResearchPlan/run/checkpoint state;
- publication or decision activation;
- evidence/truth promotion;
- package or browser persistence changes.

## 15. Next safe action

```text
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
T2A_IMPLEMENTATION_AUTHORIZED=false
NEXT_ALLOWED_STEP=FRESH_MAIN_T2A_BOUNDED_IMPLEMENTATION_AUTHORIZATION
```

The authorization must repeat the exact five-file maximum and explicitly limit
persistence to the existing `researchTasks` binding field with canonical
`dossiers` read-only validation.