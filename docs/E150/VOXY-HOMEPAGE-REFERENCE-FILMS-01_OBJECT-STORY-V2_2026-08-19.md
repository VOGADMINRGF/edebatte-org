# VOXY-HOMEPAGE-REFERENCE-FILMS-01 · Object Story v2 · 2026-08-19

Status: `review`

## Human review input

The private eDebatte render from branch head `19f0020eea1f87bbd2f44a7a562c508ae8e16d37` completed with `TECHNICAL_PASS`, but human visual review did **not** accept it as the reference standard.

The review found that the film was materially improved over the earlier slide system, but the large central dashboard still covered Voxy for too much of the film and made the experience feel like a presentation surface changing state rather than research happening in the studio.

Human direction for the next pass:

- leave the paper/dashboard metaphor behind
- make the researched object itself move through the scene
- preserve Voxy as visible host instead of background wallpaper
- make eDebatte the primary brand in the eDebatte homepage film
- keep VoiceOpenGov visually and dramaturgically distinct
- preserve NEWS 5.0 object continuity and Evidence Memory
- no threshold hack, no auto-publish, no production eligibility

## Object Story v2 correction

### eDebatte · research becomes the scene

`homepageReferenceFilmsHtml.ts` now stages eDebatte as an object-led investigation rather than a persistent dashboard.

The scene vocabulary includes:

- headline swarm → one claim freezes
- claim → visible evidence beam → primary source
- relevant source passage becomes the object of attention
- number / quote / study separate from interpretation
- evidence trace moves through `AUSSAGE → QUELLE → PASSAGE → KONTEXT → GEGENPOSITION → OFFEN`
- synthesis becomes a spatial relationship between source, context and counter-position
- the final state clears the scene and returns Voxy to the foreground
- the explained evidence still uses the accepted FOCUS → EXPLAIN → DOCK continuity into the upper-right Evidence Memory

The legacy VoiceOpenGov/eDebatte studio lockup is hidden only in this homepage overlay and replaced by a page-specific hierarchy:

- eDebatte film: `eDebatte` primary, VoiceOpenGov contextual
- VoiceOpenGov film: `VoiceOpenGov` primary, eDebatte as the verifiability foundation

The accepted jacket canon remains unchanged: lapel pin `VOG`, pocket mark exactly `eDebatte` once.

### VoiceOpenGov · living democratic process

VoiceOpenGov is no longer a ballot/document slide sequence. Its visual grammar is now a living democratic feedback system:

`STIMME → PRIORITÄT → REAKTION → ENTSCHEIDUNG → WIRKUNG → RÜCKKOPPLUNG`

Additional scenes distinguish:

- programme / promise from formal decision status
- the gap between participation and binding consequence
- `Demophobie` as a democratic design question with guardrails, not as an authority shortcut
- current VoiceOpenGov capability from the future target model
- participation from substantive democratic effect

The VOG homepage reference render now uses the `evergreen` core. This is a deliberate editorial decision, not a duration-threshold change. The election-window layer remains supported by the shared contract, but the reference homepage film should explain the enduring democratic proposition rather than carry a temporary election calendar through the canonical master.

This also removes the previously observed real-render blocker where the election-window D1 synthesis exceeded the canonical `60–75 s` media contract. The duration contract itself is unchanged.

## Added contract coverage

`apps/web/tests/voxy-homepage-object-story.contract.test.ts` locks:

- page-specific brand hierarchy
- object-led eDebatte scenes
- smaller evidence objects that preserve host visibility
- distinct VoiceOpenGov democratic feedback loop
- Demophobie guardrails
- strict current-capability vs future-target distinction
- evergreen context for the VOG reference renderer
- human/release gates remaining pending and fail-closed

## Superseded private render

The private eDebatte MP4 rendered from `19f0020eea1f...` remains valid technical evidence for that exact head, but it is **superseded for human visual acceptance** by this Object Story v2 correction.

A fresh private render from the new exact branch head is required before any human acceptance can be recorded.

## Release gates

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- no homepage integration
- no Ready-for-Review transition
- no merge
- no deployment
- no publishing
