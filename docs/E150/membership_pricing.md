# eDebatte & eDebatte – zentrale Pricing-Struktur

Alle membership- und App-Pricings liegen in `apps/web/src/config/pricing.ts` und werden von den Seiten `/mitglied-werden`, `/mitglied-antrag` und `/nutzungsmodell` genutzt. Die Datei ist TS-strikt typisiert und enthält:

- **`VOG_MEMBERSHIP_PLAN`** – Basisdaten der eDebatte-Mitgliedschaft (Bezeichnung, Beschreibung, orientierender Monatsbeitrag pro Person).
- **`EDEBATTE_PLANS`** – Liste der eDebatte-Pakete (`edb-start`, `edb-pro`) mit Label, Beschreibung und Listenpreis (Amount + Interval `month | year`).
- **`MEMBER_DISCOUNT`** – zentrale Rabattregel (aktuell 25 %) inklusive Anwendungsbereich (`edebatte`, `merch`).
- **`calcDiscountedPrice`** – Helper, der den rabattierten Preis aus dem Listenpreis berechnet.

## Neue Pakete oder Rabatte ergänzen

1. **Neues eDebatte-Paket**: In `EDEBATTE_PLANS` einen weiteren Eintrag mit `id`, `label`, `description` und `listPrice` anlegen. Die Seiten lesen automatisch alle Einträge der Liste aus und zeigen Listen- und Mitgliedspreis an.
2. **Weitere Rabatte**: `MEMBER_DISCOUNT` erweitern oder zusätzliche `DiscountRule`-Objekte definieren. Verwende `calcDiscountedPrice(listPrice, discountPercent)`, um neue Prozentsätze einzubinden.
3. **Mitglieds-Orientierungswert anpassen**: `VOG_MEMBERSHIP_PLAN.suggestedPerPersonPerMonth` ändern; der Wert fließt direkt in den Rechner auf `/mitglied-werden`.

Die Seiten greifen ausschließlich auf diese Quelle zu, um harte Zahlen zu vermeiden und konsistente Darstellung zwischen Mitgliedschaft, Nutzungsmodell und Antrag zu gewährleisten.
