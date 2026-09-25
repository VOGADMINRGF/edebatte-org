# VOXY Homepage Reference Films — V3.2 Geometry + Editorial Sync

Date: 2026-08-20
Task: `VOXY-HOMEPAGE-REFERENCE-FILMS-01`
PR: #624

## Why this pass exists

The Node-20 V3.1 render passed technically and fixed the earlier synthesis-line and duplicate-class defects. Human review of both rendered MP4s still found two narrow issues:

1. the declared host face-safe corridor was smaller than Voxys actually rendered speech-bubble silhouette;
2. some object-dominant moments still carried a second, unrelated lower-third headline.

This pass is intentionally surgical. It does not redesign the films, change the accepted D1 voice, alter evergreen/election isolation, or change release gates.

## V3.2 geometry correction

The renderer now declares a larger hard host exclusion zone:

`x560-1030:y135-535`

Large objects and connector lines are kept outside that silhouette-safe region.

### eDebatte

- active NEWS 5.0 evidence tag begins at x=1060;
- the primary-source document is visually scaled from the right edge so its visible left edge clears the host silhouette;
- the source evidence beam is routed below the host zone;
- number/quote/study inspection objects and the source/interpretation rule are shifted right;
- the AUSSAGE → QUELLE → PASSAGE → KONTEXT → GEGENPOSITION → OFFEN trace axis moves below the host zone;
- trace copy, synthesis core and resolution copy move to the right-side safe lane;
- existing synthesis connectors remain routed outside the host corridor.

### VoiceOpenGov

- PROGRAMM ≠ BESCHLUSS gap copy and status ruler use the right-side safe lane;
- the Demophobie design question and guardrails move right;
- participation balance core moves right while its connector remains below the host zone;
- current capability, bridge and future target panels move right of the host silhouette.

## Editorial sync correction

Each frame now exposes `data-homepage-segment-id`.

For object-dominant segments, lower-third chrome remains structurally present but competing lower-third headline, summary and meta copy are suppressed. The small kicker remains, preserving stable NEWS 5.0 chrome without asking the viewer to process two different assertions at once.

Covered object-dominant segments:

- `edebatte-source-questions`
- `edebatte-media-forensics`
- `edebatte-product-model`
- `edebatte-current-offer`
- `vog-program-not-contract`
- `vog-demophobie`
- `vog-current-offer`

## Render identity

`data-pilot-version="homepage-reference-v3-2-geometry-sync"`

## Unchanged gates

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- no homepage integration
- no Ready-for-Review transition
- no merge
- no deployment
- no publishing

A fresh private Node-20 D1 render from the exact branch head is required after CI before any human acceptance decision.
