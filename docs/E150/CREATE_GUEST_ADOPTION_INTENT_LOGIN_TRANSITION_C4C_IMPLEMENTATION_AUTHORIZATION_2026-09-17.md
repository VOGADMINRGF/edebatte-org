# C4C Implementation Authorization — Guest Intent, Login/Register, Authenticated Draft Return

```text
BASE_MAIN_SHA=83a0a9c6df891e744d5fbea2bdcf044f4d524f53
TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
ROLE=C4C
CONTRACT=AUTHENTICATED_CREATE_GUEST_ADOPTION_TRANSITION_V1
PREFLIGHT_PR=855
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

IMPLEMENTATION_AUTHORIZED=true
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=true

AUTHORIZED_RUNTIME_FILES=3
AUTHORIZED_TEST_FILES=1
AUTHORIZED_RUNTIME_FILE_1=apps/web/src/app/create/GuestCreateEphemeralClient.tsx
AUTHORIZED_RUNTIME_FILE_2=apps/web/src/app/create/AuthenticatedGuestAdoptionResumeClient.tsx
AUTHORIZED_RUNTIME_FILE_3=apps/web/src/app/create/page.tsx
AUTHORIZED_TEST_FILE_1=apps/web/tests/create-guest-ephemeral-ui.contract.test.tsx

NEW_API_REQUIRED=false
NEW_PERSISTENCE_REQUIRED=false
NEW_COOKIE_REQUIRED=false
NEW_BROWSER_STORAGE_REQUIRED=false
NEW_REDIRECT_SANITIZER_REQUIRED=false
C3A_CONTRACT_CHANGE_REQUIRED=false
C4A1_CONTRACT_CHANGE_REQUIRED=false
C4B_CONTRACT_CHANGE_REQUIRED=false
CREATECLIENT_CHANGE_AUTHORIZED=false
C5_C12_AUTHORIZED=false
AUTO_PUBLISH=false
SILENT_MERGE=false
```

## Authorized implementation

This authorization consumes the exact bounded scope established by merged fresh preflight PR #855. No additional architecture work is authorized.

### Guest side

`apps/web/src/app/create/GuestCreateEphemeralClient.tsx` may only:

- extend the existing `session → intake` flow with `POST /api/create/adoption-preparation` using the same trimmed claim;
- require the exact lawful preparation response before clearing the in-memory claim or offering the special continuation CTA;
- preserve the editable in-memory claim on intake/preparation/network failure;
- use the existing `createMutationRequestHeaders()` contract;
- expose the fixed navigation intent only after preparation success: `/login?next=<encoded /create?nextAction=guest-adoption-resume>`;
- add truthful DE/EN presentation states for preparation, ready-for-login and generic retryable failure;
- remain React-memory-only with no browser recovery storage or identifier.

### Authenticated return side

A new `apps/web/src/app/create/AuthenticatedGuestAdoptionResumeClient.tsx` may only:

- receive `OperatorLocale`;
- make one automatic bounded `POST /api/create/adoption-resume` attempt per mount using existing Create mutation headers and exactly `{}`;
- allow explicit user retry after failure while preventing concurrent duplicate attempts;
- strictly validate the success shape and draft identifier before navigation;
- navigate only to `/create?draftId=<encoded authoritative draftId>` after a valid authoritative response;
- show generic DE/EN unavailable/expired/network UX, accessible busy/status/error states and a fresh-start path;
- never display or persist draft/preparation/adoption/claim/recovery identifiers or security failure reasons.

### Page routing

`apps/web/src/app/create/page.tsx` may only route an authenticated request with the exact marker `nextAction=guest-adoption-resume` to the dedicated resume client instead of the ordinary `CreateClient`. Every other `/create` path must retain current behavior. After successful navigation the marker is absent and canonical draft loading continues through the existing authenticated `draftId` path.

`apps/web/src/app/create/CreateClient.tsx` is explicitly not authorized.

### Focused tests

Only `apps/web/tests/create-guest-ephemeral-ui.contract.test.tsx` may be extended to prove:

- exact guest request order `session → intake → adoption-preparation`;
- same trimmed claim reaches intake and preparation;
- no special login continuation before preparation success;
- preparation failure preserves editable in-memory text and leaks no server/security detail;
- no browser recovery carrier/storage is introduced;
- exact encoded transition target after preparation success;
- authenticated resume posts exactly `{}` with the existing mutation headers;
- exactly one automatic attempt per mount, explicit retry after failure, no loop/concurrent duplicate;
- strict success validation and one navigation to canonical encoded `draftId` path;
- malformed/failed/unexpected responses never navigate;
- exact marker-only page routing;
- DE/EN copy, `aria-busy`, polite status/error announcement and fresh-start action.

## Forbidden

No new API route or request field; no new collection/index/transaction/receipt/recovery table; no new cookie; no localStorage/sessionStorage/IndexedDB/Cache API/Service Worker recovery state; no preparation/adoption/draft/claim/recovery locator in login/register URL or cookie; no second redirect sanitizer; no C3A/C4A1/C4B authority change; no automatic resume on ordinary authenticated `/create`; no direct browser hydration of the resumed draft; no C5–C12 work; no production activation; no auto-publish.

## Required completion gate

Implementation is not done merely because code exists. Completion requires an implementation PR whose changed-file set is confined to the authorized files, exact-head Web CI success, focused contract success, no unresolved review blocker, and a fresh C4C closure/revalidation before C5 may be authorized.