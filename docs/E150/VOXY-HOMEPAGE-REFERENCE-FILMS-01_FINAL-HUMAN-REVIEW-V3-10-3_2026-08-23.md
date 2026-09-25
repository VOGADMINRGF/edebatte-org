# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — V3.10.3 FINAL HUMAN REVIEW

Datum: 2026-08-23  
Render-Head: `384f6aa3cde9548ca7bb9fc503a27433faa9aed8`  
Branch: `pr/voxy-homepage-reference-films-01`  
Draft-PR: `#624`

## Ergebnis und Grenze

Dieser Closing-Pass erzeugt den letzten privaten 9:16-Human-Review-Kandidaten des bestehenden V3.10.3-Canons. Er schließt ausschließlich die drei vereinbarten Punkte D1-Aussprache `Weg`, eDebatte-Primary-Source-Card und VoiceOpenGov-Participation-Geometrie. Story, sichtbarer Text, D1 Voice Identity, NEWS-5.0-Grammatik, Character, VOG-Pin, eDebatte-Mark, Quellen, `BELEGEN`-Beam, Research Trace und Release-Grenzen bleiben erhalten.

Es gab kein Auto-Publish, Social Posting, Homepage-Integration, Produktions-Deployment oder Merge. W1 bleibt geparkt. Die MP4s bleiben privat außerhalb des Repositories. Die automatische CI des bestehenden Draft-PRs erzeugte ausschließlich ihren normalen Vercel-PR-Preview; es wurde kein manueller oder produktiver Deploy ausgelöst.

`humanHomepageFilmAcceptance`, `humanNews5VisualAcceptance` und die menschliche Hörabnahme des erzeugten `/veːk/` bleiben bis zur Final Acceptance `pending`. Der Kandidat ist für diese menschliche Schlussabnahme vorbereitet, nicht bereits angenommen.

## D1-Aussprache `Weg`

### Ursache

Die fehlerhafte Ausgabe entstand im graphembasierten Chatterbox-TTS-Frontend: Die direkte deutsche Schreibweise `Weg` wurde ohne einen separaten Aussprachehinweis kontextuell nicht zuverlässig als Substantiv mit langem Vokal `/veːk/` realisiert. Sichtbarer Text war nicht die Ursache und darf deshalb nicht phonetisch verfremdet werden.

### Technische Korrektur

Der sichtbare und untertitelte Satz bleibt:

`… dass du den Weg zurück zum Beleg sehen kannst.`

Nur `spokenText` im Voice-/Pronunciation-Layer verwendet:

`… dass du den Weeg zurück zum Beleg sehen kannst.`

Damit wird ausschließlich die Synthese auf den langen Vokal `/veːk/` gesteuert. Der gesprochene Inhalt bleibt semantisch identisch. D1 bleibt `voxy-d1-conversational-dynamic-pr621`, Reference 02 und die akzeptierte D1-Evidence bleiben unverändert; es gibt weder W1 noch Fallback.

Vor dem Full-Render wurde ein frischer isolierter Offline-D1-Proof erzeugt:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20/audio-review/edebatte-product-model-weg-long-vowel-preflight.wav`

- SHA-256: `303dd327f54b31314228cf9353e6c3ff6fee069d2469011b24453509e715674b`
- PCM S16LE, 48 kHz, mono, `9,160 s`
- D1-Binding, Offline-/Watermark- und Reference-Hash-Gates: PASS
- kein Dynamic Normalizing, Compressor, Limiter, EQ, Pitching, Tempo-/Time-Stretch, Reverb oder Clipping

Der maßgebliche Proof wurde anschließend direkt aus `32,680–42,880 s` des finalen eDebatte-Master-Audios extrahiert:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20/audio-review/edebatte-product-model-weg-long-vowel-final-master.wav`

- SHA-256: `f2ecab8e5201839ae0bdd9c831152defe54502432741d8f652566720b28894bf`
- PCM S16LE, 48 kHz, mono, `10,200 s`
- bytegleich mit `audio-preservation.json -> edebatte-product-model.outputSha256`
- `pcmIdentityPreservedInAssembly = true`
- VTT/SRT enthalten `den Weg zurück zum Beleg`; `Weeg` kommt in keinem Caption-File vor

Die technische Bindung des Langvokal-Alias an den tatsächlich verwendeten Master ist damit belegt. Die Plattform konnte die private Audiodatei nicht selbst auditiv abspielen; die menschliche Natürlichkeitsprüfung bleibt daher bewusst das offene Final-Acceptance-Gate.

## eDebatte-Primary-Source-Card

Die V3.6-Korrektur ist in beiden echten 9:16-Full-MP4-Zuständen sichtbar:

- Source Pull / Primary Source: geprüft bei `20,200 s` und im stabilen Endzustand bei `22,800 s`
- Source Resolution: geprüft im stabilen Endzustand bei `31,000 s`
- 9:16-Kartengeometrie innerhalb der Evidence Lane: `left:40 px`, `top:16 px`, `width:820 px`, `min-height:193 px`
- kein Kontakt und keine optische Berührung mit Tischmikrofon, Voxy, Gesicht, Torso oder Händen
- vollständig lesbare Karte ohne abgeschnittenen Text
- bestehende V3.5-/V3.6-Regeln für `BELEGEN`-Beam und Research Trace unverändert

Direkt aus dem finalen MP4 extrahierte Abnahmeframes liegen unter:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20/final-review-frames/`

## VoiceOpenGov `WIRKSAME MITBESTIMMUNG`

Die beschlossene V3.6-Komposition ist im echten 9:16-Full-MP4 sichtbar:

- Participation Core: exakt `220×168 px`
- V3.6-Positionierung gegenüber V3.5 erhalten
- sichtbare dominante Aussage: `WIRKSAME MITBESTIMMUNG`
- beide Extreme als `102 px` breite, auf `opacity:.28` beruhigte Karten sichtbar
- klarer Abstand zu Tischmikrofon, Presenter, Gesicht und Händen
- Presenter-/Face-Safe-Zonen eingehalten

Der MP4-Abnahmeframe wurde bei `37,500 s` extrahiert:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20/final-review-frames/vog-participation-final-mp4.png`

## Private 9:16-Full-MP4s

Revisionsgebundener privater Root:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20`

### eDebatte

- Datei: `edebatte/vertical_9_16/voxy-edebatte-homepage-reference-v1.mp4`
- absoluter Pfad: `/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20/edebatte/vertical_9_16/voxy-edebatte-homepage-reference-v1.mp4`
- `1080×1920`, H.264, `24 fps`, AAC 48 kHz mono
- Dauer: `69,310 s`
- SHA-256: `f9b39b62cf7d637f4a493d709995571a9d9c135178f87b508fd00bee70cb4708`
- Renderstatus: `TECHNICAL_PASS`

### VoiceOpenGov

- Datei: `voiceopengov/vertical_9_16/voxy-voiceopengov-homepage-reference-v1.mp4`
- absoluter Pfad: `/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20/voiceopengov/vertical_9_16/voxy-voiceopengov-homepage-reference-v1.mp4`
- `1080×1920`, H.264, `24 fps`, AAC 48 kHz mono
- Dauer: `66,900 s`
- SHA-256: `e275d21b2e6f5b3e07cf33aec8e438205e6273e8063c8378056f43fec8683465`
- Renderstatus: `TECHNICAL_PASS`

Beide Manifeste binden Exact Head `384f6aa3cde9548ca7bb9fc503a27433faa9aed8`, D1 `voxy-d1-conversational-dynamic-pr621`, `audioPreservationGate = passed`, `sourceIntegrityGate = passed`, `evidenceIntegrityGate = passed`, `contextIsolationGate = passed`, `motionIntegrityGate = passed`, `visualCanonGate = passed`, `productionEligible = false` und `autoPublish = false`.

## Format-, Timing- und Regressionsabnahme

Der Full-Render lief unter Node `v20.20.2` im echten Profil `vertical_9_16`; es wurde kein 16:9-Crop verwendet.

- störendes Portrait-Title-Chrome in 9:16 und 4:5 weiterhin entfernt
- keine abgeschnittenen Texte in den gesichteten Opening-, Source-, Participation-, Transition- und CTA-Frames
- profilgebundene 9:16-Safe-Area: `top 120`, `right 140`, `bottom 230`, `left 80`
- Caption-/Audio-Timeline identisch; sichtbare Captions bleiben Standardsprache
- minimale Visual-State-Dwell: eDebatte `4,159 s`, VoiceOpenGov `4,014 s`
- deterministisches State-Settle: `250 ms`; Mindest-Readable-Phase `2,0 s`
- CTA-Sprecher-Dwell: eDebatte `3,720 s`, VoiceOpenGov `4,160 s`; Schluss-Visual-State jeweils über `7 s`
- keine Quarter-Second-Flashes; die 24-fps-Master halten jedes deterministisch gerasterte Bild für zwei Frames
- Voxy-Character, VOG-Pin, eDebatte-Mark und NEWS-5.0-Grammatik ohne Regression

Exact-Head-Regression-Previews für 16:9, 1:1, 4:5 und 9:16 beider Filme:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-3-final-human-review-384f6aa3-node20/regression-previews`

- 56 Frames, acht Kontaktbögen
- Preview-Manifest SHA-256: `c56df5ddc360ccbb772be6f434d99b202cc403155c77602d8c07cee03a42445f`
- 16:9, 1:1 und 4:5 nur auf Regression geprüft; keine neue Layoutidee eingeführt

## Contracts, lokale Checks und CI

Auf Render-Head `384f6aa3cde9548ca7bb9fc503a27433faa9aed8`:

```text
22 relevante Homepage-/D1-/Voice-/Mouth-/Local-TTS-Vertragsdateien
184 Tests: PASS
pnpm -C apps/web run typecheck: PASS
ESLint auf allen vier geänderten TypeScript-Dateien: PASS
git diff --check: PASS
private 9:16 Full Render: TECHNICAL_PASS für beide Filme
```

PR `#624` bleibt offen und Draft. Alle neun Checks am Render-Head sind erfolgreich:

- Web CI Run `32633319834`: Contracts, Security und Quality `SUCCESS`
- First-party Voice Run `32633319796`: `SUCCESS`
- Local TTS Run `32633319799`: `SUCCESS`
- Mouth/Motion v4 Run `32633319844`: `SUCCESS`
- Mouth/Motion v4.1 Run `32633319790`: `SUCCESS`
- Vercel-PR-Preview und Preview Comments: `SUCCESS`

## Offene menschliche Gates

- privaten mastergebundenen Audio-Proof auf natürliche Aussprache `/veːk/` anhören
- beide 9:16-Full-MP4s in normaler Geschwindigkeit final sichten
- erst danach `humanHomepageFilmAcceptance` und `humanNews5VisualAcceptance` entscheiden
- kein Merge, Homepage-Integrations-, Batch-, Upload-, Deployment- oder Publishing-Schritt ohne diese menschliche Final Acceptance

Der V3.10.3-Closing-Kandidat ist technisch vollständig und für die Human Final Acceptance bereit. Er ist noch nicht menschlich akzeptiert und darf erst nach dieser Entscheidung als Grundlage der anschließenden `VOG-50-THEMES → EDEBATTE → VOXY`-Batch-Pipeline verwendet werden.
