# VOXY-VOICE-AND-CAPTION-FIXTURE-01

Stand: 2026-09-04

## Ergebnis

Der Voice-/Caption-Slice verarbeitet reale lokale Audiodateien statt nur vorberechneter Metadaten. Der Exact-Head-Workflow erzeugt reproduzierbare **deutsche und englische technische Sprachfixtures** aus committed Transkripten, inspiziert die WAV-Dateien mit `ffprobe` und EBU-R128, normalisiert sie real mit FFmpeg und erzeugt WebVTT, SRT und Caption-Timelines auf Basis der gemessenen Audiodauer.

Wichtig: `espeak-ng` ist **ausschließlich eine lokale CI-/Contract-Fixture**. Diese Stimme ist **nicht** der Voxy-Stimm-Canon und darf keinen Human-Final-Voice-Stand ersetzen. Character-, Visual- und Voice-Canon bleiben getrennt von diesem technischen Caption-/Audiovertrag.

## Reale Quelldateien

Committed Inputs:

- `apps/web/public/brands/voxy/fixtures/voice-caption-source-de.txt`
- `apps/web/public/brands/voxy/fixtures/voice-caption-segments-de.json`
- `apps/web/public/brands/voxy/fixtures/voice-caption-source-en.txt`
- `apps/web/public/brands/voxy/fixtures/voice-caption-segments-en.json`

Der Workflow erzeugt daraus lokale DE-/EN-WAVs unter `artifacts/voxy-voice-caption/<lang>/`.

Vor jeder Evidence-Erzeugung wird fail-closed geprüft, dass das committed gesprochene Transkript und die zusammengesetzten Caption-Segmente textlich übereinstimmen. Bei Drift endet der Lauf mit `spoken_transcript_caption_mismatch`; eine scheinbar gültige Caption-Evidence mit abweichendem gesprochenem Text darf nicht entstehen.

## Exact-Head-Bindung

Auf Pull Requests checkt `actions/checkout` explizit `VOXY_EXACT_HEAD_SHA` aus. Anschließend muss `git rev-parse HEAD` exakt diesem SHA entsprechen. Erst danach laufen Contract-Test, Audioerzeugung, Normalisierung und Evidence-Manifest.

Damit darf ein synthetischer Pull-Request-Merge-Commit nicht mehr als Evidence ausgeführt und anschließend fälschlich unter dem PR-Head-SHA protokolliert werden.

## Tatsächliche Normalisierung

Pro Sprache wird die lokale WAV real normalisiert:

```bash
ffmpeg -i source-voice-<lang>.wav \
  -af loudnorm=I=-16:TP=-1.5:LRA=7 \
  -ar 48000 -ac 1 normalized-voice-<lang>.wav
```

Der Workflow schlägt fehl, wenn:

- integrierte Lautheit nicht zwischen `-17` und `-15 LUFS` liegt,
- True Peak über `-1 dBFS` liegt,
- die Normalisierung die Dauer um mehr als 120 ms verändert.

## Caption-Artefakte

WebVTT und SRT werden aus derselben Segmenttimeline erzeugt. Stable Segment-IDs bleiben in Timeline/WebVTT-Metadaten; SRT enthält nur Sequenznummer, Timing und den tatsächlich sichtbaren Untertiteltext. Interne IDs wie `caption-opening` dürfen nicht als Zuschauertext erscheinen.

Der Runtime-Contract teilt zu lange Scene-Copy deterministisch in zeitlich lückenlose Caption-Segmente, sodass ein von `buildVoxyVoiceCaptionFixturePlan()` erzeugter Plan die formatabhängigen Safe-Area-Limits selbst erfüllt. Callers dürfen keinen nachträglichen Truncate-Hack benötigen.

CI-Artifact: `voxy-voice-caption-<exact-head-sha>`

Pro Sprache werden u. a. erzeugt:

- `source-voice-<lang>.wav`
- `normalized-voice-<lang>.wav`
- `voice-caption-<lang>.vtt`
- `voice-caption-<lang>.srt`
- `caption-timeline-<lang>.json`
- `evidence-manifest-<lang>.json`

Das Manifest bindet Transcript-Hash, Source-Audio, Normalized-WAV, VTT, SRT und Timeline über Exact-Head-SHA und SHA-256 an dieselbe Revision.

## Human Review

Die technische Evidence endet weiterhin mit `humanReview.status = pending`. Der Agent setzt keine menschliche Freigabe. Diese Fixture prüft Audio-/Caption-Integrität; sie definiert keinen neuen Voxy-Character-, Visual- oder Voice-Canon.

## Grenzen

- kein Lip-Sync
- keine Viseme-Generierung
- keine Stimmimitation einer realen Person
- lokale eSpeak-Teststimme ist kein Voxy-Stimm-Canon
- kein externer Voice-Provider
- kein Upload, Scheduling oder Publishing
- keine Selbstfreigabe

## Abschlussnachweis

Exact-Head-SHA, Workflow-Run, Artifact-ID, Messwerte, Hashes und Checkresultate werden nach dem finalen CI-Lauf als PR-Evidence dokumentiert. Vor Merge muss die kanonische `OpenTasks.md` den Task aus `codex_ready` in den belegten Review-/Gate-Status ziehen; die Synchronisierung erfolgt ausschließlich über den bestehenden Single-Writer-Vertrag.
