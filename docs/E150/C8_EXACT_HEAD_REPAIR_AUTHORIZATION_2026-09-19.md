# C8 Exact-Head Repair Authorization

Date: 2026-09-19

```text
TASK=CREATE-AUTHENTICATED-SOURCE-LINK-ANALYSIS-01
ROLE=C8
MODE=EXACT_HEAD_REPAIR_AUTHORIZATION
FAILED_PR=895
FAILED_HEAD=8b8371116f40a6385cfdb360bf9d65cf2e6e9c6f
FAILED_WEB_CI=35435065712
REPAIR_AUTHORIZED=true
C9_C12_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Proven exact-head failures

The fresh-main C8 port preserved the authorized behavior but exposed two mechanical integration defects:

1. repository-integrity ownership guard rejected the two new app-local Create feature files unless they are explicitly classified as web adapters/runtime bridges;
2. four C8 files contain literal escaped template-literal markers (`\`` / `\${...}`) and therefore fail ESLint parsing.

These are exact-head integration failures, not authorization to widen C8 semantics.

## Authorized repair

The existing PR #895 may be repaired only as follows:

- classify `apps/web/src/features/create/externalSourceAnalysis.ts` as `adapter`;
- classify `apps/web/src/features/create/externalSourceIntake.ts` as `runtime-bridge`;
- remove literal escape artifacts without semantic changes;
- keep all existing C8 security/resource/single-flight invariants;
- replace the broad `apps/web/src/server/serverDrafts.ts` C8 modification with one isolated server helper `apps/web/src/server/createDraftSourceEvidence.ts` that writes the same canonical `drafts` collection and imports its canonical collection/document contract from `serverDrafts.ts`;
- update the C8 route/tests only as required for that helper path;
- keep total C8 changed files at or below the previously authorized 16-file target by restoring `serverDrafts.ts` to current main when the isolated helper is used.

The helper substitution does **not** create a second draft store or writer model. It is only a narrower module boundary for the same idempotent source-evidence update.

## Still forbidden

- no new collection, package, browser persistence or alternate Source truth;
- no weakening of SSRF/DNS-pin/manual redirect/body-size/PDF/YouTube fail-closed behavior;
- no C9 review queue, graph/dossier activation, publish or auto-publish;
- no provider-policy redesign;
- no unrelated repository-integrity allowlist expansion.

## Completion gate

C8 remains unfinished until repaired exact-head Web CI is fully green, no review threads remain, the branch is current with main, and the final diff stays bounded to C8.