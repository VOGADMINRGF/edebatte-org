# VOXY-ANIMATABLE-MASTER-ASSET-01 — Scope

Stand: 2026-08-15

## Verbindlicher Jacket-Canon-Gate vom 15.08.2026

Die grundsätzliche menschliche Akzeptanz des statischen A-/C-Masters ist keine
Akzeptanz der anschließend sichtbaren Motion-v2-Sakkoüberlagerungen. Der
pixelidentische Gate-Stand am Head
`64b79c797450fe4c6202b6d0e3bad8c1afa2ed4b` ist ausdrücklich abgelehnt: Der
Pin las sich als `VOKT`/`VOXT`, die Pocket-Wortmarke als `eDebotte`.

Sakko-Schnitt, Revers, Stofftextur, Nähte, Taschenform und blaue Paspel bleiben
unverändert. Ausschließlich die beiden kleinen Markenflächen werden ersetzt:
der Revers-Pin mit exakt `VOXY`, die Brusttasche mit exakt einmal `eDebatte`,
ohne Badge, Box oder zweite Zeile. CANON-04 bleibt Geometriequelle für Position,
Größenordnung, Winkel, Perspektive, Farbwirkung und Integration, aber nicht mehr
Pixelquelle der Buchstaben. Beide Wortmarken werden als lokale hochauflösende
Vektorlayer neu gerendert; eine Character- oder Sakko-Generation findet nicht
statt.

Der technische Gate-Stand darf `passed` sein, wenn die exakten Quelltexte, die
dokumentierte Markenprovenienz und der maskierte Bytevergleich der unveränderten
Jacket-Pixel bestehen. Für beide Marken gilt `humanLegibilityRequired = true`;
`layerMasterEligible`, `motionV3Eligible` und `animationEligible` bleiben
`false`, `humanVisualAcceptance` bleibt `pending`. Erst die menschliche Sichtung
der revisionsgebundenen Evidence in 100, 200 und 400 Prozent kann eine spätere
Freigabeentscheidung begründen.

### Pocket-Mark-Final-Gate vom 16.08.2026

Der technische PASS am Head
`02a83e832890f12fe9843d2dc1cb8e543ddef07b` wurde für die eDebatte-Pocket-Mark
menschlich abgelehnt. Die Wortmarke war lesbar, aber wegen Cyan-Geisterkante,
Doppelkontur, zu starker Perspektive und weicher Buchstaben nicht markenscharf.
Der VOXY-Pin ist nicht Teil dieser Korrektur und bleibt per Asset-Hash
unverändert.

Die Folgekorrektur ersetzt ausschließlich das Pocket-Mark-SVG durch eine native
1600×480-Vektorquelle mit einer Textinstanz und exakt `eDebatte`. `e` ist
türkis, `Debatte` blau. Stroke, Filter, Glow, Badge, Box, Rahmen, zweite Zeile
und Raster-Upscale der Wortmarke sind ausgeschlossen. Damit die abgelehnte
Rasterglyphe nicht als Geisterkante unter dem Vektor verbleibt, entfernt eine
deterministische CANON-04-Arbeitskopie ausschließlich die Region
`x=768, y=497, w=52, h=22` in der nativen 1672×941-Quelle; außerhalb dieser
Region bleiben die Original-RGBA-Bytes unverändert. Nur die lokal per
FFmpeg-`delogo` bereinigten Bytes dieser Region werden ohne Skalierung
eingesetzt. Die Orientierung folgt der Tasche nur noch mit leichter Rotation
und ohne Perspektiv-Skew. Der separate lokale
Exact-Head-Gate erzeugt Kontext-, 100-, 200-, 400-%- und Vorher-/Nachher-
Evidence unter `artifacts/voxy-pocket-mark-final-gate/`; außerhalb der
dokumentierten Pocket-Maske müssen die Pixel bytegleich bleiben.

Der abschließende Micro-Pass nach der grundsätzlich positiven Sichtung des Heads
`f948e1e6ce09fd9c62e8621b490eb8f0994c60ab` hält Position und Größe fest,
reduziert ausschließlich die Rotation von −4° auf −2,5° und verwendet im
nativen SVG `fill-opacity="0.94"` für eine subtile Stoff-/Lichtintegration.
Der direkte Vergleich zeigt beide Stände im selben Ausschnitt und Maßstab.
Weitere optische Optimierung ist nicht Teil dieses Scopes.

Auch ein technischer Pocket-PASS lässt `humanVisualAcceptance = pending`,
`animationEligible = false`, `productionEligible = false` und
`autoPublish = false`. Layer-Master, Motion v3, Audio, neues Explainer-Video,
Publishing und Production bleiben bis zur menschlichen Sichtfreigabe gesperrt.

## Autorisierter Layer-Master-/Motion-v3-Scope vom 16.08.2026

Der neuere menschliche PR-Review-Kommentar akzeptiert den statischen
Character-/Clothing-Stand am Exact Head
`93217eca79013d13affc7bc9881a9c76f19feab9` und autorisiert ausschließlich den
lokalen Layer-Master sowie einen kontrollierten Motion-v3-Sichtkandidaten. Der
VOXY-Pin, die einzelne eDebatte-Pocket-Mark bei −2,5° und 94 % Substrat-Alpha,
Sakko-Geometrie und -Textur, blaue Paspel, Kopfkontur, Kopfhörer, Mikrofon,
Studiofamilie und genau eine Waveform hinter Voxy sind eingefroren.

Da der akzeptierte Character-Stand nur als flaches Raster vorliegt, trennt der
lokale Master keine Pixel durch generative Rekonstruktion. Stattdessen enthält
er 26 revisionsgebundene SVG-Ebenen und transparente Evidence-PNGs. Kleine
Bewegungen verwenden additive Originalpixel-Plates über dem akzeptierten
Static Master; Neutralpose und eingefrorene Markenebenen bleiben unangetastet.
Diese technische Architektur und ihre sichtbare Grenze stehen ausdrücklich im
Layer-Manifest.

Motion v3 rendert lokal 25 Sekunden bei 1920×1080 und 24 fps. Die Animation
beschränkt sich auf natürliche Blinzler, Mikro-Blickbewegung, maximal 0,35°
Kopfneigung, Atembewegung, vier subtile Mundinnenzustände und zwei höchstens
2,4 Pixel große Hinweise mit den weiterhin verschränkten Händen. Es wird keine
offene Hand behauptet; der Open-Palm-Detector aus PR #588 ist deshalb nicht
anwendbar und wird nicht durch geänderte Schwellen ersetzt. Ohne belastbares
lizenzsauberes lokales TTS bleiben Audio und Provider-Provenienz leer; deutsche
Captions und Mund-Timing sind vorhanden.

Die neue Motion-Ausgabe beginnt erneut bei `humanVisualAcceptance = pending`.
`productionEligible = false` und `autoPublish = false` bleiben unverändert.
Kein Deployment, Upload, Publishing, Merge oder Ready-for-Review ist Teil dieses
Scopes.

## Aktueller Recovery-Scope

Der Motion-Stand aus Exact Head
`7f0ad050e4079b823c3bb6c7b2ef5fc991b662cb` ist menschlich visuell
abgelehnt. Das SVG-Rig und seine technische Evidence bleiben nachvollziehbar,
gelten aber nicht als akzeptiertes visuelles Masterasset.

Die menschliche Prüfung hat am statischen Exact Head
`ecba53e4167a6382d16dc2dda25c2f162dab8162` A als Primary Master und C als
Editorial-/Anlass-Variante akzeptiert. B ist verworfen. Ein kontrollierter
Animationstest aus dem akzeptierten Primary A ist erlaubt; jede neue
Motion-Ausgabe beginnt erneut mit `humanVisualAcceptance = pending`. Für den
aktuellen Explainer in PR `#589` gilt:

- kein Reaktivieren des menschlich abgelehnten SVG-Rigs und kein neuer
  Charakter-/Studio-Look;
- dieselbe abgeflachte CANON-04-Voxy-/Studio-Pixelquelle wie Primary A;
- identische Kamera, Licht-, Marken-, Typografie- und Materialbehandlung;
- lokale Blink- und minimale Blicklicht-Overlays sowie Editorial-Easing;
- keine unabhängige Kopf-, Oberkörper-, Arm- oder Handbewegung, solange kein
  akzeptierter geschichteter Master existiert;
- genau eine statische Waveform hinter Voxy; künftig audio-reaktionsfähig,
  aktuell nicht audio-reaktiv und ohne Audioanalyse;
- Canon-geometrischer VOXY-Pin, genau eine rekonstruierte eDebatte-Wortmarke ohne Badge/zweite Zeile und dauerhaftes
  VoiceOpenGov-/eDebatte-Studio-Lockup gemäß Human Branding Decision;
- lokaler, revisionsgebundener Raster-Render ohne Generierung, externen Dienst,
  Upload oder SaaS;
- Exact-Head-Artefakt mit mindestens 14 Tagen Aufbewahrung;
- `humanVisualAcceptance = pending`, `productionEligible = false` und
  `autoPublish = false`.

Die unveränderten Canon-Boards 01 und 02 kontrollieren Charakter, Gesicht,
Hände und Anatomie; 03 und 04 kontrollieren Studio und Broadcast-Layout.
CANON-04 ist die identische Charakter-/Studioquelle beider finalen Varianten.
Ein späterer, getrennt autorisierter Rig-/Animationsschritt bleibt trotz der
A/C-Auswahl an die finale Human Visual Acceptance gebunden.

## Ziel

Eine tatsächlich lokal reproduzierbare, Stretchy-Studio-kompatibel gedachte
Voxy-Fixture erzeugen. Die menschlich akzeptierte Referenz
`apps/web/public/brand/voxy/voxy-podcast-stage.png` bleibt die kanonische
Identitätsquelle. Technische Evidence ersetzt keine Human Visual Acceptance.

## In Scope

- natives SVG-Layer-/Pivot-Rig aus dem eigenen Assetbestand;
- unabhängige Steuerung von Kopf, Augen, Lidern, Brauen, Armen, Händen und
  Oberkörper;
- separat im Oberkörper-Layer geführter VOXY-Pin und eDebatte-Pocket-Mark;
- exakt fünf vorhandene, nicht generativ erzeugte Finger-Elemente je Hand;
- sieben deterministische Motion States;
- revisionsgebundener lokaler 8-Sekunden-Render mit 24 fps in `16:9`;
- reproduzierbare Standframes und Hand-Crops in `16:9`, `9:16` und `1:1`;
- Clip-, Asset- und Rig-SHA256 sowie Exact-Head-, Timeline- und
  Render-Provenienz;
- lokaler Hand-/Crop-Smoke als vorgelagerte Evidence für den unabhängigen
  fail-closed Checkpoint aus PR `#588`.

## Technischer Ansatz

`voxy-sitting-master.svg` bleibt ein einziges natives Vektorasset. Der Renderer
steuert dessen vorhandene Gruppen über dokumentierte Pivotpunkte. Arme und Hände
bewegen sich gekoppelt um Schulteranker; Hände werden weder ausgeschnitten noch
pro Frame neu erzeugt. Branding-Elemente erben ausschließlich die starre
Oberkörpertransformation und werden nicht separat deformiert.

Die Fixture nutzt vier ruhige Zustände:

1. `neutral_idle` (0–2 s)
2. `explaining` (2–4 s)
3. `showing_contrast` (4–6 s)
4. `inviting_participation` (6–8 s)

Alle sieben geforderten Zustände sind im Rig-Contract implementiert und getestet.

## Explizit verworfen

- Attempts 1–6;
- Raster-Crops als künstliche Körperteile;
- CSS-Affine-Reparatur einzelner Pixelregionen;
- Masken- oder nachträgliche Handsegmentierung als Animationsmethode;
- generativ neu gezeichnete Hände;
- externe Avatarprovider, Uploads, Runtime-CDNs oder SaaS-Budget;
- Lip-Sync als Voraussetzung.

## Human Gate

Der frühere Motion-Kandidat und die statische Variante B haben
`humanVisualAcceptance = rejected`. Für Primary A und Editorial C bleibt
`humanVisualAcceptance = pending`;
`animationEligible`, `productionEligible` und `autoPublish` bleiben `false`.
Der technische Slice endet maximal in `review`. Merge, Ready-for-Review,
Deployment, Publishing und Production-VOTES sind nicht Teil dieses Scopes.

## Verhältnis zu #588 und #590

`#589` erzeugt Rig und Render-Evidence. `#588` bleibt der unabhängige
200-%-Visual-QA-Checkpoint und wird nicht in diesen Branch kopiert. `#590`
bleibt der providerneutrale Audio-/Caption-/Composition-Slice; sein Scope wird
nicht verändert.
