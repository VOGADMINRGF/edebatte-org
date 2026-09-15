# T0 Closure — Decision Dossier Architecture Contract

## Current repair state

```text
CURRENT_BASE_MAIN_SHA=0c4938dded685783582ac6a4c46fba9cd3e2627a
CODE_HEAD_UNDER_ACCEPTANCE=273b88b4ec74d5c65e2aa7530c06a0f5c925cb98
CODE_HEAD_CI_AT_ACCEPTANCE=PASS
DOCUMENTATION_FOLLOW_UP_MAY_HAVE_LATER_PR_HEAD=true
CONTRACT_IMPLEMENTATION_COMPLETE=true
OWNER_ACCEPTANCE=false
T0_GLOBAL_DONE=false
T0_STATUS=review
T1_STATUS=blocked
ARCHITECTURE_REVIEW=architecture-contract self-review complete; project-owner acceptance pending
CI_STATUS=exact PR-head CI remains external GitHub evidence
```

`CODE_HEAD_UNDER_ACCEPTANCE` identifies the code head that passed the
adversarial acceptance suite. This documentation-only follow-up can produce a
later PR head; it is not represented as a self-referential SHA in this file.

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
SOURCE_LINEAGE_AND_INDEPENDENCE_GATE_FIXTURE=PASS
FACTUAL_CLAIM_FORM_AND_VALUE_SEPARATION_FIXTURE=PASS
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
T1_STATUS=blocked pending T0 review, owner acceptance and completion
```

The historical fixture labels record architecture-contract execution only. In
particular, they do not claim semantic verification of evidence authenticity,
source authenticity or independence, reviewer authority, actual freshness,
source retrieval, fact-check truth or conflict adjudication.

The implementation is a pure TypeScript architecture contract and fixture suite.
It maps existing CanonicalTopic/DecisionQuestion, Dossier/ResearchTask, Atomic
Claim/Evidence, Dossier revision, Poll/TopicRound and Public Guard owners; it
does not introduce a store, migration, runtime, provider, publish or decision
activation. A supplied material revision invalidates a DecisionBinding
architecturally; a supplied hard material gap cannot be structurally
compensated by a score. T1 remains downstream and blocked pending T0 completion
after review and owner acceptance.

## Wave-1 truth repair (2026-09-15)

`CONTRACT_IMPLEMENTATION_COMPLETE=true` for the pure contract only. The repaired contract
uses exact owner/reference validation, a closed epistemic compatibility matrix,
structured provenance references, a canonical materiality-review receipt gate,
required dimensions and two-way material-dependency staleness. Its fixtures
execute contract logic rather than asserting fixture literals.
`OWNER_ACCEPTANCE=false` and `T0_GLOBAL_DONE=false`. No runtime, production or
semantic-verification completion is claimed.

## Epistemic trust boundary repair

T0 validates architecture contracts only and therefore defines and enforces a
trust boundary, not semantic verification. A factual-claim form is never a
verified fact, and a raw reference is never verified evidence. Verified factual
or measurement presentation requires a non-persisted canonical
EvidenceAssessment resolution receipt; material decision readiness requires the
canonical materiality-review resolution receipt. The canonical downstream
Evidence/Research/Review owners are responsible for producing those receipts.
T0 consumes their provided receipt data as contract inputs and fails closed when
required receipts or states are absent.

A `reviewed` string is not verified review, a `fresh` string is not verified
freshness, and a structural lineage root is not a verified independent source.
Unknown source independence remains fail-closed until a canonical
SourceFamily-/independence-resolution is present. T0 validates only the
provided receipt data. It neither authenticates receipt provenance, evidence or
sources nor retrieves sources, establishes source independence, authenticates
reviewer authority, verifies actual freshness, fact-checks truth or adjudicates
conflicts.
