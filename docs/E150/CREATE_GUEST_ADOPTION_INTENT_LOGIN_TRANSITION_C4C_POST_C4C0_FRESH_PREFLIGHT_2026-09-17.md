# C4C Post-C4C0 Fresh Preflight — Guest Intent, Login/Register, Authenticated Draft Return

```text
BASE_MAIN_SHA=f017c41e073e3fcf2d6a66ac100a9b22e78bfd53
TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
ROLE=C4C
PREFLIGHT_AUTHORIZATION_PR=854
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

C4A1_DONE=true
C4B0_DONE=true
C4B1_DONE=true
C4B2_DONE=true
C4B_DONE=true
C4C0A_DONE=true
C4C0_DONE=true

GUEST_SESSION_ROUTE_REUSED=true
GUEST_INTAKE_ROUTE_REUSED=true
GUEST_ADOPTION_PREPARATION_ROUTE_REUSED=true
AUTHENTICATED_ADOPTION_RESUME_ROUTE_REUSED=true
LOGIN_NEXT_PRESERVED=true
REGISTER_NEXT_PRESERVED=true
EMAIL_VERIFICATION_NEXT_PRESERVED=true
IDENTITY_NEXT_PRESERVED=true
TWO_FACTOR_NEXT_PRESERVED=true
OPEN_REDIRECT_CLOSED=true
C3A_COOKIE_SURVIVES_AUTH_NAVIGATION=true
C3A_COOKIE_SENT_TO_CREATE_API=true
TRANSITION_INTENT_MARKER=/create?nextAction=guest-adoption-resume
TRANSITION_INTENT_IS_NON_AUTHORITATIVE=true
CANONICAL_DRAFT_DESTINATION=/create?draftId=<authoritative-draft-id>
NO_PREAUTH_BROWSER_LOCATOR_PROVEN=true
NO_RAW_CLAIM_BROWSER_PERSISTENCE_PROVEN=true
NO_SECOND_RECOVERY_SOURCE_REQUIRED=true

CURRENT_GUEST_PREPARATION_TRIGGER_MISSING=true
CURRENT_AUTHENTICATED_RESUME_TRIGGER_MISSING=true
NEW_FOUNDATIONAL_PREREQUISITE_REQUIRED=false
NEW_API_REQUIRED=false
NEW_PERSISTENCE_REQUIRED=false
NEW_COOKIE_REQUIRED=false
NEW_BROWSER_STORAGE_REQUIRED=false
NEW_REDIRECT_SANITIZER_REQUIRED=false
C3A_CONTRACT_CHANGE_REQUIRED=false
C4A1_CONTRACT_CHANGE_REQUIRED=false
C4B_CONTRACT_CHANGE_REQUIRED=false

PLANNED_RUNTIME_FILES=3
PLANNED_TEST_FILES=1
PLANNED_RUNTIME_FILE_1=apps/web/src/app/create/GuestCreateEphemeralClient.tsx
PLANNED_RUNTIME_FILE_2=apps/web/src/app/create/AuthenticatedGuestAdoptionResumeClient.tsx
PLANNED_RUNTIME_FILE_3=apps/web/src/app/create/page.tsx
PLANNED_TEST_FILE_1=apps/web/tests/create-guest-ephemeral-ui.contract.test.tsx

IMPLEMENTATION_AUTHORIZED=false
IMPLEMENTED=false
DONE=false
C5_C12_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Result

C4C0 is closed. The registration, email-verification, identity and 2FA journey now preserves the same safe internal navigation target, including the formerly hard-coded nested `LoginPageShell` registration CTA. No remaining auth-return blocker was found.

The current C4C gap is therefore no longer foundational. Both server boundaries needed for the transition already exist and are closed:

1. `POST /api/create/adoption-preparation` accepts only the verified C3A session plus exactly `{ claim }`, runs the existing Create mutation security contract, creates the server-only encrypted preparation state and returns only `{ ok: true, status: "prepared" }`.
2. `POST /api/create/adoption-resume` requires a valid authenticated account session plus the same verified C3A session, accepts exactly `{}`, runs the existing mutation security contract and returns only the authoritative `{ ok: true, state, draftId }` result.

No preparation ID, adoption ID, claim, draft ID, recovery token or account identity is transported through the pre-auth browser journey.

## Current missing wiring

### Guest side

`GuestCreateEphemeralClient` currently performs:

```text
POST /api/create/session
→ POST /api/create/intake
→ clear local claim
→ show accepted copy
→ /login?next=/create
```

It does **not** call `POST /api/create/adoption-preparation`. Therefore intake acceptance can currently be shown before the server-only adoption preparation exists, and login does not carry the specific C4C transition intent.

The lawful C4C order is:

```text
session
→ intake
→ adoption-preparation
→ ready_for_login
→ /login?next=<encoded /create?nextAction=guest-adoption-resume>
```

The raw in-memory claim may be cleared only after preparation succeeds. A failed intake or preparation must preserve the editable in-memory text for a user-driven retry and must show fixed generic failure copy without echoing server details, security state or submitted content.

Preparation success may be described only as temporary server-side readiness for post-login adoption. It is not yet an account draft, save, handoff or publication.

### Authenticated return side

`/create` already reads `nextAction`, but there is no runtime branch that consumes the exact marker `guest-adoption-resume` and invokes `POST /api/create/adoption-resume`.

A small dedicated client boundary is sufficient. It may automatically attempt the resume exactly once on arrival, with a busy/single-flight guard, using the existing `createMutationRequestHeaders()` contract and exactly `{}` as the request body. User-driven retry may invoke the same bounded call again after failure.

Only a strict successful response may navigate to:

```text
/create?draftId=<encoded authoritative draftId>
```

The marker itself never becomes authority. Direct navigation to the marker without the account+C3A+preparation state must fail closed with generic continuation-unavailable UX and a fresh-start path. Invalid, malformed or unexpected response payloads must not navigate.

The existing canonical authenticated `/create?draftId=...` path then loads the server-backed draft. C4C must not insert the resumed draft directly into browser state or bypass the normal authenticated draft read.

## Exact bounded implementation scope

### 1. `apps/web/src/app/create/GuestCreateEphemeralClient.tsx`

Authorized changes only:

- extend the existing `session → intake` sequence with `POST /api/create/adoption-preparation` using the same trimmed claim;
- require the exact safe preparation response before clearing the claim or offering login continuation;
- replace the ordinary continuation link with the fixed non-sensitive target `/login?next=<encoded /create?nextAction=guest-adoption-resume>` only after preparation success;
- truthful DE/EN states for submitting/preparing, ready-for-login and generic retryable failure;
- preserve C3D: React memory only; no local/session storage, IndexedDB, cache, service worker, cookie writes or URL recovery identity;
- editing a new claim after a prepared state must leave the old prepared presentation state and require a new submit before the special continuation CTA is shown again.

### 2. New `apps/web/src/app/create/AuthenticatedGuestAdoptionResumeClient.tsx`

Authorized responsibilities only:

- receive `OperatorLocale` for local DE/EN copy;
- call the existing resume route with `createMutationRequestHeaders()` and body `{}`;
- exactly one automatic attempt per mounted transition plus explicit user retry after failure;
- reject malformed/extra/unexpected success payloads and unsafe draft identifiers locally before navigation;
- on success use client navigation to `/create?draftId=<encoded authoritative draftId>`;
- generic unavailable/expired/network copy, fresh-start link and accessible busy/status/error states;
- never render the draft ID, claim, preparation identity, adoption identity or security failure reason.

It must not become a recovery store, draft cache, auth source or second server boundary.

### 3. `apps/web/src/app/create/page.tsx`

Authorized change only:

- for an authenticated request whose exact `nextAction` is `guest-adoption-resume`, render the dedicated authenticated resume client instead of the ordinary `CreateClient` workspace;
- all other `/create` paths retain current behavior;
- after successful client navigation the marker is absent and ordinary canonical draft loading resumes through the existing `draftId` path.

The large `CreateClient.tsx` is explicitly out of scope.

### 4. `apps/web/tests/create-guest-ephemeral-ui.contract.test.tsx`

Extend the existing focused contract test rather than adding a parallel test surface. Required proof:

- exact guest request order `session → intake → adoption-preparation`;
- same trimmed claim is sent to intake and preparation;
- no continuation CTA before preparation success;
- prepared state uses the exact encoded fixed transition marker;
- preparation failure keeps the in-memory editable claim, exposes no response/security detail and does not claim a draft/save;
- no browser storage/recovery carrier is introduced;
- authenticated resume client posts exactly `{}` with existing mutation headers;
- strict successful result navigates once to encoded canonical `draftId` path;
- malformed, failed, expired-like and unexpected results never navigate and expose only generic UX;
- retry is user-driven and automatic resume does not loop;
- page source/behavior routes only the exact marker into the dedicated resume boundary;
- DE/EN copy, `aria-busy`, polite status/error announcement and fresh-start action remain available.

## Explicitly forbidden

- new API route or API request field;
- new Mongo collection/index/transaction/receipt/recovery table;
- preparation/adoption/draft/claim/recovery identifier in login/register URL, hash, cookie or browser storage;
- raw guest claim in localStorage, sessionStorage, IndexedDB, Cache API or Service Worker state;
- new redirect sanitizer or alternate auth-return contract;
- changes to C3A, C4A1 or C4B authority semantics;
- automatic resume on ordinary authenticated `/create` visits without the exact marker;
- bypassing the authenticated canonical draft read after resume;
- silent merge, auto-publish or C5–C12 work.

## Governance conclusion

The original C4C blocker has been repaired by C4C0/C4C0A. Current runtime now supports a bounded C4C implementation without another prerequisite split.

This preflight returns `PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION`. A separate implementation authorization must merge before the three runtime files plus the single focused test file above may change.