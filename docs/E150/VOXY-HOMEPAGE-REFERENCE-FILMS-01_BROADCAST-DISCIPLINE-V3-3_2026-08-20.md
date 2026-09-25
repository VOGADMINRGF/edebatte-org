# VOXY Homepage Reference Films — V3.3 Broadcast Discipline

Date: 2026-08-20
Task: `VOXY-HOMEPAGE-REFERENCE-FILMS-01`
Status: implementation complete; fresh private Node-20 render and human review required

## Why V3.3 exists

A quarter-second review of the V3.2 reference MP4s exposed two issues that a normal technical gate did not catch:

1. During short narration pauses, the homepage renderer fell back to the final speaker segment. That made the final CTA appear for roughly a frame cluster before the next real scene — perceived as a flash/blink rather than intentional editorial motion.
2. Several VOG process graphics remained visually too close to, or over, Voxy. Dense explanation states also asked the viewer to read too many simultaneous elements.

The broadcast standard is therefore stricter than technical correctness: **nothing readable may flash, Voxy remains the host, and information temporarily takes the stage without covering the presenter.**

## V3.3 rules

### 1. Pause hold, never CTA fallback

`currentSegment()` now resolves in this order:

- active spoken segment
- most recent completed segment
- first segment only before narration begins

A narration pause therefore holds the previous visual state at progress `1.0`. It never substitutes the film's final CTA.

Render metadata:

- `data-broadcast-discipline="v3-3"`
- `data-pause-hold="previous-segment"`
- `data-min-readable-state-seconds="2"`

### 2. Broadcast readability

The format target is:

- no readable text intended as a scene state below roughly 2 seconds
- short headline target: approximately 2.5–3 seconds
- multiline explanatory target: approximately 3–4 seconds
- no blinking, word-by-word reveal or typewriter behavior
- narration pauses hold the preceding scene

For the VOG current-offer sequence, the bridge phase now occupies 34% of the spoken segment (`0.36 → 0.70`) rather than 14%, so `VON BETEILIGUNG ZU SUBSTANZ` has a real reading window.

### 3. Presenter-first geometry

The existing hard host exclusion policy remains:

`x560-1030:y135-535`

V3.3 goes beyond the literal face box:

- the VOG democratic loop is scaled and anchored in the right safe lane
- the post-election process becomes a vertical right-lane progression instead of a line across the presenter
- programme/gap/decision objects live in the right lane
- Demophobie source/question/guardrails live in the right lane
- participation balance is fully right-lane; its torso-crossing axis is removed
- the closing loop is only a quiet background watermark behind the closing statement
- eDebatte opening headline/claim elements are shifted left of the host silhouette

### 4. One dominant assertion

Dense full-screen object states suppress the lower third completely rather than carrying a second unrelated editorial sentence.

Suppressed segments include:

- `vog-after-election`
- `vog-participation-balance`
- `vog-synthesis`
- `vog-cta`
- `edebatte-next-generation`
- `edebatte-synthesis-questions`
- `edebatte-verifiability`
- `edebatte-cta`

### 5. eDebatte synthesis restraint

The synthesis stage keeps the core statement but displays only one supporting orbit at a time:

`QUELLE → KONTEXT → GEGENPOSITION`

The former simultaneous dashed connector network is hidden in V3.3. The Evidence Memory remains available on the right, so the film does not need to restate every evidence relationship in front of Voxy.

## Invariants not changed

- D1 remains the only active production voice.
- VOG lapel pin remains visible; eDebatte pocket mark remains exactly once.
- VOG homepage reference remains evergreen.
- Election-window evidence remains isolated from evergreen output.
- Evidence Memory and FOCUS → DOCK object continuity remain.
- No homepage integration is included.
- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`

## Acceptance gate

A fresh private exact-head Node-20 render must be reviewed at normal speed and at fine-grained intervals. Human acceptance requires all of the following:

- no sub-second CTA or scene flashes between spoken segments
- no large graphic or connector crossing Voxy's face or dominant torso area
- all meaningful text remains readable long enough to be understood without pausing
- no dense scene carries an unrelated lower-third assertion
- Voxy remains visually dominant as moderator whenever the information object is not intentionally foregrounded

Technical PASS alone is insufficient.
