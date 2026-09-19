# G4A Fresh Preflight — QR Question Set Guard + Server Release Core

Date: 2026-09-19

```text
TASK=G4A-QR-SERVER-RELEASE-CORE
ROLE=G4A
BASE_MAIN_SHA=87c3e710a3d510213bd30f7d48efbbff8dc7b1e7
G1_STATUS=done
G2_STATUS=done
G3_STATUS=done
G4_SPLIT_STATUS=done
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
AUTO_PUBLISH=false
OPEN_PR_520_FILE_OVERLAP=0
```

## Scope

This preflight consumes the merged G4 split decision and limits G4A to the QR question-set server release core. Historical PR #708 is evidence only.

### Proposed runtime/owner files

1. `apps/web/src/features/create/qrQuestionSetGuard.ts` — shared G1 consumer for QR question-set evaluation/review/readiness.
2. `apps/web/src/app/api/admin/qr/sets/[code]/question-guard-review/route.ts` — explicit human review evidence boundary.
3. `apps/web/src/app/api/admin/qr/sets/[code]/activate/route.ts` — reviewed/version-bound activation only.
4. `apps/web/src/app/api/qr/resolve/route.ts` — public resolution fails closed unless the set is released.
5. `apps/web/src/app/api/qr/sets/[code]/protocol/route.ts` — protocol exposure bound to released set truth.
6. `apps/web/src/app/api/qr/sets/[code]/route.ts` — public set readmodel release gate.
7. `apps/web/src/app/api/qr/sets/[code]/vote/route.ts` — voting requires released current guard state.
8. `apps/web/src/app/api/qr/sets/route.ts` — creation stores guard/review state but never activates from `draft_allowed` alone.
9. `apps/web/src/app/api/qr/sets/summary/route.ts` — summary exposure bound to released set truth.

### Focused tests

10. `apps/web/tests/qr-question-set-guard.contract.test.ts`.
11. `apps/web/tests/qr-question-set-review-flow.route.test.ts`.

## Explicit exclusion / zero overlap with #520

G4A must not change any current #520-owned file, including:

- `apps/web/src/app/qr-studio/page.tsx`;
- `apps/web/src/app/qr-studio/QrStudioTargetPreview.tsx`;
- `apps/web/src/app/qr/[qrId]/page.tsx`;
- `apps/web/src/features/qr/publicEntry.tsx`;
- `apps/web/src/features/qr/security.ts`;
- `features/qr/qrStudioTargetContract.ts`;
- #520-owned Studio/redirect/security tests.

The proposed 11-file G4A boundary has zero file overlap with open PR #520.

## Hard invariants

- G1 is the only shared Public Question Guard / evidence truth.
- Staff authentication is not actor-extraction or question-review evidence.
- `blocked` and `review_required` are never publicly resolvable, readable, votable or summarized.
- `draft_allowed` means only guard eligibility; it never implies activation.
- Human review requires durable evidence refs and explicit actor/no-named-actor finding.
- Guard contract/version or question content changes invalidate stale review/release state.
- Activation requires the current reviewed guard state and durable audit evidence.
- Reservation, audit, activation and recovery failures remain non-public.
- Public routes re-check canonical release truth and do not trust client/studio state.
- Existing QR set storage/runtime remains canonical; no second store/queue/release runtime.
- No G2/G3/G5 producer scope and no auto-publish / auto-approve.

## Extraction guidance

Reuse only the G4-specific hunks from superseded PR #708 and adapt them to current merged G1 contract/version semantics. Do not cherry-pick #708 wholesale. Current main G1/G2/G3 implementations win over historical copies.

## Size / dependency gate

```text
RUNTIME_OWNER_FILES_MAX=9
FOCUSED_TEST_FILES_MAX=2
TOTAL_CHANGED_FILES_TARGET<=11
NEW_DB_COLLECTIONS=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
PUBLIC_UI_FILES=0
PR_520_OVERLAP=0
```

## Result

No unresolved dependency or owner collision remains inside the bounded G4A server-core slice.

```text
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
NEXT_ALLOWED_STEP=SEPARATE_G4A_IMPLEMENTATION_AUTHORIZATION
G4A_IMPLEMENTATION_AUTHORIZED=false
G4B_STATUS=blocked_on_PR_520_convergence
G5_STATUS=blocked_on_G4_completion
```

This preflight makes no runtime, test, database, provider, secret, deployment, publish or OpenTasks mutation.