# E150 Master Spec – Part 14: Implementation Roadmap & Gaps

## 1. Zweck von Part14

Part00–13 definieren **WAS** eDebatte / eDebatte können soll.  
Part14 beschreibt **WIE Codex den aktuellen Code Schritt für Schritt dorthin bringt**:

- fasst offene Lücken aus Part00–13 zusammen,
- priorisiert sie in sinnvolle Blöcke,
- gibt einen Arbeitsmodus vor, damit Codex ohne ständiges Nachfragen
  blockweise durchimplementieren kann,
- bleibt dabei strikt PII-sicher und E150-konform.

Part14 ist damit der **operative Fahrplan** für Codex.

---

## 2. Überblick: Noch offene Lücken

Stand nach den letzten Codex-Runs:

- **Part05 Orchestrator**  
  – Multi-Provider-Gerüst existiert (OpenAI, Anthropic, Mistral),  
  – Feinschliff bei Provider-Prompts & zusätzlicher Provider (Gemini) fehlt.

- **Part06 Consequences & Fairness**  
  – Konzepte vorhanden, aber keine vollständigen Typen/Modelle  
  – keine Speicherung & UI-Anzeige.

- **Part07 Graph & Reports**  
  – Mongoose-`Report` repariert, aber  
  – Knowledge-Graph-Schicht + E150-Sync fehlen.

- **Part08 Eventualities & DecisionTrees**  
  – keine Eventuality/DecisionTree-Strukturen in `AnalyzeResult`,  
  – keine UI-Einbindung, keine Persistenz.

- **Part09 Community Research Workflow**  
  – keine `ResearchTask`/`ResearchContribution`-Modelle,  
  – kein Research-Hub, keine XP-Anbindung.

- **Part10 Responsibility Navigator**  
  – Responsibility nur als Text, ohne Directory/Navigator-UI/Graph-Edges.

- **Part11 Streams & „Brennende Bürger:innen“**  
  – Twitch-Overlay existiert extern,  
  – keine integrierte Stream-Logik (Model, Routen, XP).

- **Part12 Campaigns (jenseits Telemetry)**  
  – AI-Telemetry umgesetzt,  
  – Campaign-Modelle, QR-Sessions, Kampagnen-Reports fehlen.

- **Part13 I18N, A11y, Community/Social**  
  – UI ist DE-first,  
  – keine echte I18N-Infra, kein Raum/Chat-System, A11y nur teilweise bedacht.

---

## 3. Arbeitsmodus für Codex (Autopilot)

Codex SOLL Part14 so verwenden:

1. **Einlesen**
   - Zuerst wie gewohnt: `tools/codex/e150_master_codex_briefing.ts`.
   - Danach Part00–13 nur als Referenz.
   - Abschließend Part14 (diese Datei) lesen.

2. **Blockweises Arbeiten**
   - Wähle **einen Block** aus Abschnitt 4 (z.B. „Block A – Orchestrator Feinschliff“).
   - Implementiere ihn sauber und vollständig in PR-Größe.
   - Schreibe am Ende immer:
     - **Changes**
     - **Verification**
     - **Next Steps** (nur noch **konkrete Restaufgaben**, falls der Block nicht 100 % fertig ist).

3. **Selbständige Fortsetzung**
   - Wenn ein Block erledigt ist, wähle in der nächsten Runde **automatisch den nächsten sinnvollen Block** aus Abschnitt 4 – ohne erneute Rückfrage, solange keine Widersprüche auftauchen.
   - Bei Unklarheiten konservativ entscheiden und im „Next Steps“-Teil kurz markieren.

4. **Grenzen**
   - Kein Billing-Code.
   - Keine Monster-Refactorings ohne direkten Bezug zu Part00–14.
   - Keine neuen Konzepte neben E150, nur Ausgestaltung des bereits Spezifizierten.

---

## 4. Blöcke A–H: Konkrete Implementierungs-Roadmap

### Block A – Part05 Orchestrator: Feinschliff Multi-Provider

**Ziel:** Orchestrator erfüllt vollständig die Anforderungen aus Part05.

Aufgaben:

1. **Provider-Set komplettieren**
   - Gemini-Provider implementieren (`features/ai/providers/gemini.ts` o.ä.).
   - In `orchestratorE150.ts` env-gesteuert aktivieren (nur wenn Key gesetzt).

2. **Rollen-/Prompt-Spezialisierung**
   - Für jede `ProviderRole` (`structure`, `context`, `questions`, `knots`, `mixed`) ein eigenes Prompt-Template anlegen.
   - Prompts strikt an Part05/Part06/Part08 ausrichten (Claims, Notes, Questions, Knots, Eventualities).

3. **Scoring & Health**
   - Health-Score pro Provider aus Telemetry ableiten (Fehlerrate, Latenz).
   - `score` je Candidate aus:
     - Health,
     - Passung zur Rolle,
     - ggf. einfacher Output-Heuristik (z.B. Anzahl Claims innerhalb Range).

4. **Definition of Done**
   - Orchestrator kann parallel min. 3 Provider nutzen.
   - Fallback-Mechanismen funktionieren (immer valides `AnalyzeResult`).
   - Telemetry zeichnet alle Provider-Calls konsistent auf.

---

### Block B – Part06 & Part10: Consequences & Responsibility Navigator

**Ziel:** Folgen + Zuständigkeiten sind als erste Bürger:innen-sichtbare Schicht implementiert.

Aufgaben:

1. **Modelle/Schemas**
   - `Consequence`, `Responsibility`, `ResponsibilityPath`, `ResponsibilityDirectory` nach Part06/10 modellieren.
   - In `AnalyzeResult` Referenzen zu Consequences/Responsibility ergänzen (optional, nullable).

2. **Persistenz**
   - Speichern von Consequences/Responsibility pro Statement/Eventuality (DB & Graph).

3. **Responsibility Navigator UI**
   - „Wer ist zuständig?“-Button in `/statement/*` und `/contributions/*`.
   - Navigator-Komponente mit:
     - Level-Strip (Gemeinde, Land, Bund, EU, Privat/NGO),
     - Liste der Akteure pro Level (aus Directory),
     - einfache Prozesshinweise.

4. **Admin-Verwaltung**
   - `/admin/responsibility` für ResponsibilityDirectory (Listen-/Detail-Ansicht).
   - Import/Export-Skeleton (CSV/JSON).

5. **Definition of Done**
   - Für ein Statement kann die Redaktion einen ResponsibilityPfad hinterlegen.
   - Bürger:innen sehen bei „Wer ist zuständig?“ eine verständliche, neutrale Übersicht.

---

### Block C – Part07: Graph & Reports – Basisintegration

**Ziel:** E150-Daten landen in einer konsistenten Graph-Schicht und fließen in Reports.

Aufgaben:

1. **Graph-Abstraktion**
   - Zentrales Modul für Graph-Operationen (z.B. `@core/graph`).
   - Basis-Typen: Node (Statement, Question, Knot, Eventuality, Actor/Responsibility), Edge-Typen (`relates_to`, `conflicts_with`, `responsibility_of`, …).

2. **Sync aus AnalyzeResult**
   - Hook, der nach erfolgreicher Analyze-Operation:
     - Claims/Notes/Questions/Knots/Eventualities als Nodes/Edges in den Graph schreibt (idempotent, z.B. via Hashes).

3. **Report-Adapter**
   - Topic-/RegionReport-Builder, der Graph-Daten nutzt (kein Mock mehr).
   - Minimaler Endpunkt & UI, der reale Reportdaten anzeigt.

4. **Definition of Done**
   - Neue Statements landen im Graph.
   - Ein einfacher Topic/Region-Report kann aus echten Graph-Daten generiert werden.

---

### Block D – Part08: Eventualities & DecisionTrees

**Ziel:** „Was-wäre-wenn“-Logik ist im System sichtbar (Modell + UI).

Aufgaben:

1. **Typen**
   - `EventualityNode` + `DecisionTree` nach Part08 definieren.
   - `AnalyzeResult` + Schemas erweitern (Eventualities optional).

2. **Orchestrator/Analyzer**
   - Provider-Prompts erweitern, damit Eventualitäten/DecisionTrees optional geliefert werden.
   - Normalisierung + Fallbacks implementieren (leere Arrays wenn nichts kommt).

3. **UI**
   - `/statement/new` + `/contributions/new`:
     - kleine Eventualitäten-Sektion (Pro/Neutral/Contra-Pfad),
     - nur Lesen in v1 (kein komplexer Editor).

4. **Persistenz**
   - Speicherung der Eventualitäten in DB + Graph.

5. **Definition of Done**
   - Für analysierte Beiträge können Nutzer:innen mind. simple Eventualitäten pro Statement sehen.

---

### Block E – Part09: Community Research Workflow

**Ziel:** Offene Fragen werden zu ResearchTasks, die Community kann systematisch mitarbeiten.

Aufgaben:

1. **Modelle**
   - `ResearchTask`, `ResearchContribution` definieren.
   - Felder: Bezug zu Statement/Question, Status, Qualität, XP-Wert, etc.

2. **Erzeugung**
   - Hook: Offene Fragen/Knots können in ResearchTasks umgewandelt werden (manuell + optional automatischer Vorschlag).

3. **Research Hub UI**
   - `/research`-Seite:
     - Liste offener Tasks,
     - Filter nach Thema/Region,
     - Detailansicht mit Einreichungsformular.

4. **XP-Integration**
   - Research-Beiträge geben XP + ggf. Badges (Part02/13).

5. **Definition of Done**
   - Es existiert ein end-to-end Flow: offene Frage → Task → Community-Antwort → Review → Abschluss.

---

### Block F – Part11: Streams & Brennende Bürger:innen

**Ziel:** Streams sind technisch an Plattform, Reports und XP angebunden.

Aufgaben:

1. **Modelle**
   - `StreamSession` (Host, Thema, Region, Typ, externe URL, Status).

2. **Routen & UI**
   - `/streams` (Übersicht),
   - `/streams/:id` (Viewer-Seite mit eingebettetem Video + Interaktionspane),
   - `/streams/:id/host` (Host-Panel mit Karten/Agenda).

3. **Stream-Deck**
   - Adapter, der aus Topic/Region-Report + Graph eine Karten-Liste für den Host baut (Statements, Fragen, Knoten, Eventualities).

4. **XP & Gating**
   - Stream-Hosting an Level/Plan koppeln (Brennend + Abo/Org),
   - XP-Vergabe für Host/Teilnehmende.

5. **Definition of Done**
   - Mindestens ein funktionaler Stream-Flow ist möglich (manuell gepflegter StreamSession-Eintrag).

---

### Block G – Part12: Campaigns & QR-Sessions

**Ziel:** Gemeinden/Organisationen können Kampagnen mit QR-Code fahren und Reports erhalten.

Aufgaben:

1. **Modelle**
   - `Campaign`, `CampaignQuestion`, `CampaignSession` (siehe Part12).

2. **Admin-UI**
   - `/admin/campaigns` zum Anlegen/Bearbeiten,
   - Kampagnen-Statuswechsel (draft → running → finished).

3. **QR-Flows**
   - Endpunkt/Seite für `/:campaignSlug/:sessionCode`:
     - schlanke UI, die nur Kampagnenfragen zeigt.

4. **Kampagnen-Report**
   - Aggregierte Auswertung pro Kampagne (Pro/Neutral/Contra, Eventualitäten, offene Fragen).

5. **Definition of Done**
   - Eine Gemeinde/Org kann eine Kampagne anlegen, QR-Codes nutzen und nachher einen Report sehen.

---

### Block H – Part13: I18N, A11y & Community/Social Basis

**Ziel:** Plattform ist mehrsprachig vorbereitet, a11y-freundlich und hat minimale soziale Features.

Aufgaben:

1. **I18N-Infra**
   - zentrale Übersetzungsfiles (z.B. `@features/i18n`),
   - Locale-Switch, Speicherung im Profil.

2. **A11y-Pass**
   - Basis-Check für Hauptseiten (Landing, Swipes, Contributions, Statements, Admin):
     - sinnvolle Headings,
     - Focus-Styles,
     - Kontraste,
     - Labels/ARIA.

3. **Community-Basis**
   - Profil-Ansicht verfeinern (Level, Badges),
   - einfache öffentliche Themen-/Regionsräume oder minimaler Chat-Mechanismus mit Engagement-Gate.

4. **Sharing-Meta**
   - OG-Tags für Statements & Reports konsistent setzen.

5. **Definition of Done**
   - UI ist in min. 2 Sprachen nutzbar,
   - grundlegende a11y-Regeln erfüllt,
   - erste soziale Interaktionsform jenseits Swipes vorhanden.

---

## 5. Definition of Done – Gesamt

E150 gilt als **„Phase 1 vollständig implementiert“**, wenn:

- Orchestrator (Part05) multi-provider-fähig, robust und telemetriert ist (Block A).  
- Consequences & Responsibility Navigator in UI/Graph sichtbar sind (Block B).  
- Graph & Reports echte Daten statt Mock verwenden (Block C).  
- Eventualitäten/DecisionTrees in AnalyzeResult, DB, Graph und UI ankommen (Block D).  
- Research-Workflow produktiv nutzbar ist (Block E).  
- Streams & Campaigns für erste Pilotkunden (B2G/B2B) lauffähig sind (Blöcke F & G).  
- I18N, A11y und Community-Features die Mindestanforderungen erfüllen (Block H).  

---

## 6. Kurz-Makro für Codex-Jobs

Wenn du einen neuen „Großlauf“ startest, reicht z.B.:

> „Nutze Part14 als Roadmap.  
>  Wähle den nächsten noch nicht abgeschlossenen Block (A–H) und arbeite ihn so weit wie möglich ab.  
>  Halte dich an Arbeitsmodus, Prioritäten und Definition-of-Done aus Part14.“

Damit muss **nicht jedes Mal alles neu bestätigt werden**, und Codex weiß trotzdem genau,
wo er weiterzumachen hat.

### Block R2 – Research Workflow, Phase 2 (Part09.5)

Status: Phase 1 umgesetzt (Tasks, Contributions, XP, Admin + Board).

Offen:
- R2.1: Seeding aus Questions/Knots/Eventualities
- R2.2: Filter/Sortierung Research Board (Level, Tags, Neueste)
- R2.3: Contributor-Feedback (Status + Review-Notizen, einfache Notifications)
- R2.4: Rückfluss in Statements/Graph (akzeptierte Contributions → Knowledge/Impact)
- R2.5: Anti-Spam-Maßnahmen (Rate Limits, Cooldowns, min. Engagement-Level)

### Block M – Membership Apply (Snapshot & Payment)
Update: Admin mark-paid/cancel, Overview-API + Dashboard, Dunning-Script (Reminder 1/2/final), Rhythmus yearly, PaymentInfo/Copy im Account. Offene Punkte: echtes Household-Lock/Objekt, Monitoring/Events, ggf. Payment-Modal/CTA verfeinern.

Status: Baseline implementiert.

- /api/memberships/apply erzeugt ein MembershipApplication mit Status `waiting_payment`, Payment-Reference `EDB-xxxxxx` und optionalem eDebatte-Block.  
- Nutzer-Snapshot (`user.membership`) enthält Status, amountPerMonth, rhythm, householdSize/peopleCount, edebatte, paymentMethod, paymentReference, submittedAt.  
- Bestätigungs-Mails: an Nutzer inkl. Zahlungsinfo/Verwendungszweck, optionaler eDebatte-Vorbestellung; an Admin (MAIL_ADMIN_TO) mit Betrag/Haushalt/Payment-Reference.  
- Account-Seite zeigt Status inkl. „Zahlung ausstehend“-Hinweis bei waiting_payment; Thank-you-Banner bei redirect `?membership=thanks`.  
- Offene Punkte: Zahlungs-UI/CTA im Account ausbauen (z. B. IBAN/Paypal-Link), Membership-Status auf „active“ heben nach Zahlungseingang, Admin-UI für Statuswechsel.
