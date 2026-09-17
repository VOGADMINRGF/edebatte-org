# C4C0A Implementation Authorization — Email Verification Return Continuity

```text
BASE_MAIN_SHA=5481a561417cdc1112ad297492cf1cfd517c8fd6
PREFLIGHT_PR=827
PREFLIGHT_HEAD=f67a186198681ac466d9a5f7118af7379392ebdf
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION

TASK=CREATE-GUEST-ADOPTION-EMAIL-VERIFICATION-RETURN-CONTINUITY-01
ROLE=C4C0A
CONTRACT=AUTHENTICATED_CREATE_EMAIL_VERIFICATION_RETURN_CONTINUITY_V1

AUTHORIZATION=implementation_only
PREFLIGHT_AUTHORIZED=false
PREFLIGHT_AUTHORIZATION_CONSUMED=true
NEW_PREFLIGHT_DISPATCH_ALLOWED=false
IMPLEMENTATION_AUTHORIZED=true
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=true
IMPLEMENTED=false
DONE=false
NEXT_ACTION=C4C0A_IMPLEMENTATION
```

## Authorization decision

Merged preflight PR `#827` established that the missing email-verification return continuity can be implemented as a bounded extension of the existing verification-token contract. This document authorizes exactly one implementation slice for that contract and no broader C4C, C4C0, C5-C12, G, T, production-activation or auto-publish work.

The implementation may carry only normalized, non-authoritative internal navigation intent across the verification-email boundary. It may not carry or create a preparation, adoption, draft, claim, recovery token, receipt, idempotency key, binding hash, account identity, browser recovery locator, C3A mirror, or second source of truth.

`NO_PREPARATION_BROWSER_CARRIER_V1` remains binding. C3A remains the only browser transition binding and must not be copied, recreated, broadened or inferred by this work.

## Exact authorized runtime boundary

Runtime changes are authorized only in:

- `core/auth/emailVerificationTypes.ts`
- `core/auth/emailVerificationService.ts`
- `apps/web/src/app/register/RegisterPageClient.tsx`
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/auth/email/start-verify/route.ts`
- `apps/web/src/app/api/auth/email/confirm/route.ts`
- `apps/web/src/app/register/verify-email/page.tsx`

Test changes may be added or extended only for this contract under `apps/web/tests/**` and, if the existing test topology requires it, the smallest matching auth/core contract-test location already used by the repository.

No new collection, index, cookie, browser storage, API route, recovery source, persistence subsystem, queue, provider, C3A/C4B authority or schema migration is authorized.

## Required implementation behavior

1. `EmailVerificationTokenDoc` may add exactly one optional nullable navigation-intent field, named `continuationTarget?: string | null`.
2. `createEmailVerificationToken(...)` may accept an optional continuation target. Every token rotation must explicitly write the normalized target or `null`; omission must clear a stale value from the unique per-user verification slot.
3. Registration submission may send the already-present `next` intent. `POST /api/auth/register` must canonicalize it using the existing canonical internal redirect normalizer before token creation.
4. The durable verification email URL does not need to expose `next`; the existing verification-token record is the only authorized durable carrier for this navigation intent.
5. `consumeEmailVerificationToken(...)` may return the persisted continuation target together with the existing verified-user result. Missing legacy fields behave as `null`.
6. `POST /api/auth/email/confirm` must canonicalize the consumed stored target again and return `/register/identity?next=<encoded-target>` only when valid; otherwise it must return `/register/identity`.
7. `/register/verify-email` must stop relying on its weaker local redirect sanitizer for authority. It must prefer a canonicalized lawful same-tab query target when present, otherwise the canonicalized server response, otherwise `/register/identity`.
8. The active resend flow must preserve the current lawful target by sending it to `POST /api/auth/email/start-verify`; that route must canonicalize it before rotating the token. A resend without a lawful target must rotate with `continuationTarget=null`.
9. Every other existing token creator, including public/admin/identity-driven verification callers, must remain safe when no continuation is supplied. They must not inherit a stale Create target.
10. Cross-device verification may preserve navigation intent but must not recreate C3A or any guest/adoption/draft authority. Existing C4 fail-closed behavior remains authoritative when the original C3A binding is absent.

## Required security acceptance

The implementation must reuse the existing `normalizeInternalRedirectPath` primitive. It must fail closed for at least:

- external absolute URLs;
- protocol-relative URLs;
- JavaScript/data schemes;
- control-character payloads;
- malformed and host-confusion inputs;
- unsafe absolute/path confusion;
- encoded and relevant double-encoded redirect bypass attempts already represented by the canonical normalizer contract.

No second redirect sanitizer may become authoritative.

## Required token lifecycle acceptance

Tests must prove:

- canonical safe target persists and is returned exactly once with a valid token;
- token rotation replaces a prior target with a new lawful target;
- token rotation without a target clears a prior target to `null`;
- expired, invalidated and replayed tokens do not return continuation intent;
- legacy token records without the field fall back safely;
- registration → token creation → email confirmation → identity handoff preserves the lawful target;
- resend preserves the lawful target when explicitly supplied;
- resend/non-Create token creation without target cannot inherit stale Create intent;
- malicious redirect inputs are rejected/fall back;
- cross-device target preservation does not imply C3A recreation or C4 resume authority.

## Review and completion gates

The implementation is not `done` merely because code exists. Before C4C0A can close, the exact implementation head must have:

- focused contract tests passing;
- repository/security guardrails passing;
- lint, typecheck and build passing;
- independent diff review with `P0=0`, `P1=0`, `P2=0` or all findings explicitly repaired and re-reviewed on the new exact head;
- evidence that no new collection/index/cookie/browser persistence/API boundary/recovery locator/C3A change/second authority was introduced;
- explicit legacy, replay, rotation, resend and cross-device fail-closed evidence.

A successful C4C0A implementation closes only this prerequisite. C4C0 must then be separately re-evaluated/closed before C4C may proceed. C5-C12 remain unauthorized.

## Explicit exclusions

This authorization does not permit production activation, auto-publish, C4C visible UX implementation beyond the exact verification-return boundary, C4B state changes, C3A cookie changes, guest recovery, account-draft recovery, new identifiers, new data stores, G-track work, T-track work, Alpha2 work or pricing/payment work.