# G4 Fresh Preflight — QR / Public Entry release integration

Date: 2026-09-19

```text
TASK=G4-QR-PUBLIC-ENTRY-RELEASE-INTEGRATION
ROLE=G4
BASE_MAIN_SHA=969ed5a08221a0b85350aa0f1194683714184b15
G1_STATUS=done
G2_STATUS=done
G3_STATUS=done
PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
IMPLEMENTATION_AUTHORIZED=false
AUTO_PUBLISH=false
BLOCKER=OPEN_PR_520_OWNS_QR_STUDIO_AND_PUBLIC_ENTRY_SURFACES
```

## 1. Dependency state

G3 is merged on current main as PR #892 / merge `969ed5a08221a0b85350aa0f1194683714184b15`.
The next Guard track step is therefore G4. G1 remains the sole shared public-question guard/evidence truth.

Historical PR #708 remains evidence only and must not be revived or merged wholesale.

## 2. Historical G4 owner boundary

The canonical extraction runbook assigns G4 the QR/Public Entry producer/release integration, historically covering:

- `apps/web/src/features/create/qrQuestionSetGuard.ts`;
- admin question-guard review and activation routes;
- QR set create/read, resolve, vote, protocol and summary routes where public exposure depends on release state;
- QR Studio release-facing integration;
- focused QR guard/review/release tests.

Required invariants remain:

- G1 is the only shared guard/evidence contract;
- `blocked` and `review_required` never become public;
- `draft_allowed` never implies activation;
- durable review/audit + guard/version binding precede activation/public exposure;
- stale review evidence fails closed;
- reservation/audit/recovery failure remains non-public;
- no second QR store/runtime, no G2/G3/G5 ownership and no auto-publish.

## 3. Current-main collision

Open Draft PR #520 (`refactor(studio): unify QR, events, live and distribution`) still owns QR/Public Entry surfaces including:

- `apps/web/src/app/qr-studio/page.tsx`;
- `apps/web/src/app/qr-studio/QrStudioTargetPreview.tsx`;
- `apps/web/src/app/qr/[qrId]/page.tsx`;
- `apps/web/src/features/qr/publicEntry.tsx`;
- `apps/web/src/features/qr/security.ts`;
- `features/qr/qrStudioTargetContract.ts`;
- associated Studio/QR security and routing tests.

The historical #708 G4 scope also changes `apps/web/src/app/qr-studio/page.tsx`.
That is a live owner collision. Copying #708 G4 wholesale would violate bounded ownership and ZERO PARALLEL TRUTH.

## 4. Required decomposition

### G4A — QR Question Set Guard + Server Release Core

Fresh-main bounded implementation may be separately preflighted around server-owned QR question-set release semantics only:

- new/reused `qrQuestionSetGuard.ts` consuming the current G1 epoch;
- admin guard-review route;
- admin activation route;
- QR question-set create/read and public resolve/vote/protocol/summary routes only where required to fail closed on unreleased/stale guard state;
- durable review/audit/version binding and reservation/recovery semantics;
- focused guard/review/release tests.

G4A must not edit files currently owned by #520 and must not introduce a second Public Entry/redirect/security truth.

### G4B — Studio / Public Entry release projection

Blocked until #520 is either merged/closed/superseded and its canonical owner state is reconciled on fresh main.

G4B may then wire the already established G4A release truth into the canonical Studio/Public Entry UI without copying redirect/security/runtime logic.

## 5. Acceptance for next authorization

A fresh G4A preflight may return `PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION` only if:

- its changed-file list has zero overlap with open #520 ownership;
- G1 contract epoch is consumed, not copied;
- all server release paths fail closed for stale/missing/review-required/blocked guard state;
- durable audit occurs before public release;
- recovery cannot expose a partially released set;
- existing QR set storage/runtime remains canonical;
- no auto-publish / auto-approve is introduced.

G4B remains blocked on #520 convergence.

## 6. Result

```text
PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED
NEXT_ALLOWED_STEP=FRESH_G4A_PREFLIGHT_ONLY
G4A_IMPLEMENTATION_AUTHORIZED=false
G4B_STATUS=blocked_on_PR_520_convergence
G5_STATUS=blocked_on_G4_completion
```

No runtime, test, database, provider, secret, deployment, publish or OpenTasks mutation is made by this preflight.