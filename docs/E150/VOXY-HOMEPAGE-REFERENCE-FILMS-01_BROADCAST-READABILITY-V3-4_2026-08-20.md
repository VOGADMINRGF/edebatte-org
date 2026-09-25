# VOXY Homepage Reference Films — Broadcast Readability V3.4

Date: 2026-08-20
Task: `VOXY-HOMEPAGE-REFERENCE-FILMS-01`
Status: human review pending
Release: `productionEligible=false`, `autoPublish=false`

## Why V3.4 exists

A frame-by-frame human review of the V3.3 private Node-20 renders found that the conceptual system was stable, but the remaining craft did not yet meet the intended television-reference threshold.

The decisive findings were:

- eDebatte still contained a meaningful forensic state below the declared two-second reading minimum;
- the eDebatte horizontal research trace crossed the presenter's torso area even though the face itself was clear;
- several semantic labels were too small for comfortable Full-HD reading;
- VOG right-lane graphics began roughly 20 px inside the declared hard host exclusion boundary;
- participation comparison still needed a clearer dominant assertion hierarchy;
- the prior metadata declared a two-second minimum but did not itself guarantee it.

Human review therefore remained `pending` for both films.

## V3.4 editorial rule

A readable semantic state is not a transition ornament. If text carries meaning, it must remain on screen long enough to be read at normal viewing speed.

V3.4 treats **48 frames at 24 fps = 2.0 seconds** as the hard minimum for any discrete semantic state in the staged object story.

When a spoken segment is too short for all desired phases at that minimum dwell, optional middle phases are collapsed instead of flashed.

Examples:

- source check: `claim → link → primary` becomes `claim → primary` when the segment cannot support three readable phases;
- media forensics: `number → quote → study/source` becomes `number → study/source` under the same condition;
- the renderer never creates a sub-two-second intermediate phase merely to preserve a nominal sequence.

## Implemented V3.4 changes

### Readable-state timing

- introduces an actual duration-aware phase allocator using the synthesized speaker timeline;
- each multi-phase segment only renders as many states as its duration can support at >=2.0 s per state;
- exposes `data-readable-state-id` on each distinctive scene;
- keeps `data-pause-hold="previous-segment"` so narration gaps extend the prior state rather than producing flash frames;
- eDebatte opening progression is treated as one combined opening range so it does not reset between greeting and election-noise narration;
- eDebatte synthesis progression is distributed across both synthesis segments instead of restarting three phases in each segment.

### eDebatte presenter discipline

- media forensics now uses three readable states rather than four short states: number, quote, and study/source resolution;
- study and source-vs-interpretation are combined into one dominant final forensic object;
- the research trace is now a vertical right-lane stack rather than a horizontal axis through Voxy's torso;
- trace connector spans are removed;
- synthesis has one support orbit at a time and no connector web;
- synthesis, trace and resolution are right-lane objects;
- dense object-led segments remove the lower third instead of carrying a second assertion.

### VoiceOpenGov presenter discipline

- all main semantic scene containers begin at local x=690, which places them at global x≈1050 and therefore outside the declared host-safe right edge x=1030;
- process, programme, Demophobie, participation and current/future scenes share the same right-lane discipline;
- the democratic loop remains right-lane only;
- the post-election progression remains vertical;
- the decision status ruler is reduced to three readable anchors: `AUSSAGE → BESCHLUSS → WIRKUNG`;
- participation extremes are visually secondary while `WIRKSAME MITBESTIMMUNG` remains dominant;
- the closing democratic loop is retained only as a low-opacity watermark.

### Full-HD semantic typography

Meaning-bearing microcopy has been raised from the previous 7–10 px range:

- right-lane process and trace labels: 11 px;
- guardrails: 11 px;
- current/future supporting copy: 11 px;
- participation supporting copy: 12 px;
- loop labels: 11 px;
- evidence-kind label: 10 px;
- core assertions remain substantially larger.

Decorative or tertiary chrome may remain smaller, but semantic information is not allowed to depend on it.

## Presenter-safe metadata

V3.4 preserves the face-safe zone and adds an explicit broader presenter-safe zone:

- face-safe: `x560-1030:y135-535`
- presenter-safe: `x540-1030:y125-760`
- policy: `no-semantic-text-or-connector-lines`

The distinction is intentional: passing face-safe alone is not enough if a path, label or card still cuts through the moderator's torso or hands.

## Frame-level CI gate

New focused contract:

`apps/web/tests/voxy-homepage-broadcast-readability-v3-4.contract.test.ts`

It renders the staged HTML at 24 fps and groups contiguous `data-readable-state-id` runs.

The gate fails when a checked semantic state lasts fewer than 48 frames.

Covered sequences:

- eDebatte source phases;
- eDebatte media-forensics phases;
- eDebatte combined synthesis range;
- VOG programme/gap/decision;
- VOG Demophobie source/question/guardrails;
- VOG current/bridge/future;
- narration pause hold;
- adaptive phase collapse for short spoken segments;
- presenter-safe geometry and broadcast-size semantic typography.

This closes the gap in V3.3 where a metadata declaration could be green while a real visual state still rendered for less than two seconds.

## Frozen canon

V3.4 does not change:

- Voxy character canon;
- D1 accepted voice;
- mouth v4.1 geometry;
- studio master;
- VOG lapel pin / eDebatte pocket mark;
- source registry;
- product-truth classifications;
- VOG evergreen isolation;
- narration copy;
- publishing or production gates.

## Required next review

After CI is green, create a fresh private Node-20 D1 render from the exact branch head.

Human review must include:

1. normal-speed viewing of both films;
2. 250-ms transition scan;
3. explicit 48-frame dwell verification for meaningful state changes;
4. presenter-safe review including torso/hands, not face only;
5. typography/readability review at normal Full-HD viewing size;
6. one-dominant-assertion review;
7. final evergreen, VOG pin and release-gate verification.

Until that review is explicitly accepted:

- `humanHomepageFilmAcceptance=pending`
- `humanNews5VisualAcceptance=pending`
- `productionEligible=false`
- `autoPublish=false`
- PR stays Draft/open/unmerged
- no homepage integration
- no deploy or publishing
