# Part16 AI Orchestration and Safety

> Stand: 2026-05-03
> Status: Canonical Architecture Baseline (verbindlich)
> Verbindlicher Task-Backlog: `docs/E150/OpenTasks.md`

## Update 2026-05-03 (Registration/Public Entry)

- Register-Default fuer nicht-admin Rollen fuehrt auf `/swipes?welcome=1`, sofern kein gueltiges internes `next` gesetzt ist.
- Diese Routing-Anpassung ist ein Journey-/Surface-Contract und aendert keine AI-Orchestrierungsautoritaet oder Safety-Gates.

## Update 2026-05-04 (Journey Surface Hardening)

- Dossier-, Live- und Pricing-Journey-Slices wurden abgeschlossen, ohne Lane-/Provider-Autoritaet, Policy-Gates oder Schema-SSOT anzupassen.
- Ergebnis: UX-Haertung auf Public Surface, unveraenderte AI-Safety-Architektur.

## Zweck

Dieses Part verankert das aktuelle Zielbild fuer KI-Orchestrierung, Social-Safety und Security/Privacy als verbindliche Produkt- und Architekturregeln.

Public wording fuer Pricing, `/create` und sichtbare Produktcopy wird separat in
`docs/E150/V3_AI_ORCHESTRATION_AND_RESEARCH_CREDIT_POLICY_2026-07-18.md` gefuehrt.
Die folgenden Provider-Namen sind interne Policy-/Routing-Begriffe und keine Public-Produktbegriffe.

Es gilt fuer:
- `/create` und angrenzende Intake-Fluesse
- Anlassraum/Dossier-uebergaenge
- Match-/CTA-Logik
- Community-/Kontakt-Eskalation
- KI-Provider- und Modellstrategie

## Verbindliche Einordnung

- Der bestehende E150-Orchestrator bleibt der deterministische Hauptfluss.
- Spezialisierte KI-Orchestrierungen kommen zusaetzlich hinzu, nicht als chaotischer Ersatz.
- Das fruehere lineare 11-Stufen-Modell bleibt als technische Unterpipeline/KI-Verarbeitungssicht wertvoll.
- Die kanonische Produktsicht ist das 5-Orchester-Modell in diesem Dokument.

## Binding Architecture Decision: Graph-guided Policy Orchestration Authority (#58)

Diese Entscheidung ist verbindlich:
- eDebatte nutzt **graph-guided policy orchestration**.
- eDebatte nutzt **nicht** ARI als Kern-Orchestrator.
- eDebatte nutzt **nicht** eine graph-only Orchestrierung ohne deterministische Policy-Engine.

### Rollenmodell der Autoritaet

- Graph:
  Liefert Knowledge, Context, State, Zustaendigkeiten, Dossier-Verbindungen, aehnliche Claims, Akteure, Eventualities und Mandatsbezug.
- Orchestrator / Policy Engine:
  Entscheidet Lane, Provider, Research-Pfad, Cost-/Credit-Regel, Fallback und Publishability.
- Providers:
  Sind Werkzeuge mit klaren Rollen, nicht Kontrollzentrum.
- Validator / Quality Gate:
  Validiert Schema, Qualitaet und Nutzbarkeit.
- Admin Policy:
  Steuert Provider-Verfuegbarkeit, Kostenbudgets, Research-Gates und Entitlements.

### Verbindliche Architekturregeln

- ARI darf nie Core-Orchestrator sein.
- ARI ist optional nur fuer `premium_deep_research`.
- Perplexity ist optional nur fuer Search-/Research-Discovery.
- Standard-Analyze darf nie Perplexity oder ARI voraussetzen.
- Der Graph liefert Kontext/Regeln, waehlt aber Provider nicht frei selbst.
- Der Orchestrator bleibt deterministischer, auditierbarer Code.
- `AnalyzeResultSchema` bleibt final SSOT.
- Kein Implementierungspfad darf ARI, Perplexity oder den Graph allein als Orchestrator etablieren.

### Verbindliches Lane-Modell

- `fast_draft`
- `standard_analyze`
- `dossier_enrichment`
- `sealed_factcheck`
- `premium_deep_research`

### Abhaengige Umsetzungsslices (verbindlich verknuepft)

- #48 Provider Role Routing:
  Muss Rollen so durchsetzen, dass Provider Werkzeuge bleiben und die Policy-Engine die Autoritaet behaelt.
- #49 Research Provider Abstraction:
  Muss Research-Tools abstrahieren, ohne das Kontrollzentrum zu werden.
- #55 Perplexity/Cheap-Smoke/Research-Credits:
  Muss Cost-/Credit-Optimierung liefern, ohne neue Core-Abhaengigkeit auf Perplexity oder ARI.

### Implementierungsstand (Revalidierung 2026-05-03)

- `PR-AI-ORCH-POLICY-01` ist als Architektur-/Policy-Slice abgeschlossen.
- Die Rollen- und Lane-Autoritaet liegt deterministisch im Routing (`apps/web/src/features/ai/providerRoleRouting.ts`).
- Research-Provider bleiben optional/gated ueber Registry/Policy (`apps/web/src/features/ai/researchProviderRegistry.ts`, `apps/web/src/features/ai/researchProviderPolicy.ts`).
- `standard_analyze` bleibt ohne Perplexity/ARI lauffaehig; `sealed_factcheck` und `premium_deep_research` bleiben research-gated.

### Issue #55 Narrow-Scope Umsetzungsvorbereitung (Perplexity + Cheap-Smoke)

Verbindliche Einordnung fuer den #55-Slice:
- Perplexity ist **optional** und nur `research_discovery` / Search.
- Perplexity ist **nicht** `strict_primary`, **nicht** Analyze-Provider und **nicht** Core-Orchestrator.
- ARI bleibt optional fuer `premium_deep_research` und wird nicht Default.
- `standard_analyze` laeuft ohne Perplexity und ohne ARI.

Terminologievorbereitung (Entitlements/Produktsprache, ohne Checkout-Implementierung):
- `search_credit`
- `deep_research_credit`
- `dossier_boost`
- `research_supporter`
- `initiator`

Produkt-/Pricing-Notizen (Planungsrahmen, nicht als hartes Billing-Versprechen):
- Ein Plan um 29,99 EUR kann perspektivisch 1 Perplexity Search Credit enthalten.
- Search Add-on kann grob bei ~10 EUR liegen.
- Deep Search / Premium Research kann grob bei ~20 EUR liegen.
- Diese Notizen sind Vorbereitung fuer #49 (Research Provider Abstraction), nicht deren Vollumsetzung.

Kosten-/Smoke-Leitplanken:
- Probe/Runtime/Sample-Signale bleiben als guenstige Tiny-Profile ausgelegt.
- `full-lite` bleibt der kostenguensige Diagnosemodus fuer tieferen Contract-Check.
- Unknown pricing bleibt `costKnown=false` / `n/a` und wird nie als `0 EUR` dargestellt.

## Dokumentabgrenzung (harmonisiert 2026-03-26)

- Kanonischer Gesamtfluss: `docs/E150/Part16.md`
- Anlassraum-Domainmodell: `docs/E150/Part16_Anlassraum_Model.md`
- Surface-/Demo-Abgrenzung: `docs/surface-architecture.md`
- Topic-/Round-Governance (Review/Operator): `docs/architecture/topic-round-governance-pr04.md`

## Zielbild: 5 Orchestrierungen

## 1) Intake-Orchestrierung

Aufgaben:
- Input-Typ erkennen (`freitext`, `url`, `zitat`, `upload`, `material_mix`)
- Segmentierung (Abschnitte, Claims-nahe Einheiten, Quellenhinweise)
- Rueckfragen bei duennem/ambigem Input
- erste Strukturierung ohne stillen Bedeutungsverlust

Verbindliche Ausgaben (typed):
- `inputType`, `languages`, `segments`, `sourceHints`, `missingInfoQuestions`, `confidence`

## 2) Pruef-Orchestrierung

Aufgaben:
- Faktenlage und Quellenbedarf markieren
- Unsicherheiten/Konflikte sichtbar machen
- Evidenzluecken und Cross-Check-Bedarf ausgeben
- keine stille Wahrheitsbehauptung ohne Evidenzpfad

Verbindliche Ausgaben (typed):
- `claims`, `evidenceNeeds`, `uncertainties`, `counterPositions`, `reviewPriority`, `confidence`

## 3) Agenda-/Fragen-Orchestrierung

Aufgaben:
- Diskussionspunkte strukturieren, buendeln, trennen
- fokussierbare Fragen mit hoher Fragequalitaet erzeugen
- Moderation/Medien/Verbaende bei Debatten-Setup unterstuetzen
- abschaltbare oder zu fruehe Punkte sichtbar markieren

Verbindliche Ausgaben (typed):
- `agendaCandidates`, `questionCandidates`, `mergeSuggestions`, `disableSuggestions`, `focusSuggestions`

## 4) Dossier-Orchestrierung

Aufgaben:
- Anlassraum -> Dossier Uebergang
- Claims/Quellen/offene Fragen/Widersprueche verdichten
- review-first/no-auto-publish strikt halten
- keine stille Ueberschreibung von Ursprungstexten

Verbindliche Ausgaben (typed):
- `dossierType`, `groupedClaims`, `evidencePaths`, `openQuestions`, `contradictions`, `eventualities`

## 5) Beteiligungs-/Abstimmungs-Orchestrierung

Aufgaben:
- Eventualitaeten/Optionen schaerfen
- Fragequalitaet fuer Abstimmungsreife pruefen
- Dedupe/Ranking/Exclude vorbereiten
- manipulative Zuspitzung aktiv vermeiden

Verbindliche Ausgaben (typed):
- `optionCandidates`, `dedupeGroups`, `rankingHints`, `exclusions`, `questionQualityAssessment`, `finalizationNeeds`

## Kanonische Produktregeln

- Freistart immer.
- Qualitaetsschicht immer.
- KI-Unterstuetzung immer.
- Menschliche Kontrolle immer sichtbar.
- Keine stille Inhaltsersetzung.
- Kein Auto-Publish.
- Kein stilles Merge.
- Graph-Matching darf CTA-Moment erzeugen, aber keine automatische Zusammenlegung.
- Anlassraum bleibt Arbeitsort, Dossier bleibt Verdichtung.
- `/runden` ist aktuell die oeffentliche Anlassraum-Surface (Themen-/Kontext-Einstieg).
- `Anlassraum` bleibt der Domaenenbegriff; `/anlassraum` ist offizieller Alias-/Zielbegriff und als non-breaking Wrapper auf `/runden` aktiv.
- `/swipes` ist Beteiligungs-/Bewertungssurface (nicht Oberdomaene).
- Post-Finalize-Routing ist konditional und servergefuehrt: mit Dossier nach `/dossier/<id>`, sonst nach `/swipes?fromDraft=<draftId>`.
- Social/Community-Naehe erst nach Sach-Commitment, nicht sofort.

## Social-Safety Guardrails (verbindlich)

- Kein direktes Nutzer-Matching nur auf Basis von:
  - fruehen Erkenntnissen/inhaltlicher Naehe
  - Region
  - aehnlicher Position
- Vor sozialer Naehe ist sichtbares Sach-Commitment erforderlich, z. B.:
  - Beitrag weiter ausarbeiten
  - Quellen ergaenzen
  - Diskussionspunkt konkretisieren
  - Eventualitaeten/Optionen mitbearbeiten
  - Funding-/Founding-Interesse mit inhaltlicher Mitwirkung
- Social-Eskalation nur gestuft:
  - kein ungefragtes DM-Default
  - kein aggressiver Gruppensog
  - opt-in, moderierbar, missbrauchssensibel, nachvollziehbar

Schutzdimension (explizit):
- Schutz vor Belaestigung
- Schutz vor Anmachspruechen
- Schutz vor zweideutigen/manipulativen Narrativen
- Schutz vor sozialem Druck/Vereinnahmung
- besonderer Schutz fuer Frauen
- besonderer Schutz fuer vulnerable und andersdenkende Nutzer

Entscheidungsstand (GOV-SAFETY-03, 2026-03-26):
- Gestuftes Freigabemodell ist kanonisch.
- Kein DM-/Gruppenpfad als Default.
- Operative Startform nur in ausdruecklich freigegebenen moderierten/kuratierten Kontexten.
- Technische Umsetzung folgt ueber `GOV-SAFETY-03A`, `GOV-SAFETY-03B`, `GOV-ANLASS-08B`.
- Implementierungsstand 2026-03-27 (`GOV-SAFETY-03A` + `GOV-SAFETY-03B`): zentraler Policy-Resolver ist aktiv; `match.request` bleibt ohne moderierten/kuratierten Kontext + Opt-in + Trust/Verifikation standardmaessig gesperrt und ist zusaetzlich um Rate-Limit/Cooldown/Abuse-Gate/Audit gehaertet.
- Implementierungsstand 2026-03-27 (`GOV-ANLASS-08B`): Research-/Review-Anschluesse tragen die Safety-Startform explizit in Contracts/Docs; kein Kontakt-/Gruppen-Default aus Research-Pfaden.

## Security/Privacy/AI-Zoning (verbindlich)

## Secret-Hygiene

- Prod-Secrets/Prod-URIs sind kein lokaler Alltagsstandard.
- Rotation/Hygiene/Risikoaufklaerung ist Pflicht.
- "Lokal funktioniert" ist kein Security-Nachweis.

## Datenzonen

- `PII-Zone`: Identitaet, Kontakte, sensible personenbezogene Daten
- `Content-Zone`: Beitraege, Claims, Quellen, Kontexte
- `AI-Processing-Zone`: nur minimal notwendige, moeglichst entpersonalisierte Arbeitsdaten
- `Trust/Audit-Zone`: Scores, Entscheidungen, Review-/Freigabehistorie, Trace

## Externe KI-Nutzung

- Nur minimal notwendige Ausschnitte an externe Modelle.
- Keine unnoetige PII-Mitgabe.
- Sensible Faelle bevorzugt ueber kontrollierbare/self-hosted/auditierbare Pfade.
- High-impact-Schritte mit Audit-/Trace-Pflicht.

## Maschinenzugriffe auf Factcheck/Finding (GOV-SEC-05, 2026-03-26)

- Nicht-interaktive Zugriffe sind nur ueber interne Queue-/Worker-Pfade mit kontrollierter Systemidentitaet erlaubt.
- Kein Rollenvertrauen ueber frei setzbare Request-Header.
- Kein Query-/Header-basierter Rollenbypass als Maschinen-Contract.
- Auditierbarkeit ist Pflicht.
- Optionales M2M-JWT bleibt ein spaeteres Architekturthema und ist nicht Teil des aktuellen Kanons.
- Implementierungsstand 2026-03-27 (`GOV-SEC-05A` + `GOV-SEC-05B`): shared System-Identity-Contract (`source`, `actor kind`, `runRef`, `jobRef`, `requestId`) ist aktiv; Factcheck/Finding tragen Maschinenzugriffe nur noch ueber trusted internal system identity (Token + Contract-Header), Header-Role-only bleibt fuer Maschinenpfade gesperrt.
- Implementierungsstand 2026-03-27 (`GOV-SEC-05C`): allowed-/denied-/bypass-Pfade (inkl. query/header-only) sind route-nah testbar und denied-audit Felder strukturiert nachgewiesen.

## High-impact Klassen (erhoehte Pflicht)

- Moderation/Hate/Bias
- Trust-/Score-nahe Entscheidungen
- Dossier-/Pruef-Verdichtung
- Publish-/Approval-nahe Vorstufen
- Personen-Matching und Community-Eskalation

## Anbieter-/Modellstrategie pro Orchester (Empfehlung 2026-03)

Hinweis: Dies ist eine priorisierte Architektur-Empfehlung, keine Fake-Sicherheitszusage. DPA/Residency/SLA/Kosten muessen je Anbieter laufend geprueft werden.

| Orchester | Primaer (Qualitaet) | Sekundaer/Fallback | Open-weight/self-host Option | Warum |
| --- | --- | --- | --- | --- |
| Intake-Orchestrierung | OpenAI `GPT-5.x` Thinking-Klasse | Gemini/Anthropic Frontier-Reasoning-Klasse | Llama-3.x/4.x-Instruct Klasse fuer Vorstrukturierung/Klassifikation | Intake braucht robustes Verstehen + gute Rueckfragen; Vorstrukturierung kann guenstiger/self-host laufen |
| Pruef-Orchestrierung | OpenAI Thinking-Klasse + Retrieval-Stack | Gemini/Anthropic + Search-Provider (z. B. You/SearchDB) | Open-weight Modelle fuer Vorannotation, Dubletten, einfache Evidenzmuster | Konflikte/Unsicherheiten sind reasoning-heavy; Retrieval und Quellenpfade muessen reproduzierbar bleiben |
| Agenda-/Fragen-Orchestrierung | OpenAI Thinking-Klasse | Gemini/Anthropic fuer Variantenbildung | Open-weight Modelle fuer Entwurfsvarianten/Clustering | Fragequalitaet und Moderationsnutzen brauchen starke Argumentstruktur; Varianten koennen kostenguensig generiert werden |
| Dossier-Orchestrierung | OpenAI Thinking-Klasse (hoechste Prioritaet) | Anthropic/Gemini Frontier-Reasoning | Nur selektiv self-host (nach eval) | Kritischster Verdichtungsbereich mit hohem Governance-Risiko; hoechste Qualitaet + Reviewpflicht |
| Beteiligungs-/Abstimmungs-Orchestrierung | OpenAI Thinking-Klasse | Gemini/Anthropic | Open-weight Modelle fuer Ranking/Dedupe-Vorstufen | Optionen/Eventualitaeten und Fragequalitaet brauchen gutes Abwaegen; Vorarbeit ist gut parallelisierbar |

## DSGVO-optimierte Betriebsprinzipien

- PII-Redaction vor externem Modellaufruf als Default.
- Prompt/Response-Logging nach Datenzone trennen.
- Tenant-/Scope-Bindung in Auditdaten.
- Providerwechsel ohne Produktlogikbruch durch typed Contracts.
- Self-host Optionen nicht als Selbstzweck, sondern fuer sensible Teilpfade und Kostenkontrolle.

## Offene Research-Fragen (explizit)

- Welche Provider-Kombination erfuellt DPA/Residency-Anforderungen je Datenzone belastbar?
- Welche High-impact-Pfade brauchen zwingend Human-Review vor Persistenz?
- Welche Eval-Suiten sind pro Orchester minimal erforderlich (Qualitaet, Bias, Safety, Kosten)?
- Welche Fallback-Matrix ist bei Provider-Ausfall verbindlich (SLA, Timeout, Circuit-Breaker)?
- Welche Teile der Pruef-/Beteiligungs-Orchestrierung koennen DSGVO-staerker self-hosted laufen, ohne Qualitaetsabfall?
- Welche Route-/Auth-/AI-Auditartefakte werden als Release-Gate verpflichtend?

## Decision-Stand (2026-03-27)

- `GOV-AI-04` ist entschieden: Option A `strict staged` ist Startkanon fuer den produktiven Hauptfluss.
- Produktiv gilt damit ein klarer Stage-Pflichtpfad; direkte Providerpfade ausserhalb davon bleiben Ausnahme-/Legacy-/Nebenspuren und sind kein gleichwertiger Hauptfluss.
- Degraded-Antworten bleiben zulaessig, aber sichtbar innerhalb des Hauptcontracts markiert (kein impliziter Vollzug, kein Auto-Publish).
- Entscheidungsbasis bleibt dokumentiert in `docs/E150/GOV-AI-04A_ORCHESTRATION_IMPACT_MATRIX_2026-03-27.md`.
- `GOV-AI-04B` ist umgesetzt: Stage-/Boundary-Contract wird shared geparst und testseitig eingefroren (`docs/E150/GOV-AI-04B_STAGE_BOUNDARY_CONTRACT_2026-03-27.md`).
- `GOV-AI-04C` ist umgesetzt: direkte Providerpfade sind als Ausnahme-/Legacy-Contract gegen den strict-staged Hauptfluss abgegrenzt (`docs/E150/GOV-AI-04C_DIRECT_PROVIDER_EXCEPTION_CONTRACT_2026-03-27.md`).
- `GOV-AI-04D` ist umgesetzt: Analyze->Match->CTA State-/Meta-Transfer ist ueber shared Envelope-/Handoff-Contracts regressionssicher gehaertet (`docs/E150/GOV-AI-04D_STATE_META_TRANSFER_2026-03-27.md`).
- `GOV-AI-ORCH-02` ist umgesetzt: produktnahes KI-/Route-Inventar inkl. staged-vs-direct, Contract-Status und Gap-Mapping liegt vor (`docs/E150/GOV-AI-ORCH-02_ROUTE_INVENTORY_2026-03-27.md`).
- `GOV-AI-ORCH-03` ist umgesetzt: Provider-/Modellbaseline je Orchester mit Primar/Fallback, Failure-Modes und offenen DPA/Residency/Kosten-Risiken liegt vor (`docs/E150/GOV-AI-ORCH-03_PROVIDER_STRATEGY_BASELINE_2026-03-27.md`).
- `PR-AI-CREATE-01C` ist umgesetzt (2026-04-03): `/create` ist kontraktnah als intent-basierter Multi-Entry-Orchestrator gehaertet (`apps/web/src/features/create/orchestratorIntentContract.ts`) mit kleinen Entry-Intents (`issue_signal`, `content_companion`, `round_setup`, `org_context_setup`) und `guided/direct`-Modus, ohne neue Wahrheits-/Prioritaetslogik (`docs/E150/PR-AI-CREATE-01C_CREATE_MULTI_ENTRY_ORCHESTRATOR_2026-04-03.md`).
- `PR-THEMENRADAR-01` ist umgesetzt (2026-04-19): `/admin/themenradar` fuehrt als operatorische Nachlagerung Themen von `raw` bis `review_ready`, nutzt den bestehenden Share-ready-Contract (`features/anlassraum/shareReadyAssetContract.ts`) mit unveraenderten Guardrails (`autoPostEligible=false`, `needsReviewBeforeOfficialSocial=true`) und bleibt strikt review-first ohne Auto-Publish-/Wahrheits-/Prioritaets-Sonderpfad (`docs/E150/PR-THEMENRADAR-01_VOG_THEMENRADAR_OPERATOR_SURFACE_2026-04-19.md`).
- `PR-OPS-STATUS-REPORT-01` ist umgesetzt (2026-04-19): interner Scheduler-basierter Ops-Statusreport prueft AI-Routen aktiv (u. a. `/api/contributions/analyze`, `/api/create/analyze`) und versendet nur interne SMTP-Berichte; Guardrails bleiben unveraendert (kein Auto-Publish, kein offizielles Social-Autoposting, keine Wahrheits-/Prioritaets-Sonderlogik) (`docs/E150/PR-OPS-STATUS-REPORT-01_AUTOMATED_STATUS_EMAILS_2026-04-19.md`).
- `PR-THEMENRADAR-02` ist umgesetzt (2026-04-19): Themenradar ist auf persistente Repo-/Collection-Basis angehoben, Lifecycle-/Freigabegates wurden serverseitig gehaertet (inkl. explizitem Publish-Intent), und eine append-only Audit-Spur mit Actor/Version ist aktiv; Guardrails bleiben unveraendert review-first ohne Auto-Publish-/Wahrheits-/Prioritaets-Sonderpfad (`docs/E150/PR-THEMENRADAR-02_PERSISTENCE_AUDIT_HARDENING_2026-04-19.md`).
- Produktionsreife-Markierung (2026-03-29): staged Hauptpfad, direct-exception-Vertrag sowie Boundary-/Envelope-Mindestpflichten sind als operativer Baseline-Contract zusammengefuehrt (`apps/web/src/features/ai/orchestrationProductionContract.ts`, `docs/E150/GOV-AI-ORCH-04_PRODUCTION_READINESS_MARK_2026-03-29.md`).
- `GOV-AI-07` ist entschieden (2026-03-28): Meta-Basissatz ist auf allen Pfaden verpflichtend; der Pflichtkern fuer Nachvollziehbarkeit/Erklaerbarkeit bleibt synchron (inkl. Analyse, Dossier, Factcheck, Matching, CTA, Findings und veroeffentlichungsnaher Verdichtung). Asynchrone Nachreichung ist nur fuer vertiefende Zusatzinformationen erlaubt.
- `GOV-SEC-03` ist entschieden (2026-03-28): votes/core Split wird komplett umgesetzt; Neo4j- und Prisma-Cross-Store-Pfade sind beide kritisch (Neo4j zuerst tiefer haerten, Prisma direkt danach); direkte Providerpfade unterliegen dem Mindestcontract aus Auditfeldern, PII-Redaction und Allowlist.
- `GOV-SIGNAL-01` ist entschieden (2026-03-28): Option A ist der Startkanon. Signals bleiben Relevanz-/Dynamik-/Priorisierungs-/Radarlogik und setzen weder Wahrheit noch Faktenstatus, Voting-Gewicht, Funding-Legitimation oder Sondermacht.
- `GOV-SIGNAL-01` Policy-/Profil-Logik: Decay/Laufzeit sind policy-/profilgesteuert (Kurzzyklus/Standard/Quartal/Halbjahr) und anschlussfaehig fuer Medien/Verbaende/Firmen/Kommunen/Veranstaltungen sowie offene/geschlossene Raeume.
- `GOV-FUNDING-01` ist entschieden (2026-03-28): Funding ist Ermoeglichungslogik, kein Legitimationsersatz; es dockt primaer an konkrete Anlassraeume an, bleibt getrennt von Wahrheit/Faktenstatus/Voting und ist ueber Transparenz- und Anti-Capture-Gates gebunden.
- `GOV-FUNDING-02` ist umgesetzt (2026-03-29): Ressourcen-/Sachleistungs-/Begleit-Funding ist typed contract-seitig vorbereitet (inkl. Anlassraum-first, Matching-Frame und Capture-/Transparenz-Pflichten), ohne Funding-Engine oder Checkout (`docs/E150/GOV-FUNDING-02_RESOURCE_SUPPORT_CONTRACT_2026-03-29.md`).
- `GOV-FUNDING-03` ist umgesetzt (2026-03-29): Impact-/Follow-up-/Refunding-Lifecycle ist typed kontraktnah gehaertet (reason-/audit-pflichtig, projektbezogen, ohne Reward-Drift und ohne Payment-/Checkout-Engine) (`docs/E150/GOV-FUNDING-03_IMPACT_REFUNDING_CONTRACT_2026-03-29.md`).
- `GOV-PRICING-01` ist entschieden (2026-03-29): Hybridmodell mit Caps ist Startkanon; Public Core bleibt offen, Professional Layer bepreist Umsetzungs-/Orga-Leistung (nicht Wahrheit oder Debattenausgang).
- `GOV-PRICING-01` Segmentlogik ist manifestiert: Public/Free, Civic Creator, Media Creator, Team/Organization, Kommune/oeffentlicher Traeger; Agency/Publisher-Teams laufen ueber Team-/Organization-/Publisher-Logik.
- `GOV-PRICING-02` ist operativ umgesetzt: `02A` (typed Policy-/Override-/Explainability-Contract), `02B` (typed Audit-/KPI-Contract) und `02C` (typed Readmodel-Integration in bestehende Admin-Reads) sind abgeschlossen; weiterhin ohne Checkout/Payment (`docs/E150/GOV-PRICING-02_ADMIN_PRICING_CONTROL_CONTRACT_2026-03-29.md`).
- `GOV-JOURNALISM-01` ist entschieden (2026-03-29): `source_anchor` ist legitimer Anlassgeber, aber ohne Sonderwahrheit/-macht; Anlassraeume bleiben epistemisch offen mit sichtbaren Gegenfragen/Eventualitaeten.
- Journalistische beschleunigte Pfade bleiben begrenzte, transparente Workflow-Erleichterungen; Sondertools/Spezialpfade sind zulaessig, solange sie den kanonischen Kern nicht verdraengen.
- `GOV-JOURNALISM-02` ist umgesetzt (2026-03-29): shared Truth-Guardrail-Contract fuer `source_anchor` ist aktiv (`features/anlassraum/journalismGuardrails.ts`) und wird route-nah als Meta-Contract ausgegeben (`/api/admin/governance/anlassraum`), ohne Wahrheits-/Prioritaetsprivileg oder neuen Sonderkanal (`docs/E150/GOV-JOURNALISM-02_TRUTH_GUARDRAILS_FACTCHECK_CONTRACT_2026-03-29.md`).
- `GOV-JOURNALISM-03` ist umgesetzt (2026-03-29): Companion-/Embed-/QR-Anschluss ist als shared Contract gehaertet (`features/anlassraum/journalismCompanionContract.ts`) und route-nah als `meta.journalismCompanionContract` eingebunden; oeffentlicher Anschluss bleibt moeglich ohne Wahrheits-/Prioritaetsprivileg und ohne Parallelkanon (`docs/E150/GOV-JOURNALISM-03_COMPANION_EMBED_QR_CONTRACT_2026-03-29.md`).
- `MEDIA-EVIDENCE-QR-PRICING-01` ist entschieden (2026-09-14): Medien koennen den gemeinsamen Evidenzstand vor und waehrend der Berichterstattung nutzen; Faktencheck und normale Recherche bleiben unbepreiste Evidenzfaehigkeiten; bezahlt werden professionelle Organisations-, Integrations-, Betriebs-/SLA- und menschliche Zusatzleistungen. QR-/Companion-Eignung folgt agent-first einer versionierten Evidenz-, Transparenz-, Methoden-, Confidence- und Risk-Policy statt Meinungsgleichheit. Der Agent fragt bei behebbaren Maengeln zuerst Redaktion/Verfasser/Kunde; nur materielle Restunsicherheit, hohe Wirkung, sensible Quellen, Policy-Konflikt oder Einspruch fuehren mit vorbereitetem Pruefbericht in den Human Loop (`docs/E150/MEDIA_EVIDENCE_QR_PRICING_DECISION_2026-09-14.md`).
- `GOV-JOURNALISM-04` ist umgesetzt (2026-03-29): journalistische Rollen-/Profil-/Publisher-Anschluesse sind als shared Contract gehaertet (`features/anlassraum/journalismRoleProfileContract.ts`) inkl. Stack-Konsistenzpruefung (`meta.journalismConsistency`), ohne Medien-Sondermacht und ohne Zwang zur Vollredaktion (`docs/E150/GOV-JOURNALISM-04_ROLE_PROFILE_PUBLISHER_CONTRACT_2026-03-29.md`).
- `GOV-MUNI-01` ist entschieden (2026-03-29): kommunale Dashboard-Logik startet verbindlich Monitoring-first (Kontext/Status/Transparenz), ohne Anlassraum-/Dossier-Uebersteuerung, ohne hidden scoring und ohne privilegierten Verwaltungswahrheitskanon.
- `GOV-MUNI-02` ist umgesetzt (2026-03-29): shared Dezernats-/Zustaendigkeits-Guardrails sind aktiv (`features/anlassraum/municipalResponsibilityGuardrails.ts`) und werden route-nah als Meta-Contract ausgegeben (`/api/admin/governance/anlassraum`), ohne Verwaltungs-Autopilot oder Prioritaets-/Scoring-Sonderkanal (`docs/E150/GOV-MUNI-02_DEPARTMENT_RESPONSIBILITY_CONTRACT_2026-03-29.md`).
- `GOV-MUNI-03` ist umgesetzt (2026-03-29): shared Status-/Prozess-Contract ist aktiv (`features/anlassraum/municipalProcessStatusContract.ts`) und wird route-nah als Meta-Contract (`meta.municipalProcessStatus`) ausgegeben; Monitoring-first, Reason-/Audit-Pflichten und Transition-Guardrails sind testseitig eingefroren (`docs/E150/GOV-MUNI-03_PROCESS_STATUS_CONTRACT_2026-03-29.md`).
- `GOV-MUNI-05` ist umgesetzt (2026-03-29): shared Verwaltungsmodus-/Governance-Gate-Contract (`features/anlassraum/municipalGovernanceModeContract.ts`) wird route-nah als `meta.municipalGovernanceMode` ausgegeben; Follow-up-/Release-Uebergaenge sind reason-/audit-pflichtig und bleiben ohne versteckte Eingriffslogik (`docs/E150/GOV-MUNI-05_GOVERNANCE_GATES_CONTRACT_2026-03-29.md`).
- `GOV-MUNI-06` ist umgesetzt (2026-03-29): shared Rollen-/Rechte-/Governance-Profil-Contract (`features/anlassraum/municipalRoleGovernanceContract.ts`) ist aktiv und wird route-nah als `meta.municipalRoleGovernance` plus `meta.municipalRoleGovernanceConsistency` ausgegeben; Monitoring-first bleibt gewahrt, Rollen erzeugen keine Wahrheits-/Prioritaetssondermacht (`docs/E150/GOV-MUNI-06_ROLE_GOVERNANCE_PROFILE_CONTRACT_2026-03-29.md`).
- `GOV-ORG-01` ist umgesetzt (2026-03-29): shared Org-Context-/Attachment-Contract (`features/anlassraum/orgContextAttachmentContract.ts`) verankert Organisationskontext anlassraum-first mit optionalem Dossierbezug, inkl. Guardrails gegen Parallel-Domaene und epistemische Sondermacht (`docs/E150/GOV-ORG-01_DOSSIER_ANLASSRAUM_ORG_CONTEXT_CONTRACT_2026-03-29.md`).
- Route-nahe Einbindung fuer Org-Context ist aktiv: `/api/admin/governance/anlassraum` gibt `meta.orgContextAttachment` und `meta.orgContextConsistency` aus, ohne neue API-Landschaft oder Organisations-Sonderkanal.
- `GOV-ORG-02` ist umgesetzt (2026-04-03): shared Org-/Publisher-/Team-Context-Contract (`features/anlassraum/orgPublisherTeamContextContract.ts`) ist aktiv und route-nah als `meta.orgPublisherTeamContext` plus `meta.orgPublisherTeamContextConsistency` angebunden; Kontextzuordnung bleibt Arbeits-/Traegerlogik ohne Wahrheits-/Prioritaets-/Voting-/Faktenstatus-Sondermacht (`docs/E150/GOV-ORG-02_ORG_PUBLISHER_TEAM_CONTEXT_CONTRACT_2026-04-03.md`).
- Org-/Publisher-/Team-Kontext bleibt explizit von Thema-/Regionsachse und von Dossier-Hoheit getrennt; keine implizite Aufwertung fuer Publisher-, Team- oder institutionelle Orga-Kontexte.
- `GOV-CIVIC-01` ist umgesetzt (2026-03-29): shared Civic-/Creator-/Stream-/Repraesentanz-Contract (`features/anlassraum/civicCreatorRepresentationContract.ts`) trennt Arbeit-/Sichtbarkeitsstufen und Thema-vs-Region-Achsen ohne Wahrheits-/Prioritaetsprivileg; route-nah aktiv als `meta.civicCreatorRepresentation` und `meta.civicCreatorRepresentationConsistency` (`docs/E150/GOV-CIVIC-01_CREATOR_STREAM_REPRESENTATION_CONTRACT_2026-03-29.md`).
- `GOV-CIVIC-02` ist umgesetzt (2026-03-30): typed Lifecycle-/Transition-Contract (`features/anlassraum/civicCreatorLifecycleContract.ts`) ist aktiv und route-nah als `meta.civicCreatorLifecycle` plus `meta.civicCreatorLifecycleConsistency` angebunden; Uebergaenge bleiben profile-/capability-basiert ohne Wahrheits-/Prioritaets-/Voting-Sondermacht (`docs/E150/GOV-CIVIC-02_INITIATIVE_LIFECYCLE_TRANSITION_CONTRACT_2026-03-30.md`).
- `GOV-CIVIC-03` ist umgesetzt (2026-03-30): typed Impact-/Unterstuetzungs-Contract (`features/anlassraum/civicCreatorImpactSupportContract.ts`) ist aktiv und route-nah als `meta.civicCreatorImpactSupport` plus `meta.civicCreatorImpactSupportConsistency` angebunden; Unterstuetzung bleibt lifecycle-gebunden, nicht-hierarchisch und ohne Wahrheits-/Prioritaets-/Voting-/Faktenstatus-Privileg (`docs/E150/GOV-CIVIC-03_IMPACT_SUPPORT_CONTRACT_2026-03-30.md`).
- `GOV-CIVIC-04` ist umgesetzt (2026-04-04): typed Share-ready-/Target-Contract (`features/anlassraum/shareReadyAssetContract.ts`) modelliert kanonische Share-/QR-Ziele (`anlass`, `round operating`, `round results`, `dossier`, `companion`) plus Social-Qualification ohne Auto-Posting-Default (`autoPostEligible=false`, `needsReviewBeforeOfficialSocial=true`); Factcheck-/Andockhinweise bleiben non-blocking (`docs/E150/GOV-CIVIC-04_SHARE_READY_TARGET_CONTRACT_2026-04-04.md`).
- Fuer den kommunalen Startkanon sind legitime KPI-/Status-/Zustaendigkeitsgruppen dokumentiert; Empfehlungen bleiben spaetere, nicht-bindende und auditierbare Folgeoption.
- Entscheidungsvorlagen und safe Prep-Slices sind dokumentiert in `docs/E150/GOV_DECISION_PREP_2026-03-27.md`.

## Verbindliche Grenzen fuer Folgeslices

- Kein Ausbau von Personen-Matching/Inbox/DM ohne Umsetzung der Slices `GOV-SAFETY-03A` und `GOV-SAFETY-03B`.
- Kein grosser Architektur- oder Feature-Slice ohne GOV-SEC-02 Auditlauf.
- Keine Abkuerzung bei no-auto-publish/review-first/approval-first/manual-first.

## Entscheidungsstand GOV-AI-02 / GOV-AI-03 (2026-03-27)

- `GOV-AI-02` ist entschieden: CTA-Layer ist konservativ-deterministisch kanonisiert auf Basis des eingefrorenen Ist-Contracts (`GOV-AI-02A/B`).
- Verbindlich fuer den Startkanon: kein Silent-Merge, kein Auto-Publish, kein impliziter Vollzug durch CTA-Ausgabe, `neu_anlegen` bleibt sicherer Ausweichpfad.
- `GOV-AI-03` ist entschieden: Anlassraum ist der oeffentliche thematische Arbeits-/Kontextraum; `/create` bleibt Intake, `/runden` bleibt Anlassraum-Surface, Dossier bleibt Verdichtung, `/swipes` bleibt Beteiligung/Bewertung.
- Das konditionale Finalize-Routing bleibt unveraendert servergefuehrt (`/dossier/<id>` oder `/swipes?fromDraft=<draftId>`).
- Nicht Teil dieser Entscheidung: neuer Anlassraum-Editor-Modus oder neue Routinglogik.
- Evidenzdateien:
  - `docs/E150/GOV-AI-02B_CTA_CONTRACT_REST_COVERAGE_2026-03-27.md`
  - `docs/E150/GOV-AI-03A_ANLASSRAUM_WORK_CONTEXT_MATRIX_2026-03-27.md`
  - `docs/E150/GOV-AI-02D_CTA_CANON_SYNC_2026-03-27.md`
  - `docs/E150/GOV-AI-03B_SURFACE_CONTRACT_SYNC_2026-03-27.md`
  - `docs/E150/GOV-AI-03C_HANDOFF_UI_CONTRACT_SYNC_2026-03-27.md`
- Implementierungsstand:
  - `GOV-AI-02C` ist umgesetzt: shared typed CTA-Resolver (`resolveCreateCtaSuggestions`) haertet Match-/No-Match-/Degraded-Pfade deterministisch ohne neues CTA-Keyset oder neue Priorisierung.
  - `GOV-AI-02D` ist umgesetzt: CTA-Kanon ist in Part16/Part05/create-intake und den Analyze-/Create-Contracts konsistent nachgezogen.
  - `GOV-AI-03B` ist umgesetzt: Surface-/Begriffstexte halten Anlassraum konsistent als Arbeits-/Kontextraum.
  - `GOV-AI-03C` ist umgesetzt: Handoff-/UI-Vertrag zwischen `/create`, `/runden`, `/swipes`, `/dossier` ist ohne Routing-Aenderung synchronisiert.
