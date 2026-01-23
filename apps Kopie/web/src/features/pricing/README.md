# eDbtt Pricing & Access

Dieses Modul kapselt alles rund um das Nutzungsmodell der Plattform (Kontingente, Bundles, Earned Credits). Es ist bewusst getrennt von `features/membership`, das ausschließlich die VoG-Bewegung adressiert.

## Bestandteile

- `types.ts` – AccessTier, ContributionLevel, UsageState.
- `config.ts` – Konfiguration der Tiers (citizenBasic, citizenPremium, institutionBasic, …) inkl. inkludierter Beiträge und Preise.
- `credits.ts` – Helper rund um Swipes → Credits und Verbrauch (`applySwipesToCredits`, `canPostContribution`, `consumeContribution`).
- `discount.ts` – `applyVogMembershipDiscount` berücksichtigt den Mitgliederrabatt laut zentraler Pricing-Konfiguration (E150 Part03).
- `components/PricingWidget_eDbtt.tsx` – UI-Komponente zur Darstellung der Kontingente.

## Prinzipien

1. **Lesen & Swipen bleiben frei.**  
   Access-Tiers steuern nur, wie viele eigene Beiträge pro Monat automatisch verfügbar sind.

2. **Earn vs. Pay**  
   Wer viel swiped, kann zusätzliche Credits verdienen (z. B. 100 Swipes → 1 Level‑1-Post).

3. **Citizen vs. Institution**  
   Bürger:innen-Pläne (citizenBasic / citizenPremium) unterscheiden sich von Organisations-Plänen (institutionBasic / institutionPremium) durch Seats & Reports.

4. **Staff / Internal**  
   Team-/Moderationsrollen erhalten unbegrenzte Rechte, sind aber kein öffentliches Produkt.

Dieses Modul liefert eine Single Source of Truth, sodass UI, API und zukünftige Checkout-Flows auf dieselben Zahlen & Regeln zugreifen können.
