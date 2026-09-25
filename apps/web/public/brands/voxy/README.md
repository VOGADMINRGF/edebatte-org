# Voxy Master Asset System v4

Canonical directory: `apps/web/public/brands/voxy/`

This pack replaces new-production use of the older raster-only `/brand/voxy` directory. The legacy directory remains available only for compatibility until every historic pose has passed a manual anatomy and branding audit.

## Non-negotiable details

- exactly five fingers on every visible hand
- `VOXY` on the lapel pin for the accepted Static-/Motion-v3 line
- `eDebatte` on the outside breast-pocket mark
- deep navy base with the eDebatte turquoise-to-electric-blue gradient
- one canonical Jarvis-style waveform behind Voxy
- the waveform never crosses the logo zone
- dynamic headlines, dates, sources and captions are not baked into character artwork
- SVG is the source of truth; raster and video outputs are generated from the SVG masters

## Accepted Static source and Motion v3 layers

The human-accepted Character/Clothing source for PR #589 is exact head
`93217eca79013d13affc7bc9881a9c76f19feab9`. Motion v3 does not use the older
vector character as its visual source. It uses the accepted flattened Canon
composition plus 26 local SVG definitions under `rig/layers/`.

Those definitions are reproducible additive pixel plates. They preserve the
accepted source at neutral pose and do not claim a hole-filled separated puppet.
The lapel pin, eDebatte pocket mark, jacket and studio are frozen. Motion output
requires a new human visual acceptance and is not production eligible.

## Masters

- `characters/voxy-sitting-master.svg`
- `characters/voxy-standing-master.svg`
- `characters/voxy-gesturing-master.svg`
- `studio/voxy-studio-background-16x9.svg`
- `studio/voxy-studio-background-9x16.svg`
- `studio/voxy-studio-background-1x1.svg`

## Broadcast templates

- 16:9: 3840 × 2160
- 9:16: 2160 × 3840
- 1:1: 2160 × 2160

## Export policy

Production exports are generated, not manually resized:

- SVG for websites and editable masters
- AVIF/WebP for responsive website delivery
- 8K/4K PNG for press and marketing
- H.264 MP4/WebM at 30 fps for production video
- lower-resolution 24 fps outputs are review previews only

## Legacy rule

Do not add new marketing use of files under `/brand/voxy` without an explicit audit. New code should resolve assets through `/brands/voxy/manifest.json`.

## Immediate marketing-safe masters

- `marketing/voxy-studio-marketing-master-16x9.svg`
- `marketing/voxy-studio-marketing-master-9x16.svg`
- `marketing/voxy-studio-marketing-master-1x1.svg`

These self-contained SVGs preserve the high-quality reviewed studio render, replace the logo zone with crisp vector typography, and start the editable lower-third above the hands. The anatomy-sensitive hand area is therefore not part of published framing until the final independent master rig is approved.
