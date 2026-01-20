# Identity & Account Flow – Implementation Briefing  
_eDebatte / eDbtt – Auth, Verification, OTB & Level‑2 Data_

> **Zweck:** Dieses Dokument bündelt den aktuellen Stand rund um Login/Registrierung/Verifikation und beschreibt _konkret_ die nächsten Implementierungsschritte für Codex.  
> Fokus: `/api/auth/*`, Verification‑Modell, OTB‑Stub, Bankdaten/Unterschrift (Level 2), Account‑UI & Telemetrie.

---

## 1. Aktueller Stand (bereits umgesetzt)

### 1.1 Passwort‑Handling & `/api/auth/register`

**Dateien**

- `apps/web/src/utils/password.ts`
- `apps/web/src/app/api/auth/register/route.ts`

**Implementiert**

- Bcrypt‑basierte Passwort‑Hashes (`hashPassword`, `verifyPassword`), Schutz gegen leere Passwörter.
- Neue `POST /api/auth/register`‑Route mit:
  - Request‑Body (Zod‑validiert):

    ```ts
    type RegisterBody = {
      name: string;
      email: string;
      password: string;
      preferredLocale?: string;   // "de" | "en" | weitere CORE/EXTENDED_LOCALES
      newsletterOptIn?: boolean;
    };
    ```

  - Normalisierung: `email.trim().toLowerCase()`, Locale via `core/locale`.
  - Passwort‑Policy:
    - min. 12 Zeichen
    - mindestens eine Ziffer (`[0-9]`)
    - mindestens ein Sonderzeichen (`[^A-Za-z0-9]`)
  - Hash mit `hashPassword(password)`.
  - Anlage des Users in der **core**‑DB (`users`‑Collection) mit Defaults, u. a.:

    ```ts
    emailVerified = false
    verification = {
      level: "none",
      methods: [],
      lastVerifiedAt: null,
      preferredRegionCode: null
    }
    locale = preferredLocale || "de"
    ```

  - PII (Bank/ID) wird hier nicht angefasst.
  - Erzeugung eines E‑Mail‑Verify‑Tokens via `core/auth/emailVerificationService` (Versand aktuell Stub/Log).
  - Response: `201 { ok: true }` – _keine_ Session‑Cookie, bevor E‑Mail bestätigt ist.

**Ergebnis**

- Der frühere 500er in `/api/auth/register` (passwortbezogen) ist behoben.
- Fehlerhafte Eingaben liefern 4xx mit klaren Zod‑Fehlermeldungen.

---

### 1.2 Verification‑Typen & E‑Mail‑Token‑Service (Grundgerüst)

**Dateien**

- `core/auth/verificationTypes.ts`
- `core/auth/emailVerificationTypes.ts`
- `core/auth/emailVerificationService.ts`

**Implementiert**

- **VerificationLevel** & **IdentityMethod**:

  ```ts
  export type VerificationLevel = "none" | "email" | "soft" | "strong";

  export type IdentityMethod =
    | "email_link"
    | "email_code"
    | "sms_tan"
    | "otb_app"
    | "eid_scan"
    | "id_upload"
    | "offline_code";

  export type UserVerification = {
    level: VerificationLevel;
    methods: IdentityMethod[];
    lastVerifiedAt?: Date | null;
    preferredRegionCode?: string | null; // regionCode gem. core/regions/types
  };
  ```

- E‑Mail‑Token‑Typ:

  ```ts
  export type EmailVerificationTokenDoc = {
    _id: ObjectId;
    userId: ObjectId;
    email: string;
    tokenHash: string;    // Hash des tatsächlichen Tokens
    createdAt: Date;
    expiresAt: Date;      // z. B. +24h
    usedAt?: Date | null;
  };
  ```

- Service‑Funktionen (Token‑Erzeugung & ‑Verbrauch) inkl. Upgrade der Verification:

  ```ts
  createEmailVerificationToken(userId, email): Promise<{ rawToken: string }>;
  consumeEmailVerificationToken(rawToken): Promise<UserDoc | null>;
  ```

  - `consumeEmailVerificationToken`:
    - prüft Hash + Ablauf.
    - setzt `emailVerified = true`.
    - hebt `verification.level` mindestens auf `"email"` an (Reihenfolge: `none < email < soft < strong`).
    - pusht passende `verification.methods` (z. B. `"email_link"`).
    - setzt `verification.lastVerifiedAt = now()`.

---

### 1.3 Account‑Domain & UI

**Dateien**

- `features/account/types.ts`
- `features/account/service.ts`
- `apps/web/src/app/api/account/overview/route.ts`
- `apps/web/src/app/api/account/settings/route.ts`
- `apps/web/src/app/account/page.tsx`
- `apps/web/src/app/account/AccountClient.tsx`
- `apps/web/src/app/(components)/SiteHeader.tsx`

**Implementiert**

- `getAccountOverview` / `updateAccountSettings` lesen User‑Daten aus triMongo (**core**) und leiten ab:
  - Anzeige‑Name, E‑Mail, Locale
  - Rollen/Tier/Groups (Berechtigungen)
  - `verificationLevel`, `verificationMethods`, `emailVerified`
  - Newsletter‑Opt‑In
- Neue API‑Routen:
  - `GET /api/account/overview` – liefert den Account‑Snapshot.
  - `POST /api/account/settings` – Zod‑validiertes Update (Name, Locale, Newsletter).
- `/account`:
  - server‑geschützt (nur eingeloggte Nutzer).
  - rendert `AccountClient`:
    - Formular für Display‑Name, Locale, Newsletter‑Opt‑In.
    - Security/Verification‑Abschnitt: zeigt `emailVerified`, `verificationLevel`, Methoden.
    - Hinweise auf Mitgliedschaft / Nutzung (Platzhalter).
- SiteHeader:
  - Erkennt Session via Cookies.
  - Zeigt Account‑Dropdown (Desktop) bzw. Link im Mobile‑Menü.
  - Logout‑Button; bei Logout zurück zu Login‑Link.

**Status**

- E150‑Smoke‑Test:  
  `pnpm -C apps/web exec tsc --noEmit -p tsconfig.e150-smoke.json` → **grün**.

---

## 2. Zielbild Identity‑Flow (fachlich)

### 2.1 Drei Stufen (aus User‑Sicht)

1. **Schritt 1 – Konto anlegen**
   - Felder: Name, E‑Mail, Passwort, (optional Locale, Newsletter).
   - Direktes Ergebnis: Konto existiert, aber noch nicht freigeschaltet.
2. **Schritt 2 – E‑Mail bestätigen**
   - E‑Mail‑Link oder Code; danach:
     - `emailVerified = true`
     - `verification.level ≥ "email"`
   - Ab dann: Basissachen (Lesen, eingeschränkt Swipen/Voten).
3. **Schritt 3 – Identität & Zahlungsfähigkeit (Level 2+)**
   - **OTB‑App / eID / ähnliches**: Identitätsprüfung (empfohlen).
   - Ab hier:
     - `verification.level = "soft"` oder `"strong"` (je nach Methode).
     - `verification.methods` enthält `"otb_app"` / `"eid_scan"` etc.
   - **Bankdaten + digitale Unterschrift / ID**:
     - in PII‑DB (separate Collections für Payment‑Profile & Signaturen).
     - Voraussetzung für:
       - größere Beitragskontingente,
       - institutionelle Nutzung,
       - evtl. bestimmte Level‑2‑Votes / Mandate.

### 2.2 Prinzipien

- **Datensparsamkeit**:
  - So wenig PII wie möglich, getrennt in PII‑DB.
  - Keine Weitergabe an Dritte, keine Partei‑Bindung, keine Spendenquittungen (kein gGmbH‑Optimierungszirkus).
- **Transparente Stufen**:
  - Klarer Stepper: „Level 1 – E‑Mail“, „Level 2 – Identität“, „Level 3 – Zahlungsprofil/Unterschrift“.
- **Zugangsmodell**:
  - Basis: E‑Mail ausreichend.
  - Erweiterte Features (z. B. hochgewichtete Abstimmungen, Organisationen, VoG‑Mitgliedschafts‑Verwaltung) erst ab höheren Levels.

---

## 3. Datenmodell – Zielzustand (Überblick)

### 3.1 Core: User & Verification

- `core.users` (bereits vorhanden, erweitert um `verification: UserVerification`).
- `core/auth/verificationTypes.ts` – zentrale Typen & ggf. Helper:

  ```ts
  export function applyVerificationUpgrade(
    user: UserDoc,
    level: VerificationLevel,
    method: IdentityMethod
  ): UserDoc { /* ... */ }
  ```

### 3.2 Core: E‑Mail‑Verifizierung

- Collection: `email_verification_tokens`
- Typ: `EmailVerificationTokenDoc`
- Service: `emailVerificationService.ts` (bereits da, s. oben).

### 3.3 Core: Identity‑Verification‑Sessions (OTB/eID)

Ziel: Jede starke Verifikation läuft über eine Session, die später mit echten Providern gekoppelt werden kann.

- Collection: `identity_verification_sessions` (core‑DB)
- Typ (Ziel):

  ```ts
  export type IdentityVerificationSessionDoc = {
    _id: ObjectId;
    userId: ObjectId;
    method: IdentityMethod;        // "otb_app" | "eid_scan" | ...
    provider: "otb" | "mock";
    status: "pending" | "succeeded" | "failed" | "expired";
    createdAt: Date;
    updatedAt: Date;
    providerSessionId?: string;
    providerPayload?: unknown;     // rohes Provider-Ergebnis
  };
  ```

- Service‑Datei: `core/auth/identityVerificationService.ts`

  ```ts
  startIdentityVerification(userId: ObjectId, method: IdentityMethod): Promise<IdentityVerificationSessionDoc>;
  completeIdentityVerification(sessionId: ObjectId, providerPayload?: unknown): Promise<UserDoc>;
  ```

  - `start*`:
    - legt Session mit `status = "pending"` an.
    - wenn `process.env.OTB_API_URL` gesetzt → Call an OTB, `providerSessionId` speichern.
  - `complete*`:
    - Session laden, Status prüfen.
    - in V1: direkt `status = "succeeded"`.
    - ruft `applyVerificationUpgrade(user, "soft" | "strong", "otb_app")`.
    - speichert `providerPayload` (falls vorhanden).

### 3.4 PII‑DB: Payment & Signaturen

- Collection: `user_payment_profiles` (triMongo PII)

  ```ts
  export type UserPaymentProfileDoc = {
    _id: ObjectId;
    userId: ObjectId;
    ibanMasked: string;        // z. B. "DE89 **** **** 1234"
    bic?: string | null;
    holderName: string;
    createdAt: Date;
    updatedAt: Date;
    verifiedBy?: "sepa_mandate" | "card" | "manual";
  };
  ```

- Collection: `user_signatures` (triMongo PII)

  ```ts
  export type UserSignatureDoc = {
    _id: ObjectId;
    userId: ObjectId;
    kind: "digital" | "id_document";
    storedAt: Date;
    meta?: {
      provider?: "otb" | "manual";
      documentType?: "id_card" | "passport" | "driver_license";
    };
  };
  ```

- Helper‑Dateien (Vorschlag):
  - `core/pii/paymentProfiles.ts`
  - `core/pii/userSignatures.ts`

---

## 4. Offene Blöcke – Aufgabenliste für Codex

### Block 2 – E‑Mail‑Verifizierung (APIs + UI Step)

**Ziel:** Vollständiger Step‑2‑Flow: Registrierung → Verify‑Mail → Identity‑Step.

#### 4.2.1 Backend‑APIs

**Datei:** `apps/web/src/app/api/auth/email/start-verify/route.ts`

- [ ] `POST /api/auth/email/start-verify`
  - Body: `{ email: string }`.
  - Verhalten:
    - Email normalisieren (`trim().toLowerCase()`).
    - User per Email suchen.
    - Wenn kein User: _idempotent_ antworten (`{ ok: true }`), keinen Hinweis, dass User fehlt.
    - `createEmailVerificationToken(user._id, user.email)` aufrufen.
    - E‑Mail Versand **Stub**:
      - aktuell: `console.log("Verify link:", verificationUrl)`.
      - später: SMTP/Provider.
    - Response: `200 { ok: true }`.

**Datei:** `apps/web/src/app/api/auth/email/confirm/route.ts`

- [ ] `POST /api/auth/email/confirm`
  - Body: `{ token: string }`.
  - Ablauf:
    - `consumeEmailVerificationToken(token)` aufrufen.
    - Bei Erfolg:
      - User laden (bereits updated durch Service).
      - Optional Session setzen (Login nach Verify).
      - Response: `200 { ok: true, next: "/register/identity" }`.
    - Bei Fehler/Ablauf:
      - `400` (ungültig) oder `410` (abgelaufen) mit Fehlermeldung.

#### 4.2.2 UI – `/register/verify-email`

**Datei:** `apps/web/src/app/register/verify-email/page.tsx`

- [ ] Seite „Schritt 2/3 – E‑Mail bestätigen“.
  - Inhalt:
    - Text: „Wir haben dir eine E‑Mail mit einem Bestätigungslink geschickt …“
    - Button „E‑Mail erneut senden“ → `POST /api/auth/email/start-verify` (mit im State gemerkter Email).
    - Optional Eingabefeld „Code/Tokens“:
      - POST an `/api/auth/email/confirm`.
  - Anzeige Stepper:  
    `Konto` (abgehakt) → **`E‑Mail` (aktiv)** → `Identität`.

- [ ] Redirect‑Logik:
  - Nach erfolgreichem `POST /api/auth/register` → Redirect auf `/register/verify-email` mit `email` als Query‑Param oder in Session.

---

### Block 3 – OTB / starke Identifikation (Step 2)

**Ziel:** Saubere Stubs & UI für OTB/eID‑Verifikation nach E‑Mail‑Bestätigung.

#### 4.3.1 Identity‑Session‑Modell & Service

**Datei:** `core/auth/identityVerificationTypes.ts`

- [ ] Typ `IdentityVerificationSessionDoc` (s. Abschnitt 3.3).
- [ ] Hilfs‑Enums/Typen bei Bedarf.

**Datei:** `core/auth/identityVerificationService.ts`

- [ ] `startIdentityVerification(userId, method)`:
  - prüft, ob `method` erlaubt ist (z. B. nur `"otb_app"` in V1).
  - legt Session (`status = "pending"`) an.
  - wenn `process.env.OTB_API_URL`:
    - Stub‑Call, `providerSessionId` speichern.
  - Rückgabe: Session.

- [ ] `completeIdentityVerification(sessionId, providerPayload)`:
  - lädt Session, prüft `status`.
  - in V1: direkt `status = "succeeded"`.
  - ruft `applyVerificationUpgrade(user, "soft" | "strong", "otb_app")`.
  - speichert `providerPayload` (falls vorhanden).

#### 4.3.2 Backend‑APIs

**Datei:** `apps/web/src/app/api/auth/verification/start/route.ts`

- [ ] `POST /api/auth/verification/start`
  - Guard: nur eingeloggte User.
  - Body: `{ method: IdentityMethod }`.
  - Prüfen: `emailVerified === true`, sonst `403`.
  - `startIdentityVerification(user.id, method)`.
  - Response (V1, Mock): `{ ok: true, sessionId }`.

**Datei:** `apps/web/src/app/api/auth/verification/confirm/route.ts`

- [ ] `POST /api/auth/verification/confirm`
  - Body: `{ sessionId: string, providerPayload?: unknown }`.
  - `completeIdentityVerification`.
  - Response: `{ ok: true, level: "soft" | "strong" }`.

#### 4.3.3 UI – `/register/identity`

**Datei:** `apps/web/src/app/register/identity/page.tsx`

- [ ] Step‑Seite „Schritt 3/3 – Identität bestätigen“:
  - Intro, warum das notwendig/empfohlen ist (Schutz vor Bots, faire Abstimmungen).
  - Cards/Buttons:
    - „Mit OTB‑App verifizieren“ → `POST /api/auth/verification/start { method: "otb_app" }`.
      - In V1: direkt im Anschluss Mock‑Bestätigung (oder Polling/Bestätigungs‑Button).
    - „Später verifizieren“ → `/account` mit Hinweis, welche Funktionen eingeschränkt sind.
  - Stepper: `Konto` (✓), `E‑Mail` (✓), **`Identität` (aktiv)**.

- [ ] Nach erfolgreicher Identitäts‑Verifikation:
  - Redirect auf `/account` oder direkt `/contributions/new` (konfigurierbar).

---

### Block 4 – Level 2: Bankdaten + Unterschrift / ID (PII)

**Ziel:** PII‑Profile & Signatur‑Status, um `verification.level = "strong"` zu ermöglichen.

#### 4.4.1 PII‑Schemas & Helper

**Dateien (Vorschlag)**

- `core/pii/paymentProfiles.ts`
- `core/pii/userSignatures.ts`

**Aufgaben**

- [ ] PII‑Collections & Typen wie in Abschnitt 3.4 implementieren.
- [ ] Helper‑Funktionen:

  ```ts
  getPaymentProfileByUserId(userId);
  upsertPaymentProfile(userId, { iban, bic, holderName });

  getSignaturesByUserId(userId);
  addUserSignature(userId, payload);
  ```

- [ ] IBAN‑Validierung (z. B. einfache Regex / Modulo‑Check) – V1 reicht Client + Basiskontrolle.
- [ ] Maskierung (`ibanMasked`) statt roher Speicherung.

#### 4.4.2 Backend‑APIs

**Datei:** `apps/web/src/app/api/account/payment-profile/route.ts`

- [ ] `POST /api/account/payment-profile`
  - Guard: nur eingeloggte User.
  - Body: `{ iban: string, bic?: string, holderName: string }`.
  - Validierung + Maskierung.
  - `upsertPaymentProfile(userId, ...)`.
  - Response: `{ ok: true }`.

**Datei:** `apps/web/src/app/api/account/signature/route.ts`

- [ ] `POST /api/account/signature`
  - Guard: nur eingeloggte User.
  - Body V1: `{ kind: "digital" }`.
  - `addUserSignature(userId, { kind: "digital" })`.
  - Response: `{ ok: true }`.

**Helper‑Logik (optional)**

- [ ] `applyStrongVerificationIfComplete(userId)`:
  - prüft:
    - `verification.level >= "soft"`.
    - Payment‑Profil vorhanden.
    - Signatur vorhanden.
  - hebt `verification.level` auf `"strong"`.

#### 4.4.3 Account‑UI – „Verifizierung & Sicherheit“

**Datei:** `apps/web/src/app/account/AccountClient.tsx`

- [ ] Abschnitt „Verifizierung & Sicherheit“ erweitern:
  - Anzeige:
    - E‑Mail: verifiziert / nicht.
    - Identität: Level + Methoden.
    - Zahlungsprofil: ja/nein.
    - Digitale Unterschrift: ja/nein.
  - CTAs:
    - „E‑Mail bestätigen“ → `/register/verify-email` (wenn nötig).
    - „Identität bestätigen (OTB)“ → `/register/identity`.
    - „Zahlungsmethode hinterlegen“ → Modal/Formular (POST `/api/account/payment-profile`).
    - „Digitale Unterschrift hinterlegen“ → Stub/Modal (POST `/api/account/signature`).

---

### Block 5 – UI/Flows auf `/register` & `/login`

**Ziel:** Moderner, klarer 3‑Step‑Flow mit verständlichen Texten.

#### 4.5.1 `/register` als Step‑1‑Form

**Datei:** `apps/web/src/app/register/page.tsx`

- [ ] Formular:
  - Name, Email, Passwort, optional Locale, Newsletter‑Checkbox.
  - POST → `/api/auth/register`.
  - Bei Erfolg → Redirect `/register/verify-email`.
- [ ] Stepper‑UI (oben):
  - „Schritt 1/3 – Konto“
  - `Konto` (aktiv), `E‑Mail`, `Identität`.
- [ ] Textblöcke unter dem Form:
  - Erklärung:
    - keine Partei, kein Verein, kein Lobby‑Netzwerk.
    - keine Spendenquittungen (keine Rücksubventionierung aus Steuergeld).
    - warum Verifikation wichtig ist (Schutz vor Bots, faire Abstimmung).
  - Hinweis auf Datensparsamkeit & PII‑Trennung.

#### 4.5.2 `/login` UX

**Datei:** `apps/web/src/app/login/page.tsx` (oder bestehendes Pendant)

- [ ] Klare Fehlermeldungen:
  - „E‑Mail/Passwort falsch“ (ohne Details).
  - „Bitte E‑Mail noch bestätigen“ -> Link zu `/register/verify-email`.
- [ ] Optional: Hinweis, dass Level‑2‑Features erst nach Identität/Freischaltung zur Verfügung stehen.

---

### Block 6 – Telemetrie & Akzeptanzkriterien

#### 4.6.1 Telemetrie‑Events

**Datei:** `core/telemetry/aiUsageTypes.ts` bzw. globaler Event‑Layer

- [ ] Neue Pipelines/Eventtypen:

  ```ts
  "identity_register"
  "identity_email_start"
  "identity_email_confirm"
  "identity_otb_start"
  "identity_otb_confirm"
  "identity_strong_completed"
  ```

- [ ] Events an relevanten Stellen feuern:
  - nach erfolgreichem `/api/auth/register`
  - nach `/api/auth/email/start-verify`
  - nach `/api/auth/email/confirm`
  - nach `/api/auth/verification/start`
  - nach `/api/auth/verification/confirm`
  - nach erfolgreichem `applyStrongVerificationIfComplete`.

- [ ] Später: Dashboard‑Kacheln (Abbruchraten je Step).

#### 4.6.2 Acceptance‑Checkliste

Technisch:

- [ ] `POST /api/auth/register` erzeugt neuen User, 4xx bei Zod‑Fehlern, keine 500er.
- [ ] `POST /api/auth/email/start-verify` erzeugt Token, antwortet immer `{ ok: true }`.
- [ ] `POST /api/auth/email/confirm` setzt `emailVerified = true`, `verification.level ≥ "email"`.
- [ ] `POST /api/auth/verification/start` + `confirm` heben Level auf `"soft"` / `"strong"` (Mock).
- [ ] Payment/Signature‑APIs speichern in PII‑DB.
- [ ] `/account` zeigt korrekten Security/Verification‑Status.
- [ ] `pnpm -C apps/web exec tsc --noEmit -p tsconfig.e150-smoke.json` grün.

UX:

- [ ] Flow: `/register` → `/register/verify-email` → `/register/identity` → `/account` funktioniert ohne Sackgassen.
- [ ] Fehlermeldungen für User verständlich (Passwort zu kurz, E‑Mail vergeben, Token abgelaufen).
- [ ] Nutzer sehen klar, welche Daten pro Level nötig sind und warum.

---

## 5. Empfohlene Implementierungsreihenfolge für Codex

1. **Block 2** – E‑Mail‑Verify‑APIs + `/register/verify-email`.
2. **Block 3** – Identity‑Sessions + `/register/identity` (OTB‑Mock).
3. **Block 4** – Payment/Signature‑PII + Account‑Erweiterung.
4. **Block 5** – Register/Login‑UX (Stepper, Texte).
5. **Block 6** – Telemetrie‑Events + kleinere UX‑Feinschliffe.

Nach jedem Block:  
`pnpm -C apps/web exec tsc --noEmit -p tsconfig.e150-smoke.json`

Dieses Briefing kann 1:1 als `tools/migration/VPM25/IDENTITY_FLOW_BRIEFING.md` oder ähnlich ins Repo gelegt und von Codex als Arbeitsgrundlage genutzt werden.
