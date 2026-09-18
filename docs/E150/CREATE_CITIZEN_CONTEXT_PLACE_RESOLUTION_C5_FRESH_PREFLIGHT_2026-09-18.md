# C5 — Citizen Context and Place Resolution — Fresh Preflight

Date: 2026-09-18

```text
TASK=CREATE-CITIZEN-CONTEXT-PLACE-RESOLUTION-01
ROLE=C5
BASE_MAIN=9261b975aff18dc33a181bb1ed130f75d97ae78b
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
C4_DEPENDENCY=done
SOURCE_PR=682
SOURCE_COMMITS=28e08cd6,52baa748,9a183863,d0444a90
NO_SECOND_RESOLVER_TRUTH=true
OFFICIAL_DIRECTORY_SOURCE_REUSED=true
C6_MATCHING_EXCLUDED=true
C7_CONFIRMATION_EXCLUDED=true
C8_SOURCE_ANALYSIS_EXCLUDED=true
C9_HANDOFF_EXCLUDED=true
```

## Result

C4 is merged and closed. C5 may proceed as a separate implementation slice.

The historical #682 source is mixed across later Create responsibilities and MUST NOT be merged or cherry-picked wholesale. C5 is limited to citizen context and place-resolution responsibilities only.

The repository already has the authoritative server-side regional directory infrastructure in `features/region/directory.ts`, including cached official-directory loading and `listOfficialMunicipalDirectoryEntries()`. C5 must reuse that source. It must not introduce a second municipality dataset, second region runtime, or generated parallel truth.

## Exact C5 contract

C5 owns:

- `CreateCitizenIntakeContext` and its C5-only supporting types;
- deterministic citizen-context derivation from contribution text;
- explicit contribution place outranking confirmed/profile fallback;
- confirmed context outranking profile suggestion;
- profile location remaining suggestion-only and never becoming fact silently;
- federal and EU concerns remaining federal/EU and never being reduced to a municipality;
- ambiguous place names remaining clarification;
- emergency/safety context surviving even when the AI planner is degraded or fails;
- citizenContext propagation through the existing Intelligent Followup result;
- the plain-language editable region chip in the existing Create composer;
- preservation of the same existing analysis/draft flow rather than creation of a second workflow.

C5 does NOT own:

- existing-topic matching or stance decisions (C6);
- official jurisdiction candidate confirmation, candidate keys, authority confirmation UI or administrative-level persistence (C7);
- authenticated source/link analysis (C8);
- canonical handoff/review persistence (C9);
- guest identity/adoption (C3/C4);
- new provider, persistence, API, cookie, browser storage, or publish authority.

## Runtime extraction boundary

Expected implementation scope, subject to exact-head drift recheck immediately before runtime work:

1. `apps/web/src/features/create/createContributionPackageContract.ts`
   - add only the C5 citizen-context type surface required by the runtime;
   - do not add C6/C7 confirmation semantics beyond types already required by existing shared place contracts.

2. `apps/web/src/features/create/createCitizenIntakeContext.ts`
   - C5 resolver and region-priority logic;
   - reuse existing safety evaluator;
   - no official candidate confirmation or C7 authority-key logic.

3. `apps/web/src/features/create/createCitizenIntakeContextServer.ts`
   - C5-only server adapter over the existing official region directory;
   - no generated municipality index;
   - no C7 confirmation validator.

4. `apps/web/src/features/create/intelligentFollowupContract.ts`
   - add optional `meta.citizenContext` only.

5. `apps/web/src/features/create/intelligentFollowup.ts`
   - derive citizen context through the server adapter;
   - reconcile only evidence-backed jurisdiction scope needed for C5;
   - preserve clarification in the existing understanding flow;
   - do not implement C6 matching.

6. `apps/web/src/features/create/intelligentFollowupResults.ts`
   - preserve optional citizenContext in degraded/technical results so safety/emergency/place context is not lost when planner output fails.

7. `apps/web/src/features/create/SharedCreateComposer.tsx`
   - C5 region chip + clarification/emergency presentation only;
   - no C7 "Passt das?" authority confirmation controls.

8. `apps/web/src/app/create/CreateClient.tsx`
   - derive profile/confirmed fallback using C5 priority rules and pass citizenContext into the existing composer;
   - no new workflow or storage.

Focused tests:

- citizen intake context contract;
- citizen region chip contract;
- Intelligent Followup success and degraded propagation regressions;
- existing Create runtime guardrails as required by Web CI.

## Mandatory acceptance cases

- explicit Wuppertal in contribution outranks Berlin profile;
- profile suggestion stays visibly a suggestion;
- confirmed context may override profile suggestion only when contribution did not already establish the region;
- ambiguous Neustadt remains clarification, never silent selection;
- federal concern remains federal;
- EU concern remains EU;
- ordinary nouns that share municipality names are not silently treated as places;
- explicit place syntax may disambiguate a lexical municipality name;
- private/PII-sensitive input remains under the existing safety contract;
- emergency context is retained even if planner/provider is degraded;
- no second place resolver/directory truth;
- no C6/C7/C8/C9 responsibility leakage.

## Governance

This preflight authorizes no runtime changes.

If this preflight PR merges with exact-head CI success and no relevant main drift invalidates the findings, the next permitted C-track action is exactly one separate C5 implementation-authorization governance PR.

C6–C12 remain implementation-unauthorized.
