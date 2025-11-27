# E150_NEEDS_REVIEW

Diese Datei sammelt Stellen im Code, an denen weiterer Feinschliff oder E150-Hardening sinnvoll wäre.

## Potenzielle Baustellen

- [x] `apps/web/src/app/api/admin/identity/funnel/route.ts` – [hardening] auf Telemetrie-Snapshot und Staff-Guard umgestellt; PII-Zählungen entfernt, Legacy-Route bleibt als kompatible Anzeige bestehen.
- [x] `features/ai/orchestratorE150.ts` – [hardening] Provider-Health typisiert, Outcome-Logging für alle Provider integriert; Retry/Error-Budgets weiterhin als zukünftiger Feinschliff offen.
- [x] `scripts/vog_apply_civic_search_v2.sh` – [legacy_keep/todo] als R&D-Vorlage markiert, bleibt für spätere Provider-Erweiterungen erhalten.
- [x] `scripts/wire_vog_pipeline.sh` und `scripts/apply_vog_ux_pipeline.sh` – [legacy_keep] mit LEGACY-Hinweis versehen, weiterhin bewusst unvollständig als Referenz.
- [x] `scripts/fix_v1_landingeDbtt.sh` – [legacy_keep] als Reparatur-Stub gekennzeichnet, keine produktive Nutzung.
- [x] `scripts/hotfix_run.sh` – [legacy_keep] Hotfix-Stubs mit LEGACY-Hinweis belassen, keine automatische Ausführung.

Erledigt in diesem Run:

- [x] Admin-Dashboards (Identity/AI Usage) mit klareren States versehen; kein weiterer Hardening-Bedarf identifiziert.
- [x] Streams/Overlay – [hardening] Stream-Status typisiert (draft/scheduled/live/ended/cancelled), Live/Ende-Guards für Agenda/Voting ergänzt
  und Overlay-Client mit Lade-/Fehlerzuständen versehen.
- [x] AnalyzeWorkbench – [cleanup] Statement-Liste mit Filter/Sortierleiste und klaren Leerhinweisen versehen; API-Shape unverändert.

Offen bleibend:

- [ ] `features/ai/orchestratorE150.ts` – [hardening] Monitoring-/Retry-Strategie weiterhin ausstehend; erfordert definiertes Fehlerschwellen-Konzept.

## Vorschläge für nächsten Codex-Run

- Streams/Events-Hardening: Logging- und Retry-Strategien für Streaming-/Overlay-Pfade prüfen, ohne Legacy-Komponenten zu löschen.
- Orchestrator E150: Fehlerbudgets und Backoff/Retry zentralisieren, Healthscore-gestützte Routing-Entscheidungen dokumentieren.
- Research-Board/Analyze-UX: Filter/Sortierung und Telemetrie ergänzen, um Nutzerwege messbar zu machen.
- Contribution-Analyze: UX-Feinschliff und Validierungen (z.B. Beitragsvorschläge vs. Eingaben) harmonisieren.
- Region-Filter im AI-Usage-Dashboard durchziehen (API-Param bereits vorhanden, UI fehlt).
- Stream-Moderation: optionale Cancel/Schedule-Flows ergänzen und SSE-Broadcast zentralisieren.
- Analyze-Telemetrie: Interaktionen mit Filtern/Sortierungen messen, ohne PII zu erfassen.

## Orchestrator-Hardening – Stand

Die Provider-Auswahl berücksichtigt jetzt typisierte Health-States (healthy/degraded/down/unknown) und gewichtet die Scoring-Heuristik entsprechend. Alle Provider-Ausgänge werden als AiUsage-Ereignisse geloggt, sodass fehlgeschlagene Läufe transparent sind und Kosten pro Versuch sichtbar werden. Circuit-/Retry-Strategien und explizite Fehlerbudgets sind weiterhin offen und sollten in einem Folgerun konsolidiert werden (Backoff, Provider-Rotation, konfigurierbare Schwellwerte).
