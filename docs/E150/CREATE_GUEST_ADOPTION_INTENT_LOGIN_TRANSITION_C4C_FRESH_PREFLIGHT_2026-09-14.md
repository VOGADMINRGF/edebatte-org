# C4C Fresh Preflight — Guest Intent, Login/Register, Authenticated Draft Return

```text
BASE_MAIN_SHA=bdd9bd0436c81d7a89d0282747f7ba1f21e1efb8
TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
ROLE=C4C
PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED

GUEST_PREPARATION_UI_PATH_FEASIBLE=true
INTAKE_PREPARATION_ORDER_PROVEN=true
LOGIN_NEXT_PRESERVED=true
REGISTER_NEXT_PRESERVED=false
TWO_FACTOR_NEXT_PRESERVED=true
OPEN_REDIRECT_CLOSED=true
C3A_COOKIE_SURVIVES_LOGIN_FLOW=true
C3A_COOKIE_SENT_TO_RESUME_ROUTE=true
AUTHENTICATED_RESUME_TRIGGER_FEASIBLE=true
TRANSITION_INTENT_MARKER_REQUIRED=true
TRANSITION_INTENT_MARKER=/create?nextAction=guest-adoption-resume
TRANSITION_INTENT_MARKER_SAFE=true
NO_PREAUTH_BROWSER_LOCATOR_PROVEN=true
AUTHENTICATED_DRAFT_NAVIGATION_PROVEN=true
AUTHENTICATED_CONTINUATION_ROUTE=/create?draftId=<canonical-draft-id>
MULTI_TAB_RESUME_SAFE=true
DOUBLE_SUBMIT_SAFE=true
RELOAD_AFTER_RESUME_SAFE=true
TRUTHFUL_FAILURE_UX_PROVEN=true
C3D_CONTRACT_PRESERVED=true
NEW_USER_VISIBLE_COPY_REQUIRED=true
CURRENT_I18N_PATTERN=LOCAL_COMPONENT_COPY_OBJECTS_WITH_DE_EN_VARIANTS_AND_OPERATOR_LOCALE
C4A1_API_REUSED=true
C4B_API_REUSED=true
AUTH_SESSION_FOUNDATION_REUSED=true
NEW_API_REQUIRED=false
AUTH_RUNTIME_CHANGE_REQUIRED=false
NEW_PERSISTENCE_REQUIRED=false
NEW_COOKIE_REQUIRED=false
NEW_QUERY_RECOVERY_LOCATOR_REQUIRED=false
NO_NEW_FOUNDATIONAL_PREREQUISITE=false

PLANNED_IMPLEMENTATION_FILES=DEFERRED_UNTIL_C4C0
PLANNED_RUNTIME_FILES=0
PLANNED_TEST_FILES=0
API_BOUNDARY_COUNT=0
CORE_CONTRACT_COUNT=0
NEW_BLOCKER=REGISTER_RETURN_CONTRACT_MISSING
PREREQUISITE_ROLE=C4C0
PREREQUISITE_TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
PREREQUISITE_CONTRACT=AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1
```

## Actual runtime audit

The audit used the merged C3A, C3D, C4A1, C4B0, C4B1, C4B2 and C4B implementations, not only their governance evidence. `GuestCreateEphemeralClient` currently creates the C3A session, submits `POST /api/create/intake`, clears the in-memory claim, presents accepted/non-restorable copy, and exposes `/login?next=/create`. It does not call `POST /api/create/adoption-preparation`.

The existing preparation route accepts a verified C3A session and `{ claim }`, creates the sole C4A1 slot and returns only `{ ok: true, status: "prepared" }`. The C4B resume route requires both the authenticated session and the C3A cookie, accepts exactly `{}`, and returns only the authenticated authoritative draft result. No pre-auth identifier, claim, recovery value or browser carrier is required or permitted.

The safe future C4C order is `session → intake → adoption-preparation → ready_for_login`. Intake first applies the C3C safe-claim inspection and produces only its fixed accepted response. Preparation then repeats bounded claim validation and establishes the encrypted C4A1 server state. The UI may clear the raw in-memory claim only after preparation succeeds; if either request fails, it must show a generic retryable/unavailable state and must not claim a draft exists. A retry must re-run the bounded server flow; durable reprepare rules remain authoritative. Preparation success—not intake acceptance—is the earliest truthful point at which login continuation may be offered.

`/create` already has a lawful authenticated canonical-draft continuation: it accepts `draftId`, reads the authenticated user's canonical draft, and initializes `CreateClient`. Therefore C4C may navigate only after a successful resume response to `/create?draftId=<canonical-draft-id>`. The suggested fixed, non-sensitive transition marker `/create?nextAction=guest-adoption-resume` conveys only an intent to attempt the server-side POST; it contains no recovery identity, cannot succeed without the C3A and account bindings, is replay-safe under C4B, and must not become a recovery source of truth. Resume must occur only following that intentional guest transition, not on every authenticated `/create` visit.

## Session, redirect and replay findings

The C3A cookie is `HttpOnly`, `SameSite=Lax`, host-only, `Secure` in production, scoped to `/api/create`, and has a 30-minute maximum age. Navigation through `/login`, `/register`, 2FA and `/create` does not overwrite or clear it; its `/api/create` path causes the browser to send it to `POST /api/create/adoption-resume`. Expiry remains fail-closed: after login an expired C3A/preparation must render a generic continuation-unavailable/fresh-start state and must never recreate guest content from the browser.

Credential login and its 2FA method switching preserve `next` through `useLoginFlow`, the login route, persisted 2FA challenge redirect data, and the verify route. Server redirect handling uses `normalizeInternalRedirectPath` / `sanitizeRedirect` and role-aware redirect resolution, rejecting external, protocol-relative, control-character and unsafe destinations; the open-redirect boundary is closed.

The registration journey itself carries a safe internal `next` through `RegisterPageClient`, verification-email and identity steps. However, the same `/login?next=/create` screen also renders `LoginPageShell`, whose credentials-step “Jetzt registrieren” link is hard-coded as `/register`. Choosing that live CTA drops `next=/create`; registration then completes to its ordinary post-registration destination instead of the C4C transition. This makes `REGISTER_NEXT_PRESERVED=false` and is the sole primary blocker.

The C4B route is idempotent: same-account completed replay returns the stored canonical draft; active and post-ordinary-expiry recovery are server-authoritative; wrong account, wrong/missing/expired C3A, malformed state and stale/superseded generations fail closed. Thus double submit, multiple tabs and reload after a successful resume are server-safe. C4C must still present one busy state, avoid repeated automatic attempts, and treat all public 403/503/internal distinctions as generic unavailable rather than exposing security state.

## C3D, UX, accessibility and localization boundary

C3D permits only ephemeral React presentation state. C4C must not use localStorage, sessionStorage, IndexedDB, Cache API, Service Worker state, cookies, URL/query/hash recovery identity, raw claim snapshots, account-global guessing, or browser-generated recovery identity. Post-preparation UI may retain only non-sensitive presentation state in memory; the authenticated canonical draft becomes authority only after C4B success.

Future copy needs at least truthful states for submitting, preparing continuation, login required, resuming, resume succeeded, resume unavailable/expired, retryable network failure and fresh start. It must never say saved, restored or continued before the authoritative C4B response. Current Guest Create copy follows a local DE/EN component copy-object pattern with `OperatorLocale`; a later bounded UI slice must follow that existing pattern and include focus movement, keyboard operation, `aria-busy`, polite status, alert/error announcement, retry control and successful-navigation behavior.

## Required prerequisite

`CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01` is required before another C4C preflight. Its narrowly bounded purpose is to make every lawful guest-to-registration CTA preserve the same safe internal transition intent through register, email verification, identity/2FA and authenticated return. It must not add a recovery locator, browser persistence, new cookie, API, persistence model, or C4C implementation. Its scope and authorization require separate governance.
