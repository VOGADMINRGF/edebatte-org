# C10 Operator Notifications — Implementation Authorization

Date: 2026-09-19

```text
TASK=CREATE-OPERATOR-NOTIFICATIONS-01
ROLE=C10
BASE_MAIN_SHA=40a787a9f18820f82e2a8418a4dd7015e8208948
PREFLIGHT_PR=#918
PREFLIGHT_MERGE=40a787a9f18820f82e2a8418a4dd7015e8208948
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=true
IMPLEMENTATION_AUTHORIZATION_CONSUMED=false
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=true
AUTHORIZED_RUNTIME_FILES=1
AUTHORIZED_TEST_FILES=2
AUTHORIZED_CI_FILES=1
AUTHORIZED_FILES_TOTAL=4
NEW_DB_COLLECTIONS=0
NEW_NOTIFICATION_QUEUE=false
NEW_WORKER_RUNTIME=false
NEW_API_ROUTES=0
NEW_PROVIDER_RUNTIME=false
AUTO_RETRY=false
AUTO_PUBLISH=false
C11_C12_AUTHORIZED=false
```

## Exact authorized file boundary

Only these files may change in the later C10 runtime slice:

1. `apps/web/src/features/operator/operatorNotifications.ts`
2. `apps/web/tests/operator-notifications.contract.test.ts`
3. `apps/web/tests/operator-digest.route.test.ts`
4. `.github/workflows/web-ci.yml`

Any other file requires a new documented preflight finding and authorization.

## Authorized behavior

The existing event and digest records may gain only bounded canonical delivery
evidence: delivery status, failure category, mailer retryability classification,
attempted/delivered/failed counts, message id when present, and a recovery
disposition. The disposition must distinguish equivalent semantics for
`confirmed_not_attempted`, `confirmed_failed_before_delivery`,
`partial_delivery`, `ambiguous_attempted`, and `confirmed_sent`.

The digest keeps its existing once-per-Berlin-day claim. Neither an ambiguous
nor an attempted delivery may reclaim that day. No raw SMTP response, provider
payload, secret, token or unbounded data may be persisted.

`AUTO_RETRY=false` is invariant. Sent, partial, ambiguous and provider-attempted
failures are never automatically resent. A confirmed non-attempt may be marked
as manually retryable, but C10 itself starts no retry.

The two focused contracts must prove redacted Create content, no draft id in
mail text, duplicate suppression, bounded Support/Registration payloads,
truthful failure evidence, no automatic second send, CRON_SECRET fail-closed,
Berlin 18:00/DST behavior, off-hour skip and truthful digest-mail failure. Both
tests must be mandatory Web CI inputs without real SMTP calls.

## Explicit exclusions

This authorization excludes new collections, queues, workers, routes, mail
providers, SMTP activation, automatic retries, Create/Support/Registration hook
changes, C11 progress, C12 UI, publication, approval, moderation, political
decisions and auto-publish.

The implementation cannot mark C10 `done`; exact-head CI, review and the
remaining human provider/inbox gate remain required.
