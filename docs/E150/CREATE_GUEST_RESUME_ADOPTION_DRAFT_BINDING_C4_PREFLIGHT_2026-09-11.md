# C4 Preflight — Guest Resume, Adoption and Draft Binding

Stand: 2026-09-11

## Revision-bound result

```
BASE_MAIN_SHA=c736241fe52b7c1c8d1d4c2fe4651c6159c67847
PARENT_TASK=CREATE-GUEST-RESUME-ADOPTION-DRAFT-BINDING-01
RESULT=FAIL_SPLIT_REQUIRED
TASK_PREFLIGHT=FAIL_SPLIT_REQUIRED
SECURITY_PREFLIGHT=FAIL_SPLIT_REQUIRED
AUTH_TRANSITION_PREFLIGHT=FAIL_SPLIT_REQUIRED
ADOPTION_PREFLIGHT=FAIL_SPLIT_REQUIRED
IDEMPOTENCY_PREFLIGHT=FAIL_SPLIT_REQUIRED
DRAFT_BINDING_PREFLIGHT=FAIL_SPLIT_REQUIRED
RESUME_PREFLIGHT=FAIL_SPLIT_REQUIRED
PERSISTENCE_PREFLIGHT=FAIL_SPLIT_REQUIRED
SIZE_PREFLIGHT=FAIL_SPLIT_REQUIRED
COLLISION_RESULT=FAIL_SPLIT_REQUIRED
SPLIT_REQUIRED=true
```

This is historical, revision-bound preflight evidence. It is not implementation authorization.

## Findings

1. C3C persists only the allowlisted result `version`, `status`, `operationId` and `createdAt`; it deliberately does not persist raw guest contribution content.
2. C3D uses ephemeral React state and clears raw text after acceptance. Reload or navigation cannot truthfully recover it.
3. Guest → Login → Adoption → authenticated draft resume therefore needs a new bounded server-side temporary preparation/payload contract. It cannot reuse C3C persistence unchanged.
4. Login creates `session_token` and `u_id`, but neither rotates, invalidates nor binds `edebatte_create_session`. The anonymous session remains correctly not an authentication credential.
5. The server-authoritative authenticated identity primitive is `getSessionUser(req)`: verified signed `session_token`, user lookup, revocation and suspension checks.
6. No adoption receipt, atomic operation/account binding, cross-account guard, adoption idempotency key or exactly-one-draft guarantee exists for Guest Adoption.
7. `createHandoff` stores CreateHandoffDraft-style state in `sessionStorage` and remains C9-owned. Authenticated CreateClient localStorage/workstate behavior remains isolated; neither is a C4 guest-resume mechanism.
8. The canonical eventual account draft is `CanonicalServerDraftDoc`, written via `saveUserScopedServerDraft` with server-generated identity. C4 must reuse it rather than create another durable account-draft model.

## Required decomposition

- C4 parent is preserved as `blocked`, `SAFE_TO_IMPLEMENT=false`, never directly implemented and not done.
- C4A may preflight only the bounded temporary server-side preparation of an already-safe Guest contribution: explicit preserve/continue intent, anonymous-session binding, server-only payload, TTL no greater than 30 minutes and no later than anonymous-session expiry, safety reuse, cleanup/orphan/restart semantics, and truthful expiry.
- C4A excludes account identity, authenticated binding, adoption receipt, durable account draft creation, resume, Planner, Place, Topic/Stance, Jurisdiction, Source/Link, and Handoff/Review.
- C4B remains blocked until C4A is done. It later needs explicit authenticated adoption through `getSessionUser(req)`, safe rebinding, immutable receipt, atomic idempotent exactly-one `CanonicalServerDraftDoc` binding, cross-account fail-closed behavior, consumption/cleanup, authenticated `draftId` resume, and no Planner replay.

Raw Guest content must not be carried in URL, query, hash, logs, traces, analytics, telemetry, errors, browser storage, Cache API or service workers. Preparation must not be automatic after submit or login, and expiration must require truthful re-entry/re-submit.

## Evidence

```
C3A_REGRESSIONS=PASS; 15/15
C3B_REGRESSIONS=PASS; 86/86
C3C_REGRESSIONS=PASS; 47/47
C3D_REGRESSIONS=PASS; 13/13
GOVERNANCE_TESTS=PASS; 4/4
OPENTASKS_CONTROL_PLANE_TESTS=PASS; 9 files, 126/126
DIFF_CHECK=PASS
WORKTREE_CLEAN=true
```

No runtime, application, test, deployment, provider, secret, database-migration or production-activation work is authorized by this evidence.
