# C4B1 Closure — Prebound Adoption Draft Recovery

```text
BASE_MAIN_SHA=c3db759f297e8ddaac150d448427b44e640890e1
TASK=CREATE-GUEST-ADOPTION-DRAFT-RECOVERY-BINDING-01
ROLE=C4B1
IMPLEMENTATION_PR=775
IMPLEMENTATION_HEAD=06cb049ee04037b588c5289a13365361e6a83b58
MERGE_SHA=c3db759f297e8ddaac150d448427b44e640890e1
FINAL_REVIEW=P0=0,P1=0,P2=0
IMPLEMENTED=true
DONE=true
```

Merged runtime provides `PREBOUND_ADOPTION_DRAFT_RECOVERY_V1` and `DRAFT_BOUND_RECOVERY_V1` on the existing authoritative C4B0 slot. Binding occurs before save (`BINDING_BEFORE_SAVE=true`), so no save-before-bind window exists. The first bind requires an active ordinary claim, stores `draftRecovery` on that slot, bounds recovery to verified C3A expiry, and atomically extends top-level `expiresAt` to that same C3A deadline without changing the ordinary `adoption.recoveryExpiresAt`.

Ordinary claim replay remains unavailable after its original deadline. Exact same-account and exact-generation bound recovery remains available only until C3A expiry; post-C3A recovery fails closed. An active draft-bound generation blocks reprepare; an expired one permits supersession, which clears the old adoption, recovery metadata, and encrypted payload. The deterministic adoption-scoped draft-key domain is `edebatte:create:guest-adoption-draft:v1`.

Post-ordinary-expiry completion requires canonical `draftRecovery` shape, a live top-level expiry, exact account and adoption ID. Malformed recovery fails closed. Valid completion removes `encryptedPayload`, removes/deauthorizes `draftRecovery`, and retains exact completion metadata. There is no browser locator, transaction, new collection/index, or `serverDraft` runtime change.

```text
NO_PREPARATION_BROWSER_CARRIER_V1_PRESERVED=true
SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1_PRESERVED=true
SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1_PRESERVED=true
DURABLE_REPREPARE_REVOCATION_BARRIER_V1_PRESERVED=true
CORE_CONTRACT_COUNT=1
API_BOUNDARY_COUNT=0
MONGO_TRANSACTION_USED=false
NEW_COLLECTIONS=0
NEW_INDEXES=0
SERVER_DRAFT_RUNTIME_CHANGED=false

FOCUSED_TESTS=53/53 PASS
REPEATED_RUNS=20
REPEATED_PASS=20
REPEATED_FAIL=0
REPEATED_TIMEOUT=0
CREATE_RUNTIME_CONTRACTS=PASS
WEB_CRITICAL_GUARDRAILS=28 files, 192/192 PASS
PRODUCTION_GUARDRAILS=12 files, 36/36 PASS
TYPECHECK=PASS
LINT=PASS
BUILD=PASS
GOVERNANCE_TESTS=4/4 PASS
OPENTASKS_CONTROL_PLANE_TESTS=9 files, 126/126 PASS
DIFF_CHECK=PASS
IMPLEMENTATION_FILES=apps/web/src/features/create/createGuestAdoptionPreparation.ts;apps/web/tests/create-guest-adoption-preparation.contract.test.ts
```

The C4B blocker `SAVE_COMPLETED_DRAFT_ID_NOT_RECOVERABLE_AFTER_C4B0_CLAIM_EXPIRY` is resolved: `C4B1_PREREQUISITE_RESOLVED=true` and `C4B_POST_EXPIRY_DRAFT_RECOVERY_FOUNDATION_AVAILABLE=true`. C4B is authorized only for a fresh preflight against current main; its implementation remains unauthorized. C4C remains blocked, C5–C12 remain unauthorized, and production remains blocked. This closure does not alter the independent merged #776 governance/media changes.
