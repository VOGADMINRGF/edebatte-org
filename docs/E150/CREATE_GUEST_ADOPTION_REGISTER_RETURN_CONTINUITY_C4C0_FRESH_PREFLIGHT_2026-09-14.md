# C4C0 Fresh Preflight — Register Return Continuity

```text
BASE_MAIN_SHA=b3dd3603d1874cf4572100d697ec1150a7ee50f0
PARENT_TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
PARENT_ROLE=C4C
PARENT_STATUS=blocked
PARENT_PREFLIGHT_PR=791
PARENT_BLOCKER=REGISTER_RETURN_CONTRACT_MISSING

TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
ROLE=C4C0
CONTRACT=AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1
PREFLIGHT_AUTHORIZATION_PR=792
PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED

LOGIN_TO_REGISTER_NEXT_PRESERVED_AFTER_PLANNED_FIX=true
REGISTER_TO_LOGIN_NEXT_PRESERVED=true
REGISTER_PAGE_ACCEPTS_NEXT=true
REGISTER_PAGE_NORMALIZES_NEXT=true
REGISTER_PAGE_PRESERVES_NEXT=true
REGISTER_SUBMIT_NEXT_PRESERVED=false
REGISTER_FLOW_NEXT_PRESERVED=false
VERIFY_EMAIL_NEXT_PRESERVED=false
IDENTITY_NEXT_PRESERVED=true
POST_REGISTER_AUTHENTICATED_RETURN_PROVEN=false
TWO_FACTOR_NEXT_PRESERVED=true

REGISTER_CREATES_AUTH_SESSION=false
REGISTER_REQUIRES_LOGIN_AFTERWARD=false
REGISTER_REQUIRES_VERIFICATION_FIRST=true
REGISTER_REQUIRES_IDENTITY_FIRST=true

REGISTER_OPEN_REDIRECT_CLOSED=true
C4C_TRANSITION_TARGET_PRESERVED=true
C3A_CONTRACT_UNCHANGED=true
NO_RECOVERY_LOCATOR_PROVEN=true
TRANSITION_INTENT_IS_NON_AUTHORITATIVE=true
AUTH_SESSION_FOUNDATION_REUSED=true
REDIRECT_SANITIZER_REUSED=true

NEW_API_REQUIRED=false
AUTH_API_RUNTIME_CHANGE_REQUIRED=true
NEW_COOKIE_REQUIRED=false
NEW_PERSISTENCE_REQUIRED=false
NEW_DB_CHANGE_REQUIRED=false
NEW_RECOVERY_SOURCE_REQUIRED=false
NO_NEW_FOUNDATIONAL_PREREQUISITE=false

PLANNED_IMPLEMENTATION_FILES=DEFERRED_UNTIL_C4C0A
PLANNED_RUNTIME_FILES=0
PLANNED_TEST_FILES=0
API_BOUNDARY_COUNT=0
CORE_CONTRACT_COUNT=0

NEW_BLOCKER=EMAIL_VERIFICATION_RETURN_TARGET_NOT_DURABLE
PREREQUISITE_ROLE=C4C0A
PREREQUISITE_TASK=CREATE-GUEST-ADOPTION-EMAIL-VERIFICATION-RETURN-CONTINUITY-01
PREREQUISITE_CONTRACT=AUTHENTICATED_CREATE_EMAIL_VERIFICATION_RETURN_CONTINUITY_V1
```

## Actual active-runtime matrix

The audited target is the non-sensitive internal path `/create?nextAction=guest-adoption-resume`. It is only navigation intent: it cannot authenticate, authorize, identify a preparation/adoption/draft/claim, or cause C4B resume without the authenticated account, verified C3A HttpOnly session, and authoritative C4A1/C4B server state.

| Path | Classification | Target result |
| --- | --- | --- |
| Guest Create → Login → credentials login | ACTIVE_RUNTIME | `LoginPageClient`, `useLoginFlow`, login API and role-aware redirect resolution preserve a safe `next`; return is proven. |
| Login → 2FA challenge/method switch/verification | ACTIVE_RUNTIME | `next` is stored as the sanitized challenge redirect and returned after verification; return is proven. |
| Login → outer registration CTA | ACTIVE_RUNTIME | `LoginPageClient` builds `/register?next=<encoded target>`. |
| Login → nested `LoginPageShell` CTA | ACTIVE_RUNTIME | Currently drops `next`; a focused future repair can preserve it, but is not implemented here. |
| Register → “already have an account” login link | ACTIVE_RUNTIME | `RegisterPageClient` preserves `next` in the login link. |
| Register client submit → same-tab verify-email page | ACTIVE_RUNTIME | The client keeps `next` in its `/register/verify-email` navigation. |
| Server-generated registration email link → verify-email | ACTIVE_RUNTIME | Fails: the link has token and email only; no safe target is emitted or stored with the token. |
| Verify-email → identity | ACTIVE_RUNTIME | Preserves a supplied safe `next`; without one, defaults to `/register/identity`. |
| Identity verification → authenticated return | ACTIVE_RUNTIME | Uses existing role-aware internal redirect resolution and preserves a supplied safe `next`. |

## Primary blocker

`RegisterPageClient` does not send `next` to `POST /api/auth/register`. The registration route creates an email-verification token with only `(userId, email)` and sends `/register/verify-email?token=<token>&email=<email>`. `EmailVerificationTokenDoc` has no continuation-target field, and `/api/auth/email/confirm` returns the fixed `/register/identity`. Consequently, opening the active verification email link loses `/create?nextAction=guest-adoption-resume`; neither the token nor the server confirmation can reconstruct it lawfully.

This is distinct from the known nested `LoginPageShell` CTA: after that link is repaired, the mail-link path remains unable to preserve the target. The new C4C0A prerequisite must establish the bounded safe-email-verification return-intent contract under separate governance. It must use the existing canonical internal redirect normalizer and cannot add browser storage, a C3A mirror cookie, guest/adoption/draft/recovery identifiers, a second recovery source, or C4C implementation.

## Security and session findings

The canonical redirect primitive is `normalizeInternalRedirectPath`, reused by auth `sanitizeRedirect` and role-aware post-login/post-registration redirect resolution. It rejects unsafe external, protocol-relative, JavaScript/data, control-character, malformed, host-confusion and unsafe absolute redirect inputs; the target query remains intact and internal. No C4C0-specific redirect sanitizer is needed.

C3A remains independent and unchanged: it is HttpOnly, SameSite=Lax, host-only, Secure in production, scoped to `/api/create`, and never read, copied, issued, cleared, or broadened by the inspected registration flow. A verification email opened on another device may lawfully authenticate that device but cannot recreate C3A; any later C4B attempt there fails closed and must receive generic continuation-unavailable UX. This is not a browser carrier and no recovery locator is required.

Registration itself creates no authenticated session. The active post-registration route requires email verification and then the identity flow, where identity verification establishes the session and can navigate to a supplied safe internal target. Login, 2FA and identity routes preserve existing safe `next` values; the missing durable target is specifically the server-generated registration verification link.
