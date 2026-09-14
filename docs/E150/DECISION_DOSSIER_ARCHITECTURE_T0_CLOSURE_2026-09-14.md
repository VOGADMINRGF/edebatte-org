# T0 Closure — Decision Dossier Architecture Contract

Base: `7e81eff9cf285bf2137d5a9eff8c4ce808f5fcbf`.
Implementation: `f7b7f4dbf2fd8d01cc33886d9d91677ad958e43c`.

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
blocked pending T0 merge.
