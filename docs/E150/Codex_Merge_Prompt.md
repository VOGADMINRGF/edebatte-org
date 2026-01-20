# Codex Merge Prompt – Access, Pricing & Admin Controls

Du bist Codex und arbeitest im Monorepo „eDbtt / eDebatte“ in VS Code.

Kontext / Stand:

- Das Projekt nutzt pnpm, Next.js (App Router), TypeScript strict, Tri-Mongo (core / votes / pii).
- Es existieren:
  - eine neue Login-UI:
    - apps/web/src/app/login/page.tsx → nutzt LoginPageShell mit step/method searchParams.
    - apps/web/src/features/auth/LoginPageShell.tsx → 2-Step-Login (credentials + verify).
    - apps/web/src/components/layout/HeaderLoginInline.tsx → kompakter Header-Login.
    - apps/web/src/app/(components)/SiteHeader.tsx → bindet HeaderLoginInline ein.
  - eine zentrale Pricing-Konfiguration:
    - apps/web/src/config/pricing.ts → VOG_MEMBERSHIP_PLAN, eDebatte-Tiers basis/erweitert/premium, MEMBER_DISCOUNT, calcDiscountedPrice etc.
  - angepasste Seiten:
    - /mitglied-werden, /nutzungsmodell, /mitglied-antrag nutzen die neuen B2C-Pläne und die 25 %-Goodie-Logik (min Betrag, min Laufzeit, 6-Monats-Fenster).
  - Docs:
    - docs/E150/membership_pricing.md
    - docs/E150/Part01_Systemvision_Mission_Governance.md
  - Part1_Overview ist inhaltlich wie in docs/E150/Part01_Overview_Roles_Access.md beschrieben (siehe Chat-Kontext).

Leitplanken:

- PII-Zonen strikt beachten (siehe docs/PII_ZONES_E150.md).
- Keine magischen Zahlen in Komponenten, nur in Config/DB.
- Login-UI (LoginPageShell, HeaderLoginInline) NICHT neu erfinden – nur passende Backends, Session- & Access-Logik implementieren.
- E150/E200: deterministisch arbeiten, keine eigene Business-Logik erfinden.

Ziel dieses Runs (kurz):

1. Auth-Backend + 2FA passend zur bestehenden Login-UI implementieren.
2. AccessTier & EngagementLevel technisch abbilden.
3. Feature-Matrix & Limits (Voting, Swipes, Streams, Kampagnen, Reports) in Config gießen.
4. Contribution-Credits aus Swipes implementieren.
5. Staff-Admin-Dashboard für Feature/Limit-Tuning bauen.
6. Cookie-/Consent-Banner im eDebatte-Stil hinzufügen.
7. Docs (docs/E150/part00–16) aktualisieren, damit alles konsistent ist.

---

## Block 1 – Auth-Backend & 2FA

1.1 Implementiere /api/auth/login (POST):

- Body: { identifier: string, password: string }.
- Finde User per E-Mail oder Nickname (Core-/PII-Struktur beachten).
- Prüfe Passwort (Argon2/Bcrypt, Hash nur in PII-DB).
- Prüfe, ob 2FA aktiviert ist:
  - 2FA-Modus: "email" oder "otp" (in PII-Zone gespeichert).
- Wenn KEINE 2FA:
  - Erzeuge Session (JWT/Cookie) mit:
    - userCoreId
    - accessTier
    - engagementLevel
    - b2cPlanId
    - vogMembershipStatus (oder bool/enum)
  - Response JSON: { require2fa: false, redirectUrl: string }.
- Wenn 2FA:
  - Für "email":
    - Generiere 6-stelligen Code, speichere temporär (Redis oder PII-DB mit TTL).
    - Sende Code per Mail (existierendes Mail-Subsystem nutzen).
  - Für "otp":
    - Keinen Code senden, nur vorbereiten.
  - Response: { require2fa: true, method: "email" | "otp" }.

1.2 Implementiere /api/auth/verify-2fa (POST):

- Body: { code: string, method: "email" | "otp" }.
- Bei "email":
  - Vergleiche Code mit temporärem Speicher.
- Bei "otp":
  - Prüfe TOTP-Code gegen gespeichertes Secret (PII-DB).
- Bei Erfolg:
  - Session wie oben erzeugen.
  - Response: { redirectUrl: string } (von LoginPageShell genutzt).
- Fehler:
  - HTTP 400/401, JSON { message } → LoginPageShell zeigt Fehlermeldung.

1.3 Sicherheitsdetails:

- Rate-Limits pro IP & Account bei Login & 2FA.
- Telemetrie-Events (AI_CORE_READER):
  - auth.login.success
  - auth.login.failed
  - auth.2fa.success
  - auth.2fa.failed
- PII niemals in Telemetrie-Events oder Logs.

---

## Block 2 – AccessTier & EngagementLevel in Code verankern

2.1 Lege (oder erweitere) `apps/web/src/config/accessTiers.ts`:

```ts
export type AccessTier =
  | "public"
  | "basis"
  | "erweitert"
  | "premium"
  | "institutionBasic"
  | "institutionPremium"
  | "staff";

export const ACCESS_TIERS: AccessTier[] = [
  "public",
  "basis",
  "erweitert",
  "premium",
  "institutionBasic",
  "institutionPremium",
  "staff",
];
```

2.2 Lege apps/web/src/config/engagement.ts an oder erweitere:

- Typ EngagementLevel wie in Part1 beschrieben.
- XP_EVENTS (Swipe, Eventualität, Frage/Knoten, Stream-Teilnahme, Stream hosten).
- ENGAGEMENT_LEVEL_THRESHOLDS.
- Funktion `getEngagementLevelFromXp(totalXp)`.

2.3 Stelle sicher, dass nach Login / Session-Rehydrierung:

im Frontend Hooks/Helpers existieren, um:

- `useAccessTier()`
- `useEngagementLevel()`
- `useB2CPlan()`
- `useVogMembershipStatus()`

zu liefern.

---

## Block 3 – Feature-Matrix & Limits (Voting, Swipes, Streams, Kampagnen, Reports)

3.1 Erstelle apps/web/src/config/featureMatrix.ts:

- Definiere FeatureKeys (z.B. "canSwipe", "maxSwipesPerDay", "canVote", "canChatPublic", "canCreateStream", "canHostStream", "maxCampaignsPerMonth", "maxQuestionsPerCampaign", "reportScope", …).
- Lege pro Feature einen Default pro AccessTier fest entsprechend Part1_Overview (Voting & Swipes, Streams & Chat, Kampagnen & Reports).

3.2 Erstelle apps/web/src/config/limits.ts:

- `CONTRIBUTION_LIMITS_PER_MONTH[AccessTier]`
- `STREAM_LIMITS_PER_MONTH[AccessTier]`
- `CAMPAIGN_LIMITS_PER_MONTH[AccessTier]`
- `QUESTIONS_PER_CAMPAIGN_LIMITS[AccessTier]`
- `REPORT_SCOPE[AccessTier]` (z.B. "none" | "simple" | "homeRegion" | "homeRegionPlusOne" | "ownTopicsBasic" | "ownTopicsDeep" | "all").

3.3 Implementiere Helper-Funktionen:

- `canUserSwipe(user)`
- `canUserVote(user)`
- `canUserChatPublic(user)`
- `canUserCreateStream(user)`
- `canUserHostStream(user)`
- `canUserCreateCampaign(user)`

Diese Funktionen lesen ausschließlich aus:

- accessTier
- engagementLevel
- den Config-Dateien (`featureMatrix.ts`, `limits.ts`)

und NICHT aus hartcodierten Werten in Komponenten.

---

## Block 4 – Credits (Swipes → Contribution Credits)

4.1 Erstelle apps/web/src/config/credits.ts:

- `SWIPES_PER_CONTRIBUTION_CREDIT = 100;`
- `MAX_STORED_CONTRIBUTION_CREDITS = 50;`

4.2 Implementiere eine reine State-Funktion:

```ts
type CreditState = {
  swipeCountTotal: number;
  creditsAvailable: number;
};

function applySwipeForCredits(state: CreditState): CreditState;
```

Diese Funktion erhöht `swipeCountTotal`, berechnet ggf. neue Credits (alle 100 Swipes), deckelt `creditsAvailable` bei `MAX_STORED_CONTRIBUTION_CREDITS`.

4.3 Binde diese Funktion dort ein, wo Swipes serverseitig verarbeitet werden:

- Swipes aktualisieren:
  - XP (Engagement),
  - Telemetrie-Event,
  - CreditState.

---

## Block 5 – Staff-Admin-Dashboard „Access & Feature Control“

5.1 DB-Modell:

Lege in der geeigneten DB ein Modell FeatureOverride an mit:

- id
- featureKey
- accessTier
- valueJson
- createdAt, updatedAt
- updatedById (staff-user-coreId)

5.2 API:

`/api/admin/features`:

- **GET:**
  - Liefert alle Features + Default-Werte + Overrides pro AccessTier.
- **PUT /api/admin/features/:featureKey:**
  - Nimmt Updates (z.B. Wert pro AccessTier) entgegen.
  - Validiert Typen (Boolean/Number/String/Enum) gegen FeatureDefinition.
  - Schreibt/aktualisiert FeatureOverride.

5.3 Frontend:

`apps/web/src/app/admin/features/page.tsx`:

- Nur für AccessTier = "staff" zugänglich.
- Tabs:
  - „Features“: Matrix (Zeilen=Features, Spalten=AccessTiers, Zellen editierbar).
  - „Engagement & XP“: Anzeige und Anpassung von XP_EVENTS und THRESHOLDS.
  - „Credits & Swipes“: SWIPES_PER_CONTRIBUTION_CREDIT, MAX_STORED_CONTRIBUTION_CREDITS.
- UI:
  - Kennzeichnung von Overrides (z.B. Badge „Override“).
  - Inline-Validierung der Eingaben.

---

## Block 6 – Cookie-/Consent-Banner im eDebatte-Stil

6.1 Komponente:

- Lege eine globale `CookieConsentBanner`-Komponente an (z.B. `apps/web/src/components/privacy/CookieConsentBanner.tsx`).

6.2 Texte:

- Kurz erklären:
  - Essenzielle Cookies sind nötig für Login, Sicherheit, Sprache etc.
  - Optionale Analytics helfen, die Plattform zu verbessern.
  - KI-Providern (OpenAI, Anthropic, Mistral, Gemma etc.) analysieren Inhalte serverseitig, ohne Tracking-Pixel oder Werbeprofile.

6.3 Consent:

- LocalStorage-Flag mit gewählter Option.
- Optional: Consent-Eintrag in PII-DB (UserId, Kategorien, Timestamp).
- Beim Rendering:
  - Nur bei Zustimmung Analytics- oder optionalen Scripts laden.
- In den Kontoeinstellungen einen Abschnitt „Datenschutz & Consent“ ergänzen, um Consent-Status anzeigen/ändern zu können.

---

## Block 7 – Docs aktualisieren (E150 Part00–16)

7.1 `docs/E150/Part01_Overview_Roles_Access.md`:

- Stelle sicher, dass der Inhalt dieser Datei exakt dem im Chat definierten Gold-Stand entspricht (AccessTiers, EngagementLevels, Feature-Matrix, Credits, Login-Flow, Membership-Logik).

7.2 `docs/E150/membership_pricing.md`:

- Abgleich mit der bereits umgesetzten Mitgliedschaft + 25 %-Goodie-Logik.
- Klarstellung der Bedingungen:
  - mind. 5,63 €/Monat,
  - minTermMonths >= 24,
  - 6-Monats-Fenster, nur bei monatlicher Zahlung,
  - Goodie als Dank, nicht als Lockangebot.

7.3 Weitere Parts:

- Suche in docs/E150/Part00-16 nach alten Begriffen (citizenBasic/Pro/Ultra etc.) und passe sie an:
  - AccessTier: basis/erweitert/premium/institution*/staff.
  - B2C-Logik: auf neues 3-Tier-Modell.
- Entferne alte TODOs, die jetzt durch:
  - Feature-Matrix,
  - Engagement-Gates,
  - Pricing-Limits,
  - Credits

abgedeckt sind.

---

Allgemeine Anforderungen:

- Nutze bestehende Patterns für DB-Zugriffe, Mail, Telemetrie.
- Stelle sicher, dass `pnpm -C apps/web run build` ohne Fehler durchläuft.
- Schreibe bei neuen Services/Helpern sinnvolle Tests (soweit Test-Infrastruktur vorhanden).
- Ändere Login-UI und Pricing-UI nur dort, wo nötig ist, um neue Funktionen zu aktivieren – kein vollständiges Redesign.

Bitte arbeite die Blöcke 1–7 nacheinander ab
und halte dich strikt an die E150-Dokumentation als fachliche Quelle.
