# C10 Operator Notifications — Fresh Preflight

Date: 2026-09-19

```text
TASK=CREATE-OPERATOR-NOTIFICATIONS-01
ROLE=C10
MODE=FRESH_PREFLIGHT
SOURCE_C9_CLOSURE_PR=#914
SOURCE_HISTORICAL_PR=#725
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
C10_IMPLEMENTATION_AUTHORIZED=false
C11_C12_AUTHORIZED=false
AUTO_PUBLISH=false
```

## Dependency gate

C9 runtime is merged as `9c0db2152a0b3aa262ec35c9379e258fb8eac93a` after exact-head Web CI #2743. C10 is downstream of durable Create persistence and may never become a prerequisite for a successful citizen Create response.

## Current-main ownership audit

Current main already contains the historical C10 runtime in converged form. The following owners are canonical/reusable:

- `apps/web/src/features/operator/operatorNotifications.ts` — canonical operator event, delivery and digest owner;
- `apps/web/src/app/api/cron/operator-digest/route.ts` — canonical secret-protected digest trigger;
- `apps/web/src/app/api/create/save/route.ts` — current Create submission hook, downstream of successful durable save and using `safety.redactedText`;
- `apps/web/src/app/api/create/intelligent-followup/route.ts` — current technical support-ticket hook, downstream of persisted ticket creation;
- `apps/web/src/lib/onboarding/events.ts` — current completed-registration hook;
- `vercel.json` — current summer/winter UTC cron slots, with the route retaining the authoritative Europe/Berlin 18:00 check;
- `apps/web/tests/operator-notifications.contract.test.ts` — current focused C10 contract suite.

No second mail runtime, queue, event owner, digest owner or provider integration is required.

## Security and data-minimization audit

Current main passes the key payload boundaries:

- Create notification uses the already-redacted Create safety text and locale; the draft ID is used only as an idempotency key and is not rendered into the mail.
- Technical support notification is derived from a persisted support ticket and bounded technical metadata; current main does not include raw contribution text in that mail.
- Member registration loads only `_id`, email, name and profile locale from the canonical user record.
- Notification failure never changes the already-successful citizen Create mutation because delivery is scheduled best-effort.
- `CRON_SECRET` must exist, be at least 16 characters and match the bearer token; otherwise the digest route fails closed with 401.
- Europe/Berlin day/hour computation is server-side and DST-aware.

## Fresh findings requiring bounded hardening

The current runtime is largely complete, but C10 should not be closed without these two hardening items.

### 1. Failure / recovery evidence is incomplete

`sendMail` already returns structured failure metadata including `category`, `retryable`, attempted/delivered/failed counts and message ID. `operatorNotifications.ts` currently persists only `deliveryStatus`, `messageId` and `failureCategory` for events, and only status/message ID for digests.

A failed event or digest is durably deduplicated, so later scheduler invocations do not silently resend it. This is correct for duplicate safety because SMTP timeout/connection outcomes can be ambiguous, but the persisted record does not contain enough information to distinguish:

- definitely not attempted;
- attempted with confirmed zero delivery;
- partial delivery;
- ambiguous transport outcome;
- non-retryable configuration/content failure.

C10 hardening must therefore persist bounded failure/recovery metadata from the canonical mail result. It must **not** introduce blind automatic retries. A previously attempted or ambiguous delivery remains manual-review-required; only downstream separately authorized recovery may resend after an explicit human decision.

### 2. Critical C10 tests are not part of mandatory Web CI

`operator-notifications.contract.test.ts` exists but is not currently in the focused Web CI list. There is also no focused route test proving short/missing/wrong `CRON_SECRET` fails closed and that an authenticated off-hour request skips delivery.

C10 cannot claim exact-head evidence until those tests execute in mandatory PR CI.

## Existing behavior that must remain unchanged

- fixed operator recipients remain the existing reviewed values;
- citizen Create success never waits for SMTP delivery;
- notification failure is observable but not represented as Create failure;
- no raw prompt, secret, session token, signed URL or fetched source body is copied into operator mail/event persistence;
- no public publication, review approval, moderation decision or vote activation is triggered;
- C10 does not become the C11 progress channel;
- real SMTP/inbox/provider acceptance remains a Production/Human Gate and is not code-merge evidence.

## Proposed bounded implementation authorization surface

A later separate authorization may permit exactly:

1. `apps/web/src/features/operator/operatorNotifications.ts` — persist bounded canonical delivery/recovery metadata only; no new collection and no blind resend.
2. `apps/web/tests/operator-notifications.contract.test.ts` — extend failure/recovery and dedupe invariants.
3. `apps/web/tests/operator-digest.route.test.ts` — new focused secret/hour fail-closed route contract.
4. `.github/workflows/web-ci.yml` — execute the two C10 tests in mandatory Web CI.

No edits are currently justified in Create save, intelligent-followup, onboarding events, `vercel.json`, mailer/provider runtime or package manifests.

```text
RUNTIME_FILES_MAX=1
TEST_FILES_MAX=2
CI_FILES_MAX=1
TOTAL_CHANGED_FILES_MAX=4
NEW_DB_COLLECTIONS=0
NEW_API_ROUTES=0
NEW_PROVIDER_RUNTIME=0
NEW_PACKAGES=0
AUTO_RETRY=false
AUTO_PUBLISH=false
```

## Result

```text
C9_DEPENDENCY=PASS
CURRENT_RUNTIME_REUSE=PASS
DATA_MINIMIZATION=PASS
CRON_SECURITY_DESIGN=PASS
DST_DESIGN=PASS
RECOVERY_EVIDENCE=HARDEN_REQUIRED
MANDATORY_CI_COVERAGE=HARDEN_REQUIRED
SIZE_GATE=PASS
COLLISION_GATE=PASS
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
NEXT_ALLOWED_STEP=SEPARATE_C10_IMPLEMENTATION_AUTHORIZATION
```
