# E150 Master Spec – Part 15: Offene Pfade & Restarbeiten

## Zweck

Dieses Dokument bündelt, welche Pfade (Part00–Part15) noch offen sind und welche Bestandteile erledigt werden müssen. Es verweist auf die Blöcke aus Part14, damit der nächste Run gezielt die Lücken schließen kann.

## Status-Übersicht der Pfade 00–15

- **Part00 Foundations / PII:** PII-Guardrails plus Klarname-Trennung (givenName/familyName) und Privacy-Flags dokumentiert; Migration/Aufsplitten alter Felder offen (siehe Identity & Profile Tasks).
- **Part01 Systemvision / Governance:** Leitplanken + 15 Themenkategorien als Backbone verankert.
- **Part02 Rollen / XP / Gamification:** XP-Anbindung benötigt noch Research-/Streams-/Campaign-Hooks (siehe Blöcke E, F, G); Profil-Freischaltungen pro Engagement-Level dokumentiert, UI-Gating offen.
- **Part03 Access Tiers & Pricing:** Grundlogik aktiv; Profil-Pakete (profileBasic/Pro/Premium) als Darstellungs-Dimension ergänzt, Mapping zu Tiers umzusetzen.
- **Part04 B2G/B2B Modelle:** Begriffe mit Profil-Paket-Namen harmonisiert; warten auf Campaigns/Streams-Implementierung (Block F/G) für echten Pilotbetrieb.
- **Part05 Orchestrator (Block A):** Gemini-Provider, rollenspezifische Prompts und Health/Score fehlen noch.
- **Part06 Consequences (Block B):** Modelle, Persistenz und UI (Responsibility Navigator) stehen aus.  
- **Part06 Themenkatalog & Zuständigkeiten:** Neu angelegt, 15 Hauptkategorien verbindlich; `TOPIC_CHOICES`-Abgleich in Profil/Onboarding/Filter offen.
- **Part07 Graph & Reports (Block C):** Zentrale Graph-Schicht und Report-Adapter fehlen; AnalyzeResult-Sync offen.
- **Part08 Eventualities (Block D):** Eventuality-/DecisionTree-Typen, Analyzer-Prompts, Persistenz und UI fehlen.
- **Part09 Research Workflow (Block E/R2):** Tasks/Contributions vorhanden; offen sind Seeding aus Questions/Knots, Filter/Sortierung, Contributor-Feedback, Rückfluss in Statements/Graph und Anti-Spam.
- **Part10 Responsibility Navigator (Block B):** Directory/Paths und Frontend-Navigator müssen aufgebaut werden.
- **Part11 Streams (Block F):** Modelle, Routes/UI und XP-Gating fehlen; Stream-Deck aus Reports/Graph steht aus.
- **Part12 Campaigns (Block G):** Campaign/CampaignSession-Modelle, Admin-UI, QR-Flows und Reports fehlen.
- **Part13 I18N/A11y/Social (Block H):** Übersetzungs-Infra, A11y-Pass und minimale Community-Räume/Chat fehlen.
- **Part14 Implementation Roadmap:** Dient als Arbeitsmodus; Block-Reihenfolge beachten.
- **Part15 Codex Safe Mode:** Leitplanken aktiv; keine offenen Tasks, aber stets befolgen.

## Aktueller Stand (März 2025)

- `/contributions/new` rendert wieder mit SiteShell, Citizen-Core-Text und sauberem Login-Redirect statt JSON-403; Credits/Gating basieren auf `AccountOverview`.
- Login & Registrierung schreiben Name + Kontakt direkt in `pii.user_profiles` (givenName/familyName, birthDate ready), sodass Mitgliedsanträge nicht mehr ohne PII bleiben.
- `/mitglied-werden` + `/mitglied-antrag` decken die drei B2C-Produkte (Basis 0 €, Pro 14,99 €, Premium 34,99 €) ab inkl. Checkbox für den 25%-Rabatt.
- `/api/membership/apply` erstellt einen Antrag (`membership_applications`), aktualisiert `users.membership.lastApplication`, speichert Adresse/Birthdate/Telefon in PII und verschickt Bankdaten + Verwendungszweck per Mail.

## Run-Plan nach Part15 (Block-Status & Definition of Done)

| Block | Bezug | Status | Definition of Done |
| --- | --- | --- | --- |
| **A – Orchestrator (E150 Core Provider)** | Part05 | **Offen** | `@features/ai/orchestrator_gemini.ts` (Adapter + `ProviderMeta`), rollenspezifische Prompts (citizen, staff, institution), Health-/Score-Tracking in `orchestrator_health.ts`; SSE bleibt intakt. |
| **B – Consequences & Responsibility Navigator** | Part06/10 | **Offen** | Prisma-Modelle `Consequence`, `Responsibility`, `ResponsibilityLink`; API-Routes `/api/responsibility/[id]`, `/api/consequence/[id]`; React-`ResponsibilityNavigator.tsx` mit Filter/Path-Tree/Score-Coloring; Admin-View fürs Mapping. |
| **C – Graph & Reports** | Part07 | **Offen** | `@features/graph/sync.ts` (AnalyzeResult → Graph), Graph-Store (Neo4j/Arango/Memgraph Connector), `/admin/graph/impact` mit echten Graph-Stats. |
| **D – Eventualities / DecisionTree** | Part08 | **Offen** | Typen `Eventuality`, `DecisionTreeNode`; Analyzer-Prompts für „was passiert wenn …“; UI `EventualityBoard.tsx`; API `/api/eventualities/analyze`. |
| **E (R2) – Research Workflow** | Part09 | **Offen** | Seeding aus Questions/Knots; Filter-/Sortier-API `/api/research/list`; Contributor-Feedback („Hilfreich?“-Rating); Rückfluss in Statements/Graph; Anti-Spam-Heuristik (Contributor-Cooldown). |
| **F – Streams** | Part11 | **Offen** | Modelle `Stream`, `StreamSession`; UI `StreamDeck` mit XP-Gating; XP-Zuwachs für Teilnahme/Hosting. |
| **G – Campaigns** | Part12 | **Offen** | Modelle `Campaign`, `CampaignSession`; Admin-UI + Statistik-View; QR-Flow `/campaign/[id]/join`; Reports/Erfolgsmessung. |
| **H – I18N / A11y / Social** | Part13 | **Offen** | I18N-Infra (next-intl, Namespaces `common`, `admin`, `analyze`); A11y-Audit + „A11y Pass“ im Build; Basis-Chat/Community-Räume für Citizen Pro +. |

## Konkrete Next Steps

1. **Starte mit Block A** (Part05): Gemini-Provider + rollenspezifische Prompts + Health/Score.
2. **Danach Block B** (Part06/10): Consequence-/Responsibility-Modelle, Persistenz, Navigator-UI & Admin.
3. **Block C & D parallel planen** (Part07/08): Graph-Sync plus Eventualities-Typen/Prompts/UI.
4. **Research R2 priorisieren** (Part09): Seeding, Filter, Contributor-Feedback, Rückfluss, Anti-Spam.
5. **Block F/G/H** (Part11/12/13): Streams/Campaigns/I18N-A11y-Social, sobald Basis aus A–D steht.

### Identity & Profile (aus Part00–04 abgeleitet)

Offene Tasks:

1. **PII-Schema um Vor-/Nachname erweitern**  
   - `pii.users.personal.givenName` + `familyName` einführen.  
   - Alle alten Felder `name` o.ä. in Migration aufsplitten.  
   - Core-User `displayName` so anpassen, dass er nie direkt PII speichert, sondern nur ein abgeleitetes Label.

2. **Profil-Datenstruktur in Core einführen**  
   - `core.users.profile` mit: `headline`, `bio`, `avatarStyle`, `topTopics[]` (max. 3 aus 15 Hauptkategorien), `publicFlags.*` (siehe Part00).  
   - API-Routen für `/api/account/profile` (GET/PATCH).

3. **TOPIC_CHOICES an 15 Kategorien ausrichten**  
   - Zentrale Definition `TOPIC_CHOICES` in `features/interests/topics.ts`.  
   - Verwendung in Profil-Editor, Onboarding, Filter-Komponenten.

4. **Profil-Freischaltungen nach Engagement-Level umsetzen**  
   - UI-Gating im Profil-Editor: Top-Themen erst ab Level „engagiert“, Highlight-Beitrag + Styles ab „begeistert“.  
   - Gamification-Logik nutzt nur XP, niemals personenbezogene PII.

5. **Profil-Pakete und Pricing verknüpfen**  
   - Mapping Access Tier → Profil-Paket wie in Part03.  
   - B2C / B2B / B2G verwenden die gleichen Paketnamen (`profileBasic`, `profilePro`, `profilePremium`).

6. **Account-/Profil-Seiten aufräumen**  
   - `/account` als private Einstellungsseite (PII-gebunden, nicht öffentlich).  
   - `/profile` als öffentliche Visitenkarte, die nur freigegebene Felder zeigt.  
   - Hinweis im UI: „Du siehst dein Profil so, wie andere es sehen.“

Diese Liste ist verbindlich für die nächsten Codex-Runs. Bei jedem Run den aktuell offenen Block aus Part14 wählen und die „Definition of Done“ erfüllen, bevor zum nächsten Pfad gewechselt wird. Sobald ein Block abgeschlossen ist, den Status im obigen Table auf **Done** setzen; aktuell sind alle Blöcke offen, d. h. es ist noch nichts erledigt.

Safe-Mode Checks (Membership/Payment):
- Admin-Verbuchen (`mark-paid`) und Kündigung (`cancel`) funktionieren, setzen user.membership-Status korrekt.
- Dunning-Job läuft trocken (keine Orders → no-op) und setzt bei Fälligkeit Reminder-Level / Auto-Cancel.
- /account zeigt korrekten Status inkl. PaymentInfo (masked) ohne PII-Leak; Copy-Buttons ok.
