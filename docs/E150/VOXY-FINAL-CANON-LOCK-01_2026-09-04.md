# VOXY-FINAL-CANON-LOCK-01

- Datum: 2026-09-04
- Status: hardening
- Zweck: Verhindern, dass ein historischer oder technisch älterer Voxy-Stand erneut als aktueller Character-/Visual-/Voice-Canon verwendet wird.

## Einzige aktuelle Canon-Quelle

Der aktuelle Voxy-Canon ist ausschließlich **V3.10.5 / PR #624** mit der dokumentierten Human Final Acceptance aus:

`docs/E150/VOXY-HOMEPAGE-REFERENCE-FILMS-01_ROOT-CAUSE-COMPOSITING-V3-10-5_2026-08-24.md`

Maschinenlesbare SSOT:

`apps/web/src/features/voxyVideo/finalCanon.ts`

Gebundene Referenz-Provenienz:

- Canon ID: `VOXY-V3.10.5-HUMAN-FINAL`
- Source PR: `#624`
- Reference Render Head: `00ff10e80dc8985da1df64de8e9a6df23b9d13e5`
- Human-Acceptance-Manifest-Head: `c94edbcf5135ee717ac64d9da5db05c09e076c22`
- eDebatte Final MP4 SHA-256: `a5f8875a49249210474f7c1bc5ea31d97fe15816abfb0509cb28f6496eb0120c`
- VoiceOpenGov Final MP4 SHA-256: `ccffe3b04b8369fe7e05398934533d0d2bbf5f88b4bb801ffac0e222c188cbf8`

Der `Reference Render Head` friert **nicht** die zukünftige Produktionssoftware auf diesen Commit ein. Neue Runtime-/Composition-Commits dürfen sich weiterentwickeln; sie müssen jedoch ihre Character-/Visual-/Voice-Referenz explizit an den oben genannten V3.10.5-Canon binden.

Human Final Acceptance:

- `humanHomepageFilmAcceptance = accepted`
- `humanNews5VisualAcceptance = accepted`
- `humanVoxyVoiceAcceptance = accepted`

## Fail-closed Regeln

1. Kein Produktions-, QA-, Preview- oder Stress-Test darf einen anderen Voxy-Character-Stand als aktuellen Canon deklarieren.
2. PR #589 / `VOXY-ANIMATABLE-MASTER-ASSET-01` ist historische Evidence und darf nicht als aktuelle Character-Referenz verwendet werden.
3. Historische Visual-QA-/Explainer-Artefakte dürfen zur Ursachenanalyse gelesen werden, aber nie eine spätere menschlich akzeptierte Canon-Version überschreiben.
4. Fehlt eine explizite Bindung an `VOXY-V3.10.5-HUMAN-FINAL`, schlägt der Canon-Gate fehl.
5. Character-Substitution, stiller Fallback oder automatische Rückstufung auf einen älteren Asset-/Render-Stand sind verboten.
6. Eine zukünftige Canon-Version darf V3.10.5 nur ersetzen, wenn eine neue explizite menschliche Final Acceptance mit neuer Canon-ID, Provenienz, Hashes und aktualisiertem Contract vorliegt.
7. QA darf V3.10.5 auf Fehler prüfen, aber nicht aus einem älteren QA- oder Render-Branch eine neue visuelle Soll-Referenz ableiten.
8. Kein Auto-Publish wird durch diese Canon-Akzeptanz freigegeben.

## Technische Enforcement-Punkte

- `apps/web/tests/voxy-final-canon-lock.contract.test.ts` pinnt Canon-ID, PR, Reference Render Head und beide finalen MP4-Hashes.
- `.github/workflows/voxy-final-canon-lock.yml` führt diesen Contract bei Voxy-relevanten Änderungen aus.
- Drei supersedierte pre-V3.10.5 Render-Workflows werden aus dem aktiven Actions-Verzeichnis entfernt:
  - `.github/workflows/voxy-first-explainer-video.yml`
  - `.github/workflows/voxy-animatable-rig-evidence.yml`
  - `.github/workflows/voxy-character-motion-fixture.yml`
- Ihre Git-Historie und historischen Artefaktverträge bleiben erhalten, sie können aber nicht mehr manuell oder durch einen PR-Trigger als aktuelle Voxy-Evidence gestartet werden.
- Der Contract-Test schlägt fehl, falls einer dieser aktiven Workflow-Pfade später wieder eingeführt wird.
- Neue Composition-/Admin-/Daily-/Stress-Test-Pfade müssen `assertVoxyFinalCanonBinding(...)` verwenden, bevor ein Render als aktueller Voxy-Render akzeptiert oder in Human Review gestellt werden darf.

## Betreiberregel

Wenn ein Render optisch nicht dem V3.10.5-Finalstand entspricht, lautet der Status **`canon_mismatch`** und nicht „neuer Voxy“, „QA-Kandidat“ oder „Human Review Candidate“.

Der falsche Render wird verworfen. Der Canon wird nicht neu diskutiert.
