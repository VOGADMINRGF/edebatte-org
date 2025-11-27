# Register- & Identity-Flow – V3 Briefing

Ziel: Moderne, sichere und stufenweise Identifizierung der Nutzer*innen für VoiceOpenGov / eDbtt:

1. **Schritt 1 – Account + E-Mail-Verifizierung**
   - Klassische Registrierung mit Name, E-Mail, Passwort.
   - E-Mail-Bestätigung (Link oder Code) als Pflicht.
2. **Schritt 2 – OTB / starke Identifikation**
   - Optionaler, aber empfohlener Schritt nach erfolgreicher E-Mail.
   - Vorbereitung für Anbindung eines OTB-Identity-Providers (oder vergleichbare App).
3. **Level 2+ – Bankdaten + digitale Unterschrift / Personalausweis**
   - Für hochwertige Beteiligung (z. B. bindende Abstimmungen, Zahlungen/Mitgliedschaften).
   - Bankdaten + Unterschrift/ID werden ausschließlich in der PII-DB gespeichert.

Der Flow muss in **Stufen** funktionieren und sich gut in die bestehenden Module integrieren (triMongo, Membership/Pricing, Account-Page).

---

## Block 0 – Bestehende Register-Route stabilisieren

### 0.1 `apps/web/src/utils/password.ts` hart machen

Aktueller Zustand: `hashPassword` nutzt eine undeﬁnierte Konstante (`ROUNDS`), was bei der ersten Registrierung zu einem 500 führt.

**Zielzustand**

- Ein definierter Bcrypt-Runden-Wert (ENV-Override möglich, sonst Default).
- Harte Eingabevalidierung.
- Keine 500er durch triviale Fehler.

**Implementierungsvorschlag**

```ts
// apps/web/src/utils/password.ts
import bcrypt from "bcryptjs";
import { env } from "@/utils/env";

const DEFAULT_ROUNDS = 11;

const ROUNDS =
  typeof env.BCRYPT_ROUNDS === "number" && !Number.isNaN(env.BCRYPT_ROUNDS)
    ? env.BCRYPT_ROUNDS
    : DEFAULT_ROUNDS;

export async function hashPassword(plain: string): Promise<string> {
  const normalized = String(plain ?? "").trim();
  if (!normalized) {
    throw new Error("hashPassword: empty password not allowed");
  }
  return bcrypt.hash(normalized, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  const p = String(plain ?? "").trim();
  const h = String(hash ?? "").trim();
  if (!p || !h) return false;
  return bcrypt.compare(p, h);
}
