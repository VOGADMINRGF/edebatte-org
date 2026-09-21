# VOXY-VISUAL-DETECTOR-LICENSE-CONTRACT-01

Stand: 2026-08-14

## Ergebnis

Die in PR #588 zuvor hartkodierte Finger-Evidence wird durch den lokalen,
gewichtslosen `voxy_raster_silhouette_hand_landmarker@2.0.0` ersetzt. Der
Detector wertet ausschließlich RGBA-Pixel der lokal erzeugten PNG-Handcrops
aus, normalisiert kontrolliert rotierte Voxy-Open-Palm-Silhouetten geometrisch,
leitet
Fingerzahl und eine äquivalente Landmark-Struktur ab und läuft ohne Netzwerk,
Upload, SaaS oder neue Detector-Abhängigkeit.

MediaPipe Tasks Hand Landmarker bleibt ein nicht ausgelieferter Kandidat mit
Status `license_review_required`. Weder das NPM-Paket noch ein
`hand_landmarker.task`-Bundle, WASM-Artefakt oder Modellgewicht wurde integriert,
heruntergeladen oder in den Repository-/Evidence-Pfad aufgenommen.

## Betreiberentscheidung

- Standardpfad: lokal / self-hosted / kein externer Detection-Service.
- Kein CDN-Modell und kein Runtime-Netzwerkzugriff.
- Kein Upload visueller Daten und kein SaaS-Budget.
- Detector-Ergebnisse sind ausschließlich QA-Evidence für #588.
- Human Visual Acceptance bleibt zwingend.
- Keine automatische Production-Freigabe oder Veröffentlichung.

## MediaPipe-Audit und Fail-closed-Entscheidung

Der MediaPipe-Frameworkcode und die offiziellen Codebeispiele sind
Apache-2.0-lizenziert. Die offizielle Web-Anleitung verlangt daneben jedoch ein
separates trainiertes Modellbundle und beschreibt dessen Download in das
Projekt, ohne auf derselben Seite eine konkrete Lizenz für das Bundle, dessen
Redistribution, Offline-Hosting und erforderliche Notices zu benennen. Die
Framework-/Sample-Lizenz wird deshalb nicht auf die Gewichte hochgerechnet.

Zusätzlich dokumentiert das MediaPipe-Projekt, dass Tasks-APIs Nutzungs- und
Performance-Metriken an Google senden. Das widerspricht dem für diesen Slice
verbindlichen Zero-Egress-Vertrag, solange kein belastbarer vollständig
offlinefähiger und lizenzgeprüfter Pfad nachgewiesen ist.

Primärquellen:

- Framework/Code: https://github.com/google-ai-edge/mediapipe
- Web-Hand-Landmarker, separates Modell und Beispiel-CDN-Pfad: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- MediaPipe Privacy Notice zu lokalen Eingabedaten und externen Nutzungsmetriken: https://github.com/google-ai-edge/mediapipe#privacy-notice

Technischer Fit: Die Voxy-Master zeigen sehr kleine, flache Vektorhände in
kontrollierten offenen, teils seitlich rotierten Posen. Ein auf natürliche Hände
trainierter Palm-/Landmark-Stack ist für diesen Stil nicht belegt. Die
Alternative prüft genau diesen kontrollierten Rendervertrag. Sie ist ausdrücklich
kein allgemeiner Handdetector und darf nicht durch Threshold-Hacks auf andere
Posen oder Stile ausgedehnt werden.

## Vollständige Lizenzmatrix

| Ebene | MediaPipe Tasks Hand Landmarker | Ausgewählter Voxy-Rasterdetector |
| --- | --- | --- |
| 1. Framework-/Code-Lizenz | Apache-2.0 für Framework und Samples belegt; allein nicht ausreichend | First-party TypeScript im bestehenden Repository; kein kopierter MediaPipe-Code; `approved` |
| 2. Modell / konkrete Weights | konkrete Lizenz für das gepinnte `hand_landmarker.task`-Bundle, kommerzielle Redistribution und Offline-Hosting nicht belastbar belegt; `license_review_required` | keine ML-Weights; gehashtes first-party Algorithmusprofil `voxy-rotation-normalized-open-palm-profile-v2`; `not_applicable_no_weights / approved` |
| 3. Transitive Runtime-Dependencies | NPM-/WASM-/Telemetrie-/Offline-Kette für den konkreten ausgelieferten Pfad nicht freigegeben; nicht installiert | Detector-Kern ist dependency-free TypeScript auf RGBA-Pixeln; vorhandenes Playwright/Chromium dekodiert nur lokale PNGs im bestehenden Capture-Harness; `approved` |
| 4. Attribution / THIRD_PARTY_NOTICES | konkrete Bundle-/WASM-Notices nicht abschließend belegt; `license_review_required` | keine neue Third-Party-Detector-Komponente; Nachweis in `apps/web/THIRD_PARTY_NOTICES.voxy-visual-detector.md`; `approved` |

Gesamtstatus:

- MediaPipe: `preferred_candidate / license_review_required / unshipped`
- `voxy_raster_silhouette_hand_landmarker@2.0.0`: `license_approved`

## Detector- und Modellprovenienz

- Detector: `voxy_raster_silhouette_hand_landmarker`
- Detector-Version: `2.0.0`
- Runtime: `pure-typescript-rgba-pca-v2`
- Modellart: `weightless_algorithmic_profile`
- Modell-/Profil-ID: `voxy-rotation-normalized-open-palm-profile-v2`
- aktueller Profil-SHA-256: `75ae283ba8eea2e5637f2d9c373d333132086f99f5a6b7194dcbdb8a82b25f4c`
- Mindest-Confidence: `0.75`
- Input: lokal erzeugter, gepolsterter PNG-Handcrop mit eigenem SHA-256
- Output: Detection, capture-seitig belastbare Handedness, Confidence,
  Fingerzahl und `1 + fingerCount * 4` äquivalente Rasterlandmarks; bei fünf
  Fingern genau 21 Landmarks; zusätzlich PCA-Hauptachse, Originalrotation,
  Normalisierungsstatus, normalisierter Input-SHA-256, Padding- und
  Cropverlust-Evidence

Der Profil-Hash wird im Capture aus der kanonischen serialisierten
Detector-Konfiguration berechnet. Eine Profiländerung erzeugt dadurch andere
Provenienz und einen neuen revisionsgebundenen Evidence-Key.

## Fail-closed-Vertrag

- Keine Hand erkannt: `detected = false`, `fingerCount = null`.
- Crop berührt die Eingabegrenze oder Topologie/Confidence reicht nicht:
  `fingerCount = null` und `hand_detection_unusable`.
- Keine belastbare PCA-Hauptachse, Normalisierungs-Cropverlust oder fehlender
  SHA-256 der normalisierten Maske: `fingerCount = null`.
- Vier oder sechs erkannte Finger bleiben reale Evidence und blockieren über
  `hand_finger_count_invalid`.
- Fehlender oder beschädigter Detector-, Runtime-, Modell-, Input- oder
  Lizenzbeleg blockiert.
- Es gibt keinen Fallback auf fünf Finger.
- Ein Detector-Grün ersetzt nie Human Visual Acceptance.

## Reale negative Bild-Evidence

Der Capture-Workflow rastert und analysiert zusätzlich:

- `negative-fixture/hand-detector/hand-not-detected.png`
- `negative-fixture/hand-detector/insufficient-confidence-cropped-hand.png`
- `negative-fixture/hand-detector/four-finger-hand.png`
- `negative-fixture/hand-detector/six-finger-hand.png`

Vier positive PNG-Fixtures bei `-45°`, `-30°`, `+30°` und `+45°` belegen,
dass Padding, PCA-Orientierung und lokale Rotation vor dem bestehenden
Topologiecheck laufen. Der Vier-Finger-Fall ist `-45°`, der Sechs-Finger-Fall
`+30°` rotiert; beide bleiben nach der Normalisierung anatomisch ungültig.

Der beschädigte Provenienzfall ist getrennt als Metadatenfixture im Manifest
enthalten, weil die Beschädigung gerade nicht im Bild liegt. Alle Negativfälle
sind `mustNeverBeApproved`.

## Grenzen

- keine allgemeine Natural-Hand-/Gestenerkennung
- kein Face-/Eye-Großsystem
- kein generatives Hand-Reparieren
- kein Auto-Approve oder Auto-Publish
- kein externer Provider
- keine Änderung am Rigging-Scope von #589
- bei einer neuen Pose oder einem neuen Voxy-Stil zuerst ehrlicher Detector-Fit-
  und Human-Review-Nachweis; keine künstliche Schwellenabsenkung
