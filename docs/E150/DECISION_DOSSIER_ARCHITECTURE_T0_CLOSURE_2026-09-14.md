# T0 Closure — Decision Dossier Architecture Contract

Base: `7e81eff9cf285bf2137d5a9eff8c4ce808f5fcbf`.
Implementation: `8c5646ae2f954330dcb279850c301e1ea55025d8`.

The implementation is a pure TypeScript architecture contract and fixture suite.
It maps existing CanonicalTopic/DecisionQuestion, Dossier/ResearchTask, Atomic
Claim/Evidence, Dossier revision, Poll/TopicRound and Public Guard owners; it
does not introduce a store, migration, runtime, provider, publish or decision
activation. Material revision invalidates a DecisionBinding architecturally;
hard material gaps cannot be compensated by a score. T1 remains downstream and
blocked pending T0 merge.
