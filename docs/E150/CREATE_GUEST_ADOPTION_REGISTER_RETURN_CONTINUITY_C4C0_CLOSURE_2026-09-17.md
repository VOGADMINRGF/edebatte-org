# C4C0 Closure — Register Return Continuity

```text
BASE_MAIN_SHA=164333350861c54b004a02b9574b47bc948830b7
PARENT_TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
PARENT_ROLE=C4C

TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
ROLE=C4C0
CONTRACT=AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1
STATUS=done
IMPLEMENTED=true
DONE=true

POST_C4C0A_PREFLIGHT_PR=849
IMPLEMENTATION_AUTHORIZATION_PR=850
IMPLEMENTATION_PR=852
IMPLEMENTATION_HEAD=9cf9af3bf5761a3051f50ccc63155d00aa1101d7
IMPLEMENTATION_MERGE=164333350861c54b004a02b9574b47bc948830b7
CI_EXACT_HEAD=SUCCESS

LOGIN_CREDENTIAL_NEXT_PRESERVED=true
LOGIN_2FA_NEXT_PRESERVED=true
OUTER_LOGIN_REGISTER_CTA_NEXT_PRESERVED=true
NESTED_LOGIN_SHELL_REGISTER_CTA_NEXT_PRESERVED=true
REGISTER_PAGE_CANONICALIZES_NEXT=true
REGISTER_SUBMIT_NEXT_PRESERVED=true
EMAIL_TOKEN_NEXT_DURABLE=true
VERIFY_EMAIL_NEXT_PRESERVED=true
IDENTITY_NEXT_PRESERVED=true
UNSAFE_OR_ABSENT_NEXT_FAILS_CLOSED=true
C3A_CONTRACT_UNCHANGED=true
NO_RECOVERY_LOCATOR_PROVEN=true
TRANSITION_INTENT_IS_NON_AUTHORITATIVE=true

NEW_API_BOUNDARY=false
NEW_PERSISTENCE=false
NEW_COOKIE=false
NEW_BROWSER_CARRIER=false
NEW_RECOVERY_LOCATOR=false
AUTO_PUBLISH=false

C4C_PREREQUISITE_RESOLVED=true
NEXT_ROLE=C4C
NEXT_TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
NEXT_ACTION=C4C_FRESH_PREFLIGHT
C4C_FRESH_PREFLIGHT_AUTHORIZED=true
C4C_IMPLEMENTATION_AUTHORIZED=false
C5_C12_AUTHORIZED=false
```

## Closure evidence

The post-C4C0A audit identified one remaining live gap: the credentials-step registration CTA rendered inside `LoginPageShell` discarded the already-derived safe registration return target and linked directly to `/register`.

PR #852 repairs exactly that gap. `LoginPageClient` now passes its existing `registerHref` to `LoginPageShell`; the nested registration CTA consumes that value and defaults to `/register` when no return target exists. Focused tests prove both the guest-adoption transition target and the ordinary fallback, including client-to-shell prop wiring.

The implementation does not add a redirect sanitizer, API, persistence model, cookie, browser storage, preparation/adoption/draft identifier or recovery source. Registration remains the canonical normalization boundary and the continuation target remains non-authoritative navigation intent only.

The exact implementation head `9cf9af3bf5761a3051f50ccc63155d00aa1101d7` completed Web CI successfully before merge. The changed-file set was limited to the two authorized runtime files and two focused auth tests.

## Next authorization

C4C0 no longer blocks C4C. Exactly one fresh read-only C4C preflight is authorized against current merged runtime. It must re-audit the complete guest transition, including:

- C3A session creation and continuity;
- `/api/create/intake` before preparation;
- `/api/create/adoption-preparation` before login is offered;
- the fixed navigation marker `/create?nextAction=guest-adoption-resume`;
- login, registration, verification and 2FA return continuity;
- authenticated `POST /api/create/adoption-resume`;
- canonical draft navigation only after authoritative resume success;
- retry, expiry, multi-tab and failure behavior;
- C3D ephemeral-state, accessibility and DE/EN copy boundaries;
- proof that no browser recovery locator, raw claim persistence or second authority is introduced.

The preflight may determine an exact bounded C4C implementation scope, but it does not itself authorize runtime changes. C5–C12 remain unauthorized until C4 is closed.