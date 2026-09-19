# C8 Authenticated Source / Link Analysis — Closure

Date: 2026-09-19

```text
TASK=CREATE-AUTHENTICATED-SOURCE-LINK-ANALYSIS-01
ROLE=C8
STATUS=done
IMPLEMENTED=true
DONE=true
RUNTIME_PR=#895
RUNTIME_HEAD=14a1ea87cb206c4ac43242adf351967b41564464
RUNTIME_MERGE=af0176df0e0505bb83319352e26ada718d4ee882
EXACT_HEAD_WEB_CI_RUN=2703
EXACT_HEAD_WEB_CI_CONCLUSION=success
REPAIR_AUTHORIZATION_PR=#900
C9_PREFLIGHT_AUTHORIZED=true
C9_IMPLEMENTATION_AUTHORIZED=false
C10_C12_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Closure evidence

C8 is complete on `main` after runtime PR #895 merged as
`af0176df0e0505bb83319352e26ada718d4ee882`.

The exact runtime head
`14a1ea87cb206c4ac43242adf351967b41564464`
passed Web CI run #2703 without waived failures. The closing pass also found no unresolved review threads.

The implementation consumed the merged C8 authorization and the bounded exact-head repair authorization from PR #900. The repair did not widen C8 semantics: it corrected repository ownership/classification, parser/template-literal artifacts, a Node runtime import, the focused test harness, and isolated draft source-evidence persistence while retaining the canonical `drafts` collection as the sole draft truth.

## Contract closed

C8 now enforces the authenticated source/link boundary after a real server-authoritative draft binding. External fetch/provider work does not run for guests or before the authenticated draft exists.

The source boundary is fail-closed and bounded:

- only HTTP/HTTPS source URLs are accepted;
- sensitive, credential-bearing or signed source URLs are rejected;
- DNS resolution and socket use are constrained against non-public targets;
- redirects are manually revalidated and bounded;
- request timeout and streamed/declared byte limits are enforced;
- HTML/text and PDF intake are content-type/signature checked;
- PDF parsing is page-, text- and time-bounded;
- unavailable YouTube transcripts do not become source-loaded evidence and do not trigger a model call;
- recovery after possible prior external execution fails closed instead of replaying uncontrolled external work;
- no raw fetched body is persisted into orchestration state;
- successful source analysis is not represented as externally verified truth merely because fetch/provider execution succeeded.

C8 uses the existing Create single-flight runtime and persists source evidence against the same authenticated canonical draft. It creates no second draft store, no new DB collection, no browser persistence authority and no publication/review activation.

## Scope preserved

C8 does not implement C9 handoff/review persistence, C10 notifications, C11 progress streaming, C12 progressive UX, public publication, auto-approval or auto-publish.

## Next authorized action

C8 plus already-merged C6, C7 and G1 satisfy the dependency edge for a fresh C9 preflight.

This closure authorizes exactly one fresh read-only preflight for:

`CREATE-CANONICAL-HANDOFF-REVIEW-PERSISTENCE-01` (C9)

The C9 preflight must start from then-current `main` and classify current runtime plus historical extraction evidence from #682 and the G1 review/persistence boundary. It must not assume historical queue or review code is still canonical.

The preflight must prove at minimum:

- the handoff is bound to the authenticated canonical draft, validated jurisdiction, canonical-topic/stance state and current source-evidence state;
- C9 reuses one canonical review/handoff persistence owner and does not introduce a second queue or review truth;
- public-question guard evidence/version binding remains current and stale/missing guard evidence fails closed;
- handoff creation is idempotent and retry-safe and cannot duplicate logical review work;
- user-visible success requires durable handoff persistence first;
- review/persistence failure cannot masquerade as successful submission;
- no C10 notification side effect is required for C9 durability;
- no publication, approval, graph activation, vote activation or public release occurs in C9;
- raw credentials, secrets, signed URLs, fetched bodies and unnecessary PII are not copied into review persistence;
- existing current-main handoff/review code is classified hunk-by-hunk as canonical, reusable, stale, colliding or out-of-scope before any implementation edit;
- size/collision gates are evaluated before implementation authorization.

C9 implementation remains unauthorized until the fresh preflight is merged and followed by a separate bounded implementation authorization.

C10-C12 remain unauthorized.
