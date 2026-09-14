# Part16 - Canonical Orchestration Flow

> Stand: 2026-03-21
> Status: Canonical Architecture Baseline
> Verbindlicher Task-Backlog: `docs/E150/OpenTasks.md`

## Zweck

Dieses Part definiert den kanonischen KI-/Produktfluss fuer E150/VoiceOpenGov als einen gemeinsamen Produktfluss mit spezialisierten Unter-Orchestrierungen und einem verpflichtenden Meta-Layer.

Superseded Altannahme:
- sichtbarer Primaersplit `manual/source/ai` als Zielarchitektur.

Kanonische Form:
- `Freistart -> Intake-Orchestrierung -> Pruef-/Qualitaetsschicht -> Graph-Matching -> CTA-/Routing-Layer -> Anlassraum/Dossier/Debatten-Setup/Beteiligung -> Output/UI/API -> Meta-Layer/Audit/Governance`

## Einordnung der Part16-Familie (harmonisiert 2026-03-26)

- `docs/E150/Part16.md` bleibt das kanonische Hauptdokument.
- `docs/E150/Part16_AI_Orchestration_and_Safety.md` konkretisiert Safety/Security/Providerstrategie.
- `docs/E150/Part16_Anlassraum_Model.md` konkretisiert Anlassraum-Domainregeln.
- Operativer Aufgabenstand bleibt in `docs/E150/OpenTasks.md`.

## A. Warum ein Fluss statt mehrerer Produkt-Modi

- Es gibt keinen primaeren Nutzer-Modus-Split `manual/source/ai` mehr.
- Nutzerseitig startet der Prozess als Freistart.
- Das System erkennt, strukturiert und routed danach intern.
- Orchestrierungen sind interne Qualitaets-, Pruef- und Routing-Schichten.
- Sichtbare menschliche Kontrolle bleibt verpflichtend.

## B. Kanonischer Hauptfluss

Feste Abfolge:

1. Freistart / Input Capture
2. Intake-Orchestrierung
3. Pruef-/Qualitaets-Orchestrierung
4. Graph-Matching
5. CTA-/Routing-Layer
6. Anlassraum / Dossier / Debatten-Setup / Beteiligung
7. Output / UI / API
8. Meta-Layer / Audit / Governance

Architekturregel:
- Der Meta-Layer ist querliegend ueber alle Stufen aktiv, auch wenn er hier als Schritt 8 benannt ist.

## C. Unter-Orchestrierungen

Verbindliche Orchestrierungen:

1. Intake-Orchestrierung
- Input-Typ-Erkennung
- Segmentierung
- Input-Normalisierung
- Rueckfragen nur bei Bedarf
- PII-/Datenschutz-Vorpruefung

2. Pruef-Orchestrierung
- Claims erkennen
- Pruefbar vs. wertend trennen
- Quellenbedarf markieren
- Unsicherheiten und Gegenpositionen markieren
- Truth-/Risk-Hinweise ausgeben

3. Agenda-/Fragen-Orchestrierung
- Diskussionspunkte bilden/buendeln/trennen
- fokussierbare Fragen formulieren
- abschaltbare Punkte markieren
- moderation-/medien-/verbandsgeeignete Agenden vorschlagen

4. Dossier-Orchestrierung
- Anlassraum -> Dossier-Strukturierung
- Claim-Buendelung
- Evidenzpfade
- offene Fragen/Widersprueche/Konflikte
- eventualities/Optionen vorbereiten

5. Beteiligungs-/Abstimmungs-Orchestrierung
- Optionen/Eventualitaeten schaerfen
- Dedupe/Ranking/Exclude vorbereiten
- Fragequalitaet pruefen
- sprachspezifische Mehrdeutigkeit reduzieren

## D. Meta-Layer

Der Meta-Layer laeuft verbindlich querschnittlich und umfasst:
- provenance
- audit trail
- trust/risk flags
- bias/ethics checks
- layman explanation
- human-in-the-loop fuer high-impact Faelle
- monitoring / anomaly detection
- policy / law update readiness

Decision-Stand (2026-03-28):
- `GOV-AI-07`: Meta-Basissatz ist auf allen Pfaden verpflichtend; der Pflichtkern fuer Nachvollziehbarkeit/Erklaerbarkeit bleibt synchron.
- `GOV-SEC-03`: votes/core Split wird komplett umgesetzt; direkte Providerpfade bleiben nur mit Mindestcontract (Auditfelder + PII-Redaction + Allowlist) zulaessig.

## E. Language-Aware Regeln

- `uiLocale != contentLanguage != sourceLanguage` ist explizit erlaubt und erwartbar.
- Jede semantische Einheit behaelt eine sprachneutrale `canonicalId`.
- Originaltext bleibt unangetastete Primaerquelle.
- Uebersetzungen sind locale-spezifische Renderings, nicht der Ursprung.
- Cross-lingual Matching ist Pflicht.
- Cross-lingual Matching arbeitet semantisch, nicht nur auf String-Ebene.
- Rueckfragen erfolgen in der Nutzersprache.
- Fragequalitaet wird pro Sprache separat geprueft.
- High-impact Fragen muessen pro Sprache separat reviewbar sein.
- Oeffentliche Fragen duerfen sprachlich neu formuliert werden, muessen aber semantisch aequivalent bleiben.

## F. CTA-/Routing-Layer

Verbindliche CTAs:
- zustimmen
- anders sehen
- dossier oeffnen
- anlassraum oeffnen
- perspektive anhaengen
- neu anlegen

Guardrails:
- kein Auto-Publish
- kein Silent-Merge
- kein stilles Ueberschreiben des Ursprungs
- Human control bleibt sichtbar
- GOV-AI-02 Entscheidung (2026-03-27): konservativ-deterministischer Startkanon auf Basis des eingefrorenen Ist-Contracts (`GOV-AI-02A/B`), ohne neue Priorisierungslogik.
- GOV-AI-02D Sync (2026-03-27): derselbe Startkanon wird in Analyze-/Create-Flows und im shared Resolver `apps/web/src/features/create/ctaResolver.ts` referenziert (kein neues CTA-Keyset, keine neue Priorisierung).

Post-Finalize-Regel (Ist-Code, servergefuehrt):
- `api/contributions/finalize` entscheidet das Ziel.
- Mit Dossier: Redirect nach `/dossier/<id>`.
- Ohne Dossier: Redirect nach `/swipes?fromDraft=<draftId>`.
- Quelle fuer Create-Semantik: `docs/create-intake-unification.md`.

Surface-/Handoff-Contract (Ist-Stand, GOV-AI-03C):
- `/create`: kanonischer Intake + Handoff-Ausgangspunkt.
- `/runden`: oeffentliche Anlassraum-Surface fuer Arbeits- und Themenkontext.
- `/swipes`: Beteiligungsmodus (inkl. `fromDraft`-Arrival), ohne Anlassraum-Kontext zu ersetzen.
- `/dossier/<id>`: strukturierte Verdichtung; ersetzt weder Intake noch Anlassraum-Kontext.

## F.1 Signal-/Funding-/Pricing-Leitplanke (Decision-Prep)

- Signal-Logik bleibt Relevanz-/Dynamik-/Priorisierungssteuerung und ersetzt weder Wahrheit noch Faktenstatus.
- `GOV-SIGNAL-01` ist als konservativer Startkanon freigegeben (Option A): Signal bleibt Relevanz-/Dynamik-/Priorisierungslogik, Decay bleibt policy-/profilgesteuert, keine Wahrheits-/Fakten-/Voting-/Funding-Sondermacht.
- `GOV-FUNDING-01` ist als Ermoeglichungslogik freigegeben: Funding folgt dem Anlassraum (nicht umgekehrt) und bleibt strikt getrennt von Wahrheit/Faktenstatus/Voting/Legitimation.
- `GOV-FUNDING-02` ist als Contract-Folgeslice umgesetzt: Ressourcen-/Sachleistungs-/Begleit-Funding ist typed operationalisiert, Anlassraum-first bleibt Pflicht, Matching bleibt projektbezogen (`docs/E150/GOV-FUNDING-02_RESOURCE_SUPPORT_CONTRACT_2026-03-29.md`).
- `GOV-FUNDING-03` ist als Contract-Folgeslice umgesetzt: Impact-/Follow-up-/Refunding-Lifecycle ist typed gehaertet, reason-/audit-pflichtig und weiter ohne Payment-/Checkout-Engine (`docs/E150/GOV-FUNDING-03_IMPACT_REFUNDING_CONTRACT_2026-03-29.md`).
- Public Core bleibt offen; Professional Layer bepreist Umsetzungs-/Orga-Leistung statt epistemischer Sondermacht.
- `GOV-PRICING-01` ist manifestiert: Hybridmodell mit Caps, klare Segmentlogik (Public/Free, Civic Creator, Media Creator, Team/Organization, Kommune) und rote Linien gegen Wahrheits-/Signal-/Abstimmungs-Monetarisierung.
- `GOV-PRICING-02` ist operativ umgesetzt: `02A` (Policy-/Override-/Explainability-Contract), `02B` (Audit-/KPI-Contract) und `02C` (Readmodel-Integration in bestehende Admin-Reads) sind abgeschlossen; weiterhin ohne Checkout/Payment/Billing-Engine (`docs/E150/GOV-PRICING-02_ADMIN_PRICING_CONTROL_CONTRACT_2026-03-29.md`).
- `GOV-JOURNALISM-01` ist manifestiert: Journalismus kann Anlass geben und strukturieren, aber weder Sonderwahrheit noch Prioritaetsprivileg ableiten; Anlassraeume bleiben epistemisch offen.
- `MEDIA-EVIDENCE-QR-PRICING-01` manifestiert den Medienanschluss (2026-09-14): Redaktionen duerfen den gemeinsamen Evidenzstand fuer eigene Berichte nutzen; Faktencheck und normale Recherche werden nicht einzeln bepreist; QR-/Companion-Eignung folgt agent-first einer versionierten Evidenz-, Transparenz-, Methoden-, Confidence- und Risk-Policy statt Meinungsgleichheit. Behebbare Maengel gehen zuerst als Rueckfrage an Redaktion/Verfasser/Kunde; nur materielle Restunsicherheit, hohe Wirkung, sensible Quellen, Policy-Konflikt oder Einspruch fuehren mit Agent-Pruefbericht in den Human Loop (`docs/E150/MEDIA_EVIDENCE_QR_PRICING_DECISION_2026-09-14.md`).
- `GOV-MUNI-01` ist manifestiert: kommunale Dashboard-Logik startet Monitoring-first (Kontext/Status/Transparenz) und bleibt ohne Anlassraum-/Dossier-Uebersteuerung, hidden scoring oder privilegierte Verwaltungswahrheit.
- `GOV-MUNI-02` und `GOV-MUNI-03` sind kontraktnah umgesetzt: Dezernats-/Zustaendigkeits-Guardrails sowie Status-/Prozess-Guardrails werden route-nah als Meta-Contracts ausgegeben und sichern Monitoring-first ohne institutionellen Sonderkanal.
- `GOV-MUNI-05` ist kontraktnah umgesetzt: Verwaltungsmodus-/Governance-Gates mit reason-/audit-pflichtigen Follow-up-/Release-Uebergaengen sind route-nah angeschlossen, ohne hidden scoring und ohne Uebersteuerung des Kernkanons.
- `GOV-MUNI-06` ist kontraktnah umgesetzt: Rollen-/Rechte-/Governance-Profil-Contract vervollstaendigt den kommunalen Unterbau mit rollenbezogenen Aktionen und Stack-Konsistenzpruefung, ohne neue Sondermachtpfade.
- Empfehlungen im Muni-Kontext bleiben Folgephase und muessen nicht-bindend, transparent und auditierbar bleiben.

## G. Wording

Glossar/Abgrenzung (Ist-Stand):
- `Grundlage vorhanden`: Contracts, Importstrategie oder Runtime-Bausteine sind angelegt, aber noch kein geschlossener Produktpfad.
- `pilotfaehig`: kontrollierter Pilot mit klaren Guardrails ist moeglich.
- `produktionsnah` / `produktionskandidat`: ein Pfad ist nah an einem belastbaren Produkt, die offenen Luecken sind klar begrenzt.
- `produktionsfaehig`: definierter Zielgruppenpfad ist ohne stille Demo-/Seed-Abhaengigkeiten belastbar nutzbar.
- `live`: aktiver Betriebs- oder Vermarktungszustand mit belastbaren Support-/Betriebsannahmen.
- `Anlassraum`: Domaenenbegriff fuer thematischen Arbeits- und Kontextraum.
- `/runden`: aktuelle oeffentliche Surface fuer Anlassraum-/Round-Einstieg.
- `/anlassraum`: offizieller Alias-/Zielbegriff; als non-breaking Wrapper auf `/runden` aktiv, ohne harte Migration.
- `Dossier`: strukturierte Verdichtung als eigenes Zielobjekt.
- `Swipes`: Voting-/Einordnungsoberflaeche fuer Beteiligung; nicht thematische Oberdomaene.
- `Risk Ladder`: Sichtbarkeits- und Pruefstatus von `private_draft` ueber `internal_review`, `public_unverified`, `public_reviewed`, `public_official`, `archived` bis `blocked`.
- `RegionRegistry`: autoritative Importbasis fuer Regionen (z. B. Destatis GV-ISys / Gemeindeverzeichnis, spaeter Eurostat NUTS/LAU); kein Renderpfad fuer lokale XLSX-Dateien.
- `OfficialDirectory`: getrenntes Register fuer Anschriften der Gemeinde- und Stadtverwaltungen; ebenfalls Importbasis statt Runtime-Abhaengigkeit.
- `Registry`: operative Einordnungs-/Sammelansicht fuer Beteiligungsobjekte (im Ist-Code primaer `/swipes`).
- `Review/Operator`: Governance-/Management-Kontext, getrennt von Buerger-Surfaces.
- `Demo`: explizit gekennzeichneter Demo-/Pilot-Kontext, getrennt vom produktiven Standardfluss.
- DOMAIN-HARM-01 Entscheidung (2026-03-27): Option B (`/runden` bleibt kanonische Surface, `/anlassraum` als Alias-Zielrichtung ohne harte Migration). Evidenz: `docs/E150/DOMAIN-HARM-01A_SURFACE_ROUTING_MATRIX_2026-03-27.md`.
- GOV-AI-03 Entscheidung (2026-03-27): Anlassraum ist der oeffentliche thematische Arbeits-/Kontextraum; Dossier bleibt Verdichtung und Swipes bleibt Beteiligung/Bewertung.

## H. Ist-Mapping Community-Research -> Review/Anlassraum (GOV-ANLASS-08A)

Nur Ist-Stand, keine neue Produktentscheidung:

- Community-Einstiege:
  - `/research/tasks` (Research Board)
  - `/community/contributions` (strukturierte Community-Beitraege)
- Research-API-Pfade:
  - `/api/research/tasks/list`, `/api/research/tasks/[id]`, `/api/research/tasks/[id]/contribute`
  - Admin-Review: `/api/admin/research/tasks/*`, `/api/admin/research/contributions/*`
- Review/Anlassraum-Anschluss:
  - Feed-Review ueber `/api/admin/feeds/drafts/*`
  - Anlassraum-Steuerung ueber `/api/admin/feeds/anlassraum/*`
  - Dossier-Link ueber explizite kuratierte Aktion `/api/admin/feeds/anlassraum/[id]/dossier`
- Manifestierte Guardrails:
  - Community-Research erfordert Session + Verifikation + Rate-Limits
  - Review/Transition bleiben admin-/governance-gatet
  - Publish bleibt gate-geprueft und explizit, kein Auto-Publish
- Offene Entscheidungsgrenze:
  - Produkt-/Safety-Freigabe fuer Social-/Kontakt-Eskalation bleibt in `GOV-SAFETY-03` und ist bewusst nicht Teil dieses Mappings.

## Canonical Prompt Contracts

### Prompt Contract 1 - Intake-Orchestrierung

Ziel:
- Input-Typ erkennen
- Sprache/Sprachmix erkennen
- Quelle/Zitat/Freitext/Upload unterscheiden
- Segmente bilden
- PII-/Datenschutzhinweise markieren
- fehlende Angaben identifizieren
- nur Rueckfragen stellen, wenn noetig

Soll-Ausgabe:
- `inputType`
- `languages`
- `segments`
- `sourceHints`
- `piiRisk`
- `missingInfoQuestions`
- `normalizedInputSummary`
- `confidence`

### Prompt Contract 2 - Pruef-Orchestrierung

Ziel:
- Claims erkennen
- pruefbare vs. wertende Aussagen unterscheiden
- Quellenbedarf markieren
- Unsicherheiten markieren
- Konflikte/Gegenpositionen skizzieren
- keine Wahrheit halluzinieren

Soll-Ausgabe:
- `claims[]`
- `nonCheckableOpinions[]`
- `evidenceNeeds[]`
- `uncertainties[]`
- `counterPositions[]`
- `reviewPriority`
- `confidence`

### Prompt Contract 3 - Agenda-/Fragen-Orchestrierung

Ziel:
- aus Material gute Diskussionspunkte bauen
- Punkte buendeln/trennen/entschaerfen
- fokussierbare Fragen formulieren
- abschaltbare Punkte markieren
- medien-/verbands-/moderationsgeeignete Agenden vorschlagen

Soll-Ausgabe:
- `agendaCandidates[]`
- `questionCandidates[]`
- `mergeSuggestions[]`
- `disableSuggestions[]`
- `focusSuggestions[]`
- `moderationNotes[]`

### Prompt Contract 4 - Dossier-Orchestrierung

Ziel:
- Anlassraummaterial in belastbare Dossierstruktur ueberfuehren
- Claims buendeln
- Evidenzpfade aufbauen
- offene Fragen/Konflikte/Widersprueche markieren
- eventualities/Optionen vorbereiten
- `dossierType` ableiten ohne stilles Publizieren

Soll-Ausgabe:
- `dossierType`
- `groupedClaims[]`
- `evidencePaths[]`
- `openQuestions[]`
- `contradictions[]`
- `eventualities[]`
- `recommendedNextStep`

### Prompt Contract 5 - Beteiligungs-/Abstimmungs-Orchestrierung

Ziel:
- Optionen/Eventualitaeten schaerfen
- Dedupe/Ranking/Exclude vorbereiten
- Fragequalitaet pruefen
- sprachspezifische Mehrdeutigkeit reduzieren
- keine manipulative Zuspitzung

Soll-Ausgabe:
- `optionCandidates[]`
- `dedupeGroups[]`
- `rankingHints[]`
- `exclusions[]`
- `questionQualityAssessment`
- `localeWarnings[]`
- `finalizationNeeds[]`

### Prompt Contract 6 - Graph-Matching / CTA Layer

Ziel:
- Input gegen Claims/Anlassraeume/Dossiers/Perspektiven matchen
- Match-Staerke bewerten
- passenden CTA-Moment erzeugen
- kein stilles Zusammenfuehren

Soll-Ausgabe:
- `matches[]`
- `matchStrength`
- `matchType`
  - `exact_claim`
  - `related_claim`
  - `same_anlassraum`
  - `related_dossier`
  - `duplicate_risk`
  - `no_match`
- `matchEntityType`
  - `claim`
  - `anlassraum`
  - `dossier`
  - `perspective`
  - `question`
- `reasons[]`
- `suggestedCtas[]`
- `newStrandRecommended` (bool)
- `attachAsPerspectiveRecommended` (bool)

Regel:
- `matchStrength` allein reicht nicht; die CTA-Ableitung muss auch `matchType` und `matchEntityType` beruecksichtigen.

## Shared Output Envelope (verbindlich fuer alle Orchestrierungen)

Jede Orchestrierung liefert zusaetzlich zu ihren fachlichen Feldern immer:
- `schemaVersion`
- `orchestrator`
- `runId`
- `inputRef`
- `sourceLanguage`
- `contentLanguage`
- `uiLocale`
- `confidence`
- `uncertaintyFlags[]`
- `requiresHumanReview`
- `noAutoPublish = true`
- `noSilentMerge = true`
- `provenanceRefs[]`
- `createdAt`

Regeln:
- Kein kritischer Orchestrierungsuebergang nur mit losem Freitext.
- Jeder Output muss audit-, replay- und routingfaehig sein.
- Der Envelope ist providerunabhaengig zu formulieren.

## Governance Guardrails (verbindlich)

- no auto publish
- review-first
- approval-first
- manual-first
- provenance-by-default
- audit trail pro Schritt

## Operational Addendum (2026-03-21) — Single Opaque History Cursor

Create Prepare-Attach History Read:
- Endpoint: `GET /api/admin/create/attach-drafts/[draftId]/history`
- Query: `type`, `limit`, `cursor`
- Response: `events`, `reviewEvents`, `applyEvents`, `latestEvent`, `hasMore`, `nextCursor`, `type`, `limit`, `draft`

Cursor-Regel:
- Extern ist nur ein Cursor sichtbar (`nextCursor`).
- Der Cursor bleibt opaque; interne Scan-/Accepted-Informationen duerfen enthalten sein.
- Cursor sind draft- und filter-gebunden (`type=all|review|apply`), nicht zwischen Drafts/Filtern wiederverwendbar.

Legacy-Verhalten:
- Read-time Legacy-Normalisierung bleibt unveraendert aktiv (`normalizedFromLegacy`, `legacyNormalizationReason`).

Legacy-Backfill/Maintenance:
- Nur expliziter Maintenance-Pfad (`apps/web/scripts/create.history-backfill.ts`, Utility `apps/web/src/features/create/attachDraftHistoryBackfill.ts`).
- Default ist dry-run.
- Apply nur explizit (`--apply` oder `--mode=apply`) und idempotent ohne Event-Duplikate.
- Unsichere/ambige Rows werden reportet (`unsafe_to_backfill`), nicht blind umgeschrieben.

Guardrails bleiben unveraendert:
- kein Auto-Apply
- kein Auto-Merge
- kein Auto-Publish
- keine neue Produkt-Mutation
- Stage-2/Stage-3 bleiben unberuehrt

## Strategischer Leitsatz

Die eigentliche Unabhaengigkeit entsteht zuerst durch:
- eigene Contracts
- eigene Evals
- eigene Audit-Logik
- eigene Graph-/Governance-Struktur

Nicht zuerst durch ein eigenes Foundation Model.

Daraus folgt:
- Providerwechsel muss architektonisch moeglich sein
- Model-Souveraenitaet ist nachgelagert
- Produkt- und Governance-Souveraenitaet kommen zuerst

## Scope-Grenze (hard-deferred)

- Stage-2/Stage-3 (Self-Host/Souveraenitaet) sind bewusst nicht Teil der aktuellen Priorisierung.
- Diese Bloecke duerfen erst nach vollstaendigem Kernbetrieb, stabiler Live-Baseline und abgeschlossenen Kern-PR-Wellen gezogen werden.
