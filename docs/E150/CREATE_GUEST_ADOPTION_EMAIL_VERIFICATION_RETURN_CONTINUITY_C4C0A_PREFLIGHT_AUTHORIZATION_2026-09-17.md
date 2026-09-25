# C4C0A Preflight Authorization — Email Verification Return Continuity

```text
BASE_MAIN_SHA=76e1265e0b71dff3b703e9abe944a6426ce0179d
PARENT_TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
PARENT_ROLE=C4C0
PARENT_PREFLIGHT_PR=793
PARENT_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
PARENT_BLOCKER=EMAIL_VERIFICATION_RETURN_TARGET_NOT_DURABLE

TASK=CREATE-GUEST-ADOPTION-EMAIL-VERIFICATION-RETURN-CONTINUITY-01
ROLE=C4C0A
CONTRACT=AUTHENTICATED_CREATE_EMAIL_VERIFICATION_RETURN_CONTINUITY_V1

STATUS=codex_ready
AUTHORIZATION=preflight_only
PREFLIGHT_AUTHORIZED=true
PREFLIGHT_AUTHORIZATION_CONSUMED=false
NEW_PREFLIGHT_DISPATCH_ALLOWED=true
IMPLEMENTATION_AUTHORIZED=false
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
IMPLEMENTED=false
DONE=false
NEXT_ACTION=C4C0A_FRESH_PREFLIGHT
```

PR `#793` established the precise prerequisite on merged runtime: the registration UI can retain the non-sensitive safe internal `next` target in same-tab navigation, but the active server-generated verification email link is built from a token whose durable record contains no continuation target. `POST /api/auth/email/confirm` therefore cannot lawfully reconstruct the requested authenticated return and currently falls back to `/register/identity`.

This authorization permits exactly one C4C0A fresh preflight against current `main`. The preflight must audit the complete registration-submission → token creation/rotation → verification-mail construction → verification confirmation → identity handoff path, including resend and other token-creation call sites that share the same token service. It must determine the smallest lawful contract for carrying only a normalized safe internal navigation intent across the email boundary.

The target remains non-authoritative navigation intent only. It may not contain or become a source of truth for a preparation, adoption, draft, claim, recovery token, receipt, idempotency key, binding hash, user identity, or C3A session. `NO_PREPARATION_BROWSER_CARRIER_V1` remains binding. The C3A HttpOnly session must not be copied, mirrored, broadened, recreated, or inferred from the email-verification contract.

The preflight must reuse the existing canonical internal redirect normalization primitive and prove fail-closed behavior for external, protocol-relative, JavaScript/data, control-character, malformed, encoded-host-confusion, unsafe absolute and relevant double-encoded redirect inputs. It must explicitly assess token rotation, expiry, replay/consume behavior, resend behavior, cross-device verification, legacy token compatibility, and whether stale or absent continuation intent safely falls back to the existing identity path.

No implementation is authorized by this document. The preflight may identify a minimal bounded persistence extension on the existing email-verification token document if and only if that extension stores solely the already-normalized safe internal navigation intent and introduces no new collection, recovery source, browser persistence, cookie, API boundary, preparation/adoption identifier, or secondary authority. Any runtime or test change requires a separate implementation authorization after the preflight establishes the exact file boundary and acceptance evidence.

C4C0 remains blocked until C4C0A is completed and separately closed. C4C remains blocked until C4C0 is completed. C5–C12 remain unauthorized; production activation and auto-publish remain false.
