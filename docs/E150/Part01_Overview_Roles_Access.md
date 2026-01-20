# E150 – Part 1: Overview, Roles, Access & Usage

Dieses Dokument ist die **zentrale Übersicht** über Rollen, Zugänge, Levels und Nutzung der Plattform eDebatte / eDebatte.  
Es dient als **Single Source of Truth** für Implementierung (Codex), UX, Pricing und spätere Governance.

Grundprinzipien:

- **Deterministisch**: Alle Regeln sind explizit. Keine Magie, keine Heuristik.
- **Konfigurierbar**: Zahlen (Preise, Limits, XP) liegen in Config/DB, nicht hart im Code.
- **PII-sicher**: Personendaten bleiben strikt in der PII-Zone (siehe Part00).
- **Gesellschaft zuerst**: Produkte (eDebatte) sind Werkzeuge. eDebatte ist die Bewegung dahinter.

---

## 1. Mission & Rahmen

eDebatte / eDebatte sind als langfristige, internationale Demokratie-Infrastruktur gedacht.

Ziele:

- **Komplexe Themen verständlich machen**  
  (Kontextkarten, Zuständigkeiten, Folgen, Unsicherheiten).
- **Mehrheiten & Minderheiten fair sichtbar machen**  
  statt Lautstärke oder Geld entscheiden zu lassen.
- **Konflikte strukturieren statt zuspitzen**  
  (Fragen, Knoten, Eventualitäten).
- **Zuständigkeiten transparent machen**  
  (wer kann was ändern, auf welcher Ebene).
- **Barrierearm & mehrsprachig**  
  – für Menschen, die sich bisher selten beteiligen.
- **Unabhängig von Parteien, Stiftungen oder Großspendern**  
  – finanziert über viele Mitglieder mit kleinen Beiträgen, nicht wenige große.

Dieses Dokument beschreibt **nur** Rollen, Zugänge und Nutzung. Details zu Orchestrator, Graph und Streams folgen in Part 2 ff.

---

## 2. Rollenmodell: Access Tiers & Engagement Levels

Das System unterscheidet zwei Achsen:

1. **Access Tiers** – technische / kaufbare Pläne = „Was darf dieser Account?“  
2. **Engagement Levels** – XP-basiert = „Wie aktiv/erfahren ist diese Person?“

Beides wird getrennt gespeichert, aber für **Feature-Gates kombiniert**.

### 2.1 Access Tiers (Zugangs-Ebenen)

Technischer Typ:

```ts
type AccessTier =
  | "public"            // Gast, kein Login
  | "basis"             // registriert, kostenlos
  | "erweitert"         // B2C-Tier (Pro)
  | "premium"           // B2C-Tier (oberste Stufe)
  | "institutionBasic"  // Organisation / Kommune – Einstieg
  | "institutionPremium"// Organisation / Kommune – erweitert
  | "staff";            // internes Team, Admin/Operator
```

Bedeutung (Kurzfassung):

- **public**  
  Gast ohne Account. Darf begrenzt swipen & lesen, aber nicht schreiben.

- **basis**  
  Kostenlos, Registrierungspflicht. Bürger:innen können voll teilnehmen, aber mit Limits (Beiträge, Streams etc.).

- **erweitert (B2C Pro)**  
  Mehr Kontingente, Streams erstellen, Kampagnen in Grenzen.

- **premium**  
  Maximale B2C-Freiheit: höhere Limits, mehr Reports, Research-Features.

- **institutionBasic / institutionPremium**  
  Organisationen/Kommunen. Dürfen eigene Kampagnen & Reports nutzen, aber nie als Organisation swipen oder voten.

- **staff**  
  Intern. Kann Administrations- und Monitoring-Funktionen nutzen. Keine Sonderrechte beim Voten (nur Debug).

Die konkreten Features & Limits pro Tier stehen in Abschnitt 4 (Feature-Matrix).

### 2.2 Engagement Levels (XP-Stufen)

Technischer Typ:

```ts
type EngagementLevel =
  | "Interessiert"
  | "Engagiert"
  | "Begeistert"
  | "Brennend"
  | "Inspirierend"
  | "Leuchtend";
```

XP-Events (Default-Konfiguration):

| Aktion                   | XP |
| ------------------------ | -- |
| Swipe                    | 1  |
| Eventualität schreiben   | 10 |
| Frage/Knoten übernehmen  | 20 |
| Teilnahme an einem Stream| 50 |
| Stream hosten            | 200|

Level-Schwellen (Konfiguration, Defaults):

| Level         | XP ab |
| ------------- | ----- |
| Interessiert  | 0     |
| Engagiert     | 250   |
| Begeistert    | 1.500 |
| Brennend      | 5.000 |
| Inspirierend  | 15.000|
| Leuchtend     | 50.000|

Regeln:

- Level wird immer aus XP + Konfiguration abgeleitet, nie hart codiert.
- Eine zentrale Funktion `getEngagementLevelFromXp(totalXp)` implementiert die Schwellen.

Gates (High-Level, Details in 4.2):

- **Brennend** → Streams erstellen.
- **Inspirierend** → Streams hosten.
- **Leuchtend** → erweiterte Moderation / Quality-Rollen.

---

## 3. B2C-Pläne eDebatte & Mitgliedschaft

Die Plattform trennt bewusst:

- **eDebatte-Pläne (B2C)** – technische Nutzung der App.
- **eDebatte-Mitgliedschaft** – gesellschaftliche Bewegung & Finanzierung.

### 3.1 eDebatte B2C-Pläne (basis / erweitert / premium)

eDebatte-Pläne sind personenbezogene Nutzungspläne (1 Person = 1 Account).

Zentrale Definition (vereinfacht):

```ts
type BillingInterval = "month" | "year";

type EDebattePlanId = "edb-basis" | "edb-erweitert" | "edb-premium";

type EDebattePlan = {
  id: EDebattePlanId;
  label: string;
  description: string;
  listPrice: { amount: number; interval: BillingInterval };
};
```

Pläne (Inhaltlich):

- **basis**
  - 0 € / Monat.
  - Registrierung nötig.
  - Faire Limits (z.B. begrenzte Beiträge/Monat, keine eigenen Kampagnen/Streams).

- **erweitert (Pro)**
  - Monatlicher Preis (z.B. 9,90–19,90 €).
  - Mehr Beiträge, eigene Streams (bei ausreichendem Engagement-Level), 1 Kampagne/Monat, tiefere Reports.

- **premium**
  - Höherer Monatspreis (z.B. 29–49 €).
  - Höchste Limits, 3+ Kampagnen/Monat, Deep-Reports Heimatregion + 1 Wunsch-Ebene, Research-Features.

Alle konkreten Preise liegen in `config/pricing.ts` und können geändert werden, ohne Code zu ändern.

### 3.2 eDebatte-Mitgliedschaft & 25%-Goodie

eDebatte-Mitgliedschaft ist kein Produkt-Abo, sondern Unterstützung der Bewegung:

- Mindestbeitrag: 5,63 € / Monat (weltweit, unabhängig von Einkommen).
- Keine Spendenquittungen, keine Konstrukte zur Steueroptimierung. Einnahmen werden regulär versteuert.
- Finanzierung über viele kleine Beiträge, nicht wenige große.

Technisches Modell (vereinfacht):

```ts
type VogMembershipStatus = "active" | "pending" | "canceled" | "paused";

type VogMembership = {
  userId: string;
  monthlyAmountEUR: number;
  minTermMonths: number; // z.B. 24
  status: VogMembershipStatus;
  startedAt: Date;
  minTermEndAt: Date;
  discountUsed: boolean;
};
```

#### 3.2.1 25 %-Goodie (Rabatt auf eDebatte)

Als „Sahnehäubchen“ gibt es kein permanentes Discount-Gimmick, sondern ein klares Goodie:

**Goodie-Regel:**
Wenn jemand eDebatte als Mitglied mit mindestens 5,63 € / Monat und einer Mindestlaufzeit von 24 Monaten unterstützt, erhält diese Person **25 % Rabatt** auf das eDebatte-Abo (erweitert/premium) **für die ersten 6 Monate** – bei monatlicher Zahlung.

Technische Bedingungen (`function canApplyVogDiscount`):

- `membership.status === "active"`
- `membership.monthlyAmountEUR >= 5.63`
- `membership.minTermMonths >= 24`
- `membership.discountUsed === false`
- eDebatte-Plan mit `interval === "month"`

Beim Abschluss einer eDebatte-Subscription:

- Wenn `canApplyVogDiscount` →
  - `discountType = "VOG_MEMBER_25_6M"`
  - `discountUntil = now + 6 Monate`
  - `discountUsed = true`
- Danach läuft das Abo zum Listenpreis weiter.

Die Mitgliedschaft läuft unabhängig vom Rabatt weiter – sie ist primär Unterstützung der Bewegung, nicht Rabattmaschine.

---

## 4. Feature-Matrix: Was darf wer?

Dieser Abschnitt beschreibt auf hoher Ebene die Zuteilung von Funktionen.
Die konkrete technische Umsetzung erfolgt in zentralen Configs (`config/featureMatrix.ts`, `config/limits.ts`, `config/engagement.ts`, `config/credits.ts`).

### 4.1 Voting & Swipes

Grundprinzip:
1 Person = 1 Stimme. Organisationen dürfen nicht als „eine Stimme“ auftreten.

| Feature                        | public      | basis       | erweitert   | premium      | instBasic | instPremium | staff |
| ------------------------------ | ----------- | ----------- | ----------- | ------------ | --------- | ----------- | ----- |
| Swipen                         | max. 3/Tag  | ∞           | ∞           | ∞            | ✖         | ✖           | ∞ (Test) |
| Statements voten               | ✔           | ✔           | ✔           | ✔            | ✖         | ✖           | ✔   |
| Gewichtete Darstellung (XP/Branche) | ✖     | optional UI | ✔           | ✔            | ✖         | ✖           | ✔   |

Organisationen (institutionBasic, institutionPremium)
**dürfen nicht swipen und nicht voten.** Sie sind Beobachter & Gestalter, keine „Super-Stimmen“.

Gewichtung (z.B. „Stimmen von Pflegekräften im Gesundheits-Thema“) betrifft nur Analyse/Anzeige, nicht das Stimmgewicht selbst.

### 4.2 Streams & Community-Chat

Ziel: Live-Formate ermöglichen, aber Missbrauch minimieren.

| Feature                | public | basis | erweitert | premium | instBasic | instPremium | staff |
| ---------------------- | ------ | ----- | --------- | ------- | --------- | ----------- | ----- |
| Streams ansehen        | ✔      | ✔     | ✔         | ✔       | ✔         | ✔           | ✔   |
| Öffentlichen Chat lesen| ✔      | ✔     | ✔         | ✔       | ✔         | ✔           | ✔   |
| Öffentlichen Chat schreiben | ✖ | ✖    | ✔         | ✔       | ✖         | ✖           | ✔   |
| Interner Unternehmenschat (nur intern) | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ |
| Streams erstellen*     | ✖      | ✖     | limitiert | höher   | intern    | intern + öffentlich Panels | ∞   |
| Streams hosten*        | ✖      | ✖     | ✔         | ✔       | intern    | intern + öffentlich        | ✔   |

* Streams erstellen und hosten sind zusätzlich an Engagement-Level gebunden:

- **Erstellen:** EngagementLevel >= "Brennend"
- **Hosten:** EngagementLevel >= "Inspirierend"

Und durch Plan-Limits:

- **erweitert:** z.B. 2 Streams / Monat
- **premium:** z.B. 5 Streams / Monat
- **Institutionen:** nach Profil (z.B. 10 / Monat für Premium)

KI-Moderation (Hate, Rassismus, persönliche Angriffe etc.) läuft immer für alle, die schreiben dürfen.

### 4.3 Kampagnen & Fragen

| Feature                 | basis | erweitert | premium | instBasic | instPremium |
| ----------------------- | ----- | --------- | ------- | --------- | ----------- |
| Eigene Kampagnen/Monat  | –     | 1         | 3       | 1         | ∞           |
| Fragen je Kampagne      | –     | 5         | 15      | 10        | 100         |

Bürger:innen-Tiers (basis/erweitert/premium) nutzen Kampagnen primär in kollektiven Kontexten (z.B. Initiativen).

Institutionen nutzen Kampagnen für eigene Themenfelder (z.B. Stadtentwicklung, Betriebsrat, NGO-Projekte).

### 4.4 Reports & Governance

| Feature                             | public | basis | erweitert | premium | instBasic | instPremium | staff |
| ----------------------------------- | ------ | ----- | --------- | ------- | --------- | ----------- | ----- |
| Einfache Stimmungs-Reports          | ✔      | ✔     | ✔         | ✔       | ✔         | ✔           | ✔   |
| Deep-Report Heimatregion            | ✖      | ✖     | ✔         | ✔       | eigene Themen (Basis) | eigene Themen (Deep) | ✔   |
| +1 Wunsch-Ebene (z.B. EU)           | ✖      | ✖     | ✖         | ✔       | ✖         | ✖           | ✔   |
| Alle Regionen (global)              | ✖      | ✖     | ✖         | ✖       | ✖         | ✖           | ✔   |
| Prognosen & Szenarien (Light)       | ✖      | ✖     | lokal     | Heimat+1| ✖         | eigene Themen| Max (auf Anfrage) |

Evidence-Graph (E150-Qualität) wird immer erzeugt, aber die Darstellungstiefe hängt vom Tier ab.

---

## 5. Swipes, Contributions & Credits

### 5.1 Swipes

- **public:** max. 3 Swipes/Tag → dann UI-Blocker + Hinweis auf Registrierung.
- **basis / erweitert / premium:** unlimitierte Swipes, aber Telemetrie & Rate-Limits gegen Spam.
- **institution\***: keine Swipes.

Jeder Swipe erzeugt:

- XP (siehe Engagement).
- `swipeCountTotal`.
- Beteiligung an der Credit-Logik.

### 5.2 Contribution-Credits

Regel (Default):

- Alle **100 Swipes** → 1 Contribution-Credit
- Maximal **50 Credits** speicherbar (Soft-Cap, konfigurierbar).

Eine Contribution ist:

- ein längerer Fließtext,
- wird durch den E150-Orchestrator analysiert,
- erzeugt:
  - max. 3 Statements,
  - Notes, Questions, Knots, Eventualitäten, Folgen, Zuständigkeiten.

Die konkreten Limits (Beiträge/Monat pro Tier) liegen in `config/limits.ts` und werden aus dieser Logik abgeleitet.

---

## 6. Login, Identität & Mitgliedschaft

### 6.1 Login-Flow (UI)

Die Login-UI basiert auf einem zweistufigen, konfigurierbaren Flow:

- **Step „credentials“**
  - Eingabe: E-Mail oder Nickname + Passwort.
  - Endpoint: `POST /api/auth/login`.

- **Step „verify“ (wenn 2FA aktiv)**
  - Eingabe eines 6-stelligen Codes.
  - Methode: `email` (Code per Mail) oder `otp` (TOTP-App).
  - Endpoint: `POST /api/auth/verify-2fa`.

Ein kompakter Login (`HeaderLoginInline`) befindet sich zusätzlich im Header (Desktop).

Wichtig:

- **Login = Zugang zu eDebatte**
- **Mitglied werden = eDebatte unterstützen (+ optionales Goodie)**

### 6.2 Technische Identität

- User-Basisdaten (E-Mail, Passwort-Hash, OTP-Secret) liegen ausschließlich in der **PII-DB**.
- AccessTier, EngagementLevel, B2C-Plan, Membership-Status liegen in **Core/Web-DBs** und werden in der Session mitgeführt.

---

## 7. Technische Grundsätze (für Codex)

- Keine magischen Zahlen in Komponenten – alles in zentralen Configs:
  - `config/pricing.ts`
  - `config/featureMatrix.ts`
  - `config/limits.ts`
  - `config/engagement.ts`
  - `config/credits.ts`
- **Kanonische Tier-IDs im Code (Stand Run B2C)**: `public`, `citizenBasic`, `citizenPremium`, `citizenPro`, `citizenUltra`, `institutionBasic`, `institutionPremium`, `staff`. Quelle: `features/pricing/{accessTiers,featureMatrix,limits}`; in `apps/web/src/config/*` nur Re-Exports.
- PII-Daten niemals in Logs oder Telemetrie.
- Alle Telemetrie-Events benutzen nur Core-IDs (keine E-Mails, keine Klar-Namen).
- E150-/E200-Qualität: neue Features müssen:
  - in Typen/Config verankert,
  - in Docs referenziert,
  - in Admin-/Staff-Views sichtbar gemacht werden.

---

## 8. Status & TODOs

Mit diesem Part 1 sind folgende früheren TODOs abgedeckt:

- Feature-Matrix pro Access Tier (High-Level)
- Gates pro Engagement Level
- Pricing-Limits für Paid Tiers (Rahmen, Details in `pricing.ts` + `limits.ts`)
- Contribution-Credit-Threshold

Offen bleiben (für spätere Parts):

- Detail-Design Orchestrator & Evidence-Graph (Part 2–4).
- Vollständige Telemetrie-Spec (Events & KPIs in Part 3.x).
- Tiefen-Spezifikation der Admin-Dashboards (Part 6/7).

Dieses Dokument ist der verbindliche Rahmen für alle Rollen-, Access- und Nutzungsentscheidungen in E150/E200.
