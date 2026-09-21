# VOXY-VOICE-AND-CAPTION-FIXTURE-01 — Locale-Matrix-Closure · 2026-09-21

## Zweck

Dieser Hardening-Slice schließt die nach Merge von PR #590 verbliebene Sprachmatrix-Lücke aus Issue #567. Audio-/Caption-Timeline, WebVTT, SRT und Safe-Areas aus #590 bleiben unverändert.

## Kanonische Sprachwahrheit

Voxy führt keine unabhängige öffentliche Sprachliste. Maßgeblich bleibt `SUPPORTED_LOCALES` aus `core/locale/locales.ts`, re-exportiert über `apps/web/src/config/locales.ts`.

Aktueller kanonischer Stand sind genau 20 Locales:

`de`, `en`, `fr`, `pl`, `es`, `it`, `tr`, `ar`, `ru`, `zh`, `nl`, `pt`, `fi`, `sv`, `no`, `cs`, `hi`, `ro`, `el`, `uk`.

Die Liste im historischen Issue-Text ist insofern nicht mehr als eigenständige SSOT zu lesen. Ein Contract-Test vergleicht die explizite Voxy-Ausgabematrix mit der aktuellen Anwendungs-SSOT und schlägt bei Drift fehl.

## Voice-Unavailable-Vertrag

Für jede kanonische Locale kann Text-/Caption-Vorbereitung fortgesetzt werden. Ein finaler sprachgebundener Render wird aber nur freigegeben, wenn für exakt diese angeforderte Locale ein explizit freigegebenes Voice-Profil vorliegt.

Fehlt eine freigegebene Stimme:

- Status `voice_unavailable`;
- `renderAllowed = false`;
- `captionPreparationAllowed = true`;
- `fallbackLocale = null`;
- kein stiller Wechsel auf Deutsch, Englisch oder eine andere Stimme;
- Human Review bleibt erforderlich.

Damit behauptet dieser Slice ausdrücklich **nicht**, dass für alle 20 Locales bereits freigegebene Produktionsstimmen existieren. Er stellt sicher, dass fehlende Voice-Verfügbarkeit sichtbar und fail-closed bleibt.

## Drift-Gate

Der bestehende `Voxy Voice Caption Contract` wird zusätzlich bei Änderungen an

- `core/locale/locales.ts`,
- `apps/web/src/config/locales.ts`,
- der Voxy-Locale-Matrix

ausgelöst. Der fokussierte Contract-Test verlangt exakte Mengenübereinstimmung mit `SUPPORTED_LOCALES`.

## Grenzen

- kein Voice-Provider wird hinzugefügt;
- keine neue Stimme wird als freigegeben behauptet;
- kein Lip-Sync oder Viseme-Pfad;
- kein Upload, Scheduling, Social Posting oder Auto-Publish;
- keine Änderung der V3.10.5 Character-/Visual-/Voice-Canon-Provenienz.

Refs #567, #568, #570, #590.
