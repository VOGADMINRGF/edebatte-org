# T0 Closure — Decision Dossier Architecture Contract

## Current repair state

```text
CURRENT_BASE_MAIN_SHA=0c4938dded685783582ac6a4c46fba9cd3e2627a
CURRENT_REPAIR_HEAD_SHA=c49a44da574dc815fea008df17fb0b5166211785
IMPLEMENTATION_COMPLETE=true
OWNER_ACCEPTANCE=false
T0_GLOBAL_DONE=false
T0_STATUS=review
T1_STATUS=blocked
ARCHITECTURE_REVIEW=self-review pending
CI_STATUS=pending current head
```

## Historical implementation evidence

```text
ORIGINAL_BASE_MAIN_SHA=7e81eff9cf285bf2137d5a9eff8c4ce808f5fcbf
ORIGINAL_IMPLEMENTATION_SHA=f7b7f4dbf2fd8d01cc33886d9d91677ad958e43c
```

Files: `features/dossier/decisionDossierArchitectureContract.ts`,
`apps/web/tests/decision-dossier-architecture-contract.test.ts`, this closure,
the revalidated preflight and `docs/E150/OpenTasks.md`.

```text
SYSTEM_QUESTION_OWNER=CanonicalTopic + DecisionQuestion
RESEARCH_OBJECT_OWNER=Dossier + ResearchTask
SCENARIO_OWNER=Dossier scenario domain
DECISION_OWNER=Poll/TopicRound
EVIDENCE_OWNER=Atomic Claim + EvidenceAssessment
NON_GERMAN_FIXTURE=PASS
LOW_DATA_FIXTURE=PASS
MEASUREMENT_CONFLICT_FIXTURE=PASS
OPERATIONALIZATION_FIXTURE=PASS
SOURCE_FAMILY_FIXTURE=PASS
FACT_VALUE_FIXTURE=PASS
REVISION_INVALIDATION_FIXTURE=PASS
OWNER_FAIL_CLOSED_FIXTURE=PASS
T0_BOUNDARY_FIXTURE=PASS
PUBLIC_GUARD_FIXTURE=PASS
ARCHITECTURE_SECURITY_REVIEW=PASS
DB_CHANGES=none
MIGRATION_CHANGES=none
RUNTIME_CHANGES=none
PROVIDER_CHANGES=none
PUBLISH_CHANGES=none
T1_STATUS=blocked until T0 merge
```

The implementation is a pure TypeScript architecture contract and fixture suite.
It maps existing CanonicalTopic/DecisionQuestion, Dossier/ResearchTask, Atomic
Claim/Evidence, Dossier revision, Poll/TopicRound and Public Guard owners; it
does not introduce a store, migration, runtime, provider, publish or decision
activation. Material revision invalidates a DecisionBinding architecturally;
hard material gaps cannot be compensated by a score. T1 remains downstream and
blocked pending T0 completion after review and owner acceptance.

## Wave-1 truth repair (2026-09-15)

`IMPLEMENTATION_COMPLETE=true` for the pure contract only. The repaired contract
uses exact owner/reference validation, a closed epistemic compatibility matrix,
structured provenance, reviewed materiality, complete required dimensions and
two-way material-dependency staleness. Its fixtures execute contract logic rather
than asserting fixture literals. `OWNER_ACCEPTANCE=false` and `T0_GLOBAL_DONE=false`.
CI and architecture review remain required; no runtime or production completion is claimed.

## Epistemic trust boundary repair

T0 performs structural validation only. A factual claim form is never a
verified fact: verified factual or measurement presentation and material
decision readiness require a non-persisted resolution receipt from the existing
`AtomicClaim`/`EvidenceAssessment` owner. Raw reference strings, review labels,
freshness labels, root records and repetition do not establish verification or
independence. Unknown source-family independence remains fail-closed.
