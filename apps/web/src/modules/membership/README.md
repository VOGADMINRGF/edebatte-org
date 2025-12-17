# VoiceOpenGov Membership (Bewegung)

Dieses Modul gehört ausschließlich zur VoiceOpenGov-Bewegung – also zur ideellen Mitgliedschaft (1 %‑Rechner, Mindestbeitrag 5,63 €, lokale Einbindung). Es hat keinen direkten Einfluss auf das eDbtt-App-Pricing; dieses liegt separat unter `features/pricing`.

## Struktur

- `types.ts` – Grundtypen für VoG-Produkte (Privat/Haushalt).
- `config.ts` – Presets & Mindestbeträge (z. B. 5,63 / 10 / 25 / 50 €).
- `calculator.ts` – pure Helper (`calcSuggestedPerPerson`, `calcTotal`).
- `api.ts` – Platzhalter für künftige Support-/Intent-Calls.
- `components/` – UI-Komponenten:
  - `MembershipCalculator_VOG` – Haushaltsrechner für Bürger:innen.

## Integration (Ausblick)

- **Landing & /mitglied-werden**: nutzen diesen Rechner, um Beiträge vorzuschlagen.
- **features/user**: VoG-Status kann später als Badge/Feld gespeichert werden (optional).
- **Checkout**: `/api/support/intent` oder zukünftige Zahlungsanbieter laufen hier zusammen.

> Hinweis: eDbtt-spezifisches Pricing (citizenBasic, citizenPremium, Bundles, Swipes → Credits) liegt in `features/pricing`. Hier bleibt es bewusst getrennt.
