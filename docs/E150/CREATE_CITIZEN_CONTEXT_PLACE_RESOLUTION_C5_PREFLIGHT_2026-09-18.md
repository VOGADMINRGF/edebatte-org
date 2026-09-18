# C5 — Citizen Context and Place Resolution — Fresh Preflight

Stand: 2026-09-18

```text
TASK=CREATE-CITIZEN-CONTEXT-PLACE-RESOLUTION-01
ROLE=C5
BASE_MAIN=9261b975aff18dc33a181bb1ed130f75d97ae78b
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
RUNTIME_CHANGE_REQUIRED=true
NEW_API_REQUIRED=false
NEW_PERSISTENCE_REQUIRED=false
NEW_COOKIE_REQUIRED=false
NEW_BROWSER_STORAGE_REQUIRED=false
SECOND_PLACE_RESOLVER_ALLOWED=false
C6_MATCH_STANCE_INCLUDED=false
C7_JURISDICTION_CONFIRMATION_INCLUDED=false
C8_SOURCE_ANALYSIS_INCLUDED=false
C9_HANDOFF_INCLUDED=false
AUTO_PUBLISH=false
```

## 1. Mission

Extract the C5 owner slice from the historical mixed Create work without importing later C6/C7/C8/C9 responsibility.

C5 adds a citizen-first, reviewable context for place and scope while preserving the existing Create planner, the existing server-side regional directory, the existing draft/correlation identity, and the existing safety boundary.

The governing rules are:

- explicit place evidence in the current contribution outranks profile-derived region;
- federal and EU scope must never be silently reduced to a municipality;
- ambiguous place evidence remains a clarification state;
- profile location is only a suggestion until the user explicitly supplies or confirms location context;
- the existing server-side region directory remains the authoritative place data source;
- no second resolver truth, no silent jurisdiction confirmation, no silent merge, and no auto-publish;
- emergency/safety context must survive even when the AI planner is degraded or fails.

## 2. Fresh-main / collision audit

Fresh base is `main@9261b975aff18dc33a181bb1ed130f75d97ae78b`, after merged C4 closure PR #861.

A compare from C4C merge `459e26f93bf2a000d7a6e03b6c4a88399c511228` to this base shows 21 intervening commits. Those commits touch T0, G1 review persistence, SEO/public discovery and governance material, but none of the C5 owner runtime files listed below.

Therefore there is no current C5 owner collision, but implementation must still branch freshly from then-current `main`.

## 3. Historical source evidence

Primary extraction source remains PR #682, specifically:

- `28e08cd6f2c23df8a529f5d16bf3d2f8b617d878` — citizen-first regional intake context;
- `52baa748c157810d4fd30ac1fe57d00fc342733b` — mixed correction commit; C5 hunks only;
- `287482c3277c7237504d8e8d5eabc8efac1091f8` — later C5 place-index / lexical-ambiguity correction; only C5 place hunks, never its C7 confirmation surroundings;\n- `9a183863df906d1d3b29f5ffc0a3d1d8f94123c4` — mixed C5/C6 correction; only the C5 emergency hunk, never C6 relation inference;
- `d0444a90761cdfdcdb54cb838221138467cf3add` — mixed later correction; C5 locale/place/emergency hunks only.

Whole-commit cherry-pick is prohibited.

The historical source contains later responsibilities in the same files, including existing-topic decisions, jurisdiction confirmation/candidate-key validation, link/source integration and handoff persistence. Commit `a12978a5fc7f22f4f5281d393a26834cadd36204` is specifically C7 confirmation evidence and its candidate-key/confirmation/UI hunks are excluded from C5. Those later responsibilities are explicitly excluded here.

## 4. Existing authoritative dependency

C5 MUST reuse the existing server-side regional source:

`features/region/directory.ts`

In particular, its existing cached official directory import and `listOfficialMunicipalDirectoryEntries()` are the source for official municipal/place records.

This file is a read-only dependency for C5 and is not authorized for modification.

C5 MUST NOT introduce or copy a parallel generated municipality database merely because later #682 snapshots used `generatedOfficialMunicipalityIndex.json`.

## 5. Proposed implementation boundary

Implementation may be authorized later only inside these runtime/contract files:

1. `apps/web/src/features/create/createContributionPackageContract.ts`
   - add only C5 citizen-context/region/safety types required by this slice;
   - do not add C7 jurisdiction-confirmation state.

2. `apps/web/src/features/create/createCitizenIntakeContext.ts` — new
   - deterministic citizen concern classification;
   - place candidate normalization;
   - explicit-place > profile priority;
   - federal/EU non-reduction;
   - ambiguity/clarification;
   - emergency and existing Create safety summary;
   - no C6 topic-match execution and no C7 confirmation authority.

3. `apps/web/src/features/create/createCitizenIntakeContextServer.ts` — new
   - thin server adapter over the existing `features/region/directory.ts`;
   - bounded/cached directory use only;
   - no independent official candidate index;
   - no free-form authority acceptance;
   - no C7 `candidateKey` confirmation API.

4. `apps/web/src/features/create/intelligentFollowupContract.ts`
   - add optional `meta.citizenContext` only.

5. `apps/web/src/features/create/intelligentFollowupResults.ts`
   - preserve optional `citizenContext` through technical/degraded results so safety/emergency/place context is not lost when AI fails.

6. `apps/web/src/features/create/intelligentFollowup.ts`
   - resolve C5 context through the server adapter;
   - reconcile only evidence-backed scope;
   - keep deterministic citizen context even when planner/provider fails;
   - no existing-topic matching or C7 confirmation.

7. `apps/web/src/features/create/SharedCreateComposer.tsx`
   - render truthful editable region context;
   - render emergency notice;
   - no authority-confirmation controls.

8. `apps/web/src/app/create/CreateClient.tsx`
   - derive displayed context from returned citizen context plus existing confirmed intake/profile context;
   - explicit contribution evidence must win over profile suggestion;
   - profile suggestion remains visibly non-authoritative;
   - edit action returns focus to the citizen input;
   - no C6/C7 persistence or confirmation.

Focused tests may be created/modified only in:

9. `apps/web/tests/create-citizen-intake-context.contract.test.ts` — new.
10. `apps/web/tests/create-citizen-region-chip.contract.test.tsx` — new.
11. `apps/web/tests/create-intelligent-followup.contract.test.ts` — extend only for C5 integration/degraded evidence.

No other runtime/test file is authorized by this preflight.

## 6. Required contract behavior

### 6.1 Place precedence

Must prove:

- contribution text explicitly naming Wuppertal beats a Berlin profile suggestion;
- confirmed existing intake context may be used only when the contribution did not explicitly establish another place/scope;
- profile location is presented as a suggestion, never silently promoted to fact.

### 6.2 Scope preservation

Must prove:

- federal contribution stays federal even when profile city exists;
- EU contribution stays EU even when profile city exists;
- municipal evidence is not inferred solely because a profile location exists.

### 6.3 Ambiguity

Must prove:

- multiple distinct places remain clarification;
- ambiguous same-name municipality remains clarification;
- no arbitrary first-record selection;
- ordinary nouns that happen to share municipality names do not become places without place evidence;
- the smallest useful clarification question is returned.

### 6.4 Emergency / safety

Must prove:

- common German emergency language triggers the emergency notice;
- supported English emergency wording does likewise for English locale;
- existing Create safety findings remain in the safety summary;
- emergency/citizen context remains available when planner result is technical/degraded/failed.

### 6.5 UI truthfulness

Must prove:

- a profile-derived location chip is explicitly labelled as a suggestion;
- contribution-derived location is labelled as coming from the user's contribution;
- the user can return to editing the input;
- no C7 wording such as authority confirmation / server candidate confirmation is shown in C5;
- no internal contract names are exposed.

## 7. Explicit exclusions

C5 MUST NOT implement:

- C6 existing-topic search, match selection, stance persistence or counting;
- C7 official jurisdiction confirmation, candidate-key validation, authority persistence or confirmation UI;
- C8 source/link fetch or evidence persistence;
- C9 CreateHandoffDraft/review persistence;
- new Create API routes;
- new browser persistence;
- new account/profile persistence;
- a generated municipality index parallel to the existing region directory;
- any auto-publish, auto-merge or automatic mandate/authority claim.

## 8. Size and ownership gate

Expected implementation boundary:

- runtime/contract files: 8
- focused test files: 3
- API boundaries: 0 new
- persistence boundaries: 0 new
- browser carriers: 0 new
- external providers: 0 new

This remains inside the Create slice-size gate.

## 9. Mandatory verification

Before merge of any future C5 runtime PR:

- `git diff --check`;
- repository integrity guards;
- Web Critical Guardrails;
- Production Guardrails;
- focused Create runtime contracts;
- Create save domain contracts;
- full lint;
- typecheck;
- build;
- exact-head Web CI success.

Focused C5 tests must cover at minimum:

- Wuppertal vs Berlin profile;
- federal scope;
- EU scope;
- ambiguous municipality;
- multiple places;
- non-place noun false positives;
- emergency DE;
- emergency EN;
- safety/PII summary;
- degraded planner preserving citizen/emergency context;
- profile suggestion chip and editability.

Human acceptance before C5 closure must verify that the region chip/clarification copy is understandable and does not imply a confirmed authority or jurisdiction.

## 10. Preflight result

```text
C4_MERGED=true
CURRENT_MAIN_AUDITED=true
PARALLEL_DRIFT_COLLISION=false
EXISTING_SERVER_DIRECTORY_REUSED=true
SECOND_RESOLVER_TRUTH=false
EXPLICIT_PLACE_BEATS_PROFILE=true
FEDERAL_EU_NON_REDUCTION_REQUIRED=true
AMBIGUITY_FAILS_TO_CLARIFICATION=true
DEGRADED_PLANNER_MUST_PRESERVE_CITIZEN_CONTEXT=true
C6_EXCLUDED=true
C7_EXCLUDED=true
IMPLEMENTATION_AUTHORIZED=false
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
```

## 11. Next legal action

Exactly one governance-only implementation-authorization PR may be opened after this preflight is merged with exact-head CI success.

That authorization must restate the exact 8 runtime/contract + 3 test file boundary above.

C5 runtime implementation remains forbidden until that authorization is merged.

C6–C12 remain implementation-unauthorized.
