# C4B1 Registration — Draft Recovery Binding

```text
BASE_MAIN_SHA=7e8e6a46233eaf6a11f14e795d394845a89103d6
PARENT_TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01
PARENT_PREFLIGHT_PR=771
PARENT_PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
PARENT_BLOCKER=SAVE_COMPLETED_DRAFT_ID_NOT_RECOVERABLE_AFTER_C4B0_CLAIM_EXPIRY
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-BINDING-01
ROLE=C4B1
STATUS=codex_ready
AUTHORIZATION=preflight_only
PREFLIGHT_AUTHORIZED=true
PREFLIGHT_AUTHORIZATION_CONSUMED=false
IMPLEMENTATION_AUTHORIZED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
```

C4B1 is a server-side prerequisite, not the C4B route. Its future preflight must establish exact same-account recovery of the already saved canonical draft after C4B0 claim expiry, with no duplicate draft, stale-generation confusion, cross-account disclosure, browser locator, or account-global guessing. It must consider without selecting: extending the existing C4B0 slot, a minimized canonical-draft-side binding, a dedicated server recovery record, or a blocking/split result.

Fixed contracts remain `SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1`, `SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1`, `NO_PREPARATION_BROWSER_CARRIER_V1`, and `DURABLE_REPREPARE_REVOCATION_BARRIER_V1`. Only server-derived binding hashes, adoption ID and canonical draft ID may be considered. Post-C3A-expiry recovery is not preauthorized. Future scope targets at most ten implementation files, two core contracts, and preferably zero API boundaries. C4B remains blocked; C4C is blocked pending C4B completion; C5–C12 and production remain unauthorized.
