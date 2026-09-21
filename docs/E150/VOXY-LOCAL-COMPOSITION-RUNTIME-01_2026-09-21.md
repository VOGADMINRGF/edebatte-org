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

- `localCompositionRuntime.ts`: kanonische Job-/Output-/Idempotenz-/Validierungsverträge einschließlich revisionsgebundener Review-IDs.
- `localCompositionRuntimeStore.ts`: persistenter Mongo-Primary-Store mit In-Memory-Testfallback für genau einen Job und einen Output pro deterministischer Composition-Identität; Job/Output sind zusätzlich über bestehende `previewReviewFlowId`, `decisionGateId` und optional `dossierRefId` auffindbar.
- `localCompositionRuntimeService.ts`: review-first Queue-, Execute- und Retry-Semantik. Der Request besitzt bewusst kein Approval-Feld; eine serverseitige `VoxyLocalCompositionApprovalAuthority` muss sowohl Renderfreigabe als auch die bestehende Review-Bindung liefern.
- `localCompositionReviewBridge.ts`: additiver server-only Adapter auf den bestehenden `VoxyRenderPreviewReviewDecisionPersistenceStore`; keine zweite Review-Queue und kein zweiter Approval-Store.
- `localCompositionProcessExecutor.ts`: gemeinsamer server-only Adapter für Dossier-Automation und das spätere Admin Studio. Er ruft den lokalen Worker ohne Shell-Interpolation und mit Timeout auf.
- `render-voxy-local-composition.ts`: realer Playwright/FFmpeg-Worker auf dem vorhandenen Character-Motion-Fixture und den kanonischen Voxy-Masterassets.
- `render-voxy-local-composition-smoke.ts`: reproduzierbarer realer MP4-/WebM-Smoke für 16:9, 9:16 und 1:1 mit lokal erzeugtem 8-s-Testaudio sowie Recovery-/Idempotenz-Wiederholungsnachweis.

## Idempotenz und Persistenz

Die Composition-Identität wird ausschließlich aus `briefingId + scriptVersion + locale + format + renderProfile` gebildet. Der vollständige Input erhält zusätzlich einen Fingerprint. Zwei parallele identische Requests landen deterministisch auf demselben Job. Ändert sich Inhalt unter derselben Identität ohne neue Scriptversion, wird fail-closed ein `idempotency_conflict` erzeugt.

Die serverseitige Approval-Authority liefert zusätzlich `approvalRef`, `previewReviewFlowId`, `decisionGateId` und optional `dossierRefId`. Diese Werte können nicht aus dem Runtime-Request gesetzt werden. Sie werden in einem separaten `reviewBindingHash` gebunden. Eine nachträglich abweichende Review-Bindung unter derselben Composition-Identität wird ebenfalls fail-closed als Idempotenzkonflikt behandelt.

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
- Timeline-/Input-Bindung,
- bestehende Preview-Review-/Decision-Gate-Bindung.

Ein Output wird erst nach erfolgreichem Dateischluss und Verifikation persistiert. Falls die Datei bereits vollständig atomar promoted wurde und eine nachgelagerte Persistenz scheiterte, kann ein Retry ausschließlich einen exakt revisions-, Canon-, Review-, Hash- und Metadaten-identischen Final-Output wiederverwenden. Fremde oder veränderte Outputs werden als Konflikt blockiert.

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
- löscht Teiloutputs bei Fehlern,
- verifiziert bei Recovery den V3.10.5-Canon, Job-/Output-Identität, Input-/Timeline-/Review-Bindung und alle gespeicherten Datei-Hashes erneut.

Maximalgröße: 250 MB pro Outputdatei. Runtime-/Command-Timeouts bleiben begrenzt.

## Bestehende Review-Architektur

Die historischen `VoxyRenderPreviewReviewFlow`-, Queue-Preview- und Media/Storage-Readmodels bleiben bewusst unverändert, weil sie ihre frühere Noop-Wahrheit korrekt dokumentieren. #568 überschreibt diese Historie nicht mit neuer Runtime-Wahrheit.

Der neue reale Output wird stattdessen revisionsgebunden an die bestehenden IDs `previewReviewFlowId` und `decisionGateId` gekoppelt. `localCompositionReviewBridge.ts` liest menschliche Entscheidungen aus demselben persistenten `VoxyRenderPreviewReviewDecisionPersistenceStore`, der bereits für die Voxy-Review-Architektur und #588 verwendet wird. Nur `persistent_primary` mit restart- und deployment-rekonstruierbarer Produktionswahrheit gilt als belastbare Review-Entscheidung.

Entscheidungen werden review-only abgebildet:

- `mark_review_ready` → `review_ready`
- `request_revision` → `needs_changes`
- `reject_preview` → `rejected`
- `keep_as_script_only` → `script_only`
- `blocked` → `blocked`
- `comment_only` → weiterhin `needs_review`

Eine Decision mit abweichender `previewReviewFlowId` oder `decisionGateId` wird nicht angewendet. Der Bridge setzt niemals `approved`, Upload, Scheduling, Social Posting oder Publish.

Damit gilt explizit:

- `existingReviewStoreOnly=true`
- `createsSecondReviewQueue=false`
- `marksApproved=false`
- `uploadAllowed=false`
- `publishAllowed=false`
- `schedulingAllowed=false`
- `socialPostAllowed=false`

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

## Fokussierte Tests

`apps/web/tests/voxy-local-composition-runtime.contract.test.ts` und `apps/web/tests/voxy-local-composition-review-bridge.contract.test.ts` decken insbesondere ab:

- parallele identische Requests → ein deterministischer Job,
- neue Scriptversion → neue Jobidentität,
- fehlende serverseitige Approval-Authority → kein Jobstart,
- fehlende vertrauenswürdige bestehende Review-IDs → kein Jobstart,
- geänderte Review-Bindung unter derselben Composition-Identität → Idempotenzkonflikt,
- Worker-/FFmpeg-Fehler → `failed`, kein Output,
- Retry → gleiche Identität, `attempt + 1`,
- 16:9 / 9:16 / 1:1 Dimensionen,
- Duration-/Hash-/Size-/Review-first-Outputprüfung,
- Path-Traversal-/Argument-Injection-förmige IDs fail-closed,
- geänderter Inhalt ohne neue Scriptversion → Idempotenzkonflikt,
- bestehende persistente Review-Decision wird nur bei exakt passender Review-Bindung übernommen,
- In-Memory-Review-Fallback ist keine Produktionswahrheit,
- keine Upload-/Schedule-/Social-/Publish-Wirkung.

## Reale Render-Evidence

Der dedizierte Workflow `.github/workflows/voxy-local-composition-runtime.yml` installiert Chromium und FFmpeg, führt fokussierte Contracts und Typecheck aus und erzeugt danach **real für alle drei Formate** `16:9`, `9:16` und `1:1` jeweils:

- `master.mp4`
- `preview.webm`
- `captions.vtt`
- `captions.srt`
- `composition-manifest.json`

Alle drei Runs verwenden dieselbe kanonische Timeline. `smoke-evidence.json` muss `realFormatCount=3` und `canonicalTimelineAcrossFormats=true` belegen. Anschließend wird der identische 16:9-Worker-Aufruf erneut ausgeführt; der bereits verifizierte Final-Output muss mit denselben MP4-/WebM-/VTT-/SRT-Hashes wiederverwendet werden (`recoveryReuseVerified=true`).

Die revisionsgebundene Artifact-Evidence wird erst nach erfolgreichem Exact-Head-CI als technisch grün gewertet.

## Nicht behauptet

Dieser Implementierungsstand behauptet ausdrücklich noch keine Dossier-Auto-Render-Aktivierung, kein fertiges Admin Video Studio (#570), keine Production-Fähigkeit, keinen Upload und kein Publishing. Der gemeinsame Composition-Service ist die technische Runtime-Basis für beide späteren Caller.
