# T2A Implementation Authorization — ResearchTask ↔ Dossier Owner Binding

Date: 2026-09-20

```text
TASK=DOSSIER-RESEARCH-WORKSPACE-01
SLICE=T2A_RESEARCH_OWNER_BINDING
AUTHORIZATION_KIND=BOUNDED_IMPLEMENTATION
SOURCE_PREFLIGHT_PR=930
SOURCE_PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
BASE_MAIN_SHA=cb6343d4bd3494bf8a94f5278dc0fd02ca917ef2
IMPLEMENTATION_AUTHORIZED=true
EXISTING_PERSISTENCE_AUTHORIZED=true
PERSISTENCE_WRITE_SCOPE=researchTasks.dossierBinding_only
PERSISTENCE_READ_SCOPE=dossiers.current_head_only
NEW_DB_COLLECTIONS_AUTHORIZED=false
SCHEMA_MIGRATION_AUTHORIZED=false
API_ROUTE_AUTHORIZED=false
PROVIDER_AUTHORIZED=false
QUEUE_AUTHORIZED=false
UI_AUTHORIZED=false
BROWSER_PERSISTENCE_AUTHORIZED=false
PACKAGE_AUTHORIZED=false
DOSSIER_WRITE_AUTHORIZED=false
PUBLISH_AUTHORIZED=false
DECISION_ACTIVATION_AUTHORIZED=false
AUTO_TRUTH_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Authorized boundary

This authorization consumes merged T2A preflight PR #930. It authorizes only the canonical owner binding between an existing `ResearchTask` and the current canonical Dossier revision snapshot.

The implementation may change at most these five paths:

1. `core/research/types.ts`
   - additive `ResearchTaskDossierBinding` type;
   - optional `ResearchTask.dossierBinding` field.
2. `core/research/store.ts`
   - exclude `dossierBinding` from generic `saveTask` authority;
   - add one explicit compare-and-set binding operator using the existing `researchTasks` collection only.
3. `features/dossier/researchTaskBinding.ts`
   - new narrow bridge that reads the canonical current Dossier head, validates it and delegates the write to the ResearchTask owner;
   - may expose a pure stale-check helper.
4. `apps/web/tests/research-dossier-binding.contract.test.ts`
   - focused owner/CAS/staleness/backward-compatibility contracts.
5. `.github/workflows/web-ci.yml`
   - only the minimal focused T2A test invocation.

No other path is authorized.

```text
TOTAL_CHANGED_FILES_MAX=5
CORE_RESEARCH_OWNER_FILES_MAX=2
DOSSIER_BRIDGE_FILES_MAX=1
FOCUSED_TEST_FILES_MAX=1
CI_FILES_MAX=1
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

## Canonical ownership

`core/research` remains the canonical owner of `ResearchTask`, `researchTasks` and the binding field itself.

`features/dossier` remains the canonical owner of Dossier identity and revision truth. The bridge may read the existing `DossierDoc` head fields:

```text
dossierId
revisionSeq
lastRevisionHash
```

T2A may not create a second Dossier identifier, second Dossier revision counter, second ResearchTask store or ResearchPlan store.

The Dossier bridge must not write `dossiers`, append revisions, update counts, publish, activate or mutate any decision state.

## Authorized binding contract

The implementation may add a type equivalent to:

```ts
export interface ResearchTaskDossierBinding {
  dossierId: string;
  dossierRevisionSeq: number;
  dossierRevisionHash: string;
}
```

and the existing `ResearchTask` may expose:

```ts
dossierBinding?: ResearchTaskDossierBinding;
```

The field must remain optional. Existing unbound community/admin ResearchTasks remain valid and require no migration/backfill.

A valid requested binding requires:

- non-empty `dossierId`;
- positive integer `dossierRevisionSeq`;
- 64-character hexadecimal `dossierRevisionHash`;
- equality with the current canonical Dossier head at binding time.

Missing or malformed canonical revision state fails closed. The implementation must not fabricate revision `0`, synthesize a hash or silently treat an unversioned Dossier as bindable.

## Generic save authority is explicitly denied

`saveTask` must not gain authority over the canonical owner binding.

Its write input must exclude `dossierBinding`, and its current payload construction must continue to omit the field. Existing callers may still update the metadata they already own, but cannot set, replace or clear Dossier ownership through the generic save path.

No existing research API/UI route is authorized for modification in T2A.

## Required CAS semantics

The explicit ResearchTask binding operator must use the existing `researchTasks` collection only and must satisfy all of the following:

1. invalid task ID fails closed;
2. invalid requested binding fails closed;
3. missing task fails closed and is never upserted;
4. first valid binding succeeds only when no binding exists;
5. exact same binding replay is idempotent;
6. a different Dossier ID fails closed;
7. same Dossier with a different revision sequence or hash fails closed;
8. malformed pre-existing binding fails closed;
9. concurrent conflicting attempts cannot produce two winning bindings;
10. the write is limited to the binding plus ordinary `updatedAt` bookkeeping.

A plain read-then-unconditional-write is not sufficient. The first write must be compare-and-set constrained to an unbound task, with a post-race re-read allowed only to classify an exact identical concurrent winner as idempotent success.

No automatic rebind is authorized when the Dossier head changes later.

## Dossier bridge requirements

`features/dossier/researchTaskBinding.ts` may only:

1. load an exact canonical Dossier from the existing `dossiersCol()` owner;
2. require a valid current revision sequence/hash;
3. construct the canonical binding snapshot;
4. call the explicit ResearchTask CAS binder;
5. compare an existing binding with a current Dossier head to report stale/current state.

Unknown Dossier or malformed current head must fail closed before any ResearchTask write.

The stale helper must treat any malformed or changed `dossierId`, revision sequence or revision hash as stale/fail-closed. It must not mutate either owner.

## Required focused tests

The implementation must prove at least:

1. legacy unbound ResearchTask remains readable/valid;
2. unknown Dossier is rejected;
3. missing revision sequence is rejected;
4. missing/malformed revision hash is rejected;
5. current canonical Dossier head binds successfully;
6. exact same binding replay is idempotent;
7. different-Dossier rebind is rejected;
8. same-Dossier different revision sequence/hash rebind is rejected;
9. missing task is not upserted;
10. generic `saveTask` cannot set/rebind/clear the binding;
11. conflicting concurrent first binds are protected by CAS semantics;
12. stale helper detects Dossier ID/sequence/hash drift and malformed state;
13. only canonical `dossiers` read plus existing `researchTasks` write are used;
14. task status, contribution status, source presence or model confidence never imply evidence truth, Dossier completeness, publication readiness or decision readiness.

## Explicit non-scope

This authorization does not permit:

- `ResearchPlan` or WorkItem implementation;
- research runs/checkpoints;
- provider/search/source execution;
- automatic task seeding from Dossier state;
- contribution acceptance automation;
- evidence verification or truth promotion;
- graph merge;
- Dossier revisions/writes/publication;
- Poll/TopicRound/decision activation;
- public workspace projection;
- automatic task rebinding after a Dossier revision;
- migration/backfill of existing tasks;
- a new database collection;
- package or browser state changes;
- `docs/E150/OpenTasks.md` modification from a partial/truncated connector read.

## Stop conditions

Stop with `FAIL_SCOPE_EXPANSION` and return to preflight if implementation requires any of:

- a sixth changed file;
- modification of `features/dossier/db.ts` or `features/dossier/schemas.ts`;
- a new collection or migration;
- an API/UI route change;
- provider/runtime orchestration beyond the narrow owner bridge;
- ResearchPlan/run/checkpoint state;
- Dossier write/revision append;
- publication, voting or decision action;
- evidence/truth promotion;
- package or browser persistence changes.

## Merge gate

The later implementation PR may merge only when rebuilt/refreshed from then-current `main`, its diff is within this exact five-file boundary, zero unresolved review threads remain, exact-head Web CI including the focused T2A contract is green, and no auto-publish, Dossier mutation or decision action is introduced.

```text
AUTHORIZATION_RESULT=IMPLEMENTATION_AUTHORIZED
NEXT_ALLOWED_STEP=FRESH_MAIN_T2A_OWNER_BINDING_IMPLEMENTATION
```
