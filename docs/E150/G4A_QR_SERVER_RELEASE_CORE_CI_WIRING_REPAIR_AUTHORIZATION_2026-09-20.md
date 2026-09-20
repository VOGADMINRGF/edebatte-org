# G4A QR Server Release Core — Focused Test CI Wiring Repair Authorization

Date: 2026-09-20

```text
TASK=G4A-QR-SERVER-RELEASE-CORE
MODE=CI_WIRING_REPAIR_AUTHORIZATION
BASE_MAIN_SHA=cdf3cc490eb7d5a1324db409c01a1aac8d075360
SOURCE_IMPLEMENTATION_AUTHORIZATION_PR=899
SOURCE_AUDIT_PERSISTENCE_REPAIR_PR=901
RUNTIME_PR=923
REPAIR_REQUIRED=true
RUNTIME_OWNER_SCOPE_CHANGED=false
FOCUSED_TEST_SCOPE_CHANGED=false
CI_FILE_ADDITION_MAX=1
AUTO_PUBLISH=false
```

## Finding

Merged implementation authorization PR #899 authorizes exactly two focused G4A tests:

- `apps/web/tests/qr-question-set-guard.contract.test.ts`
- `apps/web/tests/qr-question-set-review-flow.route.test.ts`

Current `.github/workflows/web-ci.yml` does not execute either file in its focused Create contract step. Lint, typecheck and production build are valuable gates but do not substitute for executing these behavioral tests.

Because PR #899 intentionally fixed the implementation boundary at 11 runtime/test files, adding CI wiring without a separate authorization would be a scope expansion. This repair closes that governance gap before G4A can be considered complete.

## Authorized repair

After this authorization is merged, G4A PR #923 may additionally modify exactly:

` .github/workflows/web-ci.yml `

Only the minimal lines needed to add the two already-authorized G4A test paths to the existing `Focused Create runtime contracts` Vitest invocation are permitted.

No test semantics, runtime owner, route, persistence model or product surface is authorized by this repair beyond the already-approved G4A implementation.

Effective bounded implementation after this repair:

```text
RUNTIME_OWNER_FILES_MAX=9
FOCUSED_TEST_FILES_MAX=2
CI_FILES_MAX=1
TOTAL_CHANGED_FILES_MAX=12
NEW_DB_COLLECTIONS=0
NEW_SCHEMA_MIGRATIONS=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
G4B_AUTHORIZED=false
G5_AUTHORIZED=false
AUTO_APPROVE=false
AUTO_PUBLISH=false
```

## Required CI delta

The only permitted workflow change is functionally equivalent to adding:

```text
tests/qr-question-set-guard.contract.test.ts
tests/qr-question-set-review-flow.route.test.ts
```

to the existing focused Create Vitest command.

The repair may not weaken or remove any existing CI step, test, guardrail, timeout, security check or build check.

## Result

```text
G4A_CI_WIRING_REPAIR_AUTHORIZED=true
AUTHORIZED_RUNTIME_DELTA=none
AUTHORIZED_TEST_DELTA=none
AUTHORIZED_CI_DELTA=two_existing_G4A_test_paths_only
NEXT_ALLOWED_STEP=merge_this_authorization_then_refresh_G4A_on_current_main_and_add_minimal_CI_wiring
```
