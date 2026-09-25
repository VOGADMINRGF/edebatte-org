# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — Journey Semantic Sync V3.10.1

Datum: 2026-08-21
Implementierungs- und Preview-Head: `3f417f36dda9987cdb28398e5ef801c3fe6cdb06`
Branch: `pr/voxy-homepage-reference-films-01`
Draft-PR: `#624`

## Ergebnis und Grenze

V3.10.1 korrigiert ausschließlich die semantische Synchronität der bestehenden VoiceOpenGov-Journey. Story, D1, Voxy, NEWS-5-Canon, Layoutarchitektur und V3.10-Lesbarkeitsregeln bleiben unverändert. Es gibt keine Homepage-Integration, kein Publishing, keinen Produktions-Deploy und keinen vollständigen D1-Render.

Der menschlich gefundene Blocker war im realen V3.10-Prozessbild sichtbar: Die primäre Social-Prozesskarte zeigte `VORHER = VERHANDLUNG`, `AKTUELL = BESCHLUSS`, `DANACH = UMSETZUNG`, während die globale Journey unmittelbar darunter `PROGRAMM` hervorhob. Ursache waren zwei voneinander unabhängige Fortschrittsableitungen: Der Primärprozess folgte dem Segment, die globale Navigation dem generischen Filmfortschritt.

V3.10.1 verwendet deshalb einen einzigen exportierten und testbaren Resolver `resolveVogJourneyStage(plan, at)`. Er leitet den Viewer-Zustand aus Segment und bestehender lesbarer Phase ab und wird unabhängig vom Layoutprofil gemeinsam verwendet. `filmProgress()` steuert keine sichtbare Journey-Stufe mehr.

## Semantischer Vertrag

Die kanonische Reihenfolge bleibt:

`PROGRAMM → VERHANDLUNG → BESCHLUSS → UMSETZUNG → WIRKUNG → RÜCKKOPPLUNG`

Zusätzlich bezeichnet `origin` den Ausgangspunkt `DEINE STIMME`, ohne einen erfundenen Prozessfortschritt.

- `vog-greeting` sowie optionale Wahlfenster-Einstiege bleiben bei `origin`.
- `vog-after-election` verwendet die bestehende lesbare Prozessphase. Dieselbe Auflösung steuert die primäre `AKTUELL`-Karte und die globale Journey.
- `vog-program-not-contract` hält Versprechen und Übergang bei `PROGRAMM`; erst die explizite Entscheidungsphase wechselt zu `BESCHLUSS`.
- `vog-demophobie` und `vog-participation-balance` halten den letzten ausdrücklich eingeführten Zustand `BESCHLUSS`; bloßer Zeitablauf erzeugt keine Umsetzung oder Wirkung.
- `vog-current-offer` hält ebenfalls `BESCHLUSS`. Die Future-Intent-Szene darf `WIRKUNG` als Zielbild besprechen, markiert sie aber nicht als erreichte aktuelle Fähigkeit.
- `vog-synthesis` hält den letzten begründeten Zustand. `vog-cta` setzt keine aktive Stufenbezeichnung und bleibt stark beruhigt.

Viewer-Metadaten tragen `data-journey-semantic-sync="v3-10-1"`; VoiceOpenGov-Root, Szene und Navigation weisen denselben `data-journey-semantic-stage` aus. Das Preview-Manifest verwendet `schemaVersion = voxy-homepage-multiformat-preview-v3-10-1` und `journeySemanticSync = v3-10-1`.

## Layoutverhalten

9:16 und 4:5 behalten Ursprung, sechs Fortschrittspunkte und genau eine lesbare aktive Bezeichnung. Im repräsentativen Prozessmoment stimmen `AKTUELL = BESCHLUSS` und die globale aktive Bezeichnung `BESCHLUSS` überein.

1:1 behält `VORHER → AKTUELL → DANACH` als Primärobjekt. Nur während `vog-after-election` wird die globale Journey zusätzlich von `0.34` auf `0.18` Opazität beruhigt. Dadurch bleibt die Orientierung vorhanden, konkurriert aber deutlich weniger mit Mikrofon und Prozesskarten. Geometrie und akzeptierte 16:9-Komposition wurden nicht neu gestaltet.

Der finale CTA enthält kein Element mit `data-active-stage-label` und meldet für die mobile aktive Stufenbezeichnung den sichtbaren Zähler `0`.

## Vertrags- und CI-Evidenz

Neu ist `apps/web/tests/voxy-homepage-journey-semantic-sync-v3-10-1.contract.test.ts`. Der Vertrag prüft deterministische Auflösung, Prozess-/Journey-Gleichheit an repräsentativen Frames, Programm- und Beschlussphasen, den zeitunabhängigen semantischen Hold, fail-closed Future Intent, den stillen CTA, profilidentische Semantik und geschlossene Release-Gates. Drei ältere V3.7–V3.9-Assertions wurden von generischem Spätfortschritt auf den expliziten Current-Offer-Hold `BESCHLUSS` harmonisiert.

Lokal auf `3f417f36dda9987cdb28398e5ef801c3fe6cdb06`:

```text
pnpm exec vitest run tests/voxy-homepage-*.test.ts
12 Testdateien, 110 Tests: PASS

pnpm --dir apps/web run typecheck
PASS

pnpm --dir apps/web exec eslint --config eslint.config.js <7 fokussierte TypeScript-Dateien>
PASS

git diff --check
PASS
```

Die lokale Laufzeit meldete Node `v25.9.0`, während das Paket Node `20.x` deklariert. Tests, Typecheck, ESLint und Preview-Renderer liefen erfolgreich; der CI-Lauf verwendete Node 20.

Exact-Head-CI auf demselben Implementierungs- und Preview-Head:

- Web CI Run `32505613073`: Contracts, Security und Quality/Build `SUCCESS`
- Voxy first-party voice clone evidence Run `32505613056`: `SUCCESS`
- Voxy Mouth Canon and Motion v4 evidence Run `32505613179`: `SUCCESS`
- Voxy Mouth v4.1 and Motion v4.1 evidence Run `32505613125`: `SUCCESS`
- Voxy local TTS gate and voiced explainer v1 evidence Run `32505613063`: `SUCCESS`
- bestehende Vercel-PR-Preview-Checks: `SUCCESS`; kein manueller oder Produktions-Deploy wurde ausgelöst

## Private Preview-Evidenz

Erst nach vollständig grünem Exact-Head-CI wurde ausschließlich der Multiformat-Preview-Renderer ausgeführt:

`/Users/RF/Arbeitsmappe/private-assets/voxy/previews/voxy-homepage-v3-10-1-3f417f36`

Der Satz enthält 56 repräsentative Frames, acht Kontaktbögen und ein Manifest. Technisch gesichtet wurden bei VoiceOpenGov `process`, `programme-decision`, `democratic-guardrails`, `current-offer-next-step` und `final-cta` in 9:16, 4:5 und 1:1 sowie die 16:9-Regressions-Kontaktfläche. Die eDebatte-Regression ist vollständig unverändert: alle 32 eDebatte-PNGs sind byte-identisch zur privaten V3.10-Evidenz. Die VOG-16:9-Evidenz wahrt die bestehende Komposition; semantische Zustände wurden auftragsgemäß korrigiert.

Diese technische Sichtung ist ausdrücklich kein Human Visual PASS.

## Offene menschliche Gates

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- `homepageIntegrationIncluded = false`

PR `#624` bleibt offen, Draft und ungemergt. Kein Merge, kein Ready-for-Review, kein Upload, kein Publishing und keine Homepage-Integration sind Teil von V3.10.1. Der nächste menschliche Schritt ist ausschließlich die Sichtung der privaten V3.10.1-Multiformat-Previews.
