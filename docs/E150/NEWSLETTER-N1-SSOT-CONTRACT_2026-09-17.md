# Newsletter N1/N2/N3 — Subscription SSOT + Explainable Profile Relevance

Date: 2026-09-17
Status: N1-N3 foundation; no automatic user delivery enabled

## Goal

Create a conflict-safe foundation for future eDebatte user briefings without touching the active C, T or G implementation tracks.

This track defines canonical subscription, consent, preference, reconciliation and explainable profile-relevance contracts. It does not enable scheduled user sends, does not auto-publish content, and does not alter Create, Decision Dossier or Public Guard runtime behavior.

## Track boundary

Owned by N — Newsletter / Notifications.

N may own:

- subscription status and consent semantics
- newsletter audience tiers
- frequency and preference semantics
- eligibility rules
- unsubscribe/suppression semantics
- reconciliation of legacy opt-in state
- explainable profile relevance
- briefing depth/diversity policy
- delivery fatigue/quiet-hour guards
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
9. `public_updates_subscribers` is the canonical newsletter subscription source for N2+ reads.
10. Legacy `users.newsletterOptIn` is reconciliation input only and may never silently promote a recipient to `active`.
11. Profile relevance must be explainable from explicit selections or visible product activity and may not infer ideology, party preference or voting intention.
12. Audience tier may change presentation depth/capacity, but never relevance score or political selection truth.

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

N3 adds source-level personalization controls for profile topics, profile region, watchlist activity and own-work activity, plus quiet-hours/timezone foundations and relevance-explanation preference.

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

## N3 explainable relevance

N3 adds a pure/read-only relevance layer with these allowed inputs:

- explicit newsletter topic/region selections
- account profile top topics
- account profile region/country
- watchlist topic/region activity
- own-work topic/region activity
- preferred/reading locale

The result contains a deterministic score plus reason codes and human-readable explanations.

No ideology, party preference, voting intention, political camp or demographic persuasion proxy is inferred.

## N3 user control

Personalization enrichment sources can be disabled independently:

- profile topics
- profile region
- watchlist activity
- own-work activity

Explicit newsletter topic/region choices remain separate because they were selected specifically for this communication channel.

## N3 Plus / Pro behavior

`public/member`:

- compact briefing
- up to 4 items

`plus`:

- standard briefing
- up to 6 items
- relevance explanation
- change summary

`pro/organization/staff`:

- deep briefing
- up to 10 items
- relevance explanation
- change summary
- evidence/source pointers

The content truth remains shared; paid tiers receive more depth and convenience, not different democratic facts or political weighting.

## N3 diversity and fatigue guards

The foundation includes:

- per-topic diversity caps for non-critical briefing items
- critical-item bypass of the topic cap
- candidate-ID duplicate protection
- `important_only` blocks non-critical delivery fail-closed
- quiet-hours guard
- daily fatigue cap
- weekly fatigue cap

Critical alerts may bypass quiet hours/fatigue intervals, but do not bypass subscription consent, suppression or eligibility.

## Remaining before external delivery

Still intentionally not enabled:

- automatic legacy reconfirmation mail blast
- automatic newsletter/digest scheduler
- runtime preference-center API/UI writes into the canonical subscription record
- live watchlist/own-work signal ingestion into the delivery job
- external user delivery

These remain held back so they do not collide with concurrent C/T/G work and so consent/review boundaries remain explicit.

## Next slices

### N4 — Digest composition and preview

- canonical candidate schema from reviewable output only
- digest composition without auto-publish
- actual `Warum bekomme ich das?` rendering
- preference-center/admin preview
- per-topic recency window and semantic de-duplication
- no political viewpoint targeting

### N5 — Delivery and operations

- scheduler/cron
- idempotent delivery keys
- per-recipient delivery ledger
- bounce/complaint suppression feedback
- admin monitoring
- retry/rate policy
- retention/cleanup policy

## Acceptance through N3

N1-N3 is ready for review when:

- contracts compile;
- contract/reconciliation/unsubscribe/relevance/policy tests pass;
- inactive/expired/suppressed subscriptions fail closed;
- legacy opt-in can never become active without canonical consent;
- package identifiers resolve to stable communication tiers;
- preference defaults are deterministic;
- unsubscribe requires a valid signed token and explicit POST;
- profile relevance is deterministic and explainable;
- personalization source opt-outs are honored;
- audience tier changes depth, not relevance score;
- duplicate/important-only/quiet-hour/cadence guards are deterministic;
- no C/T/G runtime file is changed;
- no automatic external user notification is enabled.
