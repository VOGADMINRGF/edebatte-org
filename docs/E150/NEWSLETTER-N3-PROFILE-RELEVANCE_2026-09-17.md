# Newsletter N3 — Explainable Profile Relevance

Date: 2026-09-17
Status: contract/read-model foundation; no automatic user delivery enabled

## Goal

Make eDebatte updates individually relevant without creating opaque political profiling, filter-bubble logic or premium political weighting.

N3 remains inside the isolated Newsletter / Notifications track and does not modify C, T or G owner runtime.

## Signal sources

Allowed profile relevance signals are inspectable product/user signals:

- explicitly selected newsletter topic keys
- explicitly selected newsletter region keys
- account profile top topics
- account profile region/country
- watchlist topic/region activity
- own-work topic/region activity
- preferred/reading locale
- communication audience tier for presentation depth only

Not allowed as relevance inputs:

- inferred ideology
- inferred party preference
- inferred voting intention
- inferred political camp
- demographic proxies for political persuasion
- premium status as a relevance-score boost

## User control / preference center

N3 adds a granular preference-center contract. Users can independently enable or disable whether these enrichment sources participate in relevance:

- profile topics
- profile region
- watchlist activity
- own-work activity

Explicit newsletter topic/region choices remain separate because they were selected specifically for the communication channel.

The preference-center foundation also contains:

- frequency choice (`important_only`, `daily`, `weekly`)
- quiet hours
- timezone
- relevance-explanation preference
- category-level newsletter preferences already present in the canonical subscription model

## Relevance behavior

The relevance resolver returns:

- deterministic score
- `relevant` boolean
- explicit reason codes
- human-readable relevance explanations

Current reasons:

- explicit topic
- explicit region
- watchlist topic/region
- own-work topic/region
- locale match
- important platform alert
- no profile match

Important platform alerts can be relevant without profile matching, but still require valid subscription consent at delivery time.

## Plus / Pro differentiation

Audience tier changes communication depth and capacity, not political selection truth.

Compact (`public/member`):

- up to 4 briefing items
- concise output
- no premium evidence layer

Standard (`plus`):

- up to 6 briefing items
- relevance explanation
- change summaries

Deep (`pro/organization/staff`):

- up to 10 briefing items
- relevance explanation
- change summaries
- evidence/source pointers

The underlying factual state and democratic rights remain identical.

## Diversity guard

A briefing may not be filled indefinitely by one topic merely because it has many matching items.

The briefing selector therefore limits non-critical items per primary topic. Critical platform alerts may bypass that topic cap.

This is a diversity/fatigue mechanism, not ideological balancing or political ranking.

## Delivery guard foundation

N3 also provides a pure delivery-policy guard, without scheduler or send runtime:

- candidate-ID duplicate protection
- `important_only` blocks non-critical items fail-closed
- quiet-hours guard
- daily fatigue cap
- weekly fatigue cap
- critical alerts may bypass quiet hours/fatigue interval
- critical alerts do not bypass consent/suppression/eligibility gates

## Optimizations retained for N4/N5

Before production delivery, add:

1. idempotent delivery keys and delivery ledger
2. per-topic recency/de-duplication window beyond candidate ID
3. provider-backed bounce/complaint suppression feedback loop
4. send-volume/rate protection and retry policy
5. digest observability: selected, skipped, deduped, suppressed, failed, delivered
6. actual UI and email rendering of "Warum bekomme ich das?"
7. runtime preference-center API/UI connected to the canonical subscription record
8. retention limits and cleanup jobs for personalization event data
9. A/B testing only for format/usability, never political persuasion or viewpoint targeting
10. real scheduler/delivery only after N1-N4 acceptance and operational review

## Track boundary

No changes in this slice to:

- Create / Citizen Core C1-C12
- Public Guards G1-G5
- Topic Intelligence / Decision Dossier T0-T8
- dossier readiness / evidence logic
- automatic newsletter cron
- automatic external user sends

## N3 acceptance

N3 is contract-complete when:

- profile/preference/activity inputs normalize deterministically
- relevance decisions are explainable
- personalization enrichment sources can be disabled independently
- no political preference inference exists
- audience tier does not alter relevance score
- briefing diversity cap is deterministic
- duplicate, important-only, quiet-hour and cadence guards are deterministic
- tests cover the above behavior
- no C/T/G owner files are changed
