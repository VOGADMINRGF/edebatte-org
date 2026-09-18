# C7 — Official Jurisdiction Index and Confirmation — fresh preflight

Date: 2026-09-18  
Task: `CREATE-OFFICIAL-JURISDICTION-INDEX-CONFIRMATION-01`  
Role: C7  
Base: `main@bdd47ea22dd6af264e4d46250490557281544198`

```text
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
C6_MERGED=true
SECOND_RESOLVER_ALLOWED=false
FREE_CLIENT_AUTHORITY_ALLOWED=false
AUTO_PUBLISH_ALLOWED=false
```

## Mission

Extract only the C7 responsibility from the historical #682 reference work: a server-authoritative official jurisdiction candidate/index contract, explicit user confirmation of a server-offered candidate, and persistence that preserves the real administrative level and official authority identity.

C7 must build on the merged C5 place context and C6 explicit topic/stance work. It must not create a second place resolver, municipality dataset, browser authority, silent jurisdiction choice or C9 review-queue implementation.

## Fresh-main findings

Current main has the C5 citizen/place context and reuses the repository's existing official regional directory infrastructure. The C7 confirmation/key validator is not present on current main. Searches for `buildCreateJurisdictionCandidateKey`, `applyCreateJurisdictionConfirmation`, `validateCreateJurisdictionConfirmation` and `confirmedJurisdictionKey` return no runtime implementation on main.

The historical source is mixed. In particular `a12978a5fc7f22f4f5281d393a26834cadd36204` also contains obsolete guest/browser/adoption responsibilities and must not be copied wholesale. Only jurisdiction-specific hunks may be extracted.

## Historical evidence to extract hunk-by-hunk

Primary reference remains PR #682. Relevant C7 evidence named by the canonical extraction runbook:

- initial context: `28e08cd6`;
- index/validation corrections: `e0449a3b`, `287482c3`, `93a9b631`, `4e21a513`, `d0444a90`, `af8c1a57`;
- C7 confirmation/candidate-key/UI evidence from the mixed history, including `a12978a5fc7f22f4f5281d393a26834cadd36204`, only where the hunk is C7-owned.

Planner hunks from `93a9b631` / `4e21a513`, guest/browser persistence/adoption hunks, C6 relation/match hunks and C9 handoff-queue mechanics are excluded.

## Authorized implementation boundary for a later authorization PR

A later implementation authorization may permit only the minimum files proven necessary by a fresh diff, expected around:

- `apps/web/src/features/create/createCitizenIntakeContext.ts`
  - candidate-key builder;
  - explicit confirmation application;
  - no silent selection;
  - preserve federal/EU and ambiguity.
- `apps/web/src/features/create/createCitizenIntakeContextServer.ts`
  - server-owned candidate validation;
  - official administrative-unit lookup using existing `@features/region` directory infrastructure;
  - cached index/lookup;
  - no generated parallel municipality truth unless a later diff proves an unavoidable migration.
- `apps/web/src/features/create/createContributionPackageContract.ts`
  - only C7 confirmation/admin-level fields required by the existing citizen context contract.
- `apps/web/src/app/create/CreateClient.tsx` and/or `apps/web/src/features/create/SharedCreateComposer.tsx`
  - only explicit confirmation/edit UI and wiring;
  - DE and EN fully localized;
  - no auto-confirm.
- existing Create request boundaries only where required to persist the confirmed server-owned jurisdiction identity:
  - `apps/web/src/app/api/create/intake/route.ts`;
  - `apps/web/src/app/api/create/save/route.ts`;
  - `apps/web/src/app/api/create/handoffs/route.ts`.
  These routes may consume/propagate validated C7 fields only. C9 queue creation or review-state behavior remains forbidden.
- focused existing/new tests for C7 only.

The exact runtime file list must be frozen in the separate implementation-authorization PR after one more current-main diff review.

## Hard contract

1. Server-offered candidate key/ID is authoritative. Free-form client authority names are never accepted as confirmation evidence.
2. Confirmation is explicit. Missing confirmation stays unconfirmed; ambiguity stays clarification.
3. Persisted jurisdiction retains actual administrative level and official authority identity.
4. Wuppertal remains municipality/city.
5. Dithmarschen remains district/county and must not be collapsed to a municipality.
6. Federal concerns remain federal; EU concerns remain EU.
7. Explicit contribution place outranks profile-derived suggestion.
8. Guest/profile adoption must not overwrite a later legitimate explicit confirmation.
9. Official lookup is cached/indexed; request handling must not full-scan the complete source directory on every request.
10. No second resolver/dataset truth.
11. No auto-publish, auto-merge, auto-mandate or silent authority assignment.
12. Confirmation UI must be truthful and completely localized in DE/EN. The historical P2 localization gap is not accepted as evidence.

## Required acceptance evidence

Automated/focused coverage must prove at minimum:

- valid candidate key confirms;
- manipulated/free-form candidate key fails closed;
- missing candidate stays unconfirmed;
- ambiguity stays clarification;
- Wuppertal persists as municipality/city;
- Dithmarschen persists as district/county;
- Bund and EU survive confirmation/persistence unchanged;
- explicit contribution place beats profile suggestion;
- later explicit confirmation is not overwritten by guest/profile adoption;
- cold/warm lookup behavior uses cached/indexed source rather than a per-request full scan;
- confirmation survives the intended existing persistence path without introducing C9 queue behavior;
- DE and EN render equivalent confirmation/edit semantics;
- keyboard/focus and accessible status/labels remain usable.

Human acceptance must verify that the user can see the proposed responsible level/authority, can confirm or edit it, and is never told that an unconfirmed or ambiguous jurisdiction is final.

## Result

C7 is implementable without another architectural split.

A separate governance PR is required before runtime changes. That authorization must freeze the exact current-main file list and explicitly retain all exclusions above.

```text
NEXT_ROLE=C7_IMPLEMENTATION_AUTHORIZATION
NEXT_AUTHORIZATION=governance_only
C8_IMPLEMENTATION_AUTHORIZED=false
C9_C12_IMPLEMENTATION_AUTHORIZED=false
```
