# C4C0A Fresh Preflight — Email Verification Return Continuity

```text
BASE_MAIN_SHA=520162f2dcce6361176baf5eea399cdc2c9af97d
PARENT_TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
PARENT_ROLE=C4C0
PARENT_BLOCKER=EMAIL_VERIFICATION_RETURN_TARGET_NOT_DURABLE
PREFLIGHT_AUTHORIZATION_PR=821

TASK=CREATE-GUEST-ADOPTION-EMAIL-VERIFICATION-RETURN-CONTINUITY-01
ROLE=C4C0A
CONTRACT=AUTHENTICATED_CREATE_EMAIL_VERIFICATION_RETURN_CONTINUITY_V1
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

DURABLE_SAFE_INTERNAL_RETURN_INTENT_REQUIRED=true
NEW_COLLECTION_REQUIRED=false
NEW_COOKIE_REQUIRED=false
NEW_BROWSER_PERSISTENCE_REQUIRED=false
NEW_API_BOUNDARY_REQUIRED=false
C3A_CONTRACT_CHANGE_REQUIRED=false
RECOVERY_LOCATOR_REQUIRED=false
PREPARATION_OR_ADOPTION_IDENTIFIER_REQUIRED=false
CAN_REUSE_EXISTING_EMAIL_VERIFICATION_TOKEN_SLOT=true
CAN_REUSE_CANONICAL_INTERNAL_REDIRECT_NORMALIZER=true
LEGACY_TOKEN_FALLBACK_REQUIRED=true
CROSS_DEVICE_RETURN_SUPPORTED=true
RESEND_CONTINUITY_REQUIRED=true
TOKEN_ROTATION_MUST_REPLACE_RETURN_INTENT=true
UNSAFE_OR_ABSENT_RETURN_MUST_FAIL_CLOSED=true

IMPLEMENTATION_AUTHORIZED=false
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
IMPLEMENTED=false
DONE=false
NEXT_ACTION=C4C0A_IMPLEMENTATION_AUTHORIZATION
```

## Result

The C4C0A prerequisite is implementable as a bounded extension of the existing email-verification token contract. No new collection, cookie, browser persistence, recovery locator, API boundary, preparation/adoption identifier, C3A mirror, or second authority is required.

The durable value is navigation intent only. It must be a canonical normalized internal path such as `/create?nextAction=guest-adoption-resume`. It must never identify a preparation, adoption, draft, claim, recovery record, receipt, idempotency key, binding hash, user identity, or session.

## Current runtime findings

1. `RegisterPageClient` reads and locally sanitizes `next`, and same-tab navigation can retain it, but registration submission does not durably bind it to the server-generated verification token.
2. `POST /api/auth/register` creates the email-verification token and verification URL without a durable continuation target.
3. `EmailVerificationTokenDoc` has no continuation field. `createEmailVerificationToken(userId, email)` rotates a single per-user token slot and currently stores only verification/delivery state.
4. `POST /api/auth/email/confirm` consumes the token, creates the authenticated session, and returns the fixed `/register/identity` target.
5. `/register/verify-email` currently derives its redirect from the page query. Its local `sanitizeNext` is weaker than the canonical `normalizeInternalRedirectPath`, and its success path effectively prefers the page-derived `/register/identity...` value over the server response. Therefore an email opened without `next` cannot recover the lawful stored target even if the confirm route were extended alone.
6. The verify page resends through `POST /api/auth/email/start-verify`. That path creates a replacement token. If continuation is not supplied and re-normalized there, token rotation would erase the intended return after a resend.
7. Other token creation callers — public resend, identity verification and admin-driven verification — must remain valid with no continuation intent. Their tokens must persist `null`, never inherit a stale target from the previous slot.

## Minimal lawful implementation contract

### Token document

Add one optional nullable field on the existing `email_verification_tokens` document:

```text
continuationTarget?: string | null
```

The field is navigation intent only. It is not a recovery locator and is not sufficient to resume C4B. The existing account/session plus C3A/C4A1/C4B server authority remain necessary.

### Token creation and rotation

`createEmailVerificationToken` may accept an optional continuation target. Every token rotation must explicitly replace the stored value with the supplied normalized target or `null`. Omitting a target must therefore clear any previous target in the unique token slot rather than accidentally retaining it.

The token service returns the stored continuation target only when a valid token is consumed. Expired, invalidated, replayed, missing and legacy tokens remain fail-closed. Legacy documents without the field behave as `null` and fall back to `/register/identity`.

### Canonical normalization

No new redirect sanitizer is allowed. The web boundary must reuse `normalizeInternalRedirectPath` before persistence. The confirm boundary must normalize the consumed stored value again before turning it into a redirect, so malformed historical/database values fail closed.

At minimum the contract tests must reject external URLs, protocol-relative paths, JavaScript/data forms, control characters, malformed/host-confusion inputs, unsafe absolute paths and relevant encoded/double-encoded bypass attempts already covered by the canonical normalizer.

### Registration submission

`RegisterPageClient` must send the already-present non-sensitive `next` intent with the registration request. `POST /api/auth/register` must canonicalize it and pass only the normalized result into token creation. The verification email does not need to expose `next` in its URL because the token record is the durable server-side carrier.

### Confirmation and identity handoff

After successful token consumption, `POST /api/auth/email/confirm` may return:

- `/register/identity?next=<encoded normalized target>` when a valid continuation target exists;
- `/register/identity` when it does not.

The verify page must prefer a canonicalized same-tab query target when legitimately present, otherwise use the canonicalized server return from token consumption, otherwise fall back to `/register/identity`.

### Resend

The active verify page resend path must send its current safe `next` intent to `POST /api/auth/email/start-verify`. That route must canonicalize it before creating the replacement token. A resend initiated without lawful continuation intent must create a token with `continuationTarget=null`.

Shared/admin verification callers remain unchanged unless required by typing: no continuation intent means `null`. This proves that the single shared token slot cannot retain a stale Create target after a non-Create verification rotation.

## Cross-device and fail-closed behavior

An email may be opened on another device. The token can authenticate that device and preserve only the safe navigation intent. It cannot recreate the C3A HttpOnly session, preparation/adoption identity or C4B recovery state. Returning to `/create?nextAction=guest-adoption-resume` on a device without the original C3A binding must therefore continue to fail closed through the existing C4 contracts and show continuation-unavailable behavior rather than guessing state.

## Exact implementation boundary proposed for separate authorization

Runtime files:

- `core/auth/emailVerificationTypes.ts`
- `core/auth/emailVerificationService.ts`
- `apps/web/src/app/register/RegisterPageClient.tsx`
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/auth/email/start-verify/route.ts`
- `apps/web/src/app/api/auth/email/confirm/route.ts`
- `apps/web/src/app/register/verify-email/page.tsx`

Test files may be added or extended only for this contract, covering:

- canonical-safe target persistence and consumption;
- null clearing on rotation and non-Create callers;
- expiry/replay/legacy token fallback;
- registration submission → token → confirmation → identity return;
- resend preservation;
- malicious redirect rejection;
- cross-device target preservation without C3A recreation.

No changes to C4B state authority, C3A cookie scope, preparation/adoption/draft persistence, collections/indexes, production activation, auto-publish, C5–C12, G-track or T-track are authorized by this preflight.

## Governance conclusion

`C4C0A` is **not implemented** by this PR. The preflight consumes PR #821's one-time preflight authorization and returns `PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION` for the bounded implementation contract above. A separate implementation authorization is required before any runtime or test file changes.
