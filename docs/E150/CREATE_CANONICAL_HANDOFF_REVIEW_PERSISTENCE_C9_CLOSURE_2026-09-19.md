# C9 Canonical Handoff / Review Persistence — Closure

Date: 2026-09-19

```text
TASK=CREATE-CANONICAL-HANDOFF-REVIEW-PERSISTENCE-01
ROLE=C9
STATUS=done
IMPLEMENTED=true
DONE=true
RUNTIME_PR=#907
RUNTIME_HEAD=4915310108419756292475b59ec6e63b9582ef12
RUNTIME_MERGE=9c0db2152a0b3aa262ec35c9379e258fb8eac93a
EXACT_HEAD_WEB_CI_RUN=2743
EXACT_HEAD_WEB_CI_CONCLUSION=success
UNRESOLVED_REVIEW_THREADS=0
C10_PREFLIGHT_AUTHORIZED=true
C10_IMPLEMENTATION_AUTHORIZED=false
C11_C12_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Closure evidence

C9 is complete on `main` after runtime PR #907 merged as `9c0db2152a0b3aa262ec35c9379e258fb8eac93a`.

The exact runtime head `4915310108419756292475b59ec6e63b9582ef12` passed Web CI run #2743 without waived failures. The closing review found no unresolved review threads and no P0/P1/P2/P3 finding.

## Contract closed

C9 now binds durable handoff/review persistence to exactly one authenticated canonical `drafts` record. It reuses the shared Create mutation-security boundary, rejects ambiguous or foreign draft binding, reconstructs handoff truth from the persisted intelligent-followup state rather than browser-authored planner/graph payloads, revalidates C7 jurisdiction, persists only bounded C8 source-evidence references, binds public-question review state to the current G1 contract epoch, and derives a retry-safe server handoff identity from actor, canonical draft revision and selected action.

Durable review remains in the existing `create_handoff_review_items` owner. No second review queue, second draft truth, notification prerequisite, publication, approval, graph activation, vote activation or public release was added.

## Next authorized action

This closure authorizes exactly one fresh read-only preflight for:

`CREATE-OPERATOR-NOTIFICATIONS-01` (C10)

The preflight must start from then-current `main` and classify the already-converged notification runtime on current main plus historical extraction evidence from PR #725. It must not assume that the historical stack or mail behavior is still canonical.

The C10 preflight must prove at minimum:

- C9 is merged and notification side effects remain downstream of durable user-visible Create persistence;
- current `operatorNotifications.ts`, `/api/cron/operator-digest`, Create save/support event hooks, onboarding registration event hook, `vercel.json` cron slots and focused tests are classified as canonical, reusable, stale, colliding or out-of-scope;
- notification delivery never changes the successful citizen Create result and remains best-effort/reviewable;
- create notification payloads contain only already-safe/redacted contribution text and locale, not draft/session/user identifiers, raw prompts, credentials, signed URLs or fetched bodies;
- support notifications contain only persisted technical ticket references and bounded technical metadata, never raw contribution text;
- member registration projection is bounded to approved fields;
- event and digest idempotency is durable and actor-independent where appropriate;
- `CRON_SECRET` is mandatory, sufficiently strong and fail-closed;
- Berlin 18:00 DST scheduling and once-per-Berlin-day digest behavior are deterministic;
- recovery semantics for `pending`/`failed` delivery and digest claims are explicitly classified: safely retryable definitive failures may not be confused with unknown-delivery outcomes, and no retry may create silent duplicate mail;
- notification/event persistence does not become a publication, moderation, approval or C11 progress channel;
- real SMTP/inbox/provider acceptance remains a human/production gate and is not used as code-merge proof;
- size/collision gates are evaluated before any implementation authorization.

C10 implementation remains unauthorized until this fresh preflight is merged and followed by a separate bounded implementation authorization. C11 and C12 remain unauthorized.
