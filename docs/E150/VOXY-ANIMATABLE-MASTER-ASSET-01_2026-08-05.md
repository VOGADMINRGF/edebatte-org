# VOXY-ANIMATABLE-MASTER-ASSET-01

Stand: 2026-08-17

## Verbindlicher visueller Review-Stand

Der technisch grüne Motion-Stand aus Exact Head
`7f0ad050e4079b823c3bb6c7b2ef5fc991b662cb` wurde menschlich visuell
abgelehnt. Die Detector-, Render- und Format-Evidence dieses Stands bleibt als
technischer Nachweis erhalten, ist aber keine akzeptierte Voxy-Identität und
keine Grundlage für weitere Animation oder Production.

Die anschließende menschliche Entscheidung akzeptiert am statischen Exact Head
`ecba53e4167a6382d16dc2dda25c2f162dab8162` A als Primary Master und C als
Editorial-/Anlass-Variante. B ist verworfen und kein Produktionskandidat. Die
Human Visual Acceptance des statischen Masters ist damit abgeschlossen und ein
kontrollierter Animationstest darf beginnen. Das ist keine Acceptance der
neuen Motion-Ausgabe und keine Production-Freigabe.

Der Slice bindet die vier menschlich freigegebenen Canon-Boards aus
`apps/web/public/brands/voxy/references/canon/` als unveränderte visuelle SSOT:

- `CANON-01-character-development-board.png` — Charakter-, Gesichts-,
  Anatomie- und Detailkontrolle,
  SHA256 `e58f4f5a6b23d8da6ccd81d979057f1b6f8ce8ae22eeba7032a2fb417a2c8bcc`;
- `CANON-02-character-overview-board.png` — Charakter-, Hand- und
  Ganzkörperkontrolle,
  SHA256 `e881e2c0e698f70eeb71ed78a021c5ef6bab8d37d52277e00a08e2f7ed9a8fe7`;
- `CANON-03-teal-broadcast-layout.png` — Studio-, Licht- und
  Broadcast-Kompositionskontrolle,
  SHA256 `479caf603da577009318beda49b4e0dc61f79c70e6bdb9fed820d448767aaded`;
- `CANON-04-blue-broadcast-layout.png` — identische Voxy-/Studio-Pixelquelle
  für Primary A und Editorial C sowie Studio-/Layoutkontrolle,
  SHA256 `8ec3927f2871b210f46468f56a2845811c89dbb971c11bf086de7446ac0efff8`.

Der lokale Renderer
`apps/web/scripts/render-voxy-static-canon-recovery.ts` erzeugt unter
`artifacts/voxy-static-canon-final/` zwei statische 16:9-Master in 1920 × 1080,
einen optionalen Clean Master und eine 3200 × 1800 große Vergleichstafel:

- `primary-a-final.png` — ausgewählter Primary Master A;
- `primary-a-clean.png` — derselbe Primary Master ohne redaktionellen
  Beispielinhalt;
- `editorial-c-final.png` — ausgewählte Editorial-/Anlass-Variante C;
- `canon-comparison-final.png` — A final, C final und alle vier Canon-Boards;
- `manifest.json` — Exact Head, sämtliche Input-/Output-SHA256, Dimensionen,
  Produktionsmethode, Auswahl, Abweichungen und Freigabegrenzen.

A und C verwenden exakt dieselbe abgeflachte CANON-04-Voxy-/Studio-Pixelquelle,
dieselbe Kamera, Licht-, Marken-, Typografie- und Materialbehandlung. Nur die
native Inhaltszonenarchitektur unterscheidet sich. Voxy ist größer und enger in
eine ruhigere Broadcast-/Editorial-Fläche integriert; generische Dashboard-
Cards, harte Maskenkanten und die frühere doppelte Waveform entfallen. Genau
eine statische Waveform bleibt hinter Voxy. Sie ist als künftig
audio-reaktionsfähig markiert, aktuell aber nicht audio-reaktiv; Audioanalyse ist
nicht Teil dieses Slices.

Der Lauf bleibt vollständig lokal, nutzt weder Generierung noch externen Dienst,
Upload oder SaaS und lädt sein Exact-Head-Artefakt für mindestens 14 Tage hoch.
Die statische A/C-Auswahl ist menschlich akzeptiert. Jede neue Motion-Ausgabe
beginnt erneut mit `humanVisualAcceptance = pending`; `productionEligible` und
`autoPublish` bleiben `false`.

## Erster kontrollierter Explainer aus Primary A

Der revisionsgebundene Renderer
`apps/web/scripts/render-voxy-first-explainer-video.ts` nutzt ausschließlich die
akzeptierte CANON-04-Pixelquelle und die etablierte Primary-A-Kamera. Er baut
weder das abgelehnte SVG-Rig noch einen neuen Charakter oder ein neues Studio.
VOG-Anstecknadel, eDebatte-Pocket-Markierung und blaue Paspel bleiben
unveränderte CANON-04-Rasterpixel. Es werden keine lokalen SVG-Marken mehr über
das bereits gebrandete Sakko gelegt. Die Pocket-Markierung bleibt genau eine
feine blau-türkise Wortmarke ohne Rahmen, Badge, Schild oder zweite Zeile. Der dauerhafte
Studio-Absender verwendet `VoiceOpenGov` primär und `eDebatte` sekundär;
`Vote4Gov` erscheint ausschließlich kontextuell. Diese Markenbelegung folgt der
menschlichen Branding-Entscheidung im Draft-PR #589 vom 15. August 2026.

Der Motion-v2-Clip ist 17 Sekunden lang, 1920 × 1080 Pixel groß, hat 24 fps und
408 Frames. Seine Timeline lautet:

- 0–3 s: Voxy stellt sich als digitaler Moderator vor;
- 3–6 s: Vote4Gov als Denk- und Reflexionsebene / Warum;
- 6–10 s: eDebatte als Instrument und Infrastruktur / Was;
- 10–14 s: VoiceOpenGov als Bewegung und Community / Wie;
- 14–17 s: Voxy hilft beim Überblick und kehrt visuell zur Ruhe zurück.

Die Einblendungen sind kompakte Broadcast-Hinweise statt großer Dashboard-
Cards. Voxy bleibt Hauptfigur. Der deutsche Erklärtext entspricht dem
verbindlichen Testtext aus dem Human-Review-Kommentar und enthält ausdrücklich
kein `Hallo Nachbarn`.

Die akzeptierte Quelle ist ein abgeflachtes Raster und besitzt keine getrennten
Kopf-, Arm- oder Handebenen. Um Identität und Anatomie nicht durch einen neuen
Masken-/Crop-Versuch zu beschädigen, beschränkt sich der kontrollierte Test auf
fünf sparsame lokale Blink-Overlays, eine quantisierte Blicklichtbewegung von
höchstens zwei Pixeln sowie weich eingeblendete Editorial-/Caption-Übergänge.
Die Blicklichtbewegung ist kein behauptetes unabhängiges Augen-Rig. Unabhängige
Kopfneigung, Oberkörperatmung und Arm-/Handgeste sind in diesem Master technisch
nicht belastbar möglich. Der dokumentiert verworfene Raster-Masken-/Crop-Pfad
wird nicht reaktiviert. Diese Abweichung wird im Manifest und für die erneute
menschliche Prüfung offen geführt.

Die Ausgabe unter `artifacts/voxy-first-explainer-video-v2/` enthält MP4, WebM,
Preview, fünf gebundene Standframes, zehn Hand-Crops, je fünf 9:16- und
1:1-Evidencebilder, Manifest sowie deutsche VTT- und SRT-Captions. Die
Untertitel sind zusätzlich eingebrannt. Genau eine statische Waveform bleibt
hinter Voxy.

PR #590 bleibt ein separater Draft und stellt noch kein lizenzsauberes lokales
TTS-Audioergebnis bereit. Der Clip enthält deshalb bewusst keine Audiospur; das
Manifest dokumentiert den fehlenden Voice-Baustein statt Audioerfolg zu
simulieren. Kein Provider, externer Upload oder SaaS-Pfad wird genutzt.

## #588-Cross-Check des Explainers

Der Renderer lädt den unveränderten Detector aus #588-Exact-Head
`0756ad48bfd61cf88696f91bc41da87e988020c0` direkt aus dem lokalen Git-Objekt
und bindet Detector-, License-Contract- und Profil-SHA256. Die gefalteten Hände
des akzeptierten Primary A sind keine getrennt sichtbaren Open Palms. Deshalb
kann dieser Detector die geforderte Sichtbarkeit von fünf Fingern pro Hand
nicht belastbar bestätigen. Alle zehn realen Standframe-Crops werden geprüft,
aber unabhängig von einem zufälligen Roh-Detektorergebnis als
`not_open_palm_clasped_hands` und `blocked_human_review_required` geführt.
Thresholds bleiben unverändert, es gibt keine QA-Ausnahme und niemals einen
statischen Fünf-Finger-Fallback. Die Negative-Fixtures des revisionsgebundenen
#588-Detectors bleiben unverändert fail-closed.

## Ergebnis des technischen Slices

Der nach der Betreiberentscheidung vom 14. August zugelassene neue Ansatz ist
als echtes lokales Vektor-Rig implementiert. Er nimmt keinen der verworfenen
Attempts 1–6 wieder auf:

- Rig: `voxy-stretchy-compatible-svg-rig`
- Version: `voxy-local-2d-rig-v1`
- Umsetzung: `native_svg_layer_pivot_rig`
- Asset: `apps/web/public/brands/voxy/characters/voxy-sitting-master.svg`
- kanonische Referenz:
  `apps/web/public/brand/voxy/voxy-podcast-stage.png`
- Runtime: lokales SVG/HTML/Playwright plus FFmpeg; kein Modell und keine
  Modellgewichte

Das Rig hat dokumentierte Controls und Pivots für Oberkörper, Kopf, Augen,
Blinzeln, Brauen, beide Arme und beide Hände. VOG-Pin und eDebatte-Markierung
bleiben eigene SVG-Gruppen innerhalb des starr bewegten Oberkörpers. Jede Hand
enthält fünf feste Digit-Nodes; der Renderer erzeugt keine neue Anatomie.

## Motion-Polish im bestehenden Rig

Die Charakteridentität, Kleidung, Markierungen, Grundproportionen und das
kanonische SVG wurden nicht neu aufgebaut oder verändert. Der typisierte
Motion-Vertrag `voxy-motion-polish-v2` verfeinert ausschließlich die vorhandenen
Pivots:

- Hand-Basisrotation von bisher `-74°/+74°` auf `-58°/+58°` reduziert und die
  Handgelenke um 12 px in die Ärmel geführt;
- Gestenausschläge gegenüber der ersten Fixture typischerweise um etwa
  15–25 % reduziert;
- rechte Hand als dominante Erklärungsgeste, linke Hand als dominante
  Kontrast- und Einladungsgeste; die jeweils andere Hand bleibt ruhig;
- Blick-/Kopfbewegung führt die verzögert einsetzende Armbewegung, anschließend
  erfolgt eine weiche Rückkehr in neutral statt Pose-Snapping;
- `smootherstep`-Easing, 720-ms-Gestenübergang, 780-ms-Oberkörperübergang und
  sehr kleine Atem-/Idle-Amplitude;
- zwei kurze Blinkfenster und zurückhaltend eingeblendete Aussagekarten.

Die feste Timeline bleibt `0–2 s neutral_idle`, `2–4 s explaining`,
`4–6 s showing_contrast` und `6–8 s inviting_participation`.

## Reproduzierbare Evidence

Der Exact-Head-Renderer
`apps/web/scripts/render-voxy-animatable-rig-evidence.ts` erzeugt:

- ein 8,000-s-MP4 und WebM in 1280 × 720, 24 fps und 192 Frames;
- vier revisionsgebundene Standframes pro Format in `16:9`, `9:16` und `1:1`;
- gerenderte Crops beider Hände für jeden Standframe;
- fünf gerenderte SVG-Digit-Center als landmark-äquivalente Evidence je Hand;
- pixelbasierte Hand-Präsenz- und Crop-Safe-Prüfung;
- SHA256 für beide Clips, Referenz, Rig, Motion-Profil, Standframes und
  Hand-Crops;
- Exact Head, Timeline, Renderparameter und die expliziten Zustände
  `humanVisualAcceptance = pending`, `productionEligible = false` und
  `autoPublish = false`.

Der Workflow `.github/workflows/voxy-animatable-rig-evidence.yml` rendert und
lädt dieses Verzeichnis als Exact-Head-Artefakt hoch. Der lokale Smoke ist keine
Selbstfreigabe und ersetzt den unabhängigen Detector-/200-%-Checkpoint aus
`#588` nicht.

## Gegenprüfung mit #588@0756ad48

Der unveränderte, vollständig lokale Detector
`voxy_raster_silhouette_hand_landmarker@2.0.0` mit Runtime
`pure-typescript-rgba-pca-v2` und Modellprofil
`voxy-rotation-normalized-open-palm-profile-v2` aus dem finalen #588-Exact-Head
`0756ad48bfd61cf88696f91bc41da87e988020c0` wurde gegen alle 24 echten
Hand-Crops der vier Gesten in `16:9`, `9:16` und `1:1` ausgeführt.
Profil-SHA256:
`75ae283ba8eea2e5637f2d9c373d333132086f99f5a6b7194dcbdb8a82b25f4c`.

- getestet: 24;
- erkannt/akzeptiert: 24;
- blockiert: 0;
- Fingerzahl: durchgehend 5;
- Confidence: durchgehend `1.0`;
- ermittelte Originalrotationen: `-70°` bis `+60°`;
- Rotationsnormalisierung: für alle 24 Crops angewendet;
- kein Threshold wurde abgesenkt und keine QA-Ausnahme ergänzt.

Die unveränderten #588-Vertragstests wurden direkt aus diesem Exact Head
ausgeführt: 25 Tests sind grün. Rotierte 4- und 6-Finger-Evidence,
unzureichende Confidence, Cropverlust, fehlende Hand und beschädigte Provenienz
bleiben fail-closed. Das technische Detector-Gate ist damit für diese Fixture
erfüllt; die menschliche visuelle Abnahme bleibt davon ausdrücklich unberührt.

## Bekannte visuelle Grenzen

- Die statischen finalen Master und der Motion-v2-Explainer verwenden eine
  abgeflachte Canon-04-Pixelquelle
  und sind noch kein separates, geschichtetes 3D- oder Rig-Masterasset.
- Pose und Grundlicht sind deshalb zwischen A/C gebunden; Figur und Studio
  können noch nicht unabhängig voneinander verändert werden.
- Die nativen redaktionellen Text- und Inhaltsflächen sind Review-Platzhalter;
  die in der Canon-Rasterquelle eingebrannten Beispieltexte werden vollständig
  abgedeckt, nicht als Produktcopy übernommen.
- Die native Vektorfigur ist eine kontrollierbare, stilisierte Ableitung der
  Canon-Referenz; sie wurde menschlich visuell abgelehnt und ist keine aktuell
  akzeptierte 3D-Rekonstruktion.
- Unabhängige Kopf-, Oberkörper-, Arm-, Hand- und Mundbewegung sowie Lip-Sync
  sind bewusst nicht enthalten, solange kein menschlich akzeptierter
  geschichteter Master existiert.
- Die Handformen bleiben starr und werden über Arm-/Hand-Pivots bewegt; Finger
  werden in dieser Fixture nicht einzeln deformiert.
- Human Visual Acceptance muss insbesondere Wiedererkennbarkeit, Handanschluss,
  Gestenruhe, Gesicht und Markenabstand bewerten.
- Der Detector prüft die relevanten offenen Hände dieser Fixture, bewertet aber
  weder Charakteridentität noch Natürlichkeit, Timing oder Gesamtkomposition.

## Status und Grenzen

- Motion-Stand `7f0ad050e4079b823c3bb6c7b2ef5fc991b662cb`:
  `humanVisualAcceptance = rejected`;
- Primary A und Editorial C am statischen Head
  `ecba53e4167a6382d16dc2dda25c2f162dab8162`:
  `humanVisualAcceptance = accepted`;
- Variante B: `rejected`, nicht im finalen Artefakt enthalten und nicht für
  Production vorgesehen;
- technischer Taskzustand nach Exact-Head-Render und grünen Checks maximal:
  `review`;
- kontrollierter Animationstest: erlaubt; neue Motion-Ausgabe:
  `humanVisualAcceptance = pending`;
- `productionEligible = false` und `autoPublish = false`;
- PR bleibt Draft;
- kein Merge, kein Ready-for-Review, kein Deployment und kein Publishing.

## Jacket-Canon-Gate nach Human Review vom 15.08.2026

Die nach dem statisch akzeptierten A-Master erzeugte Motion-v2-Ausgabe ist für
den sichtbaren Sakko-/Branding-Stand nicht akzeptiert. Auch der technisch
pixelidentische Jacket-Gate am Head
`64b79c797450fe4c6202b6d0e3bad8c1afa2ed4b` hat die anschließende menschliche
Sichtprüfung nicht bestanden: Der Revers-Pin las sich als `VOKT`/`VOXT` statt
`VOXY`, die Pocket-Wortmarke als `eDebotte` statt `eDebatte`. Pixelidentität
belegt bei diesen sehr kleinen Rasterglyphen keine Markenlesbarkeit.

Der lokale Exact-Head-Renderer
`apps/web/scripts/render-voxy-jacket-canon-gate.ts` stellt den aktuellen
Jacket-Crop und denselben CANON-04-Ausschnitt bei identischer Kamera gegenüber.
Er erzeugt unter `artifacts/voxy-jacket-canon-gate/`:

- `jacket-full.png`;
- `jacket-200pct.png`;
- `lapel-pin-400pct.png`;
- `pocket-mark-400pct.png`;
- `jacket-canon-comparison.png`;
- `jacket-brand-legibility-comparison.png` mit CANON, VORHER und NEU;
- `manifest.json` mit Exact Head, allen vier Canon-Hashes, Crop-Vertrag,
  Asset-Provenienz und fail-closed Freigabefeldern.

Die Reparatur ersetzt ausschließlich die beiden kleinen Markenflächen. Der
Revers-Pin enthält exakt `VOXY`; die Brusttasche enthält exakt einmal
`eDebatte`, ohne Badge, Box oder zweite Zeile. Beide Buchstabenbilder werden als
lokale hochauflösende SVG-Texte neu gerendert und nicht aus dem fehlerhaften
CANON-04-Raster extrahiert. CANON-04 bleibt die Geometriequelle für Position,
Größenordnung, Winkel, Perspektive, Farbwirkung und Integration. Ein maskierter
Bytevergleich bricht bei jeder Änderung der Jacket-Pixel außerhalb der beiden
dokumentierten Ersatzflächen ab. Kopf, Gesicht, Kopfhörer, Körper, Hände,
Sakko, Stoffstruktur, Revers, Brusttasche, blaue Paspel, Beleuchtung, Mikrofon,
Studio, Waveform und Bildkomposition bleiben unverändert.

Die geometrische Provenienz ist im Manifest für beide Marken gebunden. Quelle
ist `CANON-04-broadcast-layout-blue.png`; der Pin-Referenzcrop liegt bei
`x=585, y=414, w=60, h=38`, der Pocket-Referenzcrop bei
`x=760, y=470, w=90, h=60`. Dokumentiert werden je Marke `text`,
`fontSource`, `renderingMethod`, `targetPlacement`, `scale`, `rotation`,
`perspectiveTransform` und `compositingMethod`. Zusätzlich gelten
`geometryDerivedFromCanon = true` und
`wordmarkReconstructedForLegibility = true`. Es gibt keine Character-
Generation, keine Bildgenerierung, keinen externen Dienst und keinen Upload.

Der technische Gate-Befund darf nach erfolgreichem Exact-Head-Render `passed`
sein. Für Pin und Pocket bleiben `humanLegibilityRequired = true` und
`humanLegibilityStatus = pending`. Folgerichtig bleiben
`layerMasterEligible = false`,
`motionV3Eligible = false`, `animationEligible = false`,
`humanVisualAcceptance = pending`, `productionEligible = false` und
`autoPublish = false`. Es wurde kein Layer-Master und kein Motion-v3-Render
erstellt. CANON-01 bis CANON-04, PR #588 und der frühere Rig-Scope wurden nicht
verändert. Der technische PASS wird erst nach Sichtung der neuen Jacket-Evidence
zu einer möglichen menschlichen Freigabeentscheidung.

## Pocket-Mark-Final-Gate nach Human Review vom 16.08.2026

Die Evidence am Exact Head
`02a83e832890f12fe9843d2dc1cb8e543ddef07b` erhielt für die Pocket-Mark
`humanVisualAcceptance = rejected`. `eDebatte` war lesbar, zeigte bei 400 %
jedoch Cyan-/Blau-Farbsäume, eine Doppelkontur, zu starke perspektivische
Verzerrung und weiche Glyphenkanten. Der VOXY-Revers-Pin ist nicht Teil dieses
Fixes und bleibt durch seinen SHA-256
`f5d60d98f561959e5a9b7b93899e1b566c91799cea1f83338a8756f9cfdab446`
unverändert gebunden.

Die Reparatur betrifft ausschließlich
`apps/web/public/brands/voxy/overlays/edebatte-pocket-mark.svg`. Das Asset nutzt
eine native interne Auflösung von 1600×480, genau ein SVG-`text`-Element und die
exakte kombinierte Zeichenfolge `eDebatte`: `e` in Türkis, `Debatte` in Blau.
Es enthält keinen Stroke, Filter, Glow, Rasterinhalt, Badge, Rahmen, Box oder
zweite Zeile. Eine deterministische abgeleitete CANON-04-Kompositionsquelle
entfernt die alte fehlerhafte Glyphe ausschließlich bei
`x=768, y=497, w=52, h=22` im nativen 1672×941-Bild. Die lokal per
FFmpeg-`delogo` bereinigten RGBA-Bytes werden ohne Skalierung nur für diese
Region in die unveränderten Original-RGBA-Bytes eingesetzt. Die
Vektorwortmarke wird nicht aus diesem Raster gewonnen. Die Taschenorientierung
wird auf eine leichte Rotation von −4° ohne Perspektiv-Skew reduziert;
Lesbarkeit hat Vorrang vor mathematisch exakter Verzerrung.

Der separate Renderer
`apps/web/scripts/render-voxy-pocket-mark-final-gate.ts` erzeugt
revisionsgebunden unter `artifacts/voxy-pocket-mark-final-gate/`:

- `pocket-full-context.png`;
- `pocket-mark-100pct.png`;
- `pocket-mark-200pct.png`;
- `pocket-mark-400pct.png`;
- `pocket-mark-before-after.png`;
- `manifest.json`.

Der technische Gate prüft Quelltext, einzelne Textinstanz, ausgeschlossene
Stroke-/Glow-/Box-Regeln, Vektorprovenienz, den unveränderten Pin-Hash und
Bytegleichheit außerhalb der Pocket-Maske sowie Hash und native Abmessungen der
bereinigten Kompositionsquelle. Er erhebt keine OCR-
Erfolgsbehauptung. `humanLegibilityRequired = true`,
`humanVisualAcceptance = pending`, `animationEligible = false`,
`productionEligible = false` und `autoPublish = false` bleiben verbindlich.

### Abschließender Pocket-Micro-Pass vor Human Visual Acceptance

Die korrigierte Wortmarke am Exact Head
`f948e1e6ce09fd9c62e8621b490eb8f0994c60ab` wurde grundsätzlich positiv
gesichtet. Der abschließende Micro-Pass ist deshalb kein Redesign: Position
`left=858, top=574` und Größe `74×23` bleiben unverändert. Im direkten
A/B-Vergleich wird nur die Rotation von −4° auf −2,5° reduziert. Zusätzlich
lässt `fill-opacity="0.94"` im nativen SVG den dunklen Stoff- und Lichtton
minimal durch die Wortmarke wirken. Es gibt weiterhin keinen Stroke, Filter,
Blur, Glow, Badge, Rahmen, Box oder eine zweite Textzeile.

Der revisionsgebundene Renderer erzeugt bei identischem Ausschnitt und gleicher
Skalierung:

- `pocket-mark-final-100pct.png`;
- `pocket-mark-final-200pct.png`;
- `pocket-mark-final-400pct.png`;
- `jacket-final-context.png`;
- `pocket-micro-pass-comparison.png`;
- `manifest.json`.

Die lokale A/B-Sichtprüfung bewertet den Micro-Pass als subtil besser integriert
und übernimmt ihn technisch. `eDebatte` bleibt bei 100 %, 200 % und 400 %
eindeutig lesbar. Größe, Position und der VOXY-Revers-Pin sind unverändert;
außerhalb der Pocket-Maske bleibt das Bild pixelgleich. Die finale menschliche
Freigabe wird nicht vorweggenommen: `humanVisualAcceptance = pending`,
`animationEligible = false`, `productionEligible = false` und
`autoPublish = false`.

## Lokaler Layer-Master und Motion v3 — 16.08.2026

Der letzte bindende PR-Kommentar akzeptiert den statischen Character-/Clothing-
Stand am Exact Head `93217eca79013d13affc7bc9881a9c76f19feab9` und öffnet
damit ausschließlich den lokalen Layer-Master-/Motion-v3-Sichtlauf. Der
abgelehnte historische SVG-Character wird nicht reaktiviert. Pin, Pocket-Mark,
Sakko, Kopfkontur, Kopfhörer, Mikrofon, Studio und die einzelne Waveform bleiben
an die akzeptierte Pixelquelle gebunden.

Der Master unter `apps/web/public/brands/voxy/rig/layers/` umfasst 26 lokale,
reproduzierbare SVG-Ebenen mit stabilen IDs, Z-Reihenfolge, Regionen und
Pivotpunkten. Das Evidence-Paket `artifacts/voxy-layer-master/` enthält alle
transparenten Layer-Renderings, Übersicht, Neutral-, Blink-, Speaking- und
Gesture-Frames sowie `layer-manifest.json`. Weil das akzeptierte Ausgangsbild
flach ist, arbeitet die Animation ehrlich mit additiven Originalpixel-Plates;
sie behauptet keine vollständig hole-filled separierte Puppet-Datei und nutzt
keine generative Rekonstruktion.

`artifacts/voxy-motion-v3/` enthält einen deterministischen 25-Sekunden-Render
bei 1920×1080, 24 fps als MP4 und WebM, fünf Standframes, Preview,
Kontaktbogen, deutsche VTT-/SRT-Captions, zwei Hand-Crops und Safe-Crop-Evidence
für 9:16 und 1:1. Es gibt sieben Blinzler, vier an den Caption-Segmenten
getaktete subtile Mundinnenzustände, Mikro-Blick und -Kopfbewegung sowie zwei
sehr kleine Hinweise mit den weiterhin verschränkten Händen. Der Open-Palm-
Detector aus PR #588 ist auf diese Pose nicht anwendbar; er wird nicht
ausgeführt, seine Schwellen werden nicht verändert und es gibt keine
Fünf-Finger-Erfolgsbehauptung aus einem ungeeigneten Crop.

Es wurde kein lizenzsauberes lokales TTS gefunden. Deshalb besitzt der Clip
bewusst keine Audiospur; Captions und deterministisches Mund-Timing bleiben
vorhanden. Es gab keinen Provider, externen Upload oder generativen Character-
Ersatz. Exact-Head-CI rendert Layer-Master und Motion v3 separat und bewahrt
beide Artefakte mindestens 14 Tage auf. Die sichtbare Motion-Ausgabe wartet auf
die menschliche Sichtabnahme: `humanVisualAcceptance = pending`,
`productionEligible = false` und `autoPublish = false`. PR #589 bleibt Draft.

## Mouth Canon Gate und Motion v4 — 16.08.2026

Die menschliche Prüfung des technisch grünen Motion-v3-Stands
`f7b621de20b34084423fd303728d2dd014817a48` identifizierte den unabhängig vom
Kopf positionierten Mund als wichtigste Restabweichung. Motion v4 wird deshalb
im neuen Workflow erst gerendert, nachdem ein revisionsgebundenes Mouth Canon
Gate technisch bestanden ist.

Der kanonische Mund besitzt genau einen Anchor relativ zum `head-base`-Layer:
`x=328`, `y=280`, `pivotX=48`, `pivotY=27`, Referenzkopf `500×400` und
State-Fläche `96×54`. Neutral, Closed, Slight Open und Speaking Open teilen
Anchor, Pivot, horizontale Mitte und Ausdehnung. Der Mund ist zusammen mit
Augen, Lidern und den aus dem Head-Source geerbten Brows ein DOM-Kind desselben
Head-Rigs; Canvas-relative Positionierung ist ausgeschlossen. Neutral zeigt
den akzeptierten Canon-Mund unverändert. Die Sprechzustände setzen die
Gesichtsfläche lokal fort und interpolieren eine einzelne Mundgeometrie,
anstatt halbtransparente Sticker übereinanderzulegen.

`artifacts/voxy-mouth-canon-gate/` enthält die vier 400-%-Zustände, die
halbtransparente Anchor-/Pivot-Vergleichstafel, Neutral- und Speaking-Head sowie
das Manifest. Der lokale Sichtcheck bestätigt gleiche Mitte, fehlende X-/Y-
Sprünge und eine natürliche Einbettung ohne weiße Patchkante. Diese technische
Prüfung ist keine menschliche Motion-Freigabe.

Nach bestandenem Gate rendert `artifacts/voxy-motion-v4/` einen 22 Sekunden
langen Sichtkandidaten mit 528 Frames bei 1920×1080 und 24 fps. Der Text beginnt
verbindlich mit „Ich bin Voxy.“ und erklärt anschließend Vote4Gov,
VoiceOpenGov und eDebatte in der vorgegebenen Reihenfolge. Mundzustände werden
über eine einzelne Bézier-Geometrie weich entlang der Caption-Phasen
interpoliert. Sieben Blinzler, head-relative Blicklichter, eine ruhige
Kopfbewegung bis rund 0,6°, minimale Atmung und genau eine sehr kleine
Explain-Geste der verschränkten Hände ergänzen die Bewegung; alle Zustände
kehren in Neutral zurück. Pin, Pocket-Mark bei −2,5° und 94 % Alpha, Sakko,
Kopfkontur, Kopfhörer, Studio, Mikrofon und genau eine Waveform bleiben
eingefroren.

Mangels belastbarem lizenzsauberem lokalem TTS bleiben MP4 und WebM ohne
Audiospur; VTT, SRT und eingebrannte deutsche Captions bilden die Timing-
Grundlage. Der Workflow
`.github/workflows/voxy-mouth-motion-v4-evidence.yml` prüft die bestehenden
#589-Verträge, rendert Mouth Gate vor Motion v4, bindet beide an denselben Exact
Head und bewahrt beide CI-Artefakte mindestens 14 Tage auf. Es gibt keinen
externen Provider, Upload, generativen Ersatz, Merge, Deployment oder
Publishing. `humanVisualAcceptance = pending`, `productionEligible = false`
und `autoPublish = false`; PR #589 bleibt Draft.

## Mouth-Shape-Polish und Motion v4.1 — 16.08.2026

Die menschliche Prüfung des Motion-v4-Heads
`fa45219ea25bbbb4371d311fdc768c175c85f678` akzeptiert Mouth-Anchor,
Mouth-Pivot, Head-relative Positionierung, Transform-Vererbung und fehlende
Canvas-Drift. Der autorisierte v4.1-Pass verändert deshalb weder die
Rig-Architektur noch andere Character-, Branding-, Studio- oder Motion-Ebenen.
Der Neutralzustand bleibt identisch; nur `slightOpen`, `speakingOpen` und ihre
kontinuierliche Bézier-Geometrieinterpolation werden visuell poliert.

`slightOpen` wird von 72×18 auf 62×15 Einheiten reduziert. `speakingOpen` wird
von 80×34 auf 60×31 Einheiten reduziert und damit von derselben horizontalen
Breite wie Neutral auf 75 % der Neutralbreite begrenzt. Beide Zustände behalten
die horizontale Mitte, Anchor `x=328, y=280`, Pivot `48/27` und den
500×400-Referenzkopf. Die schwarze Innenfläche ist kontrollierter; der blaue
Akzent ist kleiner, abgerundet und zurückhaltender. Die Sequenz bleibt
`closed → slightOpen → speakingOpen → slightOpen → closed` und wird als eine
SVG-Geometrie ohne zusätzliche Sticker- oder Zwischenzustands-Layer gerendert.

Das technische Gate unter `artifacts/voxy-mouth-v4-1-gate/` enthält vier
400-%-Zustände, den direkten v4/v4.1-Vergleich, das gemeinsame
Anchor-/Pivot-Overlay, den Speaking-Sequenz-Kontaktbogen und `manifest.json`.
Der lokale Sichtcheck bewertet die neue Form als schmaler, ruhiger und näher am
akzeptierten Canon-Mund. Diese technische Bewertung nimmt die menschliche
Freigabe von Mouth Shape, Speaking Naturalness und Transitions nicht vorweg.

Nach bestandenem Gate rendert `artifacts/voxy-motion-v4-1/` denselben
22-Sekunden-Test mit 528 Frames bei 1920×1080 und 24 fps. Timeline, deutscher
Textbeginn „Ich bin Voxy.“, Captions, sieben Blinzler, Blick- und Kopfbewegung,
Atmung, eine Explain-Mikrogeste, Kamera und Gesamtrhythmus werden exakt aus v4
übernommen. Ein Pixelvergleich der fünf korrespondierenden Standframes bindet
alle Differenzen auf die lokale Mundregion: maximal `x=784–862`, `y=323–353`
und 79×31 Pixel. VOXY-Pin, eDebatte-Pocket-Mark, Sakko, Hände, Kopf,
Kopfhörer, Mikrofon, Studio, Waveform und Layout bleiben außerhalb dieser
Region pixelgleich.

Der Workflow `.github/workflows/voxy-mouth-motion-v4-1-evidence.yml` prüft die
eingefrorenen #589-/v4-Verträge, rendert das Mouth-v4.1-Gate vor Motion v4.1,
bindet beide Pakete an denselben Exact Head und bewahrt beide CI-Artefakte 14
Tage auf. MP4 und WebM bleiben wie v4 ohne Audiospur; es gibt keinen externen
Provider, Upload oder generativen Ersatz. `humanVisualAcceptance = pending`,
`productionEligible = false` und `autoPublish = false`; PR #589 bleibt Draft.

## Lokales TTS License Gate und Voiced Explainer v1 — 16.08.2026

Der menschliche Review auf Head
`58548d2a5f6e4a59e84464a5c4aea3875f38662c` akzeptiert anschließend den
gesamten Character-/Motion-Master einschließlich Mouth-v4.1, Branding, Studio,
Kamera und der einen Waveform. Diese Revision ist die unveränderliche visuelle
Baseline. Der folgende Slice ergänzt ausschließlich lokale Stimme,
audioabgeleitetes Mouth-Timing und eine subtile Reaktion derselben Waveform.

Das vierstufige License Gate trennt Engine/Framework, konkrete Model-Weights,
Runtime-Abhängigkeiten und Attribution. Gewählt ist aktuelles OHF Piper 1.6.0
unter GPL-3.0-or-later als isolierter lokaler CLI-Prozess einschließlich des
eingebetteten eSpeak-NG-Phonemizers. Historisches `rhasspy/piper` unter MIT wird
nicht fälschlich als aktuelle Engine ausgewiesen. Die konkreten
`de_DE-mls-medium`-Weights werden aus Revision
`f5a6e9094787fd865d65cb024472f977f9c542b5` provisioniert und durch SHA-256
`69cd1d2aa5a35839a518966fcc4924b5f93e5f8c948ed0752b1a616ad53f65bf`
gebunden. Die konkrete Model Card dokumentiert Training von Grund auf auf
Multilingual LibriSpeech German; OpenSLR SLR94 weist das Dataset als CC BY 4.0
aus. Die Modell-Repository-Metadaten weisen MIT aus. Der feste Speaker-Index 20
entspricht Dataset-Speaker-Key 3494; es findet weder Voice Cloning noch die
Imitation einer bekannten Person statt.

Andere Kandidaten werden fail-closed behandelt: `de_DE-thorsten-high` hängt an
einem Lessac-Ausgangsmodell mit dokumentierter nicht-kommerzieller
Dataset-Beschränkung, `pavoque` ist CC-BY-NC-SA-4.0, und Kandidaten mit nur
indirekter Dataset-Angabe oder unklarer Fine-Tuning-Basis werden nicht benutzt.
`artifacts/voxy-local-tts-gate/` enthält Matrix, Engine- und
Model-Provenienz, Third-Party-Notices, rohe und normalisierte WAV, eine aus der
WAV berechnete Waveform-Vorschau und das revisionsgebundene Manifest. Das
Modell bleibt wegen Größe und Lizenz-/Distributionshygiene im expliziten Cache;
der Synthese- und Renderpfad läuft nach dem Provisioning mit deaktiviertem
Paket-/Hugging-Face-Netzwerk und ohne stillen Download.

Der typisierte `VoxyLocalTtsAdapter` liefert WAV-Pfad, Dauer, Sample Rate,
Kanäle, Segmenttimings sowie Engine-, Voice-, Model- und Lizenzprovenienz. Das
sichtbare deutsche Script bleibt exakt erhalten. Ausschließlich für die lokale
Aussprache werden die Marken Voxy, Vote4Gov, VoiceOpenGov und eDebatte durch im
Manifest sichtbare Sprech-Aliase übergeben. Die rohe Ausgabe wird mit
zurückgenommener Synthese-Lautstärke erzeugt und anschließend ohne aggressive
Kompression auf −16 LUFS bei höchstens −1,5 dBFS normalisiert. Beide
Piper-Noise-Skalen sind für die revisionsgebundene Evidence explizit null;
Länge, Lautstärke und Modell-Input sind damit deterministisch festgelegt.

`artifacts/voxy-voiced-explainer-v1/` enthält die normalisierte `audio.wav`,
deutsche VTT/SRT, das MP4/WebM mit Audiospur, Preview, Contact Sheet und
Manifest. Ein geglättetes, gegatetes RMS-Fenster der lokalen WAV wählt
ausschließlich zwischen `neutral`, `closed`, `slightOpen` und `speakingOpen`;
Shapes, Anchor `x=328, y=280`, Pivot `48/27` und Head-Bindung ändern sich nicht.
Dies ist bewusst amplitude- und nicht phonembasiert. Dieselbe Hüllkurve steuert
eine sehr kleine Höhen-/Helligkeitsreaktion der einzelnen eingefrorenen
Waveform-Region hinter Voxy. Ihre Position und Anzahl bleiben unverändert.

Der neue Workflow
`.github/workflows/voxy-local-tts-voiced-explainer-v1-evidence.yml`
provisioniert Engine und Modell in einem getrennten Netzwerkschritt, führt
Synthese und beide Renderer danach in einem Linux-Network-Namespace ohne
Netzwerk aus, prüft FFprobe-, Caption-, Audio-, Frozen-Visual- und
Release-Verträge und bewahrt License-Gate und voiced Video jeweils 14 Tage auf.
Es gibt keinen SaaS-, Paid- oder Avatarprovider, keinen visuellen Upload, kein
Deployment und kein Publishing. `humanVisualAcceptance = accepted`,
`humanAudioAcceptance = pending`, `productionEligible = false` und
`autoPublish = false`; PR #589 bleibt Draft.

## Documentary Voice Bake-off (2026-08-16)

Die technisch funktionierende Control-Stimme `de_DE-mls-medium#speaker-20`
bleibt lizenzseitig gültig, ist menschlich wegen ihres elektronischen und harten
TTS-Charakters jedoch nicht freigegeben. Der additive Bake-off verändert deshalb
weder den akzeptierten Character-/Motion-Master auf Head
`58548d2a5f6e4a59e84464a5c4aea3875f38662c` noch Mouth-v4.1-Geometrie,
Anchor, Pivot, Pin, Pocket-Mark, Studio, Mikrofon oder die einzelne Waveform.
Alle Previews verwenden dieselbe eingefrorene 1920×1080-Quelle und denselben
Renderpfad; nur die technisch unvermeidbare Audiodauer unterscheidet sich.

Neben CONTROL werden drei tatsächlich unterschiedliche lokale Voice-Profile
geprüft: Ramona Deininger und Karlsson aus einem deutschen M-AILABS-
Multi-Speaker-Modell sowie das neutrale Profil des separaten Thorsten-
Emotional-Modells. Beide VITS-Weights stammen revisions- und SHA-gebunden aus
`MycroftAI/mimic3-voices` (CC-BY-SA-4.0); die M-AILABS-Lizenz erlaubt
ausdrücklich auch kommerzielle Nutzung unter Beibehaltung von Copyright,
Bedingungen und Disclaimer, Thorsten-Voice ist CC0. Mimic 3 läuft als lokal
gepinnte AGPL-3.0-or-later-CLI. CaroTTS wird dagegen fail-closed verworfen:
Die Apache-Datei des HUI-Repositories deckt den Aufbereitungs-Code, aber nicht
eindeutig die formale Lizenz der zugrunde liegenden LibriVox-Aufnahmen ab.
Sämtliche Engine-, Model-, Dataset-, Source-, Attribution-, kommerziellen und
Offline-Angaben stehen fail-closed in `license-matrix.json`.

`artifacts/voxy-documentary-voice-bakeoff/` enthält pro Voice RAW, identisch
auf −18 LUFS/−1,5 dBFS normalisierte Finished-WAV und Preview sowie
`comparison.wav`, `comparison.mp4`, Messwerte, Review Board, Lizenzmatrix und
Exact-Head-Manifest. Sichtbarer Text und Aussprache-Aliasse sind für alle vier
Stimmen bytegleich; die Synthese läuft nach dem Provisioning ohne Netzwerk.
Automatische Dauer-, Peak-, RMS-/LUFS-, Tempo- und Pausenwerte unterstützen
nur die Hörprüfung und bestimmen keinen Sieger. Status bleibt
`humanVisualAcceptance = accepted`, `humanAudioAcceptance = pending`,
`documentaryVoiceBakeoff = ready_for_human_review`, `humanWinner = pending`,
`productionEligible = false` und `autoPublish = false`; PR #589 bleibt Draft.

## First-Party Voice Clone Bake-off (2026-08-16)

Der ausdrücklich autorisierte First-Party-Lauf ersetzt keine menschliche
Audioentscheidung. Als Voice Owner ist Ricky Gerd Fleischer mit
`voiceConsent = explicit`, `voiceReferenceSource = first_party_recording` und
`thirdPartySpeakerRights = none` gebunden. Genau zwei durch den Betreiber als
absolute lokale Pfade bereitgestellte Aufnahmen werden vor jedem Lauf auf
Existenz und SHA-256 geprüft und anschließend ausschließlich read-only
verwendet. Pfade und Hashes werden aus der öffentlichen Evidence bewusst
weggelassen. Originale und getrimmte Referenzsegmente gelangen weder in den
Git-Worktree noch in Git, PR, GitHub Artifacts, Vercel, `public/` oder ein
Production-Bundle.

Das Security-/License-Gate pinnt die lokale Engine auf
`chatterbox-tts 0.1.7` mit Upstream-Revision
`5de7a54aa4e5e2baadb0182dde554908b48b85c2` und Chatterbox Multilingual V3 auf
Hugging-Face-Modellrevision
`5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18`. Engine und Modellgewichte sind
MIT-lizenziert. Die produktionsrelevanten Weight-, Tokenizer- und
Conditioning-SHAs sind im Codevertrag fixiert. Der reale lokale
Python-3.13-Lauf löst 112 Runtime-Pakete ohne unbekannte Lizenzangabe auf.
`pykakasi` ist GPL-3.0-or-later und `soxr` LGPL-2.1-or-later; deshalb erlaubt
dieses Gate ausschließlich lokale Inferenz und keine Verteilung oder
Einbettung der Runtime. Die synthetisierten Audios müssen den eingebauten
PerTh-Wasserzeichentest bestehen. Nach Provisionierung blockiert der Worker
Sockets fail-closed und führt die Synthese mit
`runtimeNetworkRequests = 0` aus.

Beide Aufnahmen wurden lokal mit Signalmetriken und einem ebenfalls lokalen
Whisper-Zeitstempelproxy analysiert. Vier 5,8 bis 9,9 Sekunden lange,
zusammenhängende Referenzfenster aus beiden Aufnahmen gehen in die kontrollierte
Matrix ein. Sie werden lediglich geschnitten, mono auf 24 kHz resampelt und
außerhalb des Worktrees gehalten; Denoising, Pitch-Shifting und Voice-Changer
finden nicht statt. A, B und C verwenden exakt denselben sichtbaren deutschen
Testtext. Ausschließlich die TTS-internen Aliasse `Woxi`, `Wout-for-Goff`,
`Woiss-Open-Goff` und `eh Debatte` steuern die Markenaussprache.

Die private lokale Evidence unter
`artifacts/voxy-first-party-voice-clone-private/` enthält:

- `reference-selection.json` ohne private Pfade;
- vier synthetisierte Parameter-Matrix-Takes;
- für A — Ricky Natural, B — Ricky Calm und C — Voxy jeweils `raw.wav`,
  `finished.wav` und einen 12-sekündigen `preview.mp4`;
- `comparison-without-original.wav`, `manifest.json` und `README.md`.

Die einzige Vergleichs-WAV mit einem kurzen Originalsegment liegt absichtlich
außerhalb des Git-Worktrees im privaten Voice-Review-Verzeichnis. Das
Finished-Audio nutzt ausschließlich lineare Lautheitsnormalisierung und
Peak-Kontrolle; Hall, Pitch-Effekt, Exciter, Voice-Changer und aggressive
Kompression bleiben ausgeschlossen. Der lokale technische Lauf prüft pro Take
Medienformat, Clipping, SHA-256, PerTh und Original-Unverändertheit. Ein lokaler
Whisper-ASR-Proxy deckt den deutschen Inhalt weitgehend ab, meldet aber bei A
ein mögliches zusätzliches „Nein“ und bei C ein mögliches „solltest“ statt
„sollst“. Diese maschinelle Unsicherheit wird nicht als Hörurteil oder
Textperfektion ausgegeben und muss im Human Review geprüft werden.

Die drei kurzen Video-Previews verwenden dieselbe eingefrorene visuelle Quelle
auf Head `58548d2a5f6e4a59e84464a5c4aea3875f38662c`, Mouth v4.1 und genau eine
Waveform hinter Voxy. Nur Audioamplitude, die vorhandenen Mundzustände und die
bereits vorhandene Waveform reagieren; Character, Sakko, Pin, Pocket-Mark,
Studio und Kamera bleiben gesperrt. Das öffentliche Exact-Head-CI-Artefakt
enthält aus Privacy-Gründen ausschließlich technische Manifeste,
Lizenzprovenienz, Parameter und Frozen-Visual-Verträge—kein Original, kein
Referenzsegment, keine Synthese und keine privaten Metadaten.

Status bleibt `humanVisualAcceptance = accepted`,
`humanAudioAcceptance = pending`,
`firstPartyVoiceCloneGate = ready_for_human_review`,
`humanVoiceWinner = pending`, `productionEligible = false` und
`autoPublish = false`. Es gibt keinen Production-, Publishing- oder weiteren
Motion-Schritt.

## VOXY Signature Voice Final Pass (2026-08-17)

Die menschliche Prüfung des First-Party-Bake-offs am Exact Head
`5a465a339c453acc2f8206f84d85f009bbf3d037` bewertet B — Ricky Calm und C —
Voxy jeweils als `GOOD / KEEP`. A wird nicht weiter optimiert. B und C bleiben
als akzeptierte Entwicklungsreferenzen vollständig erhalten; ein Vorher-/
Nachher-Vergleich bindet alle Dateien beider Kandidaten bytegleich. Auch die
beiden autorisierten Originalaufnahmen bleiben read-only und bytegleich. Weder
Originale noch Referenzsegmente oder private Referenzpfade gelangen in Git,
PR-Artefakte, `public/`, Vercel oder Production.

Die neue Zielsetzung ist keine möglichst genaue Imitation einer menschlichen
Ausgangsstimme, sondern eine eigenständige VOXY Voice Identity. Der lokale
Final-Pass führt dazu drei getrennte Delivery Modes ein:

| Mode | Entwicklungsreferenz | Gewählte Parameter | Primärtest | Dauer |
| --- | --- | --- | --- | ---: |
| D — VOXY EDITORIAL | B — Ricky Calm | `exaggeration=0.42`, `cfgWeight=0.33`, `temperature=0.68`, `seed=58942` | Editorial | 21,080 s |
| E — VOXY SIGNATURE | Souveränität von B plus Wärme von C, ausschließlich als Parameter-/Delivery-Referenz | `exaggeration=0.46`, `cfgWeight=0.34`, `temperature=0.68`, `seed=58952` | Signature Intro | 12,930 s |
| F — VOXY EXPLAINER | C — Voxy | `exaggeration=0.47`, `cfgWeight=0.33`, `temperature=0.70`, `seed=58962` | Explainer | 18,152 s |

B und C werden nicht als Audiodateien gemischt. Pro Modus werden genau zwei
nahe, sinnvolle Varianten geprüft. Ein technischer Score bestimmt keinen
Sieger; die gewählten Varianten bilden nur die beabsichtigte Delivery für den
menschlichen Hörvergleich ab. D nutzt B als ruhige Basis mit etwas freiererem
Gedankenbogen, E verbindet B-artige Ruhe mit C-artiger Wärme, und F zügelt die
C-nahe Lebendigkeit leicht.

Alle drei Modi sprechen dieselben drei verbindlichen Situationen: Signature
Intro, Editorial und Explainer. Die sichtbaren Texte bleiben exakt erhalten.
`spoken-script.json` dokumentiert ausschließlich interne Satzgruppierung,
Interpunktion, Pausentiming, Aussprache-Aliasse und prosodische Segmentierung;
es gibt keine neue Aussage oder Bedeutungsänderung. Die Aufteilung verbindet
zusammengehörige Sätze zu Gedankenbögen und vermeidet eine identische Pause
nach jedem Punkt.

Die private lokale Evidence liegt vollständig außerhalb des Git-Worktrees und
enthält pro Modus `raw.wav`, `finished.wav`, `parameters.json` sowie RAW- und
Finished-WAV für alle drei Testsituationen. Zusätzlich enthält sie die kleine
Parameter-Suche, `voxy-signature-finalists.wav` in der Reihenfolge D → E → F,
`voxy-three-situations.wav` in der Reihenfolge Test 1/2/3 mit jeweils D → E →
F, `spoken-script.json`, `manifest.json` und `README.md`. Es wurde kein
Preview-Video erzeugt und keine visuelle Datei verändert.

Das Finishing verwendet nur lineare Lautheitsnormalisierung und Peak-Kontrolle
bei 24 kHz Mono PCM. D, E und F liegen ohne Clipping bei rund −18 LUFS und
höchstens −1,48 bis −1,50 dBTP; alle RAW- und Finished-Takes bestehen den
PerTh-Wasserzeichentest. Hall, Voice-Changer, Pitch-Effekt, künstlicher Bass,
Exciter, Radio-Kompression, hörbarer De-Esser und starke Noise-Bearbeitung
bleiben ausgeschlossen. Die Offline-Laufzeit meldet null Netzwerkanfragen.

Der technische Final-Pass ist `PASS`. E bleibt ausschließlich
`primary_canon_candidate`; es gibt keine automatische Sieger- oder
Canon-Entscheidung. Status:

- `voiceB = development_reference_accepted`;
- `voiceC = development_reference_accepted`;
- `voiceD = human_review`;
- `voiceE = primary_canon_candidate`;
- `voiceF = human_review`;
- `humanAudioAcceptance = pending`;
- `humanVoiceWinner = pending`;
- `productionEligible = false`;
- `autoPublish = false`.

PR #589 bleibt Draft. Es gibt keinen Merge, kein Ready-for-Review, kein
Deployment, keinen Upload und kein Publishing.

## Angenommene Dual-Voice-Architektur und News-5.0-Grammatik (2026-08-17)

Die nachfolgende menschliche Produktentscheidung schließt die offene
Rollenwahl des Signature-Final-Pass ab, ohne dessen historisches Manifest oder
die B/C/D/E/F-Bake-off-Evidence umzuschreiben:

- `humanVoiceArchitectureAcceptance = accepted`;
- `voxyMaleSignatureAcceptance = accepted`;
- `editorialFemaleVoiceAcceptance = accepted`.

E — VOXY SIGNATURE ist als männliche `VOXY_SIGNATURE` mit der lokalen Voice-ID
`voxy-signature-e-5a465a33` und Variante `e-02-warm-sovereign` angenommen.
Diese Stimme gehört ausschließlich Voxy. Documentary Candidate A — Ramona
Deininger ist als weibliche `EDITORIAL_VOICE` mit der vorhandenen lokalen
Voice-ID `de_DE/m-ailabs_low#ramona_deininger` angenommen. Sie erklärt,
verdichtet und fasst zusammen, ist aber ausdrücklich keine weibliche Voxy-
Variante. Die bereits versionierte Mimic-3-, Modell-, Dataset-, Lizenz-,
Attributions-, Weight-SHA- und Offline-Provenienz bleibt bindend.

Jeder gesprochene Block erhält explizit `speakerRole = "voxy" | "editorial"`
und die dazugehörige `voiceId`. Wenn Editorial spricht, bleibt Voxys Mund
neutral oder geschlossen; es gibt kein Editorial-Lip-Sync, keinen zweiten
Avatar und keine zweite Waveform. Charakter, Kopf, Kopfhörer, Jacke, Pin,
Pocket-Mark, Mouth v4.1, Anchor, Pivot, Studio und Kamera bleiben eingefroren.
Bei direkter Zuschaueransprache eröffnet Voxy den zusammenhängenden Beitrag
genau einmal mit „Hallo Nachbar,“. Weitere Voxy-Segmente und Editorial
wiederholen diese Begrüßung nicht. Die bestehende Brand Narrative bleibt
unverändert und gilt auch für Voxy-Videoformate.

Die verbindliche News-5.0-Grammatik umfasst `HOST`, `FOCUS`, `EXPLAIN`, `DOCK`
und `SYNTHESIS`. Voxy bleibt Gastgeber, tritt bei konkreter Information aber
sichtbar zurück. Quellen, Charts, Karten, Dokumente und andere
Informationsobjekte dürfen die visuelle Hauptrolle übernehmen, werden entlang
der Erklärung aufgebaut und danach kontrolliert in das dynamische visuelle
Evidence-Gedächtnis rechts gedockt. Die Zone ist keine statische Sidebar;
gedockte Evidence darf erneut fokussiert und in der Synthese gemeinsam gezeigt
werden.

Source-first priorisiert Originalquelle oder Originaldaten vor einer
nachvollziehbar abgeleiteten Visualisierung und diese vor einer klar
gekennzeichneten redaktionellen Zusammenfassung. Erfundenen Charts,
dekorativen Fake-Daten und Quellen nur im Kleingedruckten wird ausdrücklich
widersprochen. Die Animation folgt der Information; ein Chart darf schrittweise
von Achse und relevanter Reihe über Zeitraum, Vergleich und Markierung bis zum
vollständigen Kontext aufgebaut werden.

Der vollständige Vertrag und der separate nächste Task
`VOXY-DUAL-VOICE-EXPLAINER-PILOT-01` stehen in
`docs/E150/VOXY-DUAL-VOICE-EXPLAINER-PILOT-01_2026-08-17.md`. In diesem
Durchgang wurde der 45- bis 60-sekündige private Pilot nur manifestiert, nicht
gerendert oder implementiert. Es wurde keine allgemeine autonome
News-Produktion eingeführt. `productionEligible = false`,
`autoPublish = false`; PR #589 bleibt Draft.

## Merge-Readiness-Abschluss (2026-08-17)

Die abschließende Prüfung von PR #589 am Head
`11e91d15db478a543d2fab622bcfa6e6eefe7958` belegt den Abschluss von
`VOXY-ANIMATABLE-MASTER-ASSET-01`:

- GitHub CI: 14 Checks erfolgreich, 3 vertragsgemäß übersprungen, 0
  fehlgeschlagen oder ausstehend;
- Reviewthreads: keine offenen Threads;
- Mergeability: `CLEAN` und `MERGEABLE`;
- Branch-Abstand: 0 Commits hinter `origin/main`;
- lokaler Scope-/Privacy-Audit: keine privaten Voice-/Review-Medien, keine
  privaten Referenzpfade und keine neuen Secrets im Repository;
- lokale Revalidierung: 17 fokussierte Vertragsdateien mit 118/118 Tests,
  TypeScript, Source-Lint, fokussierter Voxy-Lint, Python-AST und
  `git diff --check` grün.

Die menschlich akzeptierten Visual-, Mouth-, Motion- und Dual-Voice-
Entscheidungen bleiben unverändert. `VOXY-DUAL-VOICE-EXPLAINER-PILOT-01`
bleibt als separater `codex_ready` Task manifestiert; dieser PR enthält weder
Pilotvideo noch autonome News-Produktion. `productionEligible = false` und
`autoPublish = false` bleiben verbindlich. Die nachfolgende reine
Abschlussdokumentation erhält einen eigenen Exact Head und durchläuft dieselben
Merge-Gates erneut, bevor PR #589 Ready for Review gesetzt oder gemergt wird.
