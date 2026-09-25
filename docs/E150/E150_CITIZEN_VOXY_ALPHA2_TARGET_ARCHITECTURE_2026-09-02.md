# E150 Citizen / Voxy / Alpha2 Target Architecture

Stand: 2026-09-02
Status: kanonischer Reconciliation-Contract; Runtime- und Produktionsaktivierung bleiben gesondert gegatet
Operative SSOT: `docs/E150/OpenTasks.md`
Single-Writer-Anker: Issue `#447`
Reconciliation-PR: Draft-PR `#699`

## 1. Zweck und Rang

Dieser Contract führt vorhandene Produkt-, Agenten-, Evidence- und Runtime-Verträge zu einer einzigen Zielarchitektur zusammen. Er ersetzt keine fachliche SSOT und autorisiert weder Runtime-Start noch Merge, Deployment, Veröffentlichung, Provideraktivierung oder High-Risk-Aktion.

Verbindliche Grundlagen bleiben insbesondere:

- Foundation-, Architecture- und Engineering-Canon;
- `Part01_Systemvision_Mission_Governance.md`;
- der Signal-/Anlassraum-/Dossier-/Runden-/Mandat-/Impact-Kern;
- bestehende Place-, Registry-, Region- und Jurisdiction-Verträge;
- die V3-Agentic-Rollen und deren Safe-Trace-/Review-Verträge;
- der Alpha2-Mongo-/BullMQ-Runtime- und Storage-Vertrag;
- die Claim-/Source-/Evidence-/Factcheck-Verträge;
- `OpenTasks.md` als einzige operative Arbeits-SSOT.

## 2. Eine Produktwahrheit

### 2.1 Primärer Adressat

Der primäre Adressat der öffentlichen eDebatte-/VoiceOpenGov-Produkterscheinung ist der Bürger beziehungsweise die Bürgerin.

Organisationen, Verbände, Parteien, Verwaltungen, Kommunen, Medien, Initiativen und andere institutionelle Akteure bleiben wichtige Nutzer, Auswerter, Empfänger, Partner oder Spezialpfade derselben Plattform. Sie erhalten daraus weder eine zweite Produktwahrheit noch höheres Abstimmungsgewicht oder epistemische Sondermacht.

### 2.2 Bürgerkern

```text
Anliegen
→ Region / Zuständigkeit
→ Strukturierung / Qualifizierung
→ gemeinsames Lagebild
→ Debatte / Priorisierung / Evidenz
→ Mandat / Handlung
→ Umsetzung / Impact
```

Die bürgerverständliche Leitfrage lautet sinngemäß:

> Was sollte sich in deiner Region verbessern?

Sie ist kein Standortclaim und kein Zwang zu einem kommunalen Scope. Bund-, EU- und globale Anliegen bleiben möglich.

### 2.3 Reconciliation mit dem Domain-Kern

| Bürgerperspektive | Bestehende kanonische Fachwahrheit |
| --- | --- |
| Anliegen | direkter Input; Signal oder reviewpflichtiger Signalkandidat |
| Region / Zuständigkeit | Place-/Street-Resolver, Region Directory, Registry, Jurisdiction Context |
| Strukturierung / Qualifizierung | `/create`, Intake & Format, Canonical Topic Resolution, Review-Handoff |
| gemeinsames Lagebild | Anlassraum als Kontext plus Dossier als analytische Verdichtung |
| Debatte / Priorisierung / Evidenz | Dossier, Runde, Beteiligung, Claims, Sources und Evidence |
| Mandat / Handlung | bestehender Mandats-/Handoff-Vertrag; keine KI-generierte Legitimation |
| Umsetzung / Impact | bestehende Umsetzungs-, Status- und Impact-Schichten |

Damit entstehen weder ein zweiter Lifecycle noch konkurrierende Begriffe. Ein Bürgeranliegen darf den bestehenden Kern speisen; es überspringt ihn nicht.

### 2.4 Minimale Interaktion, maximale interne Unterstützung

Ein Satz muss als Einstieg reichen. Region kann je nach Kontext aus expliziter Ortsangabe, Straße, Ortsteil, Kommune, Signal, Profil, Organisationskontext oder Registry-/Jurisdiction-Match vorgeschlagen werden. Ein expliziter Gegenstandsbezug gewinnt gegen einen bloßen Profilvorschlag. Echte Mehrdeutigkeit führt zur kleinstmöglichen Rückfrage.

Im Hintergrund dürfen Voxy und die bestehenden Services Thema, Region, Zuständigkeit, Ähnlichkeit, Dublettenrisiko, Quellenbedarf, Evidenzlage, Gegenpositionen, regionale Häufungen und mögliche Lösungsräume vorbereiten. Das Ergebnis bleibt Arbeitskontext mit Provenienz, Konfidenz und Reviewbedarf, keine automatische Wahrheit oder Veröffentlichung.

Der detaillierte Citizen-/Regionsvertrag und die bereits begonnene Umsetzung gehören weiterhin den Draft-PRs `#672` und `#682`. Dieser Contract dupliziert deren Surface- und Edge-Case-Regeln nicht.

## 3. Voxy-First

Voxy ist langfristig die primäre sichtbare KI-Schnittstelle für normale Nutzer.

Voxy:

- versteht die Nutzerabsicht;
- hält nur erlaubten und nachvollziehbaren Kontext;
- erklärt Ergebnisse, Quellen, Evidenz, Widersprüche und Unsicherheit;
- stellt nur notwendige Rückfragen;
- delegiert intern an spezialisierte Agenten;
- legt relevante Human-, Review- und Sicherheitsgrenzen offen.

Normale Nutzer wählen keine internen Agenten, Provider oder Modelle aus. Ausnahmen sind explizite Admin-, Operator-, Debug-, Governance- und Mission-Control-Flächen.

Voxy besitzt keine eigene Fakten-, Graph-, Dossier-, OpenTasks- oder Governance-SSOT. Alpha2 ist nicht Voxy: Alpha2 orchestriert die Organisation, Voxy orchestriert die verständliche Nutzerinteraktion.

## 4. Spezialisierte Agenten hinter Voxy

Die vorhandenen sieben V3-Civic-Rollen bleiben die kanonische fachliche Gruppierung des öffentlichen Workflows. Die größere Alpha2-Registry ergänzt feinere interne Organisationsrollen. Beide Ebenen werden über Capability-Routing verbunden und nicht als zwei konkurrierende Flotten geführt.

Das Zielmodell berücksichtigt mindestens:

- Engineering / Development;
- Architecture;
- Code Review;
- QA / Testing / Visual QA;
- SRE / Infrastructure;
- Security;
- Research;
- Source Discovery und Retrieval;
- Evidence;
- Fact Checking;
- Dossier / Synthesis;
- Legal / Compliance, soweit freigegeben;
- Moderation;
- Growth / Marketing;
- Membership / Community;
- Funding;
- weitere vorhandene E150-Fachrollen.

Rollen bleiben provider- und modellagnostisch, besitzen getrennte Capability-, Risk-, Permission- und Eval-Metadaten und dürfen sich nicht selbst freigeben.

## 5. Research-/Evidence-/Factcheck-Pipeline

```text
Question / Claim
→ Discovery
→ Source Retrieval
→ Source Quality
→ Primary-Source Preference
→ Cross-Check
→ Contradiction Detection
→ Evidence Mapping
→ Fact Check
→ Synthesis
→ Citation / Provenance
```

Bereits vorhanden sind unter anderem Research-/Source- und Transferability-Verträge, Claim-/Factcheck-Kandidaten, atomare Claim-/Source-Relationen, Canonical Topic Resolution sowie review-first Dossier-/Graph-Handoffs.

Noch nicht als vollständige Pipeline geschlossen sind insbesondere breite policy-konforme Source Discovery, Quellenfamilien-/Unabhängigkeitsprüfung, Relation Review, Synthesis Gate und der gemeinsame Red-Team-E2E-Nachweis. Die operative Queue erweitert deshalb die bestehenden Evidence-Folgeslices, statt einen zweiten Research-Stack zu eröffnen.

Verbindlich gilt:

- Primärquellen bevorzugen, wo verfügbar und geeignet;
- mehrere voneinander unabhängige Quellen prüfen;
- Aktualität, Jurisdiktion, Sprache, Lizenz und Abrufzeit berücksichtigen;
- Widersprüche und Unsicherheit erhalten;
- Claim und Evidence maschinenlesbar verknüpfen;
- Source Family und abgeleitete/syndizierte Inhalte nicht mehrfach als unabhängig zählen;
- keine erfundenen Quellen, Vollständigkeitsbehauptungen oder Scheinsicherheit;
- technische, rechtliche, kostenbezogene und Zugriffsgrenzen nicht umgehen.

## 6. Alpha2: zwei Betriebsphasen

### Phase 1 — Build / Completion Mode

Bis zur belegten Produktionsreife lautet Alpha2s vorrangige Mission: **eDebatte fertigbauen**.

Alpha2 arbeitet die kanonischen OpenTasks zunehmend selbstständig ab und koordiniert Engineering, Tests, QA, Review, Runtime, Agent Fleet, Voxy, Research/Evidence, Mission Control, Observability, Governance, Security und Produkt-/UX-Slices. Jeder Worker bleibt auf einen kohärenten Slice beziehungsweise 1–3 Tasks begrenzt. Bestehende Human-, Review-, Security-, Policy- und Budget-Gates bleiben bindend.

### Phase 2 — Autonomous Operating Mode

Nach dem dokumentierten Phase-2-Acceptance-Gate wird Alpha2 zum dauerhaften organisationsweiten Control-/Orchestration-Layer. Alpha2 ist dann weder nur Worker noch nur Run-Orchestrator.

```text
OBSERVE
→ PRIORITIZE
→ CLAIM
→ DELEGATE
→ EXECUTE
→ VERIFY
→ REVIEW / HUMAN GATE falls erforderlich
→ RECONCILE SSOT
→ LEARN
→ CONTINUE
→ OBSERVE
```

Der Übergang ist eine belegte Governance-Entscheidung, kein automatischer Statussprung aus vorhandenen Komponenten oder Draft-PRs.

## 7. Verbleibender Autonomiepfad

Bereits vorhanden beziehungsweise in vorhandener Arbeit:

- Durable Mongo Runtime und Run-/Mission-Wahrheit;
- BullMQ/Redis als recoverbarer Dispatch-Layer;
- Leases, CAS, Idempotency, Fencing, Checkpoints und Recovery;
- Risk-/Human-Gates;
- Agent Fleet in Draft-PR `#638`;
- Learning/Evals in gestapeltem Draft-PR `#639`;
- Mission Control in gestapeltem Draft-PR `#640`;
- Continuous Dispatch in gestapeltem Draft-PR `#647`;
- bounded Repair/Self-Healing in gestapeltem Draft-PR `#649`.

Explizit zu schließen:

1. `ALPHA2-GITHUB-STATE-ADAPTER-01`;
2. `ALPHA2-OPENTASKS-SINGLE-WRITER-01`;
3. `ALPHA2-ORCHESTRATOR-LOOP-01`;
4. vorhandenen Continuous-Dispatch-Stack konvergieren;
5. vorhandenen Repair-Stack konvergieren;
6. Mission Control und Observability produktionsfähig anbinden;
7. `ALPHA2-AUTONOMOUS-E2E-RECOVERY-ACCEPTANCE-01` bestehen.

## 8. GitHub- und OpenTasks-Verträge

Der zentrale GitHub-State-Adapter liefert mindestens:

- Branch-/PR-Existenz und Ownership;
- exakten Head und beobachteten `origin/main`;
- Merge Base sowie ahead/behind;
- CI und Preview-/Deployment-Evidence für exakt diesen Head;
- Reviewentscheidung und offene Reviewthreads;
- veraltete, fehlende oder widersprüchliche Evidence als fail-closed Zustand.

Der OpenTasks-Single-Writer:

- ist der einzige mutierende Adapter für den operativen Kopf;
- nutzt compare-and-swap gegen exakte Basisrevision und Task-Revision;
- erlaubt nur dokumentierte Statusübergänge;
- prüft Dependencies, Ownership, Exact-Head-Evidence und Human Gates erneut;
- schreibt Status, Evidence, Actor/Run und Zeitpunkt atomar beziehungsweise transaktional nachvollziehbar;
- erzeugt bei Konflikt keinen Last-Writer-Wins-Erfolg;
- kann nach Restart idempotent reconciliieren;
- ersetzt weder GitHub noch Mongo Runtime als deren jeweilige Wahrheit.

## 9. Autonomie-Acceptance

Alpha2 gilt erst als autonom, wenn ein reproduzierbarer E2E-Test die vollständige Kette beweist:

`OpenTasks lesen → GitHub-State lesen → erlaubten Task bestimmen → atomar claimen → persistenten Run erzeugen → Fachagent bestimmen → Risk/Budget/Policy prüfen → dispatchen → ausführen → Tests/Evidence erzeugen → Exact-Head-CI-/Review-State prüfen → OpenTasks reconciliieren → fortfahren oder persistent review/human_gate setzen`

Danach muss ein Recovery-/Chaos-Test Worker-Abbruch, Runtime-Neustart und Queue-/Redis-Recovery abdecken, doppelte Side Effects ausschließen, den Run korrekt fortsetzen und die erneute selbstständige Arbeitswahl belegen.

## 10. Bestehende PR-Ownership

| PR | Rolle in der Zielarchitektur | Status bei diesem Audit |
| --- | --- | --- |
| `#672` | Citizen-first regionaler Product-/Brand-Contract | Draft; nicht duplizieren, vor Kanonisierung reviewen/konvergieren |
| `#682` | `/create`-Intake für Anliegen, Region und Zuständigkeit | Draft; bestehender Implementierungsowner |
| `#638` | Alpha2 Agent Fleet / Registry | Draft, Exact-Head-Evidence grün; operativ `review` nach Single-Writer-Sync |
| `#639` | Shared Learning / Evals | gestapelter Draft; nach Registry-Merge neu basieren und reviewen |
| `#640` | read-only Mission Control | gestapelter Draft; abhängige Evidence bleibt vor Konvergenz vorläufig |
| `#647` | Continuous Dispatch | gestapelter Draft; vorhandenen Code erhalten und nach Dependencies konvergieren |
| `#649` | bounded Repair Continuation | gestapelter Draft; vorhandenen Code erhalten und nach Dependencies konvergieren |
| `#652` | Unified Knowledge & Discovery Intake | Draft-Intake; operativ erst nach Single-Writer-Serialization |

Die PR-Existenz ist Implementierungsevidenz, aber kein Merge-, Done-, Provider- oder Production-Beleg.

## 11. Human-Sovereignty-Grenze

Merge, Deploy, Publish, Geld, Verträge, Rechte, Secrets, Sicherheitsänderungen und weitere High-Risk-Aktionen bleiben an bestehende Policy- und Human-Gates gebunden. Alpha2 darf Entscheidungen vorbereiten, erklären und nach dokumentierter Freigabe ausführen; es darf diese Freigaben nicht selbst erfinden.

## 12. Ergebnis dieses Contracts

Die Zielwahrheit lautet:

> Bürger zuerst. Voxy vorne. Spezialisierte Agenten dahinter. Alpha2 baut zunächst die Plattform fertig. Danach orchestriert Alpha2 dauerhaft den Agentenverbund. OpenTasks, GitHub und Runtime bilden einen geschlossenen, auditierbaren und policy-konformen Steuerungskreis.
