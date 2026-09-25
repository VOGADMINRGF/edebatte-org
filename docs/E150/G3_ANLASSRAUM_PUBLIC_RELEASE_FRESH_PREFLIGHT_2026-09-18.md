# G3 Anlassraum Public Release — Fresh Preflight

Date: 2026-09-18

```text
TRACK=G
SLICE=G3
MODE=FRESH_PREFLIGHT
BASE=main@ff11778768ef68a9f5272d0ac9dd07a1fc36b34c
DEPENDENCY_G2=MERGED_PR_860
DEPENDENCY_G2_MERGE=ff11778768ef68a9f5272d0ac9dd07a1fc36b34c
HISTORICAL_SOURCE_PR=708
HISTORICAL_SOURCE_STATUS=CLOSED_SUPERSEDED_EVIDENCE_ONLY
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Decision

`PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION`

G3 can be implemented as one bounded Anlassraum public-release slice after separate project-owner authorization.

## Fresh inventory

The current repository already has the canonical Anlassraum runtime, activation workflow/server, admin review/action route and Runden public-input route. These remain the only runtime/persistence truth and must be extended rather than duplicated.

Current main does not yet carry the complete G1 question-guard/review/CAS/release integration on these surfaces.

## Historical evidence

Closed/superseded PR #708 contains audited G3 hunks for the same owner surfaces. It remains evidence only and must not be revived or merged wholesale.

Since the #708 base `5a7dcadf98c69d31b184266c8c525722ef4b0c30`, current main advanced by 353 commits during preflight inspection, with **zero changes** to the 15 candidate G3 files below. Therefore bounded hunk/blob extraction can be performed without overwriting newer owner-file work.

## Active-PR collision check

Open PRs were inspected for Anlassraum/Runden ownership. No active PR writes any of the exact G3 owner files below. PR #805 touches `apps/web/src/app/runden/vog/[canonicalId]/page.tsx`, which is outside this G3 release boundary.

## Authorized candidate boundary for the later implementation authorization

Runtime / producer owner files:
1. `apps/web/src/features/create/anlassraumActivationWorkflow.ts`
2. `apps/web/src/features/create/anlassraumActivationWorkflowServer.ts`
3. `apps/web/src/features/create/anlassraumRuntime.ts`
4. `apps/web/src/app/admin/review/AnlassraumActivationActions.tsx`
5. `apps/web/src/app/api/admin/anlassraum-activation/[sourceHandoffId]/route.ts`
6. `apps/web/src/app/api/runden/public-input/route.ts`
7. `apps/web/src/features/surfaces/runden/guidedQuestionBuilder.ts`
8. `apps/web/src/features/surfaces/runden/manualAnlassraumSetup.ts`
9. `features/anlassraum/types.ts`

Focused tests:
10. `apps/web/tests/anlassraum-activation-admin.test.tsx`
11. `apps/web/tests/anlassraum-activation-workflow.test.ts`
12. `apps/web/tests/anlassraum-visibility-concurrency.test.ts`
13. `apps/web/tests/manual-anlassraum-setup.contract.test.ts`
14. `apps/web/tests/runden-guided-question-builder.contract.test.ts`
15. `apps/web/tests/runden-public-input.route.test.ts`

Additional focused G3 test files are allowed only when they prove failure ordering, stale G1 binding, CAS, or public-input fail-closed behavior without creating another runtime.

## Mandatory invariants

- consume G1 Shared Public Question Guard & Evidence as the only guard truth;
- bind every persisted/reviewed guard result to the canonical G1 contract epoch;
- stale/missing guard epoch fails closed;
- blocked/review-required guard states cannot approve, activate, publish, or accept public input;
- human review needs durable allowed evidence and cannot override safety/fact/person blocks;
- review invalidates stale activation/publication approvals;
- workflow records use monotonic version/CAS semantics;
- persisted room visibility is bound to workflow source + version;
- stale visibility writers fail closed;
- public input requires a currently public-released workflow record; legacy fallback is allowed only for pre-workflow rooms with no workflow ownership marker and established reviewed/approved publication evidence;
- reservation / audit / side-effect / release failure cannot expose a public room;
- no automatic publication or approval;
- no G2, G4 or G5 producer ownership;
- no parallel guard/review/evidence/runtime truth.

## Red-team requirements before merge

Implementation must prove at minimum:

1. blocked original input cannot be neutralized into an activated room;
2. missing or stale G1 contract binding blocks release;
3. human guard re-review invalidates earlier approvals;
4. stale concurrent review/approval/activation/publication writes fail CAS;
5. failed room-visibility side effect cannot be reported as public release;
6. stale workflow version cannot overwrite newer room visibility;
7. public Runden input rejects a workflow-owned room unless the current workflow record is fully released;
8. legacy public rooms remain readable/input-capable only under the explicit pre-workflow compatibility gate;
9. internal guard/review/audit data never leaks through the public input response;
10. exact-head Security, Contracts, Repository Integrity, lint, typecheck and production build are green.

## Exclusions

No `OpenTasks.md` write in this preflight.
No new DB collection/index.
No new provider.
No browser persistence.
No G4 QR or G5 Material producer changes.
No auto-publish.

Implementation remains unauthorized until this preflight is merged and separate authorization is recorded in #836.
