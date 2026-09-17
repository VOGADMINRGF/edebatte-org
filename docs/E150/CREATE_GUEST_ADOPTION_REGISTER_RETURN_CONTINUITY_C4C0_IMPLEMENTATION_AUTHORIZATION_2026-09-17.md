# C4C0 Implementation Authorization — Login/Register Return Continuity

```text
BASE_MAIN_SHA=e072c5f0781589c73cee1e8a9e963b20bdb97635
PREFLIGHT_PR=849
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
ROLE=C4C0
CONTRACT=AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1

IMPLEMENTATION_AUTHORIZED=true
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=true
IMPLEMENTED=false
DONE=false
```

## Authorized implementation boundary

Exactly one remaining runtime defect is authorized for repair: the nested credentials-step registration CTA rendered by `LoginPageShell` must preserve the already-canonical safe internal `next` target computed by `LoginPageClient` instead of hard-coding `/register`.

Runtime files authorized:

- `apps/web/src/app/login/LoginPageClient.tsx`
- `apps/web/src/app/login/LoginPageShell.tsx`

Focused existing auth/login shell tests may be extended or added only as required to prove this contract.

## Required behavior

- Reuse the existing canonicalized registration href produced by `LoginPageClient`; do not create another sanitizer.
- With a valid internal transition target, every registration CTA on the login surface must resolve to `/register?next=<encoded target>`.
- Without a valid target, registration CTAs must continue to resolve to `/register`.
- No target may be reconstructed, guessed, persisted, or broadened by `LoginPageShell`.
- Existing login, 2FA, registration, verification-email and identity behavior must remain unchanged apart from preserving this navigation intent.

## Forbidden

- new API or persistence
- new cookie or cookie-scope change
- localStorage/sessionStorage/browser persistence
- new recovery locator or preparation/adoption/draft identifier
- new redirect sanitizer
- C3A/C4B authority changes
- C4C parent implementation beyond this prerequisite
- C5–C12 changes
- production activation or auto-publish

## Acceptance

Focused tests must prove both safe-target preservation and no-target fallback for the nested credentials-step registration CTA, alongside unchanged existing login-shell behavior. Exact-head Web CI must pass before merge. After this implementation is merged, C4C0 must be freshly revalidated before it can be marked done or unblock C4C.