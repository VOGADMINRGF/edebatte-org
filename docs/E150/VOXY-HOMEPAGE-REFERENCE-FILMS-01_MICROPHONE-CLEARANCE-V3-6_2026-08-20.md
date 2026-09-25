# VOXY HOMEPAGE REFERENCE FILMS 01 — V3.6 MICROPHONE CLEARANCE LOCK

Date: 2026-08-20

## Why this pass exists

Fresh human review of the V3.5 private Node-20 renders found that the broadcast readability and transition work was holding, but two last presenter-composition issues remained:

1. the large eDebatte primary-source card still sat too close to / visually behind the desk microphone;
2. the VoiceOpenGov `WIRKSAME MITBESTIMMUNG` core still visually touched the microphone area.

This pass is intentionally narrow. It does not change story, copy, voice, evidence, political framing, timing allocation, source truth, release policy, or the accepted Voxy character/studio canon.

## V3.6 geometry changes

### eDebatte source card

The source-pull primary-source card now uses:

- `right: -48px`
- `scale(.72)`

This shifts the visible left edge farther into the right information lane while retaining the same source object and copy.

The media-forensics source-resolution version is aligned to the same clearance intent:

- `right: -38px`
- `scale(.72)`

The V3.5 `BELEGEN` beam remains fully in the right lane and the vertical research trace remains at local `x=770`.

### VoiceOpenGov participation balance

The participation scene now starts at local `x=810` instead of `x=760`.

The dominant participation core is reduced to `220×168` and the two edge states are reduced to `102px` cards with lower opacity. This keeps `WIRKSAME MITBESTIMMUNG` visually dominant while opening a clean gap around the presenter microphone.

## Preserved locks

V3.6 deliberately preserves:

- minimum readable state duration: 2.0 s / 48 frames at 24 fps;
- narration-pause hold on the previous state;
- deterministic 250 ms timeline-based state settling;
- no browser-time animation dependency;
- presenter-safe and face-safe policies;
- D1-only accepted voice path;
- VoiceOpenGov evergreen isolation;
- eDebatte source/evidence semantics;
- `productionEligible = false`;
- `autoPublish = false`;
- human acceptance remains pending until a fresh exact-head render is visually reviewed.

## Machine-readable marker

Frames include:

`data-microphone-clearance-lock="v3-6"`

Focused contract coverage:

`apps/web/tests/voxy-homepage-microphone-clearance-v3-6.contract.test.ts`

## Human review required

After exact-head CI succeeds, create a fresh private Node-20 render and review at normal speed plus targeted full-HD frames around:

- eDebatte source-pull / primary-source sequence (~19–22 s in the previously reviewed render);
- eDebatte research trace (~33–42 s);
- VoiceOpenGov participation balance (~29–38 s);
- VoiceOpenGov closing CTA (~56 s onward).

Acceptance requires visible separation from Voxy, the microphone and presenter quiet zone without sacrificing legibility or one-dominant-assertion discipline.

No merge, homepage integration, deployment or publishing is authorized by this pass.
