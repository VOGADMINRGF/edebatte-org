# Newsletter / Notifications N1 — Scope

Date: 2026-09-17
Status: approved preparation track

## Goal

Consolidate newsletter/update consent and prepare personalized notification delivery without colliding with active C, T or G workstreams.

## Isolation rule

N1 must not modify C/T/G owner files or their active workflow contracts. The first slice is restricted to communication/subscription infrastructure, account-facing notification preferences, and newsletter admin/read-model surfaces.

## N1 sequence

1. Establish one canonical communication-subscription read model.
2. Keep existing public double-opt-in behavior intact and migrate admin reads away from a separate newsletter truth.
3. Add explicit unsubscribe/preference semantics before recurring user delivery is enabled.
4. Introduce entitlement-driven briefing levels instead of binding logic to user-facing package names.
5. Add personalized digest selection based on consented profile signals such as locale, region, top topics, watchlist, and user-owned work.
6. Add scheduled delivery only after the canonical subscriber model and preference controls are accepted.
7. Add admin observability for eligibility, suppression, last delivery, failures, and upcoming digest state.

## Guardrails

- No automatic publishing of editorial content.
- Personalization may change relevance, ordering, depth, and delivery frequency, but must not create different factual truths for different users.
- No premium vote weighting or political preference inference.
- Consent and unsubscribe are fail-closed.
- Existing public updates subscribers and registered-user newsletter opt-ins must be reconciled through one canonical read model before recurring sends.
- C/T/G paths stay untouched unless a later explicit dependency is accepted by the project owner.

## Initial evidence

Current repository state already contains:

- public updates double opt-in in `apps/web/src/app/api/public/updates/*`
- account `newsletterOptIn` plus locale/profile/topic data
- dossier watchlists
- `newsletter_draft` as an output channel
- newsletter admin surfaces

The current gap is the missing canonical subscriber truth plus recurring personalized delivery runtime.
