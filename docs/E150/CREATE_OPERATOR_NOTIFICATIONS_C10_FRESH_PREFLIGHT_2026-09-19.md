# C10 Operator Notifications — Fresh Main Preflight

Date: 2026-09-19

```text
TASK=CREATE-OPERATOR-NOTIFICATIONS-01
ROLE=C10
BASE_MAIN_SHA=8d5904eae475935f76af7ca4b7c2a9812b659cd1
C9_MERGE=9c0db2152a0b3aa262ec35c9379e258fb8eac93a
C9_CLOSURE_MERGE=8d5904eae475935f76af7ca4b7c2a9812b659cd1
MODE=FRESH_READ_ONLY_PREFLIGHT
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
C10_IMPLEMENTATION_AUTHORIZED=false
C11_C12_AUTHORIZED=false
AUTO_RETRY=false
AUTO_PUBLISH=false
```

## Dependency and ownership result

C9 is merged and its closure is now part of `main`. The audited runtime on the
fresh base has one canonical notification owner:

- `apps/web/src/features/operator/operatorNotifications.ts` owns event
  idempotency, best-effort delivery and Berlin-day digest claiming;
- `/api/cron/operator-digest` enforces a bearer `CRON_SECRET` of at least
  sixteen characters and performs the server-side Europe/Berlin 18:00 gate;
- the current Create save, technical-support and registration hooks are
  downstream of durable user-visible work; notification failure does not alter
  a successful Create response;
- `vercel.json` provides summer/winter UTC slots while the route remains the
  authoritative DST-aware time check.

No second mail runtime, notification queue, event owner, collection, provider
integration or Create runtime change is justified.

## Safety audit

Create notices use the existing redacted safety text and locale. Support
notices are derived from persisted ticket references and bounded technical
metadata. Registration reads only approved identity fields. Event and digest
claims are durable and duplicate-safe. The present implementation correctly
does not automatically resend failed or ambiguous mail, so an uncertain SMTP
outcome cannot silently create a duplicate delivery.

## Findings required before C10 can close

1. Event records persist only delivery status, message id and failure category;
   digest records persist only status and message id. They do not preserve the
   bounded recovery classification needed to distinguish a definite failure,
   confirmed zero delivery, partial delivery and an ambiguous attempted
   outcome. Recovery must remain manual-review-required after an attempted or
   ambiguous outcome; no blind retry is authorized.
2. `operator-notifications.contract.test.ts` is not part of mandatory Web CI,
   and no focused digest-route contract presently proves missing, short or
   wrong `CRON_SECRET` fails closed and an authorized off-hour call skips
   delivery.

## Bounded follow-up authorization recommendation

Only a separate reviewed C10 implementation authorization may permit these
four files: `operatorNotifications.ts`, its contract test, a new
`operator-digest.route.test.ts`, and `.github/workflows/web-ci.yml`. It may
persist bounded canonical recovery metadata and add mandatory contracts, but
may not add a collection, queue, route, package, provider activation, automatic
retry, publication, approval, moderation decision or C11 progress behavior.

Real SMTP, inbox and provider acceptance remains a human/production gate and
is not a code-merge proof.
