# Alpha2 — Unified Knowledge & Discovery Intake

Stand: 2026-08-26  
Issue: #651  
Status: **bounded architecture/intake slice; no implementation authorization**  
Operativer SSOT: `docs/E150/OpenTasks.md`

## Zweck

Dieser Intake konkretisiert Issue #651 gegen den bestehenden eDebatte-/Alpha2-Canon. Er eröffnet **keine zweite Knowledge-, SEO-, Agenten- oder Backlog-Wahrheit**.

Nordstern:

> Nicht Reichweite durch möglichst viele Seiten erzeugen, sondern Reichweite dadurch, dass überprüfbare demokratische Fragen, Orte, Zuständigkeiten, Quellen und Entscheidungen als ein konsistenter Knowledge Graph für Menschen, Suchmaschinen und KI-Systeme verständlich werden.

Die öffentlichen Rollen bleiben getrennt:

- **Vote4Gov = WHY / Systemanalyse** — demokratische Systeme, Institutionen, internationale Vergleiche und Systemfragen.
- **VoiceOpenGov = WHO + WHERE / Bewegung** — Menschen, Mitgliedschaft, regionale Vernetzung und reale Beteiligungsstrukturen.
- **eDebatte = WHAT + EVIDENCE / Prüfung und Entscheidung** — Fragen, Topics, Dossiers, Claims, Quellen, Widersprüche, Alternativen/Eventualitäten, Zuständigkeiten, Abstimmungen und Ergebnisse.
- **Voxy = Erklärung/Übersetzung** — nutzt dieselbe kanonische fachliche Wahrheit, ist aber kein eigener Fakten-SSOT.

## Canon-Abgleich

Der Auftrag ist eine Fortführung des vorhandenen Foundation-Canons, kein Bedeutungswechsel:

- `Constitution.md`: Evidenz, Quellen, Unsicherheit, Pluralität, Mehrsprachigkeit, Nachvollziehbarkeit und menschliche Verantwortung.
- `Architecture-Canon.md`: Core Platform als fachliche Quelle der Wahrheit; Knowledge-Domäne; Language Independent; Evidence First; keine parallelen Wahrheiten.
- `Engineering-Canon.md`: bestehende Architektur erweitern, Provenienz erhalten, Mehrsprachigkeit als Systemvertrag, Reversibilität und beobachtbare Zustände.
- `EDEBATTE_BRAND_NARRATIVE.md`: Stimmen/Perspektiven verbinden, Quellen/Evidenzen/Widersprüche sichtbar halten; keine Abstimmung über Wahrheit.

Daher gilt: **eDebatte Core/Knowledge bleibt kanonische Knowledge-/Evidence-Schicht.** Öffentliche Domain-Projektionen dürfen Kontext ergänzen, aber keine unabhängige Faktenkopie als SSOT etablieren.

---

# Repository-Audit und Intake-Entscheidungen

| Candidate | Vorhandene Foundation | Entscheidung | Delta |
| --- | --- | --- | --- |
| `ALPHA2-ENTITY-ID-CONTRACT-01` | `features/ai/roles/shared_types.ts` besitzt `canonicalIdFrom(...)`, `canonical_id`, Claim-/Evidence-Referenzen; weitere fachliche IDs existieren in Topic/Dossier/Participation-Pfaden | **EXTEND / NEW canonical contract** | Bestehende IDs inventarisieren und einen organisationsweiten typisierten Entity-ID-Vertrag definieren. Der heutige textbasierte Hash ist kein ausreichender fachlicher Universal-Identifier. IDs müssen sprach-/URL-unabhängig, typisiert, alias-/merge-fähig und migrationsfähig sein. |
| `ALPHA2-KNOWLEDGE-GRAPH-01` | Architecture Canon hat bereits die `Knowledge`-Domäne; Claims, Evidence, Dossiers, Topics, Widersprüche/Unsicherheit und Graph-Technik existieren im Repo | **EXTEND** | Keine zweite Graph-Datenhaltung. Bestehende Modelle/Stores zuerst inventarisieren; fehlende Relationstypen und kanonische Cross-Entity-Verknüpfungen ergänzen. |
| `ALPHA2-GEO-JURISDICTION-GRAPH-01` | `CREATE-PLACE-REGISTRY-JURISDICTION-08`, Stability-10, `features/region/directory.ts`, Place Resolver, Themenradar-/Region-Contracts | **EXTEND** | Bestehende amtliche Registry/Resolver weiterverwenden. Canonical geo/jurisdiction IDs, Hierarchie, Zuständigkeitsrelationen, amtliche Codes, Zeitgültigkeit und Provenienz ergänzen. Keine Parallel-Registry. |
| `ALPHA2-INDEXABILITY-GATE-01` | kein organisationsweiter evidence-gated Indexierungsvertrag gefunden | **NEW** | Maschinenlesbares Gate für `draft -> public_noindex -> indexable -> stale_review_required -> archived/superseded`; Sitemap/hreflang/robots daraus ableiten. |
| `ALPHA2-SEARCH-INTENT-ROUTING-01` | Marken-/Architekturtrennung vorhanden; Vote4Gov/VoiceOpenGov besitzen bereits separate öffentliche Rollen | **NEW contract, reuse brand roles** | Cross-Domain-Intent-Vertrag `WHY / WHO+WHERE / WHAT+EVIDENCE`; Duplicate-/Cannibalization-Eval; keine drei Kopien derselben Regional-/Thementexte. |
| `ALPHA2-MULTILINGUAL-ENTITY-CONTRACT-01` | `I18N_GO_PROGRAM_2026-07-27.md`, UI-/Reading-/Original-/Output-/Source-Language-Verträge und Capability-Modell | **EXTEND** | Entity-ID bleibt sprachunabhängig; lokalisierte Labels/Textfassungen werden versionierte Repräsentationen. Translation status, source locale, rendered locale und hreflang/canonical müssen mit bestehendem I18N-Canon konvergieren. |
| `ALPHA2-PROVENANCE-TEMPORALITY-01` | Constitution/Engineering Canon fordern Quellen/Herkunft/Zeitpunkt/Unsicherheit; Evidence-/Source-Strukturen vorhanden | **EXTEND** | Einheitlicher Provenance-/Temporal-Envelope für öffentlich relevante Entitäten/Relationen: `sourceId`, `retrievedAt`, `publishedAt`, `validFrom`, `validUntil`, `lastVerifiedAt`, uncertainty/confidence, review status, `supersededBy`. |
| `ALPHA2-AI-RETRIEVAL-SURFACE-01` | öffentliche Dossier-/Topic-/Abstimmungs-/Report-/Anlassraum-Flächen und APIs existieren | **EXTEND after contracts** | Bestehende kanonische Outputs als server-rendered HTML/JSON-LD/read-only projections retrieval-fähig machen. Kein separater „AI content store“. |
| `ALPHA2-CROSS-DOMAIN-RELATIONS-01` | Architektur-/Markenrollen sind dokumentiert, aber kein einheitlicher maschinenlesbarer Cross-Domain-Relation-Contract nachgewiesen | **NEW** | Sichere Relationen zwischen identischen fachlichen Entitäten und den Domain-Projektionen; `sameAs` nur bei wirklicher Identität, nicht als Rollenverkürzung. |
| `ALPHA2-KNOWLEDGE-FRESHNESS-01` | `ALPHA2-GLOBAL-GOVERNANCE-SCANNER-01` fordert jurisdiction/time; I18N Capability hat `lastVerifiedAt`; Research/Evidence-Prinzipien vorhanden | **EXTEND** | Volatilitätsklassen + Freshness-SLA je Entity/Relation; stale state aus Quellen/Fakten ableiten, nicht aus Datei-`updatedAt`. |
| `ALPHA2-DISCOVERY-OBSERVABILITY-01` | Alpha2 Content/Marketing/Analytics/Growth-Stränge und Admin-Analytics existieren | **EXTEND** | Domain/Locale/Region/Topic/Intent-spezifische Discovery-Metriken, Indexability-Inventar, Handoff-Messung und AI/referral signals soweit belastbar messbar. |

---

# Harte Architekturentscheidungen

## A. eDebatte Core ist kanonischer Knowledge-/Evidence-Owner

Dies folgt bereits aus `Architecture-Canon.md`: Die Core Platform trägt kanonische Datenmodelle; KI-Ausgaben, Kommunikationskanäle und Agenten dürfen keine Schattenwahrheit etablieren.

Daraus folgt:

1. Vote4Gov und VoiceOpenGov dürfen dieselben Entity-IDs referenzieren.
2. Sie dürfen ihren eigenen redaktionellen/community-spezifischen Kontext besitzen.
3. Fakten-/Geo-/Topic-/Claim-/Source-Identität wird jedoch nicht unabhängig pro Domain neu erfunden.
4. Voxy liest/projiziert die kanonische Wahrheit und bewahrt Quellen-/Unsicherheitsstatus.

## B. Entity IDs sind nicht URLs und nicht Übersetzungen

Zielsemantik, noch **kein final beschlossenes Syntaxformat**:

```text
geo:<stable-id>
jurisdiction:<stable-id>
institution:<stable-id>
topic:<stable-id>
question:<stable-id>
dossier:<stable-id>
claim:<stable-id>
source:<stable-id>
option:<stable-id>
vote:<stable-id>
result:<stable-id>
person:<stable-id>
organization:<stable-id>
```

Die konkrete Syntax/Namespace-Strategie wird erst nach Inventar aller bestehenden IDs finalisiert. `canonicalIdFrom(text)` darf nicht ungeprüft zum globalen SSOT-Identifier erhoben werden.

## C. Geo ist ohne Zuständigkeit unvollständig

Eine Ortsentität allein beantwortet nicht, wer eine Frage politisch/administrativ bearbeiten darf. Deshalb müssen Geo-Containment und Jurisdiction/Responsible-Institution getrennt modelliert werden.

Beispiel:

```text
Berlin -> locatedIn -> Deutschland
Frage X -> about -> Berlin
Frage X -> jurisdictionOf -> Land Berlin
Frage X -> responsibleInstitution -> <kanonische Institution>
```

Unsichere Zuständigkeiten bleiben als Kandidat/Review-Zustand sichtbar und werden nicht still kanonisiert.

## D. Temporalität ist Kernvertrag

Politische Zuständigkeiten, Institutionen, Gesetze, Amtsträger und Verfahrensstände verändern sich. Eine Relation ohne Zeitkontext kann historische und aktuelle Wahrheit vermischen.

Mindestens vorzusehen:

```text
validFrom
validUntil
lastVerifiedAt
supersededBy
```

Historische Entitäten werden nicht gelöscht, sondern versionier-/referenzierbar gehalten, soweit rechtlich und fachlich sinnvoll.

## E. Programmatic SEO ist Renderer, nicht Content-Fabrik

Regionen/Themen können technisch in hoher Zahl als Daten existieren. Indexierbare Public Pages entstehen nur, wenn das `ALPHA2-INDEXABILITY-GATE-01` erfüllt ist.

Unter Gate:

- keine Sitemap-Aufnahme;
- keine automatische hreflang-Expansion;
- `noindex,follow` oder keine öffentliche Route;
- keine erfundenen lokalen Aktivitäten, Gruppen, Mitglieder, Repräsentativität oder Vollständigkeit.

---

# Empfohlene Ausführungsreihenfolge

Alpha2 soll **nicht** alle Candidates gleichzeitig implementieren.

## Wave K0 — Audit/Contract only

1. `ALPHA2-ENTITY-ID-CONTRACT-01`
2. `ALPHA2-GEO-JURISDICTION-GRAPH-01` — Contract/Inventory-Teil
3. `ALPHA2-MULTILINGUAL-ENTITY-CONTRACT-01`
4. `ALPHA2-PROVENANCE-TEMPORALITY-01`

Ziel: Identität, Sprache, Ort/Zuständigkeit und Provenienz sind geschlossen, bevor Public SEO-Routen skalieren.

## Wave K1 — Knowledge relations + publishing safety

5. `ALPHA2-KNOWLEDGE-GRAPH-01`
6. `ALPHA2-INDEXABILITY-GATE-01`
7. `ALPHA2-SEARCH-INTENT-ROUTING-01`
8. `ALPHA2-CROSS-DOMAIN-RELATIONS-01`

## Wave K2 — Public retrieval projections

9. `ALPHA2-AI-RETRIEVAL-SURFACE-01`
10. vorhandene VoiceOpenGov-/Vote4Gov-Projektionen an die kanonischen IDs anbinden
11. eDebatte Public Question/Dossier/Topic/Geo-Projektionen evidence-gated ausbauen

## Wave K3 — autonomous scale with guardrails

12. `ALPHA2-KNOWLEDGE-FRESHNESS-01`
13. `ALPHA2-DISCOVERY-OBSERVABILITY-01`
14. zusätzliche Länder/Regionen/Themen nur nach Gate und Evals skalieren

---

# Abhängigkeiten zu bestehendem Alpha2

- `ALPHA2-GLOBAL-GOVERNANCE-SCANNER-01` wird **erweitert**: liefert/aktualisiert Geo-, Jurisdiction-, Institution- und Governance-Evidence, darf aber keine neue Fakten-SSOT bilden.
- `ALPHA2-SYSTEM-CHALLENGER-01` arbeitet auf kanonischen Entitäten und Evidence; hypothetische Alternativen bleiben als solche markiert.
- `ALPHA2-CONTENT-PIPELINE-01` konsumiert Knowledge-Entities und Provenienz; redaktionelle Assets sind Projektionen, keine Faktenquelle.
- `ALPHA2-MEMORY-LAYERS-01` darf Raw Chat oder Content-Drafts nicht über kanonische Knowledge-/Evidence-Wahrheit stellen.
- `ALPHA2-EVAL-HARNESS-01` erhält Evals für Entity Resolution, Intent-Kollision, Source Binding, Temporalität, Locale-Konsistenz, stale data und Indexability.
- `ALPHA2-CONTINUOUS-DISPATCH-01` darf nur `codex_ready`/policy-eligible Folge-Slices automatisch fortsetzen. Public Publish/Merge/Production bleibt an vorhandenen Gates.

---

# Minimale Evals vor Public Scale

## Entity identity

- dieselbe Entität behält ID über Locale/Slug/URL-Wechsel;
- Alias/Merge erzeugt keine stille Doppelentität;
- zwei unterschiedliche Entitäten dürfen nicht aufgrund ähnlicher Labels kollidieren.

## Geo/Jurisdiction

- Berlin als Ort ist nicht automatisch gleich jeder Berliner Zuständigkeit;
- unsichere Zuständigkeit bleibt Review-Kandidat;
- historische Zuständigkeit wird nicht als aktuelle ausgespielt.

## Language

- Original-, Lese-, UI-, Ausgabe- und Quellensprache bleiben getrennt;
- maschinelle Fassung wird nicht als human-reviewed ausgegeben;
- Entity-ID ändert sich nicht mit der Sprache.

## Provenance

- öffentlicher Claim verliert seine Source-Referenz nicht;
- Zusammenfassung/Übersetzung erhöht Unsicherheit nicht still zu Gewissheit;
- `lastVerifiedAt` und Gültigkeit bleiben maschinenlesbar.

## Indexability

- dünne Route => nicht in Sitemap / nicht indexable;
- substanzielle evidence-ready Route => kann nach Gate indexable werden;
- keine Doorway-Route, die ausschließlich auf denselben generischen Zielinhalt zeigt.

## Domain intent

- Vote4Gov = Analyse/Systemfrage;
- VoiceOpenGov = Bewegung/Region/Teilnahme;
- eDebatte = Dossier/Frage/Evidence/Entscheidung;
- Duplicate-Text-/Intent-Test warnt vor Cannibalization.

---

# OpenTasks-Serialization

Dieser Branch darf **keine Implementierung** der oben genannten Candidates starten, bevor der operative Single-Writer die Intake-Entscheidungen in `docs/E150/OpenTasks.md` serialisiert hat.

Empfohlene operative Aufnahme:

### Foundation zuerst

- `ALPHA2-ENTITY-ID-CONTRACT-01` — P0, `codex_ready` nach erfolgreichem bestehenden-ID-Inventar/Preflight
- `ALPHA2-GEO-JURISDICTION-GRAPH-01` — P0, zunächst Contract/Inventory; Implementation abhängig vom Entity-ID-Contract
- `ALPHA2-MULTILINGUAL-ENTITY-CONTRACT-01` — P0, `extend I18N`, abhängig vom Entity-ID-Contract
- `ALPHA2-PROVENANCE-TEMPORALITY-01` — P0, abhängig vom Entity-ID-/Evidence-Inventar

### Danach

- `ALPHA2-KNOWLEDGE-GRAPH-01` — P1, abhängig von Entity/Geo/Provenance
- `ALPHA2-INDEXABILITY-GATE-01` — P1, abhängig von Entity/Locale/Provenance
- `ALPHA2-SEARCH-INTENT-ROUTING-01` — P1, Contract kann parallel zu K1 vorbereitet werden
- `ALPHA2-CROSS-DOMAIN-RELATIONS-01` — P1, abhängig vom Entity-ID-Vertrag
- `ALPHA2-AI-RETRIEVAL-SURFACE-01` — P2, abhängig von Graph + Indexability
- `ALPHA2-KNOWLEDGE-FRESHNESS-01` — P2, abhängig von Provenance/Temporalität
- `ALPHA2-DISCOVERY-OBSERVABILITY-01` — P2, abhängig von Public Projections + Analytics

Status muss der operative Single-Writer gegen aktuelle Branch-/PR-/Task-Ownership prüfen; dieser Intake setzt keinen möglicherweise veralteten Status blind.

---

# Definition of Done dieses Intake-Slices

- [x] Foundation-/Brand-/Agent-Canon geprüft.
- [x] bestehende canonical-ID-Fundamente gefunden; kein globaler Universal-ID-Vertrag nachgewiesen.
- [x] bestehende Geo/Jurisdiction-Fundamente gefunden; Entscheidung = extend, keine Parallel-Registry.
- [x] bestehendes I18N-Go-Programm als Sprachfundament identifiziert; Entscheidung = extend.
- [x] Evidence-/Dossier-/Claim-/Topic-Architektur als Knowledge-Fundament bestätigt; keine zweite Knowledge-Schicht vorgesehen.
- [x] fehlende Indexability-, Search-Intent- und Cross-Domain-Contracts als neue Delta-Slices identifiziert.
- [x] Temporalität/Freshness als notwendige Erweiterung festgelegt.
- [x] Ausführungsreihenfolge und minimale Evals definiert.
- [ ] `docs/E150/OpenTasks.md` durch den operativen Single-Writer serialisiert.
- [ ] Task-Ownership/Status nach Serialization bestätigt.

Bis die letzten beiden Punkte erfüllt sind, bleibt dieser Slice **architecture/intake**, nicht Implementierungsfreigabe.
