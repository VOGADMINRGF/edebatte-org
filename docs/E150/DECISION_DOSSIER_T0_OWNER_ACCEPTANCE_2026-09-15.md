# T0 Owner Acceptance — Decision Dossier Architecture Contract

## Acceptance record

```text
TASK=DECISION-DOSSIER-ARCHITECTURE-CONTRACT-01
ROLE=T0
OWNER_ACCEPTANCE_DATE=2026-09-17
OWNER_ACCEPTANCE=true
ACCEPTED_CODE_HEAD=7dbfe3f4204c76f444014c1fdba9870dd8bb1092
ACCEPTED_CODE_HEAD_WEB_CI_RUN=2547
ACCEPTED_CODE_HEAD_WEB_CI_RUN_ID=35271192995
ACCEPTED_MERGE_CONTEXT_SHA=914b9460099e1ac4719238dbf317694e1db26955
FINAL_PR_HEAD=4c169f0ecbe568a6848753247442480d5ad62065
FINAL_PR_WEB_CI_RUN=2556
FINAL_PR_WEB_CI_RUN_ID=35272256453
MERGE_PR=859
MERGED_MAIN_SHA=70e99a3be2ef2327e7c01df3aef711eef79f8f07
T0_GLOBAL_DONE=true
T0_STATUS=done
T1_STATUS=blocked_pending_master_hardening
NEXT_AUTHORIZED_WORK=WAVE2_CREATE_OWNERSHIP
```

The project owner granted T0 acceptance on the condition that any remaining
critical or subtle T0-contract gaps first be hardened. The final bounded
hardening closed the remaining concrete gaps found in review: verified
measurements now require canonical evidence plus complete metric provenance;
material metric readiness requires that same provenance; whitespace lineage
identifiers and duplicate/conflicting independence resolutions fail closed; and
comparators require explicit non-blank source/target context while never
implying transferability.

The accepted code head passed exact merge-context Web CI, and the final PR head
also passed Web CI run `#2556` before PR `#859` was merged. The accepted slice
landed on `main` as `70e99a3be2ef2327e7c01df3aef711eef79f8f07` on 2026-09-17.
Later status/documentation commits do not change the accepted code head above.

`T0_GLOBAL_DONE=true` now records both required facts: human owner acceptance and
actual integration into `main`. This is the post-merge status truth for the T0
architecture slice.

## Scope of acceptance

Owner acceptance covers the **T0 architecture contract boundary** only. T0
consumes canonical resolution receipts and fails closed when required receipts
or revision bindings are absent or malformed. Acceptance does **not** certify
real-world factual truth, evidence/source authenticity, source retrieval,
reviewer authority, actual freshness, factual conflict adjudication, provider
health, research runtime, public dossier E2E behavior, or any T1–T8
implementation.

| Check | Expected result | Owner result |
| --- | --- | --- |
| SystemQuestion ownership | `CanonicalTopic + DecisionQuestion` remain canonical owners | PASS |
| Research ownership | `Dossier + ResearchTask` remain canonical owners | PASS |
| Scenario ownership | Scenario work remains downstream in T4 | PASS |
| Decision ownership | `Poll/TopicRound` remains canonical decision owner | PASS |
| Epistemic separation | Claim form alone can never become a verified fact | PASS |
| Verified measurement | Requires canonical verified evidence **and** complete metric provenance | PASS |
| Material metric readiness | Missing definition/period/population/unit/denominator provenance blocks readiness | PASS |
| Comparator transfer boundary | Source and target context required; transfer always requires review | PASS |
| Low-data case | Material unknown/gap state blocks decision readiness | PASS |
| Metric definitions | Different supplied definitions are not silently equated | PASS |
| Source lineage | Structural roots remain distinct from verified source independence | PASS |
| Duplicate independence resolution | Duplicate/conflicting resolutions fail closed independent of input order | PASS |
| Material gaps | Missing canonical materiality/evidence resolution blocks readiness | PASS |
| Revision changes | Material revision change makes binding stale | PASS |
| T0 boundary | No scenario generation, research success, decision activation or publish action | PASS |
| Public Guard | T0 cannot release a public candidate or bypass downstream public guards | PASS |
| One canonical truth | No new dossier, decision, evidence, lifecycle or publication owner is created | PASS |
| Final-quality reference map | Lifecycle/snapshot/conflict/challenge/explainability requirements are reference-only and exact | PASS |

## Owner sanity cases

| Case | Expected T0 behavior | Result |
| --- | --- | --- |
| Quantified factual claim | May have factual claim form; not a verified fact without canonical verified-evidence resolution | PASS |
| Projection | Remains projection; never a verified measurement by label | PASS |
| Value judgment | Remains normative; never promoted to factual truth | PASS |
| Unknown | Remains visible and fail-closed | PASS |
| Sweden → Germany comparator | Referenceable only with complete context; transfer remains `requires_review` | PASS |
| Missing robust baseline/comparator | Material unresolved state yields `decisionReady=false` | PASS |
| Rentenniveau vs. cross-pillar replacement rate | Requires harmonization rather than silent equivalence | PASS |
| Unterrichtsversorgung vs. Unterrichtsausfall | Operational definitions remain distinct | PASS |
| Original study → agency → repost | One structural lineage root; verified independence needs canonical receipt | PASS |
| Projection revision r1 → r2 | Bound decision becomes stale | PASS |
| Missing required material dimension | `decisionReady=false` | PASS |
| Public release attempt from T0 | Denied | PASS |

## Acceptance boundary

This acceptance closes the human-owner gate for T0, and the merge of PR `#859`
closes the implementation/integration gate. T0 is therefore globally done for
its bounded architecture-contract scope.

This does **not** authorize feature T1 yet. The repository-hardening master
sequence remains in force; the next authorized work is Wave 2 Create ownership.
T1 stays blocked until that hardening sequence explicitly releases feature work.

No statement in this file turns T0 into an AI/provider test or a production E2E
acceptance; those are separate downstream gates under the T-track and Production
Definition of Done.
