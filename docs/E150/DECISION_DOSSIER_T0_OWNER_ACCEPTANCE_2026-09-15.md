# T0 Owner Acceptance Checklist

This is a manual checklist, not acceptance evidence. Mark each item PASS or FAIL.

| Check | What to look at | Expected result | PASS / FAIL |
| --- | --- | --- | --- |
| SystemQuestion ownership | Owner registry | CanonicalTopic + DecisionQuestion remain owners | |
| Research ownership | Owner registry | Dossier + ResearchTask remain owners | |
| Scenario ownership | T0 boundary | Scenario work stays downstream in T4 | |
| Decision ownership | Owner registry | Poll/TopicRound remains decision owner | |
| Epistemic separation | Compatibility matrix | Fact, measurement, estimate, projection, opinion, value and UNKNOWN remain distinct | |
| Sweden comparator | Sweden fixture | Referenceable, never silently transferable to Germany | |
| Low-data case | Low-data fixture | Material uncertainty blocks decision readiness | |
| Metric definitions | Comparison fixtures | Different definitions are not falsely contradicted | |
| Material gaps | Readiness fixtures | Reviewed material gaps block readiness | |
| Revision changes | Binding fixture | Material revision makes binding stale | |
| T0 boundary | Boundary fixture | No scenario, research success, activation or publish action | |
| Public Guard | Public fixture | No public release or G1 bypass | |
| One canonical truth | Owner registry and imports | No new dossier, decision or evidence owner | |

## Concrete owner checks

For every check below, tick exactly one result: [ ] PASS  [ ] FAIL.

| What this means | Example input | Expected result | Owner result |
| --- | --- | --- | --- |
| Quantified facts stay factual, not opinion or value | “Der Beitragssatz beträgt 18,6 %.”; canonical semantic `quantified_fact` | Factual/quantified, never opinion, value or projection | [ ] PASS [ ] FAIL |
| A projection stays a projection | “Der Beitragssatz könnte 2040 bei 22 % liegen.”; `prediction` | Projection, never measurement | [ ] PASS [ ] FAIL |
| A value judgment stays normative | “22 % wäre gerecht.”; `normative_position` | Normative judgment, never fact | [ ] PASS [ ] FAIL |
| Unknown remains visible | Unknown source/state | UNKNOWN, never asserted truth | [ ] PASS [ ] FAIL |
| Comparison is not transfer | Sweden pension system versus Germany | Comparison allowed; transfer requires review | [ ] PASS [ ] FAIL |
| Missing evidence blocks a decision | Material question; no robust baseline or comparator | `decision_ready=false` | [ ] PASS [ ] FAIL |
| Definitions are not silently merged | Rentenniveau versus cross-pillar net replacement rate | Requires harmonization, not a factual contradiction | [ ] PASS [ ] FAIL |
| Operations remain distinct | Unterrichtsversorgung versus Unterrichtsausfall | Not automatically equivalent | [ ] PASS [ ] FAIL |
| Reposts are not independent sources | Original study → agency report → repost | One independent evidence family | [ ] PASS [ ] FAIL |
| Material revision invalidates a binding | Projection revision r1 → r2 | Existing DecisionBinding becomes stale | [ ] PASS [ ] FAIL |
| Incomplete material scope blocks readiness | Missing material dimension | `decision_ready=false` | [ ] PASS [ ] FAIL |
| T0 remains a boundary | Scenario generation, recommendation, research success, activation, publish | All denied | [ ] PASS [ ] FAIL |
| Public Guard remains intact | Attempt to release a public candidate | T0 cannot bypass G1 | [ ] PASS [ ] FAIL |
| Ownership remains singular | SystemQuestion / Research / Decision owners | CanonicalTopic+DecisionQuestion; Dossier+ResearchTask; Poll/TopicRound | [ ] PASS [ ] FAIL |
