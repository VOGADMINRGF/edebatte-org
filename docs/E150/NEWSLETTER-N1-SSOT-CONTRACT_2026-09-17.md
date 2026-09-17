# Newsletter N1 — Subscription SSOT Contract

Date: 2026-09-17
Status: foundation only; no automatic user delivery enabled

## Goal

Create a conflict-safe foundation for future eDebatte user briefings without touching the active C, T or G implementation tracks.

This slice defines the canonical subscription and preference contract only. It does not enable scheduled user sends, does not auto-publish content, and does not alter Create, Decision Dossier or Public Guard runtime behavior.

## Track boundary

Owned by N — Newsletter / Notifications.

N1 may own:

- subscription status and consent semantics
- newsletter audience tiers
- frequency and preference semantics
- eligibility rules
- unsubscribe/suppression semantics
- future read/write adapters for public updates and account settings
- future digest scheduling and delivery monitoring

N1 must not modify as part of this foundation:

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

## Current repository gap

The repository currently has two legacy sources:

- account/user `newsletterOptIn`
- `public_updates_subscribers`

N1 does not silently choose one legacy store as truth. A later adapter/migration slice must reconcile them into the canonical subscription contract with explicit precedence and auditability.

Until that adapter exists, no automated user digest should be enabled.

## Next slices

### N2 — Subscription adapter and reconciliation

- build a single read/write adapter
- reconcile existing user opt-in and public updates subscriptions
- add explicit unsubscribe endpoint and suppression handling
- retain consent evidence and timestamps
- add migration/report mode before any destructive cleanup

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

## Acceptance for N1

N1 foundation is accepted when:

- the contract compiles
- contract tests pass
- inactive/expired/suppressed subscriptions fail closed
- package identifiers resolve to stable communication tiers
- preference defaults are deterministic
- no C/T/G runtime file is changed
- no automatic external user notification is enabled
