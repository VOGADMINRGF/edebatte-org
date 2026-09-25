# VOXY Homepage Reference Films · Narrative Navigation V3.8

Date: 2026-08-20
Task: `VOXY-HOMEPAGE-REFERENCE-FILMS-01`
Status: private review slice only; human acceptance pending

## Why this pass exists

V3.7 fixed the large editorial-clarity defects: the VoiceOpenGov title hierarchy moved left, the journey loop moved below the display lane, burned-in muted-first Voxy subtitles returned, and named research references were removed from the public VoiceOpenGov story.

The remaining gap was not technical correctness. The films still carried too much internal product language and some scenes behaved like diagrams rather than television storytelling. V3.8 is therefore a narrative-navigation and editorial-simplification pass. It does not add new product claims, sources, voices or release permissions.

## VoiceOpenGov changes

- The persistent left brand hierarchy now carries one plain-language lead question: `Was passiert mit deiner Stimme nach der Wahl?`
- The bottom-right journey object remains the `DER WEG GEHT WEITER` carousel around `DEINE STIMME`, but its node labels are enlarged and the active node remains deterministic from timeline progress.
- The opening adds a quiet lead-question card instead of adding another evidence object.
- The process token changes visibly from `MANDAT?` to the simpler `FOLGE?`; the old label is retained only as non-visible compatibility metadata.
- Viewer-facing current/future language is simplified:
  - `HEUTE · CURRENT CAPABILITY` becomes visible `HEUTE`.
  - `VON BETEILIGUNG ZU SUBSTANZ` becomes visible `DER NÄCHSTE SCHRITT`.
  - `ZIELBILD · NICHT ALS PRODUKTFUNKTION BEHAUPTET` becomes visible `ZIELBILD`.
  - The future state carries `data-product-status="future-intent-not-current-capability"`, so product-truth remains machine-verifiable without forcing internal taxonomy into the film.
- Participation Balance is simplified from a seminar-like comparison to the immediate question `WAS FOLGT AUS DEINER STIMME?`, with `NUR WÄHLEN?` and `ALLES DIREKT?` as deliberately secondary extremes.
- The final CTA lands on `DEINE STIMME IST MEHR ALS EIN KREUZ.` followed by `Mitmachen. Informiert bleiben.`
- Motion chrome is suppressed during greeting, synthesis and CTA breathing-room moments.

## eDebatte changes

- The left brand hierarchy keeps `eDebatte` + `PRÜFEN STATT GLAUBEN`, with the plain-language descriptor `Von der Behauptung zurück zum Beleg.`
- The final resolution no longer trades the strongest brand statement away for a second slogan. It keeps `DU SOLLST ES PRÜFEN KÖNNEN.` as the main assertion and uses `Lies die Schlagzeile. Dann geh einen Schritt weiter.` as the CTA line beneath it.
- Motion chrome and Evidence Memory are quieter during the final verification/CTA moments.
- Media-forensics geometry, source pull, evidence trace and the V3.4+ readability gates remain unchanged.

## Muted-first caption refinement

V3.7 burned each complete spoken segment into one caption block. That could produce three or more visual lines even when the overall subtitle system was technically stable.

V3.8 keeps the complete spoken segment in `data-full-subtitle` and in the existing VTT/SRT sidecars, but the burned-in on-screen caption now advances sentence-by-sentence according to deterministic segment progress.

The visible caption:

- is a semantic sentence cue, not word-by-word animation;
- is clamped to a maximum of two lines;
- keeps the previous-segment pause-hold behavior;
- does not use browser-time animation;
- retains the complete source text in metadata/sidecars for auditability.

## Compatibility and truth gates

Historical V3.4–V3.7 machine-contract labels that are no longer appropriate as public copy remain only as non-visible `data-contract-label` metadata where needed. This avoids using internal taxonomy as viewer-facing language while preserving continuity of the fail-closed checks.

No new claim is marketed as a current VoiceOpenGov capability. The future layer remains explicitly tagged `future-intent-not-current-capability`.

The public VoiceOpenGov story remains free of named research references and the removed book title.

## Focused contract

Added:

`apps/web/tests/voxy-homepage-narrative-navigation-v3-8.contract.test.ts`

It checks:

1. one plain-language VOG lead question;
2. deterministic journey navigation;
3. viewer-facing jargon reduction while truth metadata remains;
4. simplified participation framing;
5. sentence-level two-line caption cues with full-text preservation;
6. stronger VOG/eDebatte final landing and host breathing room;
7. release gates remain closed.

The older V3.4 readability and V3.7 editorial-clarity tests were updated only where V3.8 deliberately supersedes exact presentational values. Their underlying hard gates remain intact.

## Release state

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- `homepageIntegrationIncluded = false`

PR #624 must remain draft/open/unmerged. No deployment, publishing, Ready-for-Review transition or homepage integration is authorized by this pass.

A fresh private Node-20 D1 render from the exact V3.8 head is required after CI. Human review should include normal-speed viewing plus muted viewing, with special attention to subtitle line breaks, the left brand hierarchy, the VOG bottom-right journey carousel, Participation Balance, and both final CTA landings.
