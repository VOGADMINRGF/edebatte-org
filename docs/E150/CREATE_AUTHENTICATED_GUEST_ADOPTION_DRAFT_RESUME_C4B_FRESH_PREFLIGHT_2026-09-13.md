# Fresh C4B Preflight — Authenticated Guest Adoption / Draft Resume

```text
BASE_MAIN_SHA=7919d39323e7995201003b06f66b7cf2a5946ff4
TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
PREVIOUS_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
PREVIOUS_BLOCKER=NO_SUPPORTED_ATOMIC_C4A1_SLOT_TO_C4B_RECEIPT_DRAFT_CONTRACT
PREVIOUS_BLOCKER_RESOLVED_BY=CREATE-GUEST-ADOPTION-ATOMIC-CONSUMPTION-CONTRACT-01
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
```

`getSessionUser(req)` verifies the signed account session, valid ObjectId user, current user record and revocation/suspension state; C4B must use `user._id.toHexString()` only. `verifyAnonymousSession(...)` supplies the additionally required C3A authority. C4B0’s binding-only claim/completion primitives provide current-generation claim, same-account recovery, exact completion, and cross-account denial without a browser locator.

One Node boundary is sufficient: `POST /api/create/adoption-resume`, `runtime="nodejs"`, `dynamic="force-dynamic"`. Its JSON body is exactly `{}`; a new `create_guest_adoption_resume` security scope has an empty allowed-field set and preserves existing provenance, CSRF, honeypot, bounded UTF-8 body and persistent actor/IP/session/client limits. It accepts no IDs, claim, user data, redirect or URL.

For a claimed result, the route saves one account-owned `CANONICAL_CREATE_DRAFT_KIND` draft with `status="draft"`, the approved claim in `text`, `textOriginal`, and `textPrepared`, minimal source `guest_adoption`, and no analysis/AI/publication/handoff effects; then it completes the exact server-only adoption. Completed replay verifies `getCreateContributionDraftForResumeRecord(draftId, userId)` before returning only `{ ok: true, status: "resumed", draftId }`.

The existing builder hashes user, source and payload but has no lawful adoption-generation input. Implementation therefore needs a small explicit canonical-draft adoption-idempotency field (not overloading source/package/analysis), included in builder, payload conflict contract and save input. That provides same user/adoption/claim deterministic reuse and distinct-generation separation. Save-before-completion crash retries reuse the same draft and complete it. If completion loses an expiry race, the saved user-owned draft remains authoritative and retries reuse it, but the route fails closed rather than binding a stale generation; reprepare cannot complete it later.

```text
CORE_CONTRACT_COUNT=2
CORE_CONTRACTS=C4B0 reuse; canonical draft adoption-generation idempotency
API_BOUNDARY_COUNT=1
IMPLEMENTATION_FILES_PLANNED=6
RUNTIME_FILES_PLANNED=3
TEST_FILES_PLANNED=3
IMPLEMENTATION_FILE_LIST=apps/web/src/app/api/create/adoption-resume/route.ts;apps/web/src/features/create/createRouteSecurity.ts;apps/web/src/server/serverDrafts.ts;apps/web/tests/create-adoption-resume.route.test.ts;apps/web/tests/create-route-security.contract.test.ts;apps/web/tests/server-drafts.idempotency.contract.test.ts
```

Required tests cover auth/C3A/body rejection, account switching, one draft, crash/retry, completion replay ownership, expiry race, stale generation, security limits, no IDs/claim in response, C4B0 regression and canonical-draft idempotency. No implementation is authorized. C4C remains blocked; C5–C12 and production remain unauthorized; no transaction, receipt collection, browser carrier, deploy or auto-publish is authorized.
