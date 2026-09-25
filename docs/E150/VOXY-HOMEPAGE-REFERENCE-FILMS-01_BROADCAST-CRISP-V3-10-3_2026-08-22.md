# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — Broadcast Crisp V3.10.3

Datum: 2026-08-22  
Implementierungs-, Preview- und Render-Head: `68d00a13a144eb687a0c1b9606bee894a40b117c`  
Branch: `pr/voxy-homepage-reference-films-01`  
Draft-PR: `#624`

## Ergebnis und Grenze

V3.10.3 schließt den letzten eng begrenzten Lesbarkeits- und Aussprache-Follow-up im bestehenden Draft-PR. Die semantischen Merkkarten werden ausschließlich in `feed_4_5` und `vertical_9_16` größer, kontrastreicher und auf ganze Pixel gesetzt. Das 16:9-Primärquellenobjekt wird zu einer höheren, unskalierten Dokumentfläche. Für das deutsche Substantiv `Weg` verwendet nur die D1-Synthese eine Langvokal-Aliasform; sichtbarer Text und Untertitel behalten die korrekte Schreibweise `Weg`. Story, Produktversprechen, Prozesssemantik, Layoutverträge, D1-Stimme und öffentliche Markenpositionierung bleiben unverändert.

Es gibt keine Homepage-Integration, keinen Upload, kein Publishing, keinen Produktions-Deploy, keinen Merge und kein Ready-for-Review. Die technische Sichtung ist weder ein Human Visual PASS noch ein Human Audio PASS.

## Mobile Merkkarten

Die bisher 180 px breite Karte ist in beiden Portraitprofilen 200 px breit (`+11,1 %`). Neue Regeln sind profilgebunden; `square_1_1` behält die vorherige V3.10.2-Geometrie und -Darstellung.

| Profil | Geometrie | Innenabstand | Kicker / Titel / Meta | Abstand zum Untertitel |
| --- | --- | --- | --- | --- |
| 4:5 | `x=784`, `y=1000`, `200×116 px` | `12×18 px` | `16 / 20 / 16 px` | `4 px` |
| 9:16 | `x=740`, `y=1360`, `200×146 px` | `16×18 px` | `19 / 23 / 19 px` | `29 px` |

Beide Karten enden exakt an der konservativen rechten Safe-Area. Hintergrundopazität, Rahmen- und Textkontrast wurden erhöht; `filter`, `backdrop-filter`, `text-shadow` und `transform` sind im Zielprofil deaktiviert. Der 4:5-Spot-Check führte zu einer festen, browsergemessenen Höhe, damit der zweizeilige Titel und die kleine Meta-Zeile vollständig oberhalb des Untertitels bleiben. Der Root dokumentiert `data-broadcast-crisp-polish="v3-10-3"` und `data-mobile-card-rasterization="whole-pixel"`.

## 16:9-Primärquelle

Das Primärquellenobjekt ist in `landscape_16_9` jetzt `360×300 px` statt einer `430×250 px`-Fläche mit `scale(.72)`. Es rendert ohne fraktionale Skalierung, mit `23×24 px` Innenabstand, 12-/13-px-Dokumenttypografie, höheren Quellenzeilen, einer 42-px-Passage und stärkerem Dokumentkontrast. Die Regel ist auf 16:9 beschränkt; die mobile und quadratische Quellenkomposition wird nicht umgestaltet.

## D1-Aussprache und sichtbare Sprache

Der sichtbare Satz bleibt:

`… dass du den Weg zurück zum Beleg sehen kannst.`

Nur `spokenText` verwendet zur Synthesesteuerung:

`… dass du den Weeg zurück zum Beleg sehen kannst.`

Damit zielt D1 auf das Substantiv `Weg` mit langem Vokal `/veːk/`, nicht auf das Adverb `weg` `/vɛk/`. Die sichtbaren VOG-Texte `DER WEG GEHT WEITER` bleiben bytegetreu korrekt geschrieben. Vertragstests sichern die Trennung zwischen sichtbarer und gesprochener Form. Ob der erzeugte Kandidat die gewünschte Aussprache menschlich überzeugend trifft, bleibt ausdrücklich im offenen Human-Audio-Gate.

## Lokale Verträge

Auf `68d00a13a144eb687a0c1b9606bee894a40b117c`:

```text
14 VOXY-Homepage-Vertragsdateien, 123 Tests: PASS
pnpm -C apps/web run typecheck: PASS
ESLint auf den vier fokussierten TypeScript-Dateien: PASS
git diff --check: PASS
```

Neu ist `apps/web/tests/voxy-homepage-broadcast-crisp-v3-10-3.contract.test.ts`. Der Vertrag prüft ganze Portraitpixel, `+11,1 %` Kartenbreite, Safe-Area- und Caption-Abstände, die größere Drei-Ebenen-Typografie, den unveränderten Square-Vertrag, das unskalierte 16:9-Dokument, sichtbare Standardorthografie, die spoken-only Aliasform und alle geschlossenen Release-Gates.

Tests, Typecheck, ESLint und der fokussierte Preview-Renderer liefen lokal unter Node `v25.9.0`; das Paket deklariert Node `20.x`. Der vollständige private Film-Render und die Exact-Head-CI liefen unter Node 20.

## Private Preview-Evidenz

Revisionsgebundener Pfad:

`/Users/RF/Arbeitsmappe/private-assets/voxy/previews/voxy-homepage-v3-10-3-68d00a13`

Das Manifest verwendet `schemaVersion = voxy-homepage-broadcast-crisp-preview-v3-10-3`, bindet Exact Head `68d00a13a144eb687a0c1b9606bee894a40b117c` und enthält sieben gezielte Review-Frames plus sieben Kontaktbögen:

- VoiceOpenGov: Process in 9:16 und 4:5
- eDebatte: Evidence Path in 9:16 und 4:5
- eDebatte: Primary Source in 16:9
- Regression: eDebatte Primary Source in 1:1 und VoiceOpenGov Process in 16:9

Die technische Sichtung und vergrößerte Kartenausschnitte bestätigen vollständig sichtbare Kicker-, Titel- und Meta-Zeilen sowie die dokumentierten Untertitelabstände. Das neue 16:9-Dokument ist höher, kontrastreicher und ohne fraktionale Skalierung lesbar. Die nicht adressierten Kontrollframes sind pixelidentisch:

- eDebatte 1:1 Primary Source gegenüber V3.10.1: `7be06e4da7457cb5cb32a08f6b8f30420643706867f0fb5f14b8d72d6bea1560`
- VoiceOpenGov 16:9 Process gegenüber V3.10.2: `a5348957d7093a069c4d6b4974740a612113ad282bbe22ccc4951cfb37a47de0`
- Preview-Manifest: `3f29d717e7aa71b0b53b510c57fa950ef940f936b64516b08aef3918011c79d4`

Diese technische Sichtung ist ausdrücklich kein Human Visual PASS.

## Private D1-Render- und Audio-Evidenz

Der vollständige 16:9-D1-Render wurde unter Node `v20.19.0` aus demselben Exact Head erzeugt:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-68d00a13-node20`

- eDebatte: `69,310 s`, 1.664 Frames, `TECHNICAL_PASS`
- VoiceOpenGov: `66,900 s`, 1.606 Frames, `TECHNICAL_PASS`
- beide `audio-preservation.json`: `gate = passed`, D1 für jedes gesprochene Segment, kein W1/Fallback, keine Dynamik-, EQ-, Pitch-, Tempo-, Time-Stretch-, Reverb- oder Limiter-Veränderung, PCM-Identität in der Assembly erhalten
- eDebatte Master-Audio: `7f63aa0598d54052024782a1364cff91500088e24eeca5c48d5c561d1e59dd0e`
- eDebatte MP4: `93e942e9e3182d0a55193c2574d276da6ee319387d121dfe61f2c49ec26a9097`

Gezielter Hörpfad für das Segment `edebatte-product-model` (`32,68–42,88 s`, PCM S16LE, 48 kHz, mono):

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-68d00a13-node20/audio-review/edebatte-product-model-weg-long-vowel-review.wav`

SHA-256: `f2ecab8e5201839ae0bdd9c831152defe54502432741d8f652566720b28894bf`

Dieser Pfad ist ein privater Hörkandidat, kein Human Audio PASS.

## Exact-Head-CI

Alle neun PR-Checks auf Implementierungs-, Preview- und Render-Head `68d00a13a144eb687a0c1b9606bee894a40b117c` sind erfolgreich:

- Web CI Run `32568553441`: Contracts, Security und Quality `SUCCESS`
- Voxy first-party voice clone evidence Run `32568553452`: `SUCCESS`
- Voxy Mouth Canon and Motion v4 evidence Run `32568553434`: `SUCCESS`
- Voxy Mouth v4.1 and Motion v4.1 evidence Run `32568553447`: `SUCCESS`
- Voxy local TTS gate and voiced explainer v1 evidence Run `32568553435`: `SUCCESS`
- Vercel-PR-Preview und Preview Comments: `SUCCESS`; kein manueller oder Produktions-Deploy wurde ausgelöst

## Offene menschliche Gates

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- Human Audio Review für `/veːk/ = pending`
- `productionEligible = false`
- `autoPublish = false`
- `homepageIntegrationIncluded = false`

PR `#624` bleibt offen, Draft, mergeable/CLEAN und ungemergt. Der nächste menschliche Schritt ist ausschließlich die private Sichtung der V3.10.3-Preview-Evidenz und das Anhören des extrahierten Aussprachesegments.
