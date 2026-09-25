# VOXY-HOMEPAGE-REFERENCE-FILMS-01 · Surgical V3.1 · 2026-08-19

Status: `review`

## Human review input

The Node-20 private V3 render from exact head
`05b470b37822a2df327148b37f1e7a64b4124ada` passed technically, but human
visual review did not yet accept the two homepage films as the final reference.

The review confirmed two hard corrections as successful:

- VoiceOpenGov evergreen/election isolation: passed visually;
- visible jacket lapel pin `VOG`: passed visually.

Two remaining visual gates stayed open:

- host face-safe staging was not hard enough because the eDebatte synthesis
  connector still crossed Voxy's face;
- FOCUS/EXPLAIN could still present too many simultaneous assertions, including
  a lower-third selector that did not reliably apply because the V3 renderer
  injected a second `class` attribute.

## Surgical V3.1 correction

This pass does not redesign the films. It tightens the accepted Object Story
language.

### Shared NEWS 5.0 staging

- the duplicate-class injection is removed;
- V3.1 is keyed by `data-pilot-version="homepage-reference-v3-1-surgical"`;
- FOCUS/EXPLAIN lower thirds reduce to kicker + headline, hiding summary/meta;
- the active evidence object becomes a compact evidence tag rather than a
  second large card;
- the host corridor remains `x610-900:y150-520` and is now marked as a hard
  no-lines/no-large-objects policy;
- release gates remain unchanged and fail closed.

### eDebatte

- headline and `STOPP` are revealed sequentially instead of simultaneously;
- headline → primary-source pull becomes a staged claim/link/source sequence;
- number, quote and study are inspected one after another;
- source vs interpretation appears only after those inspections;
- synthesis connectors are rerouted to left/right lanes outside the host face
  corridor;
- resolution copy remains on the right side of the host.

### VoiceOpenGov

- programme, the non-equivalence gap, and formal-decision status are revealed in
  separate temporal phases;
- `Demophobie` source, design question and democratic guardrails are revealed in
  separate phases;
- current capability, transition and future target are no longer stacked at the
  same moment;
- the balance connector is routed below the face-safe corridor;
- evergreen evidence remains `Stimme → Folge → Wirkung` and no election source
  is reintroduced.

## Contract coverage

Updated focused contracts lock:

- sequential eDebatte forensic objects;
- compact active evidence and hard face-safe routes;
- sequential VOG programme/gap/decision grammar;
- sequential Demophobie source/question/guardrails grammar;
- current-capability vs future-target separation in time;
- removal of the duplicate-class selector bug;
- existing evergreen isolation, VOG pin and release gates.

## Required next evidence

A new exact-head private Node-20 render of both MP4s is required after CI. Human
visual acceptance remains decisive.

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- no Ready-for-Review transition
- no merge
- no deployment
- no publishing
