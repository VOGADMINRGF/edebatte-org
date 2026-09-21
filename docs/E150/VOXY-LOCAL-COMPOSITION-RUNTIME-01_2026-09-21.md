# VOXY-LOCAL-COMPOSITION-RUNTIME-01 — Implementation Evidence

Datum: 2026-09-21  
Issue: #568  
Task: `VOXY-LOCAL-COMPOSITION-RUNTIME-01`

## Autorisierung

Der Task wurde nach Closure von #567, #569 und #580 über den bestehenden Single-Writer in `docs/E150/OpenTasks.md` auf `codex_ready` gesetzt. Der taskbezogene Preflight lief auf sauberem `main@88b68cbeeb3d15aa01ceebd4fe3efba5d9b3b3b4` und ergab:

```json
{
  "taskId": "VOXY-LOCAL-COMPOSITION-RUNTIME-01",
  "status": "codex_ready",
  "executable": true,
  "branchCreationAllowed": true
}
```

Erst danach wurde `feat/voxy-local-composition-runtime-01` erzeugt.

## Implementierter Runtime-Slice

Der Slice ergänzt die bestehende Voxy-Architektur additiv. Die bisherigen Noop-/Provider-/Queue-Preview-Verträge werden nicht umgedeutet oder gelöscht.

- `localCompositionRuntime.ts`: kanonische Job-/Output-/Idempotenz-/Validierungsverträge.
- `localCompositionRuntimeStore.ts`: persistenter Mongo-Primary-Store mit In-Memory-Testfallback für genau einen Job und einen Output pro deterministischer Composition-Identität.
- `localCompositionRuntimeService.ts`: review-first Queue-, Execute- und Retry-Semantik. Der Request besitzt bewusst kein Approval-Feld; eine serverseitige `VoxyLocalCompositionApprovalAuthority` muss die Renderfreigabe liefern.
- `localCompositionProcessExecutor.ts`: gemeinsamer server-only Adapter für Dossier-Automation und das spätere Admin Studio. Er ruft den lokalen Worker ohne Shell-Interpolation und mit Timeout auf.
- `render-voxy-local-composition.ts`: realer Playwright/FFmpeg-Worker auf dem vorhandenen Character-Motion-Fixture und den kanonischen Voxy-Masterassets.
- `render-voxy-local-composition-smoke.ts`: reproduzierbarer realer MP4-/WebM-Smoke mit lokal erzeugtem 8-s-Testaudio.

## Idempotenz und Persistenz

Die Composition-Identität wird ausschließlich aus `briefingId + scriptVersion + locale + format + renderProfile` gebildet. Der vollständige Input erhält zusätzlich einen Fingerprint. Zwei parallele identische Requests landen deterministisch auf demselben Job. Ändert sich Inhalt unter derselben Identität ohne neue Scriptversion, wird fail-closed ein `idempotency_conflict` erzeugt.

Jobzustände sind:

`queued → rendering → rendered → review_ready`

Fehler führen ausschließlich zu `failed`. Ein kontrollierter Retry verwendet dieselbe Job-/Output-Identität und erhöht nur `attempt`.

Der Output-Record enthält gemeinsam:

- H.264/AAC MP4 Master,
- VP9/Opus WebM Preview,
- WebVTT,
- SRT,
- SHA-256,
- Dateigröße,
- Dimensionen,
- Dauer,
- Timeline-/Input-Bindung.

Ein Output wird erst nach erfolgreichem Dateischluss und Verifikation persistiert.

## Render- und Sicherheitsgrenzen

Vor jedem Worker-Lauf wird `VOXY-V3.10.5-HUMAN-FINAL` über `assertVoxyFinalCanonBinding()` fail-closed geprüft. Der Worker:

- verwendet ausschließlich lokale `/brands/voxy/`-Assets,
- blockiert externe HTTP(S)-Requests während des Frame-Renders,
- bindet Audio per SHA-256 und erlaubtem Root,
- prüft Pfadgrenzen via `realpath`,
- startet FFmpeg ausschließlich mit Argumentlisten und `shell:false`,
- rendert in ein zufälliges Staging-Verzeichnis,
- prüft MP4/WebM per `ffprobe` auf Video-, Audio- und Subtitle-Streams sowie Dimension und Dauer,
- promoted das Staging erst nach vollständiger Prüfung atomar in das finale lokale Output-Verzeichnis,
- löscht Teiloutputs bei Fehlern.

Maximalgröße: 250 MB pro Outputdatei. Runtime-/Command-Timeouts bleiben begrenzt.

## Review- und Publishing-Grenzen

`review_ready` ist ausdrücklich nicht `approved` und nicht `published`. Jeder erzeugte Output führt:

- `reviewRequired=true`
- `reviewStatus=needs_review`
- `publicAsset=false`
- `uploaded=false`
- `scheduled=false`
- `socialPosted=false`
- `published=false`

Es gibt in diesem Slice keinen Social-Connector, Upload, Scheduler, Plattform-API-Aufruf, Auto-Publish, Lip-Sync oder externen Avatar-Provider.

Die bereits vorhandenen persistenten Review-/Approval-/Queue-Preview-Stores bleiben die bestehenden Wahrheiten. #568 führt keine zweite Review-Queue ein.

## Fokussierte Tests

`apps/web/tests/voxy-local-composition-runtime.contract.test.ts` deckt insbesondere ab:

- parallele identische Requests → ein deterministischer Job,
- neue Scriptversion → neue Jobidentität,
- fehlende serverseitige Approval-Authority → kein Jobstart,
- Worker-/FFmpeg-Fehler → `failed`, kein Output,
- Retry → gleiche Identität, `attempt + 1`,
- 16:9 / 9:16 / 1:1 Dimensionen,
- Duration-/Hash-/Size-/Review-first-Outputprüfung,
- Path-Traversal-/Argument-Injection-förmige IDs fail-closed,
- geänderter Inhalt ohne neue Scriptversion → Idempotenzkonflikt,
- keine Upload-/Schedule-/Social-/Publish-Wirkung.

## Reale Render-Evidence

Der dedizierte Workflow `.github/workflows/voxy-local-composition-runtime.yml` installiert Chromium und FFmpeg, führt fokussierte Contracts und Typecheck aus und erzeugt danach real:

- `master.mp4`
- `preview.webm`
- `captions.vtt`
- `captions.srt`
- `composition-manifest.json`
- `smoke-evidence.json`

Die revisionsgebundene Artifact-Evidence wird erst nach erfolgreichem Exact-Head-CI als technisch grün gewertet.

## Nicht behauptet

Dieser Implementierungsstand behauptet ausdrücklich noch keine Dossier-Auto-Render-Aktivierung, kein fertiges Admin Video Studio (#570), keine Production-Fähigkeit, keinen Upload und kein Publishing. Der gemeinsame Composition-Service ist die technische Runtime-Basis für beide späteren Caller.
