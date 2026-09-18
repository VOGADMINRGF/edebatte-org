# C7 — Official Jurisdiction Index and Confirmation — Implementation Authorization

Stand: 2026-09-18

```text
TASK=CREATE-OFFICIAL-JURISDICTION-INDEX-CONFIRMATION-01
ROLE=C7
BASE_MAIN=6611d19d39a8b49ec00620ee641fba12bd7f0197
PREFLIGHT_PR=883
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=true
AUTHORIZATION_SCOPE=EXACT_FILES_ONLY
NEW_API=false
NEW_PERSISTENCE=false
NEW_COOKIE=false
NEW_BROWSER_STORAGE=false
NEW_MUNICIPALITY_DATASET=false
SECOND_RESOLVER=false
FREE_CLIENT_AUTHORITY=false
AUTO_PUBLISH=false
C8_INCLUDED=false
C9_QUEUE_MECHANICS_INCLUDED=false
```

## Authorized runtime files

1. `apps/web/src/features/create/createContributionPackageContract.ts`
2. `apps/web/src/features/create/createCitizenIntakeContext.ts`
3. `apps/web/src/features/create/createCitizenIntakeContextServer.ts`
4. `apps/web/src/features/create/createSurfaceConfig.ts`
5. `apps/web/src/features/create/SharedCreateComposer.tsx`
6. `apps/web/src/app/create/CreateClient.tsx`
7. `apps/web/src/features/create/createHandoff.ts`
8. `apps/web/src/app/api/create/save/route.ts`
9. `apps/web/src/app/api/create/handoffs/route.ts`

No other runtime file is authorized.

In particular `/api/create/intake` is excluded: confirmation is a post-analysis user action and the current intake boundary does not need C7 authority handling.

No generated municipality/admin JSON index or generator is authorized. Current C5 already exposes the single cached server-side official place index backed by `@features/region`; C7 must extend that source rather than create parallel truth.

## Authorized focused tests

The runtime PR may add or update only C7-focused coverage in these existing/new test surfaces as required:

1. `apps/web/tests/create-citizen-intake-context.contract.test.ts`
2. `apps/web/tests/create-citizen-region-chip.contract.test.tsx`
3. `apps/web/tests/create-mode.save.route.test.ts`
4. `apps/web/tests/create-handoff.persistence.route.test.ts`
5. `apps/web/tests/create-handoff-draft.contract.test.ts`
6. one dedicated C7 server/index contract test may be added only if the above cannot prove cache/admin-level behavior cleanly.

## Mandatory implementation rules

### Canonical context and confirmation

- Extend the existing citizen context with `jurisdictionConfirmation.status = not_required | unconfirmed | confirmed` and `candidateKey`.
- Reuse one stable candidate-key builder. A client-provided free-form authority label is never evidence.
- Missing/invalid key remains unconfirmed or fails closed at a server persistence boundary.
- Unknown/ambiguous jurisdiction cannot be confirmed.
- No silent selection.

### Administrative level and official identity

- Extend the current C5 server adapter so its cached `@features/region` source carries the official administrative unit and authority identity needed by C7.
- Wuppertal / city-like units remain `municipality`.
- Landkreis/Kreis units including Dithmarschen become `district`.
- Land remains `state`.
- Explicit federal and EU scope remain federal/EU and are never collapsed to a municipality.
- Preserve canonical region/registry identity from the existing official directory where available.
- Do not scan the full source workbook/directory per request; build/reuse cached maps.

### Save boundary

- Add only a bounded optional `confirmedJurisdictionKey` request field.
- The authenticated save route MUST reconstruct trusted C7 context from:
  1. normalized source text;
  2. current server-side official directory;
  3. server-side authenticated profile region only as a suggestion.
- It MUST revalidate the supplied key server-side before writing it into `analysis.intelligentFollowup.meta.citizenContext`.
- Client-supplied citizen-context authority data is not trusted.
- A bad/manipulated key fails closed.
- An already server-validated confirmed jurisdiction on an existing draft must not be silently erased by an unrelated update.
- No new database collection or persistence model.

### Handoff boundary

- `createHandoff.ts` may add a transport-only `jurisdictionConfirmation` field.
- Before server validation, candidate/display data is non-authoritative.
- `/api/create/handoffs` MUST normalize incoming confirmation down to a bounded candidate key, reconstruct trusted context from source text + server-side profile suggestion, validate it, and only then replace it with server-validated candidate/region details.
- This is C7 transport validation only. Do not alter C9 queue/review lifecycle semantics.

### UI and localization

- Extend the current region chip with explicit jurisdiction confirmation and edit/change controls.
- UI strings MUST live in the existing DE/EN Create surface text contract in `createSurfaceConfig.ts`; no German-only hardcoded C7 panel.
- Unconfirmed state must say it is a proposal.
- Unknown/ambiguous candidate is non-confirmable.
- Confirmation control uses truthful selected state (`aria-pressed` or equivalent) and keyboard-accessible targets.
- Edit action returns focus to the contribution input.
- No claim that an authority is final before confirmation/server validation.

## Historical extraction constraints

Relevant C7-only evidence comes from PR #682 / commits named in the merged preflight and runbook, including `d0444a90`, `af8c1a57` and the mixed `a12978a5...`.

Do NOT copy:
- obsolete guest browser persistence/recovery from historical branches;
- historical generated municipality index;
- C6 match/relation/stance hunks;
- C8 source/link analysis;
- C9 review-queue behavior;
- planner changes belonging to C1.

## Required acceptance

The runtime exact-head must prove:

- manipulated/free-form candidate key rejected;
- valid candidate key confirmed;
- absent key does not silently confirm;
- ambiguity remains clarification;
- Wuppertal => municipality/city;
- Dithmarschen => district/county;
- Bund/EU stay unchanged;
- explicit contribution place outranks profile suggestion;
- profile region is suggestion only;
- existing confirmed jurisdiction is not silently overwritten/erased;
- cached official lookup, no per-request full source scan;
- Save persists only server-revalidated confirmation;
- Handoff persists only server-revalidated confirmation and does not change C9 lifecycle;
- DE and EN confirmation/edit UI are semantically equivalent;
- accessible confirm/edit interaction;
- no auto-publish, no silent merge, no second resolver.

## Merge gate

Runtime PR may merge only after exact-head success for repository integrity, Web Critical, Production Guardrails, focused Create runtime contracts, Create save domain contracts, C7-focused tests, lint, typecheck and build.

C7 is not done until a post-merge closure records runtime PR/head/merge SHA and exact-head CI success.

C8–C12 remain implementation-unauthorized.
