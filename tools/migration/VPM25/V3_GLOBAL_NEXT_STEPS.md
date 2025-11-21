# V3 / eDbtt – Nächste Schritte nach Email/Orphans/Evidence-Update

Stand:
- Auth-/Identity-Flow inkl. E-Mail-Verify & OTB-Mock ist implementiert.
- Feeds → StatementCandidates → Analyze → VoteDrafts → Evidence funktioniert.
- Evidence/Map/Reports nutzen Zeiträume + Region/Locale.
- Orphan-Scanner + ORPHAN_FEATURES_VPM25.md existieren.

Dieser Plan beschreibt nur noch die **offenen** Blöcke.

---

## 1. Strong Level – Bank & Signatur (PII) sauber fertig bauen

### Ziel
Verification-Level **"strong"** soll wirklich bedeuten:
- E-Mail bestätigt
- Identität (OTB-Mock) mindestens "soft"
- Bankprofil + Unterschrift in PII-DB hinterlegt

### Tasks für Codex

1. **PII-Collections & Helper finalisieren**

   - Collection: `user_payment_profiles` (PII-DB)
     - Felder: `userId`, `ibanMasked`, `bic?`, `holderName`, `verifiedBy?`, `createdAt`, `updatedAt`
     - Helper: `createOrUpdateUserPaymentProfile(userId, payload)`
       - IBAN validieren, aber nur maskiert speichern (z. B. `DE89 **** **** 1234`)

   - Collection: `user_signatures` (PII-DB)
     - Felder: `userId`, `kind` ("digital" | "id_document"), `storedAt`, `meta?`
     - Helper: `storeUserSignature(userId, kind, meta?)`

2. **APIs anbinden**

   - `POST /api/account/payment-profile`
     - Auth-Guard
     - Body: `{ iban, bic?, holderName }`
     - Ruft `createOrUpdateUserPaymentProfile` auf
     - Antwort `{ ok: true }` bzw. sinnvolle Fehlermeldungen

   - `POST /api/account/signature`
     - Auth-Guard
     - V1: Body `{ kind: "digital" }` reicht
     - Ruft `storeUserSignature` auf

3. **Strong-Level-Upgrade aktivieren**

   - Helper `applyStrongVerificationIfComplete(userId)` implementieren:
     - Lese Payment-Profile und Signatur für den User
     - Wenn vorhanden UND `verification.level >= "soft"`:
       - Setze `verification.level = "strong"`
       - Logge `identity_strong_completed` Telemetrie-Event

4. **Account-UI finalisieren**

   - `/account`:
     - Payment-Form mit `iban/bic/holderName` an `/api/account/payment-profile` anbinden
     - Signature-Button an `/api/account/signature` anbinden
     - Erfolg/Fehler-Toast zeigen
     - Wenn strong erreicht: Badge / Hinweis „Level 3 – starke Verifizierung aktiv“

Nach diesem Block: Neu registrierter User kann sich hochhangeln bis **strong**, ohne dass noch „Platzhalter“ im Flow sind.

---

## 2. Verification-Gating Review (Feinschliff)

Ziel: Alle sicherheitsrelevanten Dinge hängen an einem sinnvollen Level.

### Tasks für Codex

- Alle folgenden Endpunkte prüfen und ggf. mit `ensureUserMeetsVerificationLevel` absichern:

  - **Votes**:
    - `/api/votes/cast` (bereits ≥email)
    - ggf. Publish-APIs für `vote_drafts` (nur staff + strong)

  - **Evidence-Admin**:
    - `/api/admin/evidence/claims*`
    - `/admin/evidence/claims/**` UI
    - Hier: mindestens `soft`, besser `staff` (je nach aktueller Guard-Logik)

  - **Feed-Publish**:
    - Admin-Routen unter `/api/admin/feeds/drafts/**` + `/admin/feeds/drafts/**`
    - Klarstellen: nur staff und ggf. strong dürfen aus Feeds echte Votes veröffentlichen

- UX:
  - Wenn Level nicht reicht → JSON-Fehler mit klarer Message + im UI:
    - „Bitte E-Mail bestätigen“ (Link zu `/register/verify-email`)
    - „Bitte Identität bestätigen“ (Link zu `/register/identity` bzw. `/account`)

---

## 3. Identity-Funnel-Dashboard

Ziel: Wir wollen sehen, wo Leute im Funnel abbrechen.

### Tasks für Codex

- Neue Seite `/dashboard/identity`:

  - Nutzt Aggregation auf `identityEvents` (already implemented) z. B.:

    - pro Tag:
      - `identity_register`
      - `identity_email_verify_confirm`
      - `identity_otb_confirm`
      - `identity_strong_completed`

  - UI:
    - Kleiner Funnel:
      - Registriert → E-Mail bestätigt → Soft → Strong
    - Zeitbereich (30/90/365/All)
    - Kurze Hinweise „Hier brechen Leute am häufigsten ab“

- Optional: Kennzahlen mit in `/dashboard/usage` einbetten (nur als kleine Summary-Karten).

---

## 4. Votes – öffentliche Ansicht

Ziel: Aus den fertigen `feed_statements` / `vote_drafts` echte, öffentliche Abstimmungsseiten machen.

### Tasks für Codex

1. **Daten-Service**

   - Service-Funktionen in `features/votes/service.ts` (oder ähnlich):

     - `getVoteById(id)`:
       - holt `feed_statement` + zugehörigen `vote_draft` + Evidence-Infos (Claims/Region)
     - `listPublicVotes(filters)`:
       - künftige Übersicht (Status: offen/geschlossen, Region, Thema)

2. **Routen & UI**

   - Seite `/votes/[id]`:

     - Zeigt:
       - Titel & Kurzfassung
       - Wichtigste Claims (aus Evidence / Draft)
       - Region / Zeithorizont
       - Link „Alle Belege ansehen“ → `/evidence/[regionCode]/[topicKey]`
       - Voting-UI (Buttons) unter Berücksichtigung von:
         - Login-Pflicht
         - Verification-Level (mind. email/soft)

   - Seite `/votes`:

     - Listet laufende & abgeschlossene Votes
     - Filter nach:
       - Region
       - Thema
       - Zeitraum

3. **Telemetrie**

   - Neue Events:
     - `vote_view`
     - `vote_cast`
   - Logging im Service / API beim Laden & Abstimmen.

---

## 5. Telemetrie – echte Daten im Usage-Dashboard

Status:
- `ai_usage` / `ai_usage_daily` Types + `logAiUsage` existieren.
- `/dashboard/usage` zeigt noch statische/Platzhalterdaten.

### Tasks für Codex

1. **`logAiUsage` überall nutzen**

   - An allen relevanten Stellen:
     - Orchestrator E150 (Analyze)
     - Feeds/Analyze-Pipeline
     - Translation (`translateAndStore` / `translateOnDemand`)
     - Später Factcheck, Summaries etc.

2. **Aggregation**

   - Cron/Script, das `ai_usage` → `ai_usage_daily` aggregiert
   - Zeitraum + Provider + Pipeline + Error/Success-Quoten

3. **/dashboard/usage an echte Daten hängen**

   - Statt Dummy-Werte:
     - Letzte 24h/7 Tage Tokens, Kosten (geschätzt), Requests
     - Breakdown nach Provider & Pipeline (Tab oder Tabelle)
   - Time-Range-Filter entsprechend `resolveTimeRange` (30/90/365/All)

---

## 6. Streams / Overlays / TV (optional, aber wichtig für deine Twitch/OBS-Pläne)

Status:
- VPM25 hatte bereits Overlay-/TV-Ideen.
- In V3 gibt es dafür erste HTML/CSS-Overlays und Orphan-Code im Scanner.

### Tasks für Codex

1. **Domain `features/stream`**

   - Typen:
     - `StreamConfig`, `OverlaySlide`, `TickerMessage`, etc.
   - triMongo-Collections:
     - `streams`, `overlays`

2. **APIs**

   - `GET /api/streams` – liefert aktive Streams (Titel, Thema, Region, Status)
   - `GET /api/overlays/rotation` – liefert Slides/Ticker für OBS

3. **Admin-UI**

   - `/admin/streams`:
     - Liste der Streams
     - Bearbeiten: Titel, Beschreibung, zugeordnete Vote/Region

4. **Doku**

   - Kurze README:
     - Wie man die Overlay-HTML-Seiten in OBS/Twitch einbindet
     - Welche Query-Parameter es gibt (z. B. `?streamId=...`)

---

## 7. Orphan-Fundbüro – manuelle Kuratierung

Status:
- `ORPHAN_FEATURES_VPM25.md` existiert bereits mit:
  - „vermutlich übernommen“
  - „Kandidaten“
  - „Legacy“

### Nächste Schritte (manuell, kein Codex-Task):

- Geh durch die **Kandidaten-Sektion**:
  - Markiere:
    - `[x] KEEP` – unbedingt migrieren / modernisieren
    - `[ ] LEGACY` – darf archiviert bleiben

- Für ausgewählte KEEP-Einträge:
  - Schreibe kurze Notizen direkt in das MD (z. B. „alter NGO-Dashboard, Idee übernehmen für /dashboard/ngos“)
  - Daraus können wir später wieder konkrete Codex-Aufträge formulieren.
