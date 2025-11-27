# AUTH_OVERVIEW – Stand Auth / Identity / Verification (eDbtt / VPM25 Merge)

Stand: 2025-11-21  
Gilt für: `apps/web` + `core/*` + `features/auth/*` + `features/account/*`  

Zielbild:  
Registrierung & Identität laufen in **klaren Stufen**:

1. **Account** – E-Mail + Passwort anlegen  
2. **E-Mail verifizieren** – Schutz vor Spam/Bots  
3. **Identität & Level 2+** – OTB / ID + Bankdaten + digitale Unterschrift

Ab bestimmten Levels werden sensible Funktionen (Analyse, Voting, Beiträge) freigeschaltet.

---

## 1. Datenmodell

### 1.1 User-Dokument (core)

**Ort (vereinfacht):**

- `core/auth/verificationTypes.ts`
- `core/auth/emailVerificationTypes.ts`
- `core/auth/identityVerificationTypes.ts`
- User-Typ in `core/users/types.ts` (um `verification` erweitert)

**Wichtige Felder im User:**

```ts
type VerificationLevel = "none" | "email" | "soft" | "strong";

type IdentityMethod =
  | "email_link"
  | "email_code"
  | "sms_tan"
  | "otb_app"
  | "eid_scan"
  | "id_upload"
  | "offline_code";

type UserVerification = {
  level: VerificationLevel;
  methods: IdentityMethod[];
  lastVerifiedAt?: Date | null;
  preferredRegionCode?: string | null; // regionCode aus core/regions/types
};
```

Defaults bei Registrierung:

```
verification: {
  level: "none",
  methods: [],
  lastVerifiedAt: null,
  preferredRegionCode: null,
};

emailVerified: false;
locale: preferredLocale || "de";
```

### 1.2 E-Mail-Verifizierung

Collection: `email_verification_tokens` (triMongo core)  
Typ: `EmailVerificationTokenDoc` in `core/auth/emailVerificationTypes.ts`

```ts
type EmailVerificationTokenDoc = {
  _id: ObjectId;
  userId: ObjectId;
  email: string;
  tokenHash: string;   // Hash des eigentlichen Tokens
  createdAt: Date;
  expiresAt: Date;     // z. B. +24h
  usedAt?: Date | null;
};
```

Service: `core/auth/emailVerificationService.ts`

- `createEmailVerificationToken(userId, email)`  
  → gibt rawToken zurück, speichert nur Hash + Ablaufzeit
- `consumeEmailVerificationToken(rawToken)`  
  → prüft Hash, Ablauf, usedAt, aktualisiert User:

```
emailVerified = true
verification.level = max(existingLevel, "email")
verification.methods += ["email_link" | "email_code"]
verification.lastVerifiedAt = now()
```

### 1.3 Identity-Verifizierung (OTB / eID – V1 als Mock)

Collection: `identity_verification_sessions` (triMongo core)  
Typ: `IdentityVerificationSessionDoc` in `core/auth/identityVerificationTypes.ts`

```ts
type IdentityVerificationSessionDoc = {
  _id: ObjectId;
  userId: ObjectId;
  method: IdentityMethod;        // z. B. "otb_app"
  provider: "otb" | "mock";      // V1: "mock"
  status: "pending" | "succeeded" | "failed" | "expired";
  createdAt: Date;
  updatedAt: Date;
  providerSessionId?: string;
  providerPayload?: unknown;     // rohes Provider-Resultat (später)
};
```

Service: `core/auth/identityVerificationService.ts`

- `startIdentityVerification(userId, method)`  
  → legt Session mit status = "pending" an (V1: provider = "mock")
- `completeIdentityVerification(sessionId, providerPayload)`  
  → setzt status = "succeeded" (Mock), aktualisiert User:

```
verification.level mindestens "soft"
verification.methods += ["otb_app" | ...]
verification.lastVerifiedAt = now()
optional: preferredRegionCode aus Providerdaten (später)
```

### 1.4 Account-View (Lesen der Security-Infos)

Ort:

- `features/account/types.ts`
- `features/account/service.ts`
- `/account` (Server- & Client-Komponenten)

`features/account/service.ts` stellt u. a. bereit:

```ts
type AccountSecurityInfo = {
  emailVerified: boolean;
  verificationLevel: VerificationLevel;
  verificationMethods: IdentityMethod[];
  paymentProfile?: …;
  signature?: …;
};
```

`/account` zeigt diese Daten in einer Security-Box:

- aktueller Level + Beschreibung
- Liste der Methoden (E-Mail, OTB Mock, später weitere)
- CTAs für E-Mail/OTB/Payment/Signature

---

## 2. Passwort & Registrierung

### 2.1 Passwort-Handling

Ort: `apps/web/src/utils/password.ts`

- Bcrypt mit konfigurierbaren Runden
- verhindert leere Passwörter

### 2.2 Registrierung – `/api/auth/register`

- Body: `{ name, email, password, preferredLocale?, newsletterOptIn? }`
- Zod-Validation, Passwort-Policy:
  - Länge ≥ 12
  - mindestens eine Ziffer + Sonderzeichen
- Anlage/Update des Users mit `verification`-Defaults
- `createEmailVerificationToken` anstoßen (Versand = Stub)
- Response: `201 { ok: true }`

Fehlerfälle liefern saubere 4xx.

---

## 3. E-Mail-Verifizierungsflow

### 3.1 APIs

- `POST /api/auth/email/start-verify`
  - idempotent, erzeugt Token, gibt immer `{ ok: true }`
- `POST /api/auth/email/confirm`
  - `consumeEmailVerificationToken`
  - setzt Session + hebt Level auf mindestens `"email"`
  - Response: `{ ok: true, next: "/register/identity" }`

### 3.2 UI

- `/register` → Formular + Redirect zu `/register/verify-email`
- `/register/verify-email` → Stepper, Token-Feld, Auto-Confirm via `?token`, Resend-Button

---

## 4. Identität (Level „soft“)

### 4.1 APIs

- `POST /api/auth/verification/start`
  - Guard: Login + `emailVerified`
  - ruft `startIdentityVerification`
- `POST /api/auth/verification/confirm`
  - Mock: ruft `completeIdentityVerification` → Level ≥ `"soft"`

### 4.2 UI

- `/register/identity` als Schritt 3
- `/account` zeigt Status + CTA

---

## 5. Bankdaten & Digitale Unterschrift (Level „strong“)

### 5.1 PII-Schema

- `user_payment_profiles` & `user_signatures` (triMongo PII)
- Maskierte IBAN/BIC, Signatur-Metadaten
- Helper `applyStrongVerificationIfComplete` hebt Level auf `"strong"`, sobald Payment + Signature vorhanden sind.

### 5.2 UI

- `/account`-Security-Box zeigt IBAN (maskiert) & Signaturstatus mit Formular/Buttons.

---

## 6. Level-Gating & Policies

- `features/auth/verificationRules.ts` → Konstanten + Beschreibungen
- `features/auth/verificationAccess.ts` → `ensureUserMeetsVerificationLevel`
- Aktuell aktiv:
  - `/api/translate` (Contribution) → Level ≥ `"soft"`
  - `/api/votes/cast` → Level ≥ `"email"` (Login Pflicht)
  - `/contributions/new` zeigt Hinweistexte und deaktiviert Buttons, wenn Level fehlt

Weitere Endpunkte können nachgezogen werden.

---

## 7. Telemetrie

- `core/telemetry/identityEvents.ts`
- Events:
  - `identity_register`
  - `identity_email_verify_start`
  - `identity_email_verify_confirm`
  - `identity_otb_start`
  - `identity_otb_confirm`
  - `identity_strong_completed`
- Eingebaut in Register-/Verify-/Identity-/Payment-Flows

---

## 8. UX / Copy

- Register-Stepper erklärt „Schritt 1/3 Konto …“
- Info-Box: kein Verein, keine Spendenquittung, Datensparsamkeit
- Locale-System vorbereitet (DE als Master)

---

## 9. Offene Themen (nicht blocker)

1. Echter Mailversand (SMTP/Provider)
2. Level-Gating für weitere Features (Statements, Evidence, Admin)
3. Realer OTB/eID-Provider statt Mock
4. PII-Workflow (SEPA/Card, Signatur-Provider)
5. Design-Feinschliff & vollständige Lokalisierung

---

## 10. Akzeptanzkriterien (heutiger Stand)

- `/api/auth/register` → läuft ohne 500er, Passwort-Hash = Bcrypt
- E-Mail-Verifizierung funktioniert (inkl. Level-Upgrade)
- Identity-Mock hebt Level auf `"soft"`
- Payment/Signature + Helper ermöglichen Level `"strong"`
- `/account` zeigt E-Mail-/Identity-/Payment-/Signature-Status
- Funnel `/register` → `/register/verify-email` → `/register/identity` → `/account` ist konsistent
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.e150-smoke.json` ist grün
