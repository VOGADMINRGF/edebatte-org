# `/create` Citizen Conversation — UI-Politur

Stand: 2026-09-04  
Scope: bestehender PR `#713` auf Branch `fix/create-mobile-runtime-polish-01`  
Architekturbezug: PR `#682` und `E150_CITIZEN_VOXY_ALPHA2_TARGET_ARCHITECTURE_2026-09-02.md`

## Ergebnis

Die sichtbare `/create`-Hierarchie folgt jetzt auf Mobile und Desktop demselben Bürgerablauf:

1. Anliegen schreiben oder sprechen.
2. Voxy ordnet es im laufenden Dialog ein.
3. Der Bürger bestätigt oder präzisiert die Einordnung.
4. Erst danach wird der nächste Bearbeitungsschritt angeboten.

Voxy bleibt ein ruhiger Gesprächspartner im Dialog. Eine dekorative Chat-Spine und die dauerhaft sichtbare Fünf-Schritte-Pipeline gehören nicht mehr zur `/create`-Projektion. Interne Analyse-, Validierungs- und Quelleninformationen sind progressiv unter Details zugänglich.

Der Debattenstand erscheint im Initialzustand nicht als konkurrierende Oberfläche. Nach einer Einordnung zeigt die schmale Desktop-Spalte nur die aktuelle Entscheidung, die erkannten Themen und eine geschlossene Detailgruppe. Mobile nutzt dieselbe Information als kompakte Statuszeile mit Bottom Sheet. Ausführliche Themenbezüge sind auch im Dialog eingeklappt; die Themen selbst bleiben vor der Bestätigung sichtbar.

Schreiben und Sprechen verwenden denselben Composer-Zustand und denselben Start-Handler. Die Spracherkennung übernimmt die aktive Oberflächensprache. Es wurde keine zweite Create-Runtime ergänzt.

## Guardrails und Ownership

- Die Save-/Resume-Korrekturen aus PR `#713`, einschließlich nullable Workstate-Referenzen, bleiben erhalten.
- Kein Auto-Publish, kein automatischer Merge und kein stiller Handoff wurden ergänzt.
- Der Debattenstand bleibt ein abgeleitetes View Model und kein zweiter Persistenzstatus.
- Die von PR `#682` beanspruchten Citizen-Intake-/Region-Hunks wurden nicht übernommen oder neu implementiert. Insbesondere entstanden weder eine parallele Intake-Route noch eine zweite Domain-/Region-Wahrheit.
- `docs/E150/OpenTasks.md` bleibt wegen des dort dokumentierten Single-Writer-/Review-Kontexts unverändert. Dieser UI-Slice beansprucht keine Statusänderung von `CITIZEN-CORE-REGIONAL-INTENT-REALIGNMENT-01`.

## Verifikation

- Responsive Sichtprüfung bei `390 × 844` und `1440 × 1000`, jeweils für Initial- und eingeordneten Zustand.
- Ergebnis: keine horizontale Überbreite; keine Chat-Spine; Entscheidung auf Mobile sofort in der Statuszeile; kompakte Themenliste auf Mobile; schmale, einklappbare Desktop-Übersicht; Details standardmäßig geschlossen.
- `pnpm -C apps/web run typecheck`
- ESLint auf allen geänderten `/create`-Quelldateien
- 43 gezielte UI-/Interaktionsverträge in sieben Testdateien
- 13 bestehende Runtime-Bridge-/Resume-Tests in drei Testdateien

Die älteren Route-Suites `create-mode.save.route.test.ts` und `create-save.safety-gate.test.ts` erreichen in der aktuellen Arbeitskopie vor dem Save-Vertrag den fail-closed Rate-Limiter-Pfad (`CREATE_RATE_LIMIT_UNAVAILABLE`, HTTP 503). Das ist nicht durch diesen UI-Slice verursacht und wurde hier nicht durch eine unsichere Test- oder Runtime-Ausnahme umgangen.
