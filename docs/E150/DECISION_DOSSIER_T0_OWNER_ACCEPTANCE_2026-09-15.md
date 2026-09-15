# T0 Owner Acceptance Checklist

This is a manual checklist, not acceptance evidence. Mark each item PASS or FAIL.
It assesses T0's architecture-contract boundary only: T0 consumes canonical
resolution receipts and fails closed when required receipts are absent. It
validates supplied receipt data rather than authenticating their provenance. A
passing row does not certify fact truth, evidence or source authenticity,
source independence, reviewer authority, actual freshness, source retrieval or
conflict adjudication.

| Check | What to look at | Expected result | PASS / FAIL |
| --- | --- | --- | --- |
| SystemQuestion ownership | Owner registry | CanonicalTopic + DecisionQuestion remain owners | |
| Research ownership | Owner registry | Dossier + ResearchTask remain owners | |
| Scenario ownership | T0 boundary | Scenario work stays downstream in T4 | |
| Decision ownership | Owner registry | Poll/TopicRound remains decision owner | |
| Epistemic separation | Compatibility matrix | Claim-form categories remain distinct; no label alone presents a verified fact | |
| Sweden comparator | Sweden fixture | Supplied comparator references are structurally referenceable; T0 does not establish transferability to Germany | |
| Low-data case | Low-data fixture | A supplied material `UNKNOWN` state structurally blocks decision readiness; T0 does not determine dataset completeness | |
| Metric definitions | Comparison fixtures | Different supplied definitions remain distinct; T0 does not adjudicate a factual contradiction | |
| Material gaps | Readiness fixtures | Missing canonical materiality-review resolution blocks readiness; a `reviewed` string alone does not verify review | |
| Revision changes | Binding fixture | A supplied material-revision difference makes binding structurally stale; T0 does not judge materiality itself | |
| T0 boundary | Boundary fixture | No scenario, research success, activation or publish action | |
| Public Guard | Public fixture | No public release or G1 bypass | |
| One canonical truth | Owner registry and imports | No new dossier, decision or evidence owner; canonical downstream resolution owners remain authoritative | |

## Concrete owner checks

For every check below, tick exactly one result: [ ] PASS  [ ] FAIL.

| What this means | Example input | Expected result | Owner result |
| --- | --- | --- | --- |
| Quantified factual claims remain factual-claim form | “Der Beitragssatz beträgt 18,6 %.”; canonical semantic `quantified_claim` | Not presented as a verified fact without canonical verified-evidence resolution; never opinion, value or projection | [ ] PASS [ ] FAIL |
| A projection stays a projection | “Der Beitragssatz könnte 2040 bei 22 % liegen.”; `prediction` | Projection claim-form, never a verified measurement without canonical resolution | [ ] PASS [ ] FAIL |
| A value judgment stays normative | “22 % wäre gerecht.”; `normative_position` | Normative claim-form, never a factual-claim category or verified fact | [ ] PASS [ ] FAIL |
| Unknown remains visible | Unknown source/state | UNKNOWN; extra text, citations or raw references never promote it to a verified fact | [ ] PASS [ ] FAIL |
| Comparison is not transfer | Sweden pension system versus Germany | Comparison allowed; transfer requires canonical resolution, and a `reviewed` string alone does not establish it | [ ] PASS [ ] FAIL |
| Missing expected receipt blocks readiness | Material question; no robust baseline or comparator | Missing required canonical resolution receipt yields structurally `decision_ready=false` | [ ] PASS [ ] FAIL |
| Definitions are not silently merged | Rentenniveau versus cross-pillar net replacement rate | Requires canonical harmonization; T0 does not decide semantic equality or a factual contradiction | [ ] PASS [ ] FAIL |
| Operations remain distinct | Unterrichtsversorgung versus Unterrichtsausfall | Different supplied operation labels remain distinct; T0 does not adjudicate equivalence | [ ] PASS [ ] FAIL |
| Reposts share structural lineage | Original study → agency report → repost | One structural lineage root; verified source independence requires canonical SourceFamily/independence resolution | [ ] PASS [ ] FAIL |
| Material revision invalidates a binding | Projection revision r1 → r2 | A supplied material-revision difference makes the DecisionBinding structurally stale | [ ] PASS [ ] FAIL |
| Incomplete material scope blocks readiness | Missing declared required material dimension | `decision_ready=false`; T0 does not itself determine completeness | [ ] PASS [ ] FAIL |
| T0 remains a boundary | Scenario generation, recommendation, research success, activation, publish | All denied | [ ] PASS [ ] FAIL |
| Public Guard remains intact | Attempt to release a public candidate | T0 cannot bypass G1 | [ ] PASS [ ] FAIL |
| Ownership remains singular | SystemQuestion / Research / Decision owners | CanonicalTopic+DecisionQuestion; Dossier+ResearchTask; Poll/TopicRound | [ ] PASS [ ] FAIL |
