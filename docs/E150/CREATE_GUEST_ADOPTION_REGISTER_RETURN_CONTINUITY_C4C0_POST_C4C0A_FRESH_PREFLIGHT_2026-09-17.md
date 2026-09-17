# C4C0 Post-C4C0A Fresh Preflight — Register Return Continuity

```text
BASE_MAIN_SHA=27b108041cfa0a77a52b17cd3fc374fa8a2b0661
PARENT_TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
PARENT_ROLE=C4C
PARENT_BLOCKER=REGISTER_RETURN_CONTRACT_MISSING

TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
ROLE=C4C0
CONTRACT=AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1
PREFLIGHT_AUTHORIZATION_PR=848
PREVIOUS_PREFLIGHT_PR=793
COMPLETED_PREREQUISITE=C4C0A
COMPLETED_PREREQUISITE_IMPLEMENTATION_PR=840
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

LOGIN_CREDENTIAL_NEXT_PRESERVED=true
LOGIN_2FA_NEXT_PRESERVED=true
OUTER_LOGIN_REGISTER_CTA_NEXT_PRESERVED=true
NESTED_LOGIN_SHELL_REGISTER_CTA_NEXT_PRESERVED=false
REGISTER_PAGE_CANONICALIZES_NEXT=true
REGISTER_SUBMIT_NEXT_PRESERVED=true
EMAIL_TOKEN_NEXT_DURABLE=true
VERIFY_EMAIL_NEXT_PRESERVED=true
IDENTITY_NEXT_PRESERVED=true
UNSAFE_OR_ABSENT_NEXT_FAILS_CLOSED=true
C3A_CONTRACT_UNCHANGED=true
NO_RECOVERY_LOCATOR_PROVEN=true
TRANSITION_INTENT_IS_NON_AUTHORITATIVE=true

IMPLEMENTATION_AUTHORIZED=false
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
IMPLEMENTED=false
DONE=false
NEXT_ACTION=C4C0_IMPLEMENTATION_AUTHORIZATION
```

## Result

The C4C0A prerequisite is now merged and the prior durable email-boundary blocker is closed. The complete current runtime was re-audited for the intended non-sensitive transition marker `/create?nextAction=guest-adoption-resume`.

Registration now sends its canonicalized `next` intent to `POST /api/auth/register`; the registration route canonicalizes the input again and binds the result to the existing email-verification token; the token record carries nullable `continuationTarget`; confirmation re-normalizes the consumed value and returns `/register/identity?next=<encoded target>` only for a valid internal target; and the verify-email client prefers a lawful same-tab target, otherwise the lawful server target, otherwise the existing identity fallback. Identity/TOTP/email verification continue to use the existing post-registration redirect contract.

No C3A cookie, preparation/adoption/draft identity, claim, recovery locator, browser persistence or second source of authority is introduced by this path. The transition marker remains navigation intent only.

## Sole remaining runtime gap

`LoginPageClient` already computes:

```text
/register?next=<encoded redirectTo>
```

for its outer “Jetzt registrieren” CTA. It passes `redirectTo` into `LoginPageShell`, but does not pass the already-computed registration href. The credentials-step CTA rendered inside `LoginPageShell` remains hard-coded to `/register`.

Therefore a user entering the guest transition through `/login?next=/create?nextAction=guest-adoption-resume` can still lose the continuation only when choosing the nested registration CTA. No other C4C0 blocker was found in the merged runtime.

## Minimal lawful implementation boundary

Runtime files only:

- `apps/web/src/app/login/LoginPageClient.tsx`
- `apps/web/src/components/auth/LoginPageShell.tsx`

Focused existing tests may be extended only for this contract, primarily:

- `apps/web/tests/login-page-shell.contract.test.tsx`
- `apps/web/tests/auth-page-metadata-split.contract.test.tsx` if needed to prove prop wiring.

The smallest repair is to pass the existing `registerHref` from `LoginPageClient` into `LoginPageShell`; the shell uses that value for its credentials-step registration link and defaults to `/register` when no value is supplied. The shell must not create a second redirect sanitizer or reinterpret the destination. Register remains the canonical boundary that normalizes the `next` target before persistence.

## Required tests

- nested credentials-step CTA uses `/register?next=<encoded safe transition target>` when supplied by `LoginPageClient`;
- ordinary login without `next` keeps `/register`;
- existing credentials login and 2FA behavior remain unchanged;
- no external redirect can become authoritative through this prop; registration still canonicalizes/fails closed;
- no new cookie, browser storage, persistence, API, recovery locator or C3A/C4B authority is introduced.

## Governance conclusion

C4C0 is **not implemented** by this preflight. The preflight consumes PR #848's one-time authorization and returns `PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION` for the exact bounded implementation above. A separate implementation authorization is required before runtime/test changes.

C4C remains blocked until C4C0 is implemented and closed. C5–C12 remain unauthorized; production activation and auto-publish remain false.