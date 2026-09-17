# T0 Closure — Decision Dossier Architecture Contract

## Final acceptance state — 2026-09-17

```text
TASK=DECISION-DOSSIER-ARCHITECTURE-CONTRACT-01
ROLE=T0
ACCEPTED_CODE_HEAD=7dbfe3f4204c76f444014c1fdba9870dd8bb1092
ACCEPTED_CODE_HEAD_WEB_CI_RUN=2547
ACCEPTED_CODE_HEAD_WEB_CI_RUN_ID=35271192995
ACCEPTED_MERGE_CONTEXT_SHA=914b9460099e1ac4719238dbf317694e1db26955
MERGE_CONTEXT_MAIN_SHA=459e26f93bf2a000d7a6e03b6c4a88399c511228
OWNER_ACCEPTANCE=true
T0_GLOBAL_DONE=false
T0_STATUS=accepted_pending_merge
T1_STATUS=blocked_until_t0_merge
READY_FOR_MERGE=true
NO_RUNTIME=true
NO_MIGRATION=true
NO_PROVIDER=true
NO_PUBLISH=true
NO_DECISION_ACTIVATION=true
```

`ACCEPTED_CODE_HEAD` is the implementation head the owner accepted after the
final bounded semantic hardening. Documentation/status commits can produce a
later PR head; they do not change the accepted code head. `T0_GLOBAL_DONE`
remains false until the accepted slice actually lands on `main`. This avoids a
false-done state.

The dated “Current T0 task state — 2026-09-15” section in the retained preflight
is historical evidence. This closure is the later status authority for the T0
slice.

## Exact CI evidence

Web CI run `#2547` (`35271192995`) tested the accepted T0 head in merge context
with then-current `main` at `459e26f93bf2a000d7a6e03b6c4a88399c511228`.
The synthetic merge commit was
`914b9460099e1ac4719238dbf317694e1db26955`.

Results:

```text
WEB_SECURITY=PASS
WEB_CONTRACTS=PASS
WEB_QUALITY=PASS
GIT_DIFF_CHECK=PASS
REPOSITORY_INTEGRITY_SCRIPT=PASS
REPOSITORY_INTEGRITY_TESTS=25/25 PASS
T0_TEST_FILES=5/5 PASS
T0_NAMED_TESTS=50/50 PASS
LINT=PASS
TYPECHECK=PASS
BUILD=PASS
CRITICAL_GUARDRAILS=PASS
PRODUCTION_GUARDRAILS=PASS
```

The T0 command executes the architecture suite, permanent deterministic property
suite, semantic-edge suite, depth-retention suite and final-quality-reference-map
suite. The persistent generated property budget remains 2,750 cases and the
additional deterministic depth budget is 1,200 cases. The cross-domain suites
retain zero unsafe acceptances by contract.

The unrelated Create/operator-notification test harness can emit expected
`after was called outside a request scope` stderr while its tests still pass;
that is outside the pure T0 slice and did not fail Web CI.

## Final architecture contract

T0 maps existing owners rather than creating parallel domain truth:

```text
SYSTEM_QUESTION_OWNER=CanonicalTopic + DecisionQuestion
RESEARCH_OBJECT_OWNER=Dossier + ResearchTask
CONTEXT_OWNER=Dossier claim/source/revision domain
METRIC_OWNER=Atomic quantified claim + EvidenceAssessment
SCENARIO_OWNER=Dossier scenario domain
IMPACT_TRADEOFF_OWNER=Dossier evidence domain
COMPARATOR_OWNER=Dossier evidence domain
DECISION_OWNER=Poll/TopicRound
EVIDENCE_PUBLICATION_OWNER=AtomicClaim/EvidenceAssessment
```

The contract is pure TypeScript with type-only linkage to the canonical Atomic
Claim / EvidenceAssessment publication vocabulary. It adds no database owner,
store, migration, provider path, publication path, decision activation or
runtime orchestration.

## Epistemic and evidence boundary

T0 separates claim form from verified presentation. A factual claim is not a
verified fact merely because it is phrased factually. Verified factual
presentation requires the canonical EvidenceAssessment publication
classification and the required resolution/review/freshness/conflict/revision
receipt state.

A verified measurement is stricter: it requires canonical verified evidence
**and** complete metric provenance, including source/evidence references, metric
definition, period, population, unit and denominator. A material metric cannot
be decision-ready without that provenance.

T0 validates supplied canonical receipt data and fails closed when it is absent
or malformed. It does not itself retrieve sources, authenticate evidence,
establish real-world truth, authenticate reviewer authority, verify actual
freshness or adjudicate factual disputes.

## Source lineage and independence

Structural lineage and verified independence are separate concepts.

```text
WHITESPACE_LINEAGE_ID=invalid
WHITESPACE_PARENT_ID=invalid
DUPLICATE_LINEAGE_ID=invalid
MISSING_PARENT=invalid
SELF_PARENT=invalid
CYCLE=invalid
DUPLICATE_INDEPENDENCE_RESOLUTION=invalid
BLANK_INDEPENDENCE_FAMILY_ID=invalid
UNKNOWN_INDEPENDENCE=fail_closed
VERIFIED_INDEPENDENT_ROOT=requires canonical receipt
```

Conflicting duplicate independence resolutions fail closed independent of input
order. Reposts or translations cannot manufacture extra independent evidence
families.

## Comparator and transfer boundary

A comparator is structurally referenceable only when source jurisdiction,
target jurisdiction, institutions, contribution/benefit definitions and
language context are all meaningful and non-blank. Referenceability never means
transferability: a complete comparator still returns `requires_review`. T0 does
not infer that a foreign model should be transferred, nor does it automatically
transfer even within the same jurisdiction label.

The explicit Sweden → Germany fixture therefore checks the transfer boundary,
not a policy conclusion.

## Readiness and revision binding

The complete required-dimension set is fail-closed. Missing required dimensions,
material gaps, unresolved evidence, stale evidence, missing review receipts,
missing metric provenance or missing revision bindings block
`decisionReady=true`.

Decision bindings are stale when the bound revision changes, a material revision
changes, a material dependency is added/removed, or a revision key/value is
blank. No score can compensate for a hard material gap.

## Final T-track quality addendum mapping

`features/dossier/decisionDossierT0QualityReferenceMap.ts` maps the final T-track
quality contracts to existing canonical owners **reference-only**. It does not
create a second lifecycle, snapshot, actor-position, challenge, evidence or
publication truth.

The map locks:

- dossier lifecycle vocabulary,
- decision-context binding requirements,
- intra-actor conflict states,
- source-challenge states,
- explainability acceptance requirements.

The missing-question/scope review remains a T1 responsibility and is not
re-owned by T0. The dedicated quality-map test rejects missing, duplicate,
blank or drifted references and downstream-owner changes.

## Acceptance fixtures

```text
NON_GERMAN_COMPARATOR_FIXTURE=PASS
LOW_DATA_FIXTURE=PASS
METRIC_DEFINITION_HARMONIZATION_FIXTURE=PASS
UNTERRICHTSVERSORGUNG_VS_UNTERRICHTSAUSFALL_FIXTURE=PASS
SOURCE_LINEAGE_FIXTURE=PASS
SOURCE_INDEPENDENCE_GATE_FIXTURE=PASS
FACTUAL_CLAIM_VS_VERIFIED_FACT_FIXTURE=PASS
VERIFIED_MEASUREMENT_PROVENANCE_FIXTURE=PASS
MATERIAL_METRIC_READINESS_FIXTURE=PASS
REVISION_INVALIDATION_FIXTURE=PASS
OWNER_FAIL_CLOSED_FIXTURE=PASS
T0_BOUNDARY_FIXTURE=PASS
PUBLIC_RELEASE_DENIAL_FIXTURE=PASS
FINAL_QUALITY_REFERENCE_MAP_FIXTURE=PASS
```

These are architecture-contract fixtures. They do not claim that a real-world
political or policy statement has been proven true.

## Changed files in the accepted T0 PR

1. `.github/workflows/web-ci.yml`
2. `apps/web/package.json`
3. `apps/web/tests/decision-dossier-architecture-contract.test.ts`
4. `apps/web/tests/decision-dossier-t0-depth-regression.test.ts`
5. `apps/web/tests/decision-dossier-t0-property.test.ts`
6. `apps/web/tests/decision-dossier-t0-quality-reference-map.test.ts`
7. `apps/web/tests/decision-dossier-t0-semantic-edge.test.ts`
8. `docs/E150/DECISION_DOSSIER_ARCHITECTURE_T0_CLOSURE_2026-09-14.md`
9. `docs/E150/DECISION_DOSSIER_ARCHITECTURE_T0_PREFLIGHT_2026-09-14.md`
10. `docs/E150/DECISION_DOSSIER_T0_OWNER_ACCEPTANCE_2026-09-15.md`
11. `features/dossier/decisionDossierArchitectureContract.ts`
12. `features/dossier/decisionDossierT0QualityReferenceMap.ts`

## Remaining findings

```text
T0_SCOPE_P0_REMAINING=0
T0_SCOPE_P1_REMAINING=0
T0_SCOPE_P2_REMAINING=0
OWNER_ACCEPTANCE=true
READY_FOR_MERGE=true
T0_GLOBAL_DONE=false
T1_STATUS=blocked_until_t0_merge
```

No further T0 hardening wave is justified without a concrete counterexample.
The next T-track step after merge and post-merge status synchronization is T1 —
Topic Qualification / System Question. Production E2E, real source retrieval,
provider behavior and the Golden Cases remain later gates and must not be
misreported as T0 completion evidence.
