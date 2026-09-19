# G4A QR Server Release Core — Implementation Authorization

Date: 2026-09-19

```text
TASK=G4A-QR-SERVER-RELEASE-CORE
ROLE=G4A
MODE=IMPLEMENTATION_AUTHORIZATION
BASE_MAIN_SHA=7a834264b08e896baf9f4c64bb399f88c5e54f35
SOURCE_PREFLIGHT_PR=898
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=true
G4B_AUTHORIZED=false
G5_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Authorized boundary

Exactly these 11 files may change for G4A:

1. `apps/web/src/features/create/qrQuestionSetGuard.ts`
2. `apps/web/src/app/api/admin/qr/sets/[code]/question-guard-review/route.ts`
3. `apps/web/src/app/api/admin/qr/sets/[code]/activate/route.ts`
4. `apps/web/src/app/api/qr/resolve/route.ts`
5. `apps/web/src/app/api/qr/sets/[code]/protocol/route.ts`
6. `apps/web/src/app/api/qr/sets/[code]/route.ts`
7. `apps/web/src/app/api/qr/sets/[code]/vote/route.ts`
8. `apps/web/src/app/api/qr/sets/route.ts`
9. `apps/web/src/app/api/qr/sets/summary/route.ts`
10. `apps/web/tests/qr-question-set-guard.contract.test.ts`
11. `apps/web/tests/qr-question-set-review-flow.route.test.ts`

Historical PR #708 may be used only as audited source evidence. Current merged G1 contracts and current main win over historical copies.

## Hard invariants

- G1 remains the sole shared question-guard/evidence truth.
- Staff authentication alone is never review/evidence.
- `blocked` and `review_required` remain non-public.
- `draft_allowed` never activates a set.
- explicit durable human review evidence is required before reviewed release.
- stale question/guard/review binding fails closed.
- durable audit/version binding precedes public activation.
- partial reservation/audit/activation/recovery failure remains non-public.
- public resolve/read/vote/protocol/summary re-check release truth server-side.
- existing QR persistence/runtime remains canonical.
- no #520 Studio/Public Entry files, no G2/G3/G5 scope, no new package/collection/browser persistence and no auto-publish/auto-approve.

## Size gate

```text
RUNTIME_OWNER_FILES_MAX=9
FOCUSED_TEST_FILES_MAX=2
TOTAL_CHANGED_FILES_MAX=11
PR_520_FILE_OVERLAP=0
NEW_DB_COLLECTIONS=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
```

Implementation is not done until exact-head CI, review, main-drift and post-merge acceptance are green.