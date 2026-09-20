# C4C0 Post-C4C0A Preflight Authorization — Register Return Continuity

```text
BASE_MAIN_SHA=a3ee92fafc7f21d41849fdda69def550b1c0f3dd
PARENT_TASK=CREATE-GUEST-ADOPTION-INTENT-LOGIN-TRANSITION-01
PARENT_ROLE=C4C
PARENT_BLOCKER=REGISTER_RETURN_CONTRACT_MISSING

TASK=CREATE-GUEST-ADOPTION-REGISTER-RETURN-CONTINUITY-01
ROLE=C4C0
CONTRACT=AUTHENTICATED_CREATE_REGISTER_RETURN_CONTINUITY_V1
PREVIOUS_PREFLIGHT_PR=793
PREVIOUS_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
COMPLETED_PREREQUISITE_ROLE=C4C0A
COMPLETED_PREREQUISITE_IMPLEMENTATION_PR=840
COMPLETED_PREREQUISITE_MERGE=a3ee92fafc7f21d41849fdda69def550b1c0f3dd

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
NEXT_ACTION=C4C0_POST_C4C0A_FRESH_PREFLIGHT
```

PR #793 established two distinct register-return gaps: the durable server-generated verification-email return target and the nested `LoginPageShell` registration CTA. C4C0A was split out solely for the durable verification-email boundary and is now implemented and merged through PR #840 with exact-head CI and contract review.

This document authorizes exactly one fresh C4C0 preflight against current `main` after C4C0A completion. The audit must recheck the complete guest transition target `/create?nextAction=guest-adoption-resume` across login, registration, verification email, identity and 2FA using the actually merged runtime. It must not assume the old findings remain true merely because the prerequisite is now complete.

The preflight must specifically determine whether any blocker remains beyond the known nested `LoginPageShell` credentials-step registration CTA, where the shell historically linked directly to `/register` while `LoginPageClient` already computed the safe `/register?next=<encoded target>` href for its outer CTA.

If the nested CTA is the only remaining gap, the preflight may return `PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION` only for the smallest bounded prop-through / rendering repair plus focused regression tests. It must reuse the already-sanitized safe login redirect intent and may not add a new redirect normalizer, auth API, persistence model, cookie, browser storage, recovery locator, preparation/adoption/draft identifier, or secondary authority.

The preflight must also re-prove that C4C0A now preserves safe return intent through registration submission, server-generated verification mail, confirmation and identity handoff; that unsafe/missing intent falls back safely; that credential login and 2FA continue to preserve safe `next`; and that C3A remains independent and unchanged.

No implementation is authorized by this document. Any runtime/test change requires separate implementation authorization after the exact remaining boundary is established. C4C remains blocked until C4C0 is completed. C5–C12 remain unauthorized; production activation and auto-publish remain false.