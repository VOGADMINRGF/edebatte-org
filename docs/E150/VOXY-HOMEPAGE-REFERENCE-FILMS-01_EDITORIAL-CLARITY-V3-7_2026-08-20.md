# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — Editorial Clarity V3.7

Date: 2026-08-20
Status: implemented on draft PR #624; fresh private render and human review required
Release: not authorized

## Why V3.7 exists

Fresh V3.6 review showed that geometry and readable dwell were no longer the main problem. The films were technically disciplined, but the VoiceOpenGov story still felt roughly 80% finished as a homepage broadcast piece. The missing quality was editorial hierarchy and muted-first comprehension:

- `VoiceOpenGov · Demokratie in Bewegung` was too far from the primary brand and too small.
- `Der Weg geht weiter` and the `DEINE STIMME` loop belonged below the evidence displays, not beside the presenter.
- the loop had become too static after prior safety reductions.
- viewers could not follow the spoken argument reliably with audio muted.
- the named book/author discussion reference distracted from the actual VoiceOpenGov proposition and was never intended as public-facing copy.

V3.7 treats these as editorial-system issues rather than adding more objects or visual noise.

## VoiceOpenGov changes

### 1. Primary brand hierarchy

The top-left brand hierarchy now reads:

`VoiceOpenGov`
`DEMOKRATIE IN BEWEGUNG`
`eDebatte · prüfbare Grundlage`

The descriptor is a readable 16 px broadcast label directly under the brand instead of a remote scene kicker.

### 2. Living democratic loop

The `DEINE STIMME` loop moves to the lower-right information region beneath the slide/evidence lane.

It remains deterministic and render-safe, but no longer looks frozen:

- dashed path progression remains tied to timeline progress;
- one semantic node is highlighted according to progress;
- the loop carries its own `DER WEG GEHT WEITER` heading;
- no browser-time animation or decorative random motion is introduced.

### 3. Muted-first Voxy subtitles

Both homepage films now burn a stable Voxy subtitle strip into the rendered video while continuing to generate VTT and SRT sidecars.

The strip:

- identifies `VOXY`;
- mirrors the complete current spoken segment;
- holds the previous segment through narration pauses;
- does not blink, type, or reveal word by word;
- occupies a dedicated lower reading lane;
- suppresses the legacy editorial lower third to avoid two simultaneous reading systems.

This makes the films understandable when autoplay is muted.

### 4. Public story without named research references

The earlier public-facing `Demophobie` / named-author passage is removed from VoiceOpenGov narration, evidence cards, selected film sources, and lower-third copy.

The internal segment id `vog-demophobie` is intentionally retained for compatibility in this branch, but it is not visible to the audience.

The public argument is now direct:

`Wenn Beteiligung keine definierte Folge hat, ist sie noch keine Mitbestimmung.`

Then:

`Wie wird aus einer Stimme nachvollziehbare politische Wirkung?`

And the next state makes the democratic limits explicit:

- Grundrechte
- Minderheitenschutz
- Rechenschaft
- Revision

This keeps VoiceOpenGov focused on the design problem it actually wants to explore rather than on a research citation.

## eDebatte alignment

eDebatte receives the same muted-first subtitle system and a clearer proposition directly below its brand:

`eDebatte`
`PRÜFEN STATT GLAUBEN`
`VoiceOpenGov · demokratischer Kontext`

Its V3.6 source/microphone clearance, evidence trace, media-forensics story, D1 voice and evidence-memory behavior remain unchanged.

## Preserved hard gates

V3.7 does not authorize or perform:

- homepage integration;
- production eligibility;
- Ready for Review;
- merge;
- deployment;
- publishing.

The following remain unchanged:

- D1 is the only active narration voice;
- accepted mouth rig and visual canon remain frozen;
- 2.0 s / 48-frame readable-state minimum remains active;
- deterministic 250 ms state settling remains active;
- V3.6 microphone clearance remains active;
- current capability and future democratic target design remain explicitly separated;
- `productionEligible = false`;
- `autoPublish = false`;
- human homepage-film acceptance remains pending.

## Focused contract

`apps/web/tests/voxy-homepage-editorial-clarity-v3-7.contract.test.ts`

The contract checks:

1. primary-brand descriptor hierarchy;
2. lower-right dynamic VoiceOpenGov loop;
3. burned-in stable Voxy subtitles plus retained sidecars;
4. absence of named research references from the public VoiceOpenGov story;
5. current-capability vs future-design separation;
6. release gates remain closed.

## Human review required

After exact-head CI succeeds, render both films again with the accepted Node-20/D1 private pipeline.

Human review should answer five questions:

1. Does `DEMOKRATIE IN BEWEGUNG` read immediately as part of VoiceOpenGov branding?
2. Does the loop feel alive but subordinate to the active evidence slides?
3. Can the complete argument be understood with sound muted?
4. Is the participation story now self-explanatory without external names or book references?
5. Does eDebatte retain its stronger media-forensics identity with the same muted-first accessibility?

No human acceptance is recorded by this implementation alone.
