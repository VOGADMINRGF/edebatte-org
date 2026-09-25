# C4C0 Preflight Authorization — Register Return Continuity

```text
BASE_MAIN_SHA=1f37048d5d2a0df3cb2df2b4d2fbf27cf60ad0ee
PARENT_TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
PARENT_ROLE=C4C
PARENT_PREFLIGHT_PR=791
PARENT_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
PARENT_BLOCKER=REGISTER_RETURN_CONTRACT_MISSING

TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
ROLE=C4C0
CONTRACT=AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1

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
NEXT_ACTION=C4C0_FRESH_PREFLIGHT
```

PR `#791` established the precise blocker on merged runtime: `LoginPageClient` derives a safe `next` and constructs `/register?next=<encoded-safe-internal-path>`, but the credentials-step registration CTA inside `LoginPageShell` is hard-coded to `/register`. A visitor who enters `/login?next=/create` may select that nested CTA and lose the non-sensitive transition intent.

This authorization permits exactly one C4C0 preflight to audit all actual registration entry points and every active continuation hop: login, `LoginPageClient`, `LoginPageShell`, header login surfaces, guest Create, direct registration, registration submission, email verification, identity/2FA where applicable, session establishment, and authenticated return. It must determine whether the safe target `/create?nextAction=guest-adoption-resume` is accepted, normalized, preserved, rejected when unsafe, and lawfully restored by existing architecture after refresh where applicable.

The future preflight must preserve `NO_PREPARATION_BROWSER_CARRIER_V1`. The transition target may convey only the non-sensitive intent to attempt server-side adoption resume; it must not contain or become a source of truth for a preparation, adoption, claim, draft, recovery token, idempotency key, or binding hash. C3A cookie attributes and authority remain unchanged, and the preflight must verify that no proposed continuity work clears, overwrites, broadens, or replaces the C3A session binding.

No implementation is authorized. The later preflight must audit server-side redirect normalization for external, protocol-relative, JavaScript, encoded external, control-character, double-encoded, malformed, host-confusion, and relevant path-normalization inputs; it must reuse the existing safe internal redirect normalizer rather than introduce another sanitizer. It must also establish the smallest evidence-based runtime/test boundary, with no pre-authorized file list, API boundary, persistence, cookie, database, recovery source, or C4C implementation scope.

C4C remains blocked until C4C0 is completed and separately closed. C5–C12 remain unauthorized; production activation and auto-publish remain false.
