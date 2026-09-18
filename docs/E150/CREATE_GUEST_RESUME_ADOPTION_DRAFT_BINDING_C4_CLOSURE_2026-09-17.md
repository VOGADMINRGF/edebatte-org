# C4 Closure — Guest Resume, Adoption and Draft Binding

```text
BASE_MAIN_SHA=459e26f93bf2a000d7a6e03b6c4a88399c511228
PARENT_TASK=CREATE-GUEST-RESUME-ADOPTION-DRAFT-BINDING-01
ROLE=C4
STATUS=done
IMPLEMENTED=true
DONE=true

C4A1_DONE=true
C4B0_DONE=true
C4B1_DONE=true
C4B2_DONE=true
C4B_DONE=true
C4C0A_DONE=true
C4C0_DONE=true
C4C_DONE=true

FINAL_C4C_IMPLEMENTATION_PR=858
FINAL_C4C_IMPLEMENTATION_HEAD=4f1188976a29c77b7d624c2dfeecc7277680a8aa
FINAL_C4C_IMPLEMENTATION_MERGE=459e26f93bf2a000d7a6e03b6c4a88399c511228
FINAL_C4C_EXACT_HEAD_CI=SUCCESS

NO_PREPARATION_BROWSER_CARRIER_V1=true
SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1=true
SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1=true
DURABLE_REPREPARE_REVOCATION_BARRIER_V1=true
PREBOUND_ADOPTION_DRAFT_RECOVERY_V1=true
DRAFT_BOUND_RECOVERY_V1=true
DRAFT_BOUND_ADOPTION_DISCOVERY_V1=true
AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1=true
AUTHENTICATED_CREATE_EMAIL_VERIFICATION_RETURN_CONTINUITY_V1=true
AUTHENTICATED_CREATE_GUEST_ADOPTION_TRANSITION_V1=true

NEW_BROWSER_RECOVERY_SOURCE=false
NEW_COOKIE_AUTHORITY=false
NEW_PERSISTENCE_AUTHORITY=false
SECOND_DRAFT_AUTHORITY=false
AUTO_PUBLISH=false
PRODUCTION_ACTIVATION=false

NEXT_ROLE=C5
NEXT_TASK=CREATE-CITIZEN-CONTEXT-PLACE-RESOLUTION-01
C5_PREFLIGHT_AUTHORIZED=true
C5_IMPLEMENTATION_AUTHORIZED=false
```

## Closure result

C4 is closed after the complete decomposed chain has been implemented and verified. The historical C4 parent was a decomposition/control-plane parent after `FAIL_SPLIT_REQUIRED`; it does not own an additional runtime implementation beyond its children. Its blockers are exhausted by the completed child contracts.

The final missing runtime transition was C4C. Merged PR #858 implements the bounded guest-to-account transition on exact head `4f1188976a29c77b7d624c2dfeecc7277680a8aa`, with exact-head Web CI success, and merges as `459e26f93bf2a000d7a6e03b6c4a88399c511228`.

The final flow is:

```text
guest React-memory claim
→ verified C3A session
→ safe C3C intake
→ encrypted C4A1 preparation
→ fixed non-authoritative login/register navigation intent
→ authenticated account return
→ C4B server-authoritative adoption resume
→ canonical account draft
→ /create?draftId=<authoritative canonical draft id>
```

No preparation/adoption/draft/claim/recovery identifier is carried through browser storage, the login/register URL, or a new cookie. The only browser transition binding remains the verified C3A session cookie, scoped to the existing Create API boundary. The login/register target carries navigation intent only and cannot resume anything by itself.

## Child closure evidence

- C4A1 `CREATE-GUEST-ADOPTION-PREPARATION-SERVER-FOUNDATION-01` is already closed `STATUS=done`, establishing the server-only encrypted preparation slot and `NO_PREPARATION_BROWSER_CARRIER_V1`.
- C4B0/C4B1/C4B2 establish atomic consumption, draft-bound recovery binding and server-side discovery without browser recovery identity.
- C4B `CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01` is closed and proves authenticated resume, deterministic canonical draft identity, replay safety, cross-account/session rejection and save-before-completion.
- C4C0A closes durable email-verification return continuity while carrying only canonical navigation intent.
- C4C0 closes the complete login/register return path, including the nested registration CTA, without a second redirect sanitizer or recovery source.
- C4C PR #858 completes the live guest preparation → login/register → authenticated resume → canonical draft navigation path.

The C4 parent therefore has no remaining lawful child, blocker, unconsumed implementation authorization or separate runtime contract.

## C5 preflight authorization

Exactly one fresh read-only preflight is authorized for:

```text
TASK=CREATE-CITIZEN-CONTEXT-PLACE-RESOLUTION-01
ROLE=C5
SOURCE=#682
PRIMARY_SOURCE_COMMITS=28e08cd6;52baa748;9a183863;d0444a90
AUTHORIZATION=preflight_only
```

That preflight must compare current `main` against the historical source hunks and determine the smallest missing C5 responsibility. It must not cherry-pick mixed commits.

The preflight must preserve these boundaries:

- existing server-side place resolver remains the single authority;
- explicit place beats profile region;
- Bund/EU are not collapsed to a municipality;
- ambiguity remains clarification, never invented jurisdiction;
- only necessary canonical place context may persist through the existing draft/analysis payload;
- the same correlation updates the same context;
- C6 existing-topic/st stance, C7 official candidate index/confirmation, C8 source/link analysis and C9 handoff remain outside C5;
- no second Place/Resolver runtime, API, persistence authority or browser geolocation truth may be introduced.

The required audit surface starts with the runbook owner set:

- `apps/web/src/features/create/createCitizenIntakeContext.ts`
- `apps/web/src/features/create/createCitizenIntakeContextServer.ts`
- `apps/web/src/features/create/SharedCreateComposer.tsx`
- only Citizen-Region-Chip hunks in `apps/web/src/app/create/CreateClient.tsx`
- C5-only hunks in `intelligentFollowup.ts`, `intelligentFollowupContract.ts`, `intelligentFollowupResults.ts`
- Citizen-Context/Region/Emergency regression tests.

Required preflight evidence includes explicit place versus profile, Wuppertal, Dithmarschen, Bund, EU, ambiguity and emergency handling under planner-degraded conditions. Human acceptance must prove understandable place chips and no invented jurisdiction.

C5 implementation remains unauthorized until that fresh preflight is merged and a separate bounded implementation authorization is approved. C6–C12 remain unauthorized.