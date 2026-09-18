# C5 — Citizen Context and Place Resolution — Implementation Authorization

Stand: 2026-09-18

```text
TASK=CREATE-CITIZEN-CONTEXT-PLACE-RESOLUTION-01
ROLE=C5
BASE_MAIN=1618319a73c8d063b0ca288efd210b768e2a1633
PREFLIGHT_PR=873
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=true
AUTHORIZATION_SCOPE=EXACT_FILES_ONLY
NEW_API=false
NEW_PERSISTENCE=false
NEW_COOKIE=false
NEW_BROWSER_STORAGE=false
AUTO_PUBLISH=false
```

## Authorized runtime / contract files

1. `apps/web/src/features/create/createContributionPackageContract.ts`
2. `apps/web/src/features/create/createCitizenIntakeContext.ts` — new
3. `apps/web/src/features/create/createCitizenIntakeContextServer.ts` — new
4. `apps/web/src/features/create/intelligentFollowupContract.ts`
5. `apps/web/src/features/create/intelligentFollowupResults.ts`
6. `apps/web/src/features/create/intelligentFollowup.ts`
7. `apps/web/src/features/create/SharedCreateComposer.tsx`
8. `apps/web/src/app/create/CreateClient.tsx`

## Authorized focused tests

9. `apps/web/tests/create-citizen-intake-context.contract.test.ts` — new
10. `apps/web/tests/create-citizen-region-chip.contract.test.tsx` — new
11. `apps/web/tests/create-intelligent-followup.contract.test.ts`

No other runtime or test file is authorized.

## Mandatory extraction rules

- Use `52baa748c157810d4fd30ac1fe57d00fc342733b` as the last explicit pre-C7 C5 baseline.
- Extract only C5 place-index / lexical-ambiguity hunks from `287482c3277c7237504d8e8d5eabc8efac1091f8`.
- Extract C5 intake-classification hardening from `93a9b6314088071511e6ae8a6209d4e2708a8b54` only: locale-aware DE/EN emergency detection, sentence-leading place evidence, lexical ambiguity additions and comparison handling. Any non-C5 hunks remain excluded.
- Extract C5 quality-regression hardening from `4e21a5131a29ffad53299e20f4bd32f664c6cf58` only: municipal-signal additions, lexical false-positive hardening and sentence-leading place constraints. Any non-C5 hunks remain excluded.
- Extract only the C5 emergency hunk from `9a183863df906d1d3b29f5ffc0a3d1d8f94123c4`; C6 relation-inference hunks remain excluded.
- Extract only C5 citizen-context preservation from `d0444a90761cdfdcdb54cb838221138467cf3add`; jurisdiction-trust hunks remain C7 and excluded.
- C7 confirmation/candidate-key/UI hunks from `a12978a5fc7f22f4f5281d393a26834cadd36204` are explicitly forbidden here.
- Reuse `@features/region` / existing official directory infrastructure. Do not introduce a parallel municipality dataset, generated index or resolver truth.

## Required behavior

Implementation must prove:

- explicit contribution place outranks profile location;
- confirmed intake context is fallback only when contribution evidence did not establish another place/scope;
- profile location remains a visible suggestion, not fact;
- Bund and EU remain Bund/EU;
- ambiguous/multiple places remain clarification;
- lexical place false positives are rejected unless place syntax/evidence exists;
- DE and EN emergency wording is detected;
- citizen/emergency context survives technical/degraded AI fallback;
- region UI is editable and truthful;
- no C7 authority-confirmation UI or persistence appears;
- no C6 existing-topic action is introduced;
- no new API, persistence, cookie or browser carrier is introduced.

## Merge gate

Runtime PR may merge only after all are green on its exact head:

- diff check;
- repository integrity guards;
- T0 regression suite;
- Web Critical Guardrails;
- Production Guardrails;
- focused Create runtime contracts;
- Create save domain contracts;
- lint;
- typecheck;
- build.

C5 must not be marked done until a post-merge closure records exact runtime head, merge SHA and exact-head CI success.

C6–C12 remain implementation-unauthorized.
