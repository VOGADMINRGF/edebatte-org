## Membership Notes (basierend auf 01_vpm25_original)

### Entitäten & Datenpunkte
- **ContributionInput**: Haushaltsnetto (`net`), Warmmiete (`rent`), Haushaltsgröße (`household` ≥ 1), Fähigkeiten (`skills`), Rhythmus (`monthly` | `once`), Betrag (`amount`), Payment-Methode (`sepa` | `wire`).
- **Member**: Für jede Person ≥ 16 Jahre wird ein Objekt mit `fullName`, `email`, `birth` erfasst.
- **Location**: `country`, `postal`, `city` (bzw. ISO-Ländercode für das Support-Formular).
- **SupportIntent Payload** (`/api/support/intent`): Kombination aller obigen Felder plus `locale`.

### Berechnungslogik (VoiceOpenGov privat)
1. **Vorschlag pro Person:**  
   `base = max(0, net - rent)`  
   `suggestion = max(5.63, base * 0.01)`  
   Ergebnis auf zwei Nachkommastellen runden.
2. **Gesamtbetrag:**  
   `total = suggestionOrChosenAmount * household` (ebenfalls auf zwei Nachkommastellen).
3. **Presets:** `[5.63, 10, 20, 35]` als Schnellwahl.
4. **Haushaltsgröße:** entspricht Anzahl Zugänge (≥ 16 Jahre).

### Flows
1. **Landing → Support:** `MembershipSection` baut einen Query-Link `/{locale}/support` mit Country/Postal/City/Amount/Rhythm/Household/Skills.
2. **Support-Seite:** liest Query-Parameter, erlaubt Anpassungen (Calculator, Members), sendet alles an `/api/support/intent`.
3. **Backend (intent):** nicht analysiert; nimmt Payload entgegen und verschickt Bestätigungen pro Member.

### Offene Punkte für Migration
- Payment-Methoden und `SupporterFormLite`-Flow müssen später auf neue APIs angepasst werden.
- Für VPM/Organisationen gibt es keine eigene Formel; kann dieselbe Engine nutzen, aber mit anderen Presets & Texten.
