# Fresh C4B Preflight — Authenticated Guest Adoption / Draft Resume

```text
BASE_MAIN_SHA=7919d39323e7995201003b06f66b7cf2a5946ff4
TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
PREVIOUS_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
PREVIOUS_BLOCKER=NO_SUPPORTED_ATOMIC_C4A1_SLOT_TO_C4B_RECEIPT_DRAFT_CONTRACT
PREVIOUS_BLOCKER_RESOLVED_BY=CREATE-GUEST-ADOPTION-ATOMIC-CONSUMPTION-CONTRACT-01
PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
```

`getSessionUser(req)` verifies the signed account session, valid ObjectId user, current user record and revocation/suspension state; C4B must use `user._id.toHexString()` only. `verifyAnonymousSession(...)` supplies the additionally required C3A authority. C4B0’s binding-only claim/completion primitives provide current-generation claim, same-account recovery, exact completion, and cross-account denial without a browser locator.

One Node boundary is sufficient: `POST /api/create/adoption-resume`, `runtime="nodejs"`, `dynamic="force-dynamic"`. Its JSON body is exactly `{}`; a new `create_guest_adoption_resume` security scope has an empty allowed-field set and preserves existing provenance, CSRF, honeypot, bounded UTF-8 body and persistent actor/IP/session/client limits. It accepts no IDs, claim, user data, redirect or URL.

For a claimed result, the route saves one account-owned `CANONICAL_CREATE_DRAFT_KIND` draft with `status="draft"`, the approved claim in `text`, `textOriginal`, and `textPrepared`, minimal source `guest_adoption`, and no analysis/AI/publication/handoff effects; then it completes the exact server-only adoption. Completed replay verifies `getCreateContributionDraftForResumeRecord(draftId, userId)` before returning only `{ ok: true, status: "resumed", draftId }`.

The existing builder hashes user, source and payload but has no lawful adoption-generation input. More importantly, a deterministic save key alone does not close the save-to-completion expiry race: after the C4B0 claim expires, `claimGuestAdoptionPreparationForAuthenticatedAccount` returns no adoption ID, claim, or draft ID. `getCreateContributionDraftForResumeRecord(draftId, userId)` and ordinary resume require an already known `draftId`. No current authenticated lookup maps the verified C3A binding plus account to the exact saved, incompletely completed adoption generation. Thus a process crash or lost response after save can leave an account-owned orphan draft; a later reprepare can create a distinct new generation, and an account-global/latest-draft lookup would be ambiguous and stale-generation unsafe.

## Save-to-completion expiry recovery gap

`SAVE_TO_COMPLETION_CRASH_SAFE=false` for recovery after claim expiry. Before expiry, the same-account C4B0 replay returns the exact adoption ID and claim, so a deterministic adoption-scoped draft key can converge. After expiry, the only authoritative C4B0 record is not readable/replayable, while the saved draft’s owning store has no lookup key available to the route. A saved draft therefore cannot be returned or safely completed after a browser-lost response without an existing draft ID. `DUPLICATE_DRAFT_RISK=UNRESOLVED`; `ORPHAN_DRAFT_RISK=UNRESOLVED`; post-expiry same-account replay is not proven.

The smallest required prerequisite is a separately governed durable, binding-only recovery contract that records the exact canonical draft identity for the verified C3A binding, authenticated account binding, and adoption generation before that generation can become unrecoverable. It must support exact same-account lookup after expiry, reject stale/new generations, avoid browser locators and account-global guessing, and remain a single authoritative recovery model. No transaction, receipt collection, or implementation is selected or authorized here.

```text
CORE_CONTRACT_COUNT=UNRESOLVED_PENDING_RECOVERY_PREREQUISITE
API_BOUNDARY_COUNT=UNRESOLVED_PENDING_RECOVERY_PREREQUISITE
IMPLEMENTATION_FILES_PLANNED=0
RUNTIME_FILES_PLANNED=0
TEST_FILES_PLANNED=0
```

Required prerequisite tests must prove post-expiry exact-draft recovery, browser-lost-response recovery, orphan exclusion, reprepare/new-generation exclusion and duplicate-draft exclusion before a new C4B preflight. No implementation is authorized. C4C remains blocked; C5–C12 and production remain unauthorized; no transaction, receipt collection, browser carrier, deploy or auto-publish is authorized.
