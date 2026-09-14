# T0 Preflight — Decision Dossier Architecture Contract

```text
TASK=DECISION-DOSSIER-ARCHITECTURE-CONTRACT-01
ROLE=T0
BASE_MAIN_SHA=7e81eff9cf285bf2137d5a9eff8c4ce808f5fcbf
PREFLIGHT_RESULT=PASS_REVALIDATED
CURRENT_IMPLEMENTATION_AUTHORIZED=true
T1_IMPLEMENTATION_AUTHORIZED=false
NO_RUNTIME=true
NO_MIGRATION=true
NO_PROVIDER=true
NO_PUBLISH=true
```

This ports the reviewed PR #790 preflight evidence without changing its owner
matrix or its T0/T1 boundary. Revalidation on current main found the same
canonical owners: CanonicalTopic/DecisionQuestion for system questions,
Dossier plus ResearchTask for research, Atomic Claim/Evidence for epistemic
references, Dossier revisions for revision provenance, Poll/TopicRound for
decision ownership, and the existing Public Question Guard for public release.

The T0 contract is limited to pure owner, reference, epistemic and readiness
validation. It creates no Dossier, Evidence, Topic, Scenario, DecisionBinding,
runtime, persistence, provider, queue, publish or activation path. Swedish
pension comparison, low-data jurisdiction, measurement/operationalization,
source-family, fact/value, revision, owner, task-boundary and public-guard
fixtures remain required acceptance evidence. T1 classification remains blocked
until this T0 task is merged and done.
