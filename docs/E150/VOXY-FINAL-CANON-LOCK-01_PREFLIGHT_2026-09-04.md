# VOXY-FINAL-CANON-LOCK-01 — Preflight / Authorization Evidence

Date: 2026-09-04
Task: `VOXY-FINAL-CANON-LOCK-01`
Implementation PR: #720
SSOT reconciliation PR: #722

## Purpose

This record documents the separate owner authorization that preceded the implementation slice for `VOXY-FINAL-CANON-LOCK-01`, as permitted by `AGENTS.md` when a task is not yet present as `codex_ready` in `docs/E150/OpenTasks.md`.

## Owner authorization

Before PR #720 was opened, the project owner explicitly directed that the already human-accepted Voxy V3.10.5 / PR #624 become the sole current Character / Visual / Voice canon and that older evidence, especially PR #589, must never again be treated as the current Voxy identity reference.

The authorized implementation scope was limited to repository hardening needed to make that directive fail closed:

- bind current Voxy rendering to `VOXY-V3.10.5-HUMAN-FINAL` / PR #624;
- reject stale or legacy character references as current canon;
- guard the real homepage render entry path, not only tests;
- retire active legacy Voxy workflow paths that could bypass the final canon;
- preserve human review and no-auto-publish behavior;
- do not redesign Voxy and do not create a new Human Final Acceptance.

This authorization preceded the implementation work in PR #720. The missing OpenTasks registration at PR creation was a governance-recording defect, not an authorization to bypass review, merge, deployment, or publishing gates.

## Preflight facts

At authorization time:

- PR #624 had already established V3.10.5 as the accepted Human Final Voxy reference;
- PR #589 was historical technical evidence only and was not authorized as a current identity canon;
- the requested change was hardening/guardrail work around the existing accepted canon, not a new product or visual decision;
- production eligibility and auto-publish remained fail closed.

## Lifecycle reconciliation

PR #722 is the Single-Writer SSOT reconciliation for this slice. It registers `VOXY-FINAL-CANON-LOCK-01` in `docs/E150/OpenTasks.md` and keeps the task at `review`; `review` is not merge or production authorization.

PR #720 must not merge before #722 is merged and its own exact-head CI, Vercel, review-thread, and current-main comparison gates are green.

No deployment, publishing, provider change, secret change, or new Human Final Acceptance is authorized by this document.
