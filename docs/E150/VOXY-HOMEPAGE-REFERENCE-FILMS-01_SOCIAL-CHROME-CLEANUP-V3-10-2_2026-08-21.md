# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — Social Chrome Cleanup V3.10.2

Datum: 2026-08-21
Implementierungs- und Preview-Head: `42e671ac9dcd664e39a172bf4e3b30edeeaa0bc2`
Branch: `pr/voxy-homepage-reference-films-01`
Draft-PR: `#624`

## Ergebnis und Grenze

V3.10.2 entfernt ausschließlich ein inhaltsleeres, geerbtes Portrait-Chrome aus `feed_4_5` und `vertical_9_16`. Story, Text, D1, Voxy-Skalierung, Captions, Typografie, Evidence-Geometrie, VoiceOpenGov-Prozesskarten und -Guardrails, CTA-Kompositionen, eDebatte-Prüfpfad, V3.10-Mobile-Layouts, V3.10.1-Semantik und 16:9-Komposition bleiben unverändert. Es gibt keinen vollständigen Film-Render, keine Homepage-Integration, kein Publishing und keinen Produktions-Deploy.

## Exakte Ursache und Korrektur

Der bestehende Motion-v4-Basisrenderer erzeugt für jedes Portraitformat außerhalb von `.master` diesen Wrapper:

```html
<div class="portrait-title"><strong></strong><small></small></div>
```

Die Homepage übergibt die geerbten Editorial-Felder bewusst leer. Die Basis-CSS schaltet `.portrait-title` in Portraitformaten dennoch auf `display:block` und positioniert es mit `top:38px`, dunklem Hintergrund und cyanfarbener linker Kante. Damit entstand exakt der leere obere Balken. Die bereits vorhandenen Social-Regeln für `.master .broadcast-chrome` und `.master .on-air` konnten ihn nicht erreichen, weil `.portrait-title` ein direktes Kind von `.viewport` außerhalb von `.master` ist.

Die Korrektur blendet deshalb ausschließlich den leeren direkten Wrapper in `feed_4_5` und `vertical_9_16` aus:

```css
[data-layout-profile="feed_4_5"]>.portrait-title{display:none!important}
[data-layout-profile="vertical_9_16"]>.portrait-title{display:none!important}
```

Es gibt kein Cropping und keine Verschiebung der Marken-, Presenter-, Evidence-, Navigations- oder Caption-Regionen. Die bestehende konservative Top-Safe-Area bleibt unverändert. Der Root trägt zusätzlich `data-social-chrome-cleanup="v3-10-2"`.

## Regression und Verträge

Neu ist `apps/web/tests/voxy-homepage-social-chrome-cleanup-v3-10-2.contract.test.ts`. Der Vertrag prüft beide Filme und beide Zielprofile, den exakten leeren DOM-Verursacher und seine profilgebundene Deaktivierung, Brand- und Caption-Geometrie innerhalb der Safe Area, Zwei-Zeilen-Caption-Metadaten, V3.10.1-Prozess-/Journey-Gleichheit, die Nichtanwendung auf Square und Landscape sowie alle geschlossenen Release-Gates.

Lokal auf `42e671ac9dcd664e39a172bf4e3b30edeeaa0bc2`:

```text
pnpm exec vitest run tests/voxy-homepage-*.test.ts
13 Testdateien, 117 Tests: PASS

pnpm run typecheck
PASS

pnpm exec eslint --config eslint.config.js \
  src/features/voxyVideo/homepageReferenceFilmsHtml.ts \
  scripts/render-voxy-homepage-multiformat-previews.ts \
  tests/voxy-homepage-social-chrome-cleanup-v3-10-2.contract.test.ts
PASS

git diff --check
PASS
```

Die lokale Laufzeit meldete Node `v25.9.0`, während das Paket Node `20.x` deklariert. Tests, Typecheck, ESLint und Preview-Renderer liefen erfolgreich; die Exact-Head-CI verwendet Node 20.

## Private Preview-Evidenz

Der Renderer unterstützt für diese Abnahme den fokussierten Satz `--review-set=social-chrome-v3-10-2`. Es wurde kein vollständiger Film erzeugt. Der revisionsgebundene private Pfad lautet:

`/Users/RF/Arbeitsmappe/private-assets/voxy/previews/voxy-homepage-v3-10-2-42e671ac`

Das Manifest bindet den Satz an Exact Head `42e671ac9dcd664e39a172bf4e3b30edeeaa0bc2`, verwendet `schemaVersion = voxy-homepage-social-chrome-cleanup-preview-v3-10-2` und hält alle Release-Gates geschlossen. Enthalten sind genau die elf angeforderten Review-Frames sowie sechs daraus zusammengesetzte Kontaktbögen:

- VoiceOpenGov 9:16: Opening, Process, Final CTA
- VoiceOpenGov 4:5: Opening, Process
- eDebatte 9:16: Opening, Evidence Path, Final CTA
- eDebatte 4:5: Opening
- Regression: ein VoiceOpenGov-Square-Prozessframe und ein VoiceOpenGov-Landscape-Prozessframe

Die technische Sichtung bestätigt: In allen neun Zielprofil-Frames fehlt der leere UI-Balken; Marken- und Caption-Komposition bleiben in ihren Safe Areas. Die beiden Regressionsframes sind byte-identisch zur privaten V3.10.1-Evidenz:

- Square Process: `b06e1aec0e66e8067d2bed3feb65a48b4d276eadef8076cfbaabac917190e8c1`
- Landscape Process: `a5348957d7093a069c4d6b4974740a612113ad282bbe22ccc4951cfb37a47de0`
- Preview-Manifest: `5275cfa8bed21fd245db34309af87bbb776cca26ffaac2304823585a0a103036`

Diese technische Sichtung ist ausdrücklich kein Human Visual PASS.

## Exact-Head-CI

Alle neun PR-Checks auf Implementierungs- und Preview-Head `42e671ac9dcd664e39a172bf4e3b30edeeaa0bc2` sind erfolgreich:

- Web CI Run `32513210086`: Contracts, Security und Quality/Build `SUCCESS`
- Voxy first-party voice clone evidence Run `32513210028`: `SUCCESS`
- Voxy Mouth Canon and Motion v4 evidence Run `32513210005`: `SUCCESS`
- Voxy Mouth v4.1 and Motion v4.1 evidence Run `32513209983`: `SUCCESS`
- Voxy local TTS gate and voiced explainer v1 evidence Run `32513210084`: `SUCCESS`
- bestehende Vercel-PR-Preview-Checks: `SUCCESS`; kein manueller oder Produktions-Deploy wurde ausgelöst

## Offene menschliche Gates

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- `homepageIntegrationIncluded = false`

PR `#624` bleibt offen, Draft und ungemergt. Kein Merge, kein Ready-for-Review, kein Upload, kein Publishing und keine Homepage-Integration sind Teil von V3.10.2.

Der nächste menschliche Schritt ist ausschließlich der finale V3.10.2-Preview-Spot-Check vor dem vollständigen Multi-Format-D1-Render.
