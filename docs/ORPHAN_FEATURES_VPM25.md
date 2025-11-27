# ORPHAN_FEATURES_VPM25

Zweck: Überblick über Features und Module, die aus VPM25 stammen oder dafür gedacht waren, aber im aktuellen eDbtt-Stand nicht (mehr) sinnvoll verdrahtet sind.

## Status (automatisch per Script gesammelt)

Lauf `pnpm exec tsx scripts/orphan_features_scan.ts` aus dem Repo-Root. Aktuelle Heuristik (Stand: letzter Lauf während dieses Blocks):

**Potential Orphans (Auszug)**

- [true_orphan] apps/web/src/features/analysis – leerer Stub entfernt (keine Importe)
- [legacy_keep] apps/web/src/features/localization – AI-Übersetzungsprototyp, aktuell unverdrahtet
- [true_orphan] features/analysis – leerer Stub entfernt (keine Importe)
- [legacy_keep] features/editor – Legacy-CMS/Editor-Bausteine, derzeit nicht aktiv genutzt
- [legacy_keep] features/event – Prototyp-Komponenten, aktuell nicht eingebunden
- [legacy_keep] features/factcheck – alte Factcheck-Badges/Types, für spätere Migration aufbewahrt
- [legacy_keep] features/facts – Legacy-Facts-Modul, momentan ohne aktive Route
- [legacy_keep] features/media – Medien-/Asset-Wrapper, derzeit nicht referenziert
- [legacy_keep] features/moderation – Moderations-Prototyp, aktuell unbenutzt
- [legacy_keep] features/ngo – NGO-spezifische Flows, in VPM25-Phase entstanden
- [legacy_keep] features/organization – Organisations-Prototyp, kein aktiver Import
- [legacy_keep] features/politics – Politik-spezifische Modelle, aktuell nicht genutzt
- [legacy_keep] features/qr – QR-/Deep-Link-Prototyp, nicht angebunden
- [legacy_keep] features/routing – Legacy-Routing-Helfer, keine aktuellen Importe
- [legacy_keep] features/security – Security-Prototypen, für spätere Hardening-Welle behalten
- [legacy_keep] features/tv – TV/Overlay-Prototyp, bewusst nicht löschen (Streams/Events)

> Vollständige Liste inkl. „Used Features“ liefert das Script im Markdown-Output.

## Manuell bekannte Orphans / Kandidaten

- TODO: Nach Abgleich mit VPM25-Repo ergänzen.
