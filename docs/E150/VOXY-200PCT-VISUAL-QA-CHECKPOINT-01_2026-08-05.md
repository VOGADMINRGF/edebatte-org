# VOXY-200PCT-VISUAL-QA-CHECKPOINT-01

Stand: 2026-08-14

## Ergebnis

Der Voxy-Reviewpfad besitzt einen real ausführbaren Browser-Capture-Pfad für
`16:9`, `9:16` und `1:1`. Die Evidence wird mit CSS-Browserzoom `200%` in
Chromium erzeugt, enthält den vollständigen Surface-Capture plus die zehn
dokumentierten Prüfausschnitte und wird an den exakten PR-Head gebunden. Die
Finger-Evidence stammt aus echter lokaler PNG-Pixelanalyse statt aus
hartkodierten `5/5`-Werten. Ein automatisches Ergebnis ersetzt die menschliche
Sichtabnahme ausdrücklich nicht.

## Reale Evidence

Workflow: `.github/workflows/voxy-visual-qa-contract.yml`

Generator:

```bash
VOXY_EVIDENCE_COMMIT_SHA=$(git rev-parse HEAD) \
  pnpm -w exec tsx apps/web/scripts/capture-voxy-200pct-evidence.ts \
  --output=artifacts/voxy-200pct-visual-qa
```

Im `pull_request`-Workflow wird ausdrücklich
`github.event.pull_request.head.sha` verwendet, nicht der synthetische
GitHub-Merge-SHA. Der CI-Artifact-Name lautet revisionsgebunden
`voxy-200pct-visual-qa-<exact-pr-head-sha>`.

Exakte Pfade innerhalb des Artifacts:

- `artifacts/voxy-200pct-visual-qa/16x9/surface-200pct.png`
- `artifacts/voxy-200pct-visual-qa/9x16/surface-200pct.png`
- `artifacts/voxy-200pct-visual-qa/1x1/surface-200pct.png`
- je Format zusätzlich `face_eyes-200pct.png`, `left_hand-200pct.png`,
  `right_hand-200pct.png`, `vog_pin-200pct.png`,
  `edebatte_pocket_mark-200pct.png`, `logo_zone-200pct.png`,
  `microphone_edge-200pct.png`, `waveform-200pct.png`,
  `lower_third-200pct.png` und `caption_safe_zone-200pct.png`
- `artifacts/voxy-200pct-visual-qa/negative-fixture/intentional-blur-crop-200pct.png`
- `artifacts/voxy-200pct-visual-qa/negative-fixture/hand-detector/hand-not-detected.png`
- `artifacts/voxy-200pct-visual-qa/negative-fixture/hand-detector/insufficient-confidence-cropped-hand.png`
- `artifacts/voxy-200pct-visual-qa/negative-fixture/hand-detector/four-finger-hand.png`
- `artifacts/voxy-200pct-visual-qa/negative-fixture/hand-detector/six-finger-hand.png`
- vier zusätzliche gültige PNG-Fixtures
  `valid-five-finger-hand--45deg.png`, `valid-five-finger-hand--30deg.png`,
  `valid-five-finger-hand-30deg.png` und
  `valid-five-finger-hand-45deg.png`
- `artifacts/voxy-200pct-visual-qa/evidence-manifest.json`

Das Manifest enthält SHA-256 je PNG, Viewport, Browserzoom, Exact-Head-SHA,
Evidence-Key, Detector-/Runtime-/Modellprofil-Provenienz, die vierteilige
Lizenzmatrix, Detection-Confidence, Handedness, Fingerzahl,
Landmark-Evidence und den Human-Review-Zustand. Die Pixelanalyse läuft auf einer
separaten Browserseite, damit der zu prüfende Surface-Render während der zehn
Captures unverändert bleibt.

## Lokale Hand-/Landmark-Erkennung

Der typisierte Adapter `VoxyVisualHandDetector` verwendet
`voxy_raster_silhouette_hand_landmarker@2.0.0` mit dem gewichtslosen Profil
`voxy-rotation-normalized-open-palm-profile-v2`. Er segmentiert die helle
neutrale Voxy-Handkomponente aus dem lokalen PNG, polstert die Maske um 24
Pixel, berechnet die Hauptachse der Silhouettenpixel per PCA und normalisiert
die lokale Binärmaske deterministisch in die bereits geprüfte
Upright-Open-Palm-Topologie. Erst danach laufen die unveränderten
Finger-/Daumen-/Topologie- und Confidence-Gates. Bei fünf Fingern entstehen
genau 21 Punkte. Mindest-Confidence bleibt `0.75`.

Evidence enthält den ursprünglichen Crop-SHA, Hauptachsenwinkel und -stärke,
den angewendeten Rotationswinkel, `normalizationApplied`, den SHA-256 der
normalisierten Maske, den Paddingvertrag, Cropverluststatus und den
Detector-Profil-SHA. Nicht belastbare Achsen, Eingaberandkontakt,
Normalisierungs-Cropverlust, unzureichende Confidence oder fehlende Provenienz
setzen die Fingerzahl auf `null`; es gibt keine automatische Fünf-Finger-
Annahme.

Der Capture berechnet den SHA-256 des serialisierten Profils und den SHA-256
jedes Detector-Inputs. Aktueller Profil-SHA-256:
`75ae283ba8eea2e5637f2d9c373d333132086f99f5a6b7194dcbdb8a82b25f4c`.
Es gibt kein Modellgewicht, kein Runtime-CDN, keinen Upload und keinen externen
Detection-Service. Die vollständige Kandidaten- und Lizenzentscheidung steht in
`docs/E150/VOXY-VISUAL-DETECTOR-LICENSE-CONTRACT-01_2026-08-14.md`.

## Reale Negativfixtures

Der Workflow erzeugt weiterhin einen absichtlich fehlerhaften Browser-Render
bei 200 % Zoom. Voxy wird dort tatsächlich über den linken Viewportrand
verschoben und mit einem realen CSS-Blur versehen. Der Generator misst die
Browser-Bounds des Character-Layers und den tatsächlich angewendeten
`computedStyle.filter`; der Workflow schlägt fehl, falls der erwartete reale
Crop oder Blur nicht beobachtet wird.

Die Hand-Detection ergänzt vier real gerasterte PNG-Negativfälle: keine Hand,
ein bei `+30°` an der Bildgrenze abgeschnittener Low-Confidence-Fall, vier
Finger bei `-45°` und sechs Finger bei `+30°`. Vier gültige Fünf-Finger-
PNG-Fixtures bei ungefähr `-45°`, `-30°`, `+30°` und `+45°` belegen den
positiven Normalisierungspfad. Der fehlende oder beschädigte Provenienzbeleg bleibt sinnvollerweise
ein getrenntes Metadatenfixture, weil diese Beschädigung gerade nicht im Bild
liegt. Alle Negativfixtures sind `mustNeverBeApproved`. Keine Strecke setzt bei
Fehlern fünf Finger als Fallback.

## Menschliches Gate im bestehenden Reviewpfad

Der CI-Lauf erzeugt ausschließlich `humanReview.status = pending`. Er kann und
darf keine menschliche Freigabe setzen.

Die Freigabe wird an den bereits vorhandenen persistenten Voxy-Reviewpfad
angebunden:

- Store: `apps/web/src/features/create/voxyRenderPreviewReviewDecisionPersistenceStore.ts`
- Admin-API: `/api/admin/voxy-render-preview-review-decisions`
- erforderlicher persistenter Modus: `persistent_primary`

Für jede Evidence wird ein unverwechselbares Gate erzeugt:

`voxy-visual-qa:<exact-pr-head-sha>:r<review-revision>:<evidence-key>`

`applyPersistedVoxyVisualQaReviewDecision` akzeptiert für das visuelle Gate nur
einen tatsächlich als persistent gekennzeichneten Review-Record mit
`decisionRecordId`, `persistedBy` und `persistedAt`. Die Entscheidung wird wie
folgt auf das QA-Gate abgebildet:

- `mark_review_ready` → `approved`
- `request_revision` → `needs_changes`
- `reject_preview` → `rejected`

Production Eligibility entsteht nur, wenn gleichzeitig:

1. der automatisierte Capture-Check grün ist,
2. die persistierte Decision-Gate-ID exakt Head, Evidence-Key und
   Reviewrevision entspricht,
3. Reviewer und Zeitpunkt aus dem persistenten Record vorliegen,
4. `approvedCommitSha` exakt dem geprüften PR-Head entspricht,
5. `approvedEvidenceKey` exakt dem aus Capture-, QA- und Detector-Evidence
   berechneten Evidence-Key entspricht.

Eine alte oder nur in-memory/metadatenbasierte Freigabe bleibt dadurch
wirkungslos. Jeder neue Commit, jede geänderte Reviewrevision oder veränderte
Capture-/QA-/Detector-Befund erzeugt einen neuen Gate-ID/Evidence-Key. Dieser PR
enthält keine Selbstfreigabe.

## Automatische Gates

- genau ein Browser-Capture je Ausgabeformat
- exakt 200 % CSS-Browserzoom
- kanonische `/brands/voxy/`-Assetpfade
- SHA-256 für vollständige Surface-Captures und alle Prüfausschnitte
- tatsächlicher pixelbasierter Edge-Contrast-Schärfesignalwert je Ausschnitt
- keine Capture-Rechtecke außerhalb des Zielviewports
- lokale bildbasierte Detection je sichtbarer Hand mit Confidence mindestens
  `0.75`
- fünf Finger und genau 21 äquivalente Landmark-Evidenzen je gültiger
  Open-Palm-Pose
- Detector-, Runtime-, Profil-, Modell-/Profil-SHA-, Input-SHA- und
  Lizenzprovenienz vollständig
- ursprünglicher Crop-SHA, PCA-Hauptachse, Normalisierungswinkel,
  normalisierter Input-SHA, Padding und Cropverluststatus vollständig
- Waveform bleibt hinter Voxy und außerhalb der Logo-Zone laut kanonischem
  Layoutvertrag
- Evidence-Key umfasst Capture-Hashes, QA-Befunde, Hand-Evidence, Posen und
  Reviewrevision
- reale absichtlich fehlerhafte Browserfixtures für Crop, Blur und
  Hand-Detection

Halos, subtile Typografiefehler, Anatomie und die endgültige visuelle
Crop-Qualität bleiben zusätzlich menschlich zu prüfen; sie werden nicht durch
Metadaten als menschlich freigegeben ausgegeben.

## Grenzen

- kein Auto-Approve
- keine stillen Toleranzanhebungen
- kein Fingerzahl-Fallback und keine Threshold-Absenkung für ein künstliches
  Grün
- Detector ist auf die kontrollierte flache Open-Palm-Voxy-Pose begrenzt und
  kein allgemeiner Natural-Hand-Detector
- keine Rechte-, Marken- oder Produktfreigabe durch CI
- kein externer Upload oder Publishing
- keine menschliche Freigabe durch den Agenten
- keine Änderung am Rigging-Scope von PR #589

## #589-Exact-Head-Cross-Check

Der schreibgeschützte Cross-Check wird mit
`apps/web/scripts/cross-check-voxy-589-hand-evidence.ts` gegen das
revisionsgebundene #589-Artefakt ausgeführt. Für den Exact Head
`df339f8a3c62031a0a006cabcbf96581b48f9285` wurden aus 12 Standframes alle 24
Handregionen anhand der im Artifact-Manifest enthaltenen Bounds mit dem
24-Pixel-Paddingvertrag neu geschnitten. 23 Crops werden als fünf Finger mit
Confidence `1.0` akzeptiert; die gemessenen Originalrotationen liegen zwischen
`-90°` und `+90°`.

Der Crop `1:1 / 5000 ms / right` bleibt bewusst blockiert: In der kleinen
Rasterauflösung trennt die normalisierte Silhouette nur drei aufrechte Finger
plus Daumen, also vier Finger. Derselbe Posezustand wird in `16:9` und `9:16`
korrekt erkannt. Es wurde weder der Confidence-Schwellenwert abgesenkt noch ein
Fünf-Finger-Fallback eingebaut. Für diesen einzelnen Crop bleibt daher Human
Visual Acceptance erforderlich. `humanReview = pending` und
`productionEligible = false` bleiben unverändert.

## Abschlussnachweis

Der endgültige Exact-Head-SHA, Workflow-Run, Artifact-ID, Capture-Hashes,
Detector-/Profilversion und die Checkresultate werden im PR-Kommentar
dokumentiert, damit die Dokumentation selbst den Evidence-Commit nicht
nachträglich verändert.
