# Newsletter N1/N2 — Subscription SSOT Contract

Date: 2026-09-17
Status: N1 foundation + N2 reconciliation/unsubscribe safety; no automatic user delivery enabled

## Goal

Create a conflict-safe foundation for future eDebatte user briefings without touching the active C, T or G implementation tracks.

This track defines the canonical subscription, consent and preference contract and reconciles legacy newsletter state. It does not enable scheduled user sends, does not auto-publish content, and does not alter Create, Decision Dossier or Public Guard runtime behavior.

## Track boundary

Owned by N — Newsletter / Notifications.

N may own:

- subscription status and consent semantics
- newsletter audience tiers
- frequency and preference semantics
- eligibility rules
- unsubscribe/suppression semantics
- adapters for public updates and account settings
- future digest scheduling and delivery monitoring

N must not modify as part of this work:

- Create/Citizen Core C1-C12 runtime
- Public Guard G1-G5 runtime
- Topic Intelligence / Decision Dossier T0-T8 runtime
- dossier readiness/decision logic
- create orchestration and review gates
- public question guard behavior

## Canonical rules

1. Delivery is fail-closed.
2. Only `active` subscriptions with the currently required consent version are eligible.
3. `pending`, `unsubscribed` and `suppressed` recipients are never eligible.
4. Invalid email addresses are never eligible.
5. Explicit suppression always overrides an otherwise active subscription.
6. User-facing package names are not used as runtime permission truth. Communication maps package/access identifiers to stable audience tiers.
7. Personalization may change relevance, ordering, depth and cadence, but not factual truth or democratic rights.
8. Premium tiers receive additional convenience/depth, never political weighting or preferential democratic treatment.
9. `public_updates_subscribers` is the canonical newsletter subscription source for N2 reads.
10. Legacy `users.newsletterOptIn` is reconciliation input only and may never silently promote a recipient to `active`.

## Audience tiers

- `public`
- `member`
- `plus`
- `pro`
- `organization`
- `staff`

The audience tier is a communication capability input, not a political ranking.

## Preference model

Initial preferences:

- frequency: `important_only | daily | weekly`
- product updates
- topic updates
- regional updates
- watchlist updates
- own-work updates
- important alerts
- explicit topic keys
- explicit region keys

Default frequency is weekly.

## N2 reconciliation

The repository historically had two newsletter signals:

- account/user `newsletterOptIn`
- `public_updates_subscribers`

N2 resolves this without destructive migration:

- canonical records always win over the legacy mirror;
- legacy-only `true` becomes `pending` / `reconfirm_legacy_opt_in`, never `active`;
- canonical `unsubscribed` and `suppressed` states are preserved even when the legacy mirror says `true`;
- canonical `active` is preserved and legacy disagreement is reported as a conflict;
- `/api/admin/dashboard/newsletter/reconciliation` provides a read-only reconciliation report;
- `/api/admin/dashboard/newsletter/export` exports only canonical, active subscriptions with the current consent version;
- the old admin write endpoint is fail-closed so it cannot recreate a second write truth.

No automated user digest may be enabled while remaining canonical write/profile wiring is incomplete.

## N2 unsubscribe safety

A canonical unsubscribe endpoint exists at `/api/public/updates/unsubscribe`.

Safety rules:

- unsubscribe tokens are HMAC signed and time-limited;
- `NEWSLETTER_UNSUBSCRIBE_SECRET` is required; missing configuration fails closed;
- `GET` only verifies and previews the action because mail scanners/link previews must not trigger an unsubscribe;
- the actual unsubscribe is performed by `POST`;
- unsubscribe is idempotent and does not disclose whether the email exists;
- `suppressed` is not downgraded to `unsubscribed` by the public endpoint.

Future digest delivery must generate these tokens and place the confirmed unsubscribe action in every marketing/briefing email.

## Remaining N2/N3 boundary

Still intentionally not enabled:

- automatic legacy reconfirmation mail blast;
- automatic newsletter/digest scheduler;
- profile settings writes directly into canonical newsletter preferences;
- automatic topic/watchlist/region relevance selection;
- external user delivery.

These are held back so they do not collide with concurrent C/T/G work and so consent remains explicit.

## Next slices

### N3 — Profile relevance model

Inputs may include:

- top topics
- region
- watchlist
- own contributions/dossiers
- language
- package/access tier
- explicit user preferences

No opaque political profiling. Relevance must be explainable from explicit product activity and user-selected preferences.

### N4 — Digest composition

- general weekly update
- Plus briefing
- Pro briefing
- important-event alerts
- no automatic publication of editorial content

### N5 — Delivery and operations

- scheduler/cron
- idempotent delivery keys
- per-recipient delivery log
- bounce/suppression handling
- admin monitoring
- retry policy
- rate limits

## Acceptance

N1/N2 is ready for review when:

- contract compiles;
- contract/reconciliation/unsubscribe-token tests pass;
- inactive/expired/suppressed subscriptions fail closed;
- legacy opt-in can never become active without canonical consent;
- package identifiers resolve to stable communication tiers;
- preference defaults are deterministic;
- unsubscribe requires a valid signed token and explicit POST;
- no C/T/G runtime file is changed;
- no automatic external user notification is enabled.
