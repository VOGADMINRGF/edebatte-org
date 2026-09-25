# C4B Post-C4B1 Fresh Preflight

```text
BASE_MAIN_SHA=5255292264c183c5b53bd7392ec4f7e63692e446
TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
C4B0_STATUS=done
C4B1_STATUS=done
PREVIOUS_FRESH_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
PREVIOUS_FRESH_BLOCKER=SAVE_COMPLETED_DRAFT_ID_NOT_RECOVERABLE_AFTER_C4B0_CLAIM_EXPIRY
PREVIOUS_FRESH_BLOCKER_RESOLVED=true
POST_C4B1_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
NEW_BLOCKER=DRAFT_BOUND_ADOPTION_NOT_SERVER_DISCOVERABLE_AFTER_ORDINARY_CLAIM_EXPIRY
```

## Current-main audit

PR `#769` closed C4B0 and PR `#775` closed C4B1. C4B1 provides `PREBOUND_ADOPTION_DRAFT_RECOVERY_V1` and `DRAFT_BOUND_RECOVERY_V1`: an active ordinary claim can be pre-bound before save, with an adoption-scoped deterministic key and recovery bounded by C3A expiry. It resolves the previous foundation blocker, but does not itself provide a no-ID discovery operation for the proposed C4B request body `{}`.

`claimGuestAdoptionPreparationForAuthenticatedAccount` first attempts the unique C4A1/C4B0 slot, but its claimed-generation replay requires `adoption.recoveryExpiresAt > now`. Once that ordinary deadline has passed, it returns neither adoption ID nor claim. `recoverDraftBoundGuestAdoptionForAuthenticatedAccount` can recover through live `draftRecovery`, but its required input includes the exact `adoptionId`. Bind and completion likewise require that ID.

The audited server-draft APIs do not close the gap: `saveUserScopedServerDraft` safely converges a known adoption-scoped idempotency key, while `getCreateContributionDraftForResumeRecord` requires a known `draftId`. Neither maps verified C3A session plus authenticated account to the active adoption. No other audited primitive provides that mapping. Account-global/latest-draft lookup, a browser locator, or a second recovery source of truth would violate the contract.

Therefore the retry after `bind → crash/lost response → ordinary expiry → retry before C3A expiry` cannot lawfully rediscover the active generation. It cannot derive the exact key, save safely, recover an already saved canonical draft, or complete that generation. This leaves bind-to-save and save-to-completion crash convergence unproven; potential duplicate/orphan and stale-generation handling cannot be closed by C4B alone.

```text
POST_EXPIRY_SERVER_DISCOVERY=false
BIND_TO_SAVE_CRASH_SAFE=false
SAVE_TO_COMPLETION_CRASH_SAFE=false
DUPLICATE_DRAFT_RISK=UNRESOLVED
ORPHAN_DRAFT_RISK=UNRESOLVED
STALE_GENERATION_RISK=UNRESOLVED
CROSS_ACCOUNT_REPLAY=CLOSED
POST_C3A_FAIL_CLOSED=true
```

## Narrow prerequisite

The smallest proposed prerequisite is C4B2, `CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-DISCOVERY-01`, with contract `DRAFT_BOUND_ADOPTION_DISCOVERY_V1`. It must be separately governed and may only discover the currently active exact draft-bound generation from the verified C3A binding and authenticated account binding on the unique existing authoritative slot. It must fail closed for wrong account/session, malformed or expired recovery, expired top-level slot, completed or superseded generation, missing ciphertext, and decrypt/normalization failure. Its server-only result would be `preparationId`, `adoptionId`, `claim`, `draftIdempotencyKey`, and `recoveryExpiresAtMs`.

No implementation is authorized by this preflight. It does not authorize a browser locator, receipt collection, account-global/latest-draft search, transaction, collection, index, server-draft change, C4C, C5–C12, deployment, production activation, or auto-publish. C4B1 remains done; C4C remains blocked; C5–C12 remain unauthorized; production remains blocked. Merged #776 governance/media changes are preserved and unrelated #777 is untouched.
