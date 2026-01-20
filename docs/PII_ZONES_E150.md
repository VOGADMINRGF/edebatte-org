# PII-Zonen – E150

Dieses Dokument definiert, wo im eDebatte / e-Debatte Monorepo personenbezogene Daten (PII) verarbeitet werden dürfen und wie sie zu schützen sind. Es ergänzt die Vorgaben aus `tools/codex/e150_master_codex_briefing.ts`.

## Zonenübersicht

| Zone | Ordner / Module | Beschreibung |
| --- | --- | --- |
| **PII erlaubt** | `core/pii/**`, `core/auth/**`, `core/users/**`, `apps/web/src/app/api/(auth|account|identity)/**`, `core/db/pii/**`, `core/observability/**` (nur anonymisierte Events), Scripts unter `tools/migration/VPM25/**/pii*` | Hier dürfen Roh-PII gelesen/geschrieben werden. Zugriff erfolgt ausschließlich über Tri-Mongo (`piiConn/piiCol`) oder dedizierte Services. |
| **PII-frei** | `apps/web/src/app/(contributions|feeds|ai|public)/**`, `features/**`, `packages/ui/**`, `packages/features/**`, `core/feeds/**`, `core/prompts/**`, `core/telemetry/**`, `@features/ai/**`, Frontend-Komponenten & Storybook | Diese Bereiche erhalten nur IDs, Masken oder aggregierte Daten. Kein direkter Import von `apps/web/src/models/pii/*` oder anderer PII-Strukturen. |

> **Regel:** PII darf nur in den freigegebenen Modulen verarbeitet werden. Alle anderen Bereiche nutzen ausschließlich anonymisierte/aggregierte Daten oder `safe`-Helper aus `@core/pii`.

## Logging & Telemetrie

1. **Logger-Redaktion:** `core/observability/logger` und `apps/web/src/utils/logger` besitzen gemeinsame Redaktionspfade (`PII_REDACT_PATHS`). Dadurch werden typische Felder (`email`, `phone`, `password`, `token`, `payment.*`, …) automatisch zu `***`.
2. **Helper verwenden:** Nutze `safeUserSummary`, `maskEmail`, `maskPhone` und `logSafeUser` aus `@core/pii/redact`, um User-Kontexte in Logs nur maskiert weiterzugeben.
3. **Keine Rohtexte:** KI-Orchestrator, Feeds, Telemetrie-Events und Monitoring enthalten niemals den originalen Beitragstext eines Users, sondern nur IDs/Hashes.

## Maskierungs-Helper

`@core/pii/redact` stellt folgende Utilities bereit:

- `maskEmail`, `maskPhone`, `maskIban`, `maskName`
- `safeUserSummary(user)` – kompaktes Objekt mit `id`, `emailMasked`, `phoneMasked`, `label`
- `logSafeUser(user, prefix?)` – erzeugt ein flaches Objekt für logger-Kontexte
- `PII_REDACT_PATHS` – Standardliste für pino/Monitoring

Diese Helpers dürfen überall importiert werden (sie enthalten selbst keine Roh-PII), verhindern aber, dass versehentlich vollständige E-Mail-Adressen oder Telefonnummern geloggt/gesendet werden.

## Entwicklungs-Hinweise

- Neue Module, die PII benötigen, leben unter `core/pii/**` oder `apps/web/src/app/api/(auth|account)/**`.
- Features/UI greifen **nie** direkt auf PII-Collections zu. Wenn ein Feature auf aggregierte Daten angewiesen ist, stelle einen Service unter `core/users` oder `core/reports` bereit, der anonymisierte Informationen liefert.
- Bei Reviews immer prüfen:
  - Werden PII-Daten nur in erlaubten Zonen importiert/verarbeitet?
  - Sind Logs/Telemetry von `PII_REDACT_PATHS` erfasst oder wird `safeUserSummary` genutzt?
  - Werden Export-/Download-Routen korrekt gegen Staff/Admin abgesichert?

## Offene Punkte / TODO

- Alte VPM25-Skripte im Ordner `tools/migration/VPM25/**` enthalten Legacy-PII-Flows. Diese bleiben isoliert und werden nach Abschluss der Migration entfernt.
- Bei neuen Datenquellen (z.B. Drittanbieter-Identitätsprüfung) muss vor Umsetzung ein Abschnitt in diesem Dokument ergänzt werden.
