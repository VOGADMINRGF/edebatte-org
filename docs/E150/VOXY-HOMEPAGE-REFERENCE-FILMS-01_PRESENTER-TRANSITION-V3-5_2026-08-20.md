# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — V3.5 Presenter & Transition Polish

Date: 2026-08-20

## Scope

V3.5 is a narrow broadcast-polish pass after the fresh V3.4 human review. It does not change story, narration, sources, product truth, D1 voice, evergreen/election isolation, or release policy.

The V3.4 render passed the hard readability objective: no quarter-second flashes remained and meaningful states were readable. Human review still found two presenter-spacing defects and two finishing opportunities:

1. the eDebatte `BELEGEN` beam still crossed Voxy's jacket/pocket area;
2. the eDebatte vertical research trace sat too close to the microphone;
3. the VOG participation graphic felt attached to the microphone despite being outside the face-safe zone;
4. state changes were clean but visually abrupt, and the final VOG Evidence Memory could recede more.

## V3.5 changes

### eDebatte presenter-safe polish

- moves the `BELEGEN` beam to the right information lane;
- shortens the beam so no connector line crosses Voxy's torso;
- moves the vertical `AUSSAGE → QUELLE → PASSAGE → KONTEXT → GEGENPOSITION → OFFEN` trace from local x=690 to x=770;
- narrows the trace lane to keep clear separation from both microphone and Evidence Memory.

The approximate global starts are now:

- evidence beam: x ≈ 1080 after the source-scene inset;
- research trace: x ≈ 1130;
- declared presenter-safe right edge remains x=1030.

### VoiceOpenGov presenter-safe polish

- moves `vog-participation-balance` from local x=690 to x=760;
- reduces the participation container from 300 px to 270 px;
- reduces the central balance circle from 292×220 to 250×188;
- makes both extremes smaller and quieter while preserving `WIRKSAME MITBESTIMMUNG` as the dominant assertion.

The participation scene now begins globally around x=1120, leaving visible air between Voxy/microphone and the infographic.

### Deterministic state settling

Browser-time CSS animations are intentionally not used because every video frame is rendered deterministically from HTML state.

Instead V3.5 computes `--state-enter` from the actual speaker timeline and readable-phase allocation:

- settle duration: 250 ms;
- new state begins at 72% opacity;
- reaches full opacity over the next 250 ms;
- the two-second minimum readable-state allocation remains unchanged;
- pause-hold remains unchanged;
- no text state is shortened or replaced by the settling treatment.

Metadata:

- `data-presenter-transition-polish="v3-5"`
- `data-state-settle-seconds="0.25"`
- `data-min-readable-state-seconds="2"`

### Closing hierarchy

During VOG closing:

- synthesis Evidence Memory opacity is reduced to 0.62;
- final CTA Evidence Memory opacity is reduced to 0.38;
- the final statement remains the dominant object.

## Focused CI coverage

Added:

`apps/web/tests/voxy-homepage-presenter-transition-v3-5.contract.test.ts`

The focused contract checks:

- eDebatte beam geometry outside the presenter corridor;
- eDebatte trace geometry outside the presenter corridor;
- VOG participation spacing and reduced core geometry;
- deterministic 250 ms state settling;
- preservation of the two-second readability lock;
- closing Evidence Memory hierarchy.

## Frozen / unchanged

V3.5 deliberately does not alter:

- D1 accepted voice or transparent audio path;
- narration copy;
- source/provenance truth;
- eDebatte vs VoiceOpenGov story architecture;
- evergreen/election context isolation;
- VOG lapel pin;
- accepted Voxy character/studio canon;
- `productionEligible = false`;
- `autoPublish = false`;
- homepage integration;
- merge, deployment, or publishing state.

## Required next gate

After exact-head Web CI passes, create a fresh private Node-20 D1 render and review both MP4s at normal speed plus the previously flagged moments.

Human review must specifically verify:

- eDebatte ~19–22 s: no beam over jacket, pocket, hands, or microphone;
- eDebatte ~33–50 s: research trace has clean microphone clearance;
- VOG ~29–38 s: participation graphic has visible air from Voxy and microphone;
- all state changes: no flashes and no visually distracting opacity pumping;
- VOG closing: Evidence Memory clearly secondary to the final assertion.

Human acceptance remains pending until that render is reviewed.
