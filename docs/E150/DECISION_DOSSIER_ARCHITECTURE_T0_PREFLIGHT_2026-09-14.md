# T0 Preflight — Decision Dossier Architecture Contract

Stand: 2026-09-14

```text
TASK=DECISION-DOSSIER-ARCHITECTURE-CONTRACT-01
ROLE=T0
BASE_MAIN_SHA=bdd9bd0436c81d7a89d0282747f7ba1f21e1efb8
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
CURRENT_TASK_STATUS=blocked
CURRENT_IMPLEMENTATION_AUTHORIZED=false
T1_IMPLEMENTATION_AUTHORIZED=false
NEXT_ACTION=SEPARATE_T0_GOVERNANCE_AUTHORIZATION
NO_RUNTIME=true
NO_MIGRATION=true
NO_PROVIDER=true
NO_PUBLISH=true
NO_PRODUCTION_ACTIVATION=true
ACTIVE_C4_FILES_CHANGED=0
OPENTASKS_CHANGED=0
```

## 1. Entscheidung

Der T0-Architektur-/Security-Preflight ist auf dem exakten Main-Stand positiv. Ein
kleiner, rein typisierter Contract-Slice ist isolierbar. Dieser Preflight ist
keine Implementierungsfreigabe und ändert den operativen OpenTasks-Status nicht.

T0 kann ohne Abschluss des C-Tracks, G1–G5, Alpha2 oder der späteren
Research-/Evidence-Pipeline als Contract umgesetzt werden. T1 bleibt bis T0
`done` blockiert. T1-Fixtures dürfen inhaltlich vorbereitet, aber nicht als
Implementierung oder Abnahme ausgegeben werden.

## 2. Kanonische Grundlage

Verbindliche Quellen in ihrer Rangfolge:

1. `docs/foundation/Constitution.md`
2. `docs/foundation/Vision.md`
3. `docs/foundation/Grundwerte.md`
4. `docs/foundation/Architecture-Canon.md`
5. `docs/foundation/Engineering-Canon.md`
6. `docs/brand/EDEBATTE_BRAND_NARRATIVE.md`
7. `AGENTS.md`
8. operativer Kopf von `docs/E150/OpenTasks.md`
9. `docs/E150/EDEBATTE_SYSTEM_QUESTION_GLOBAL_CONTEXT_STANDARD_2026-09-09.md`
10. aktuelle Implementierung und Tests

Kanonischer Scope aus OpenTasks:

> Vorhandene Owner auf SystemQuestion, ResearchObject, ContextEvent,
> Metric/Projection/Assumption, ScenarioSet/Scenario, Impact/Tradeoff,
> Comparator und DecisionBinding abbilden.

Harte Grenzen: kein zweiter Dossier-/Decision-Store, keine Runtime, keine
Migration, kein neues autonomes Research, keine Provider-/Feed-Aktivierung,
kein Publish, keine Decision-Aktivierung und keine automatische
Wahrheitsentscheidung.

## 3. Repositorybefund

### 3.1 Vorhandene Grundlagen

| Domäne | Belegte Grundlage | T0-Behandlung |
| --- | --- | --- |
| Topic/System Question | `CanonicalTopic`, `DecisionQuestion`, `JurisdictionContext` in `apps/web/src/features/create/canonicalTopicResolutionContract.ts` | IDs referenzieren; kein zweites Topic und kein Silent Merge |
| Dossier | `features/dossier/schemas.ts` mit Dossier-, Source-, Claim-, Finding-, Citation- und Edge-Schemas | fachlicher Inhalts-/Evidence-Anker bleibt erhalten |
| Claims/Evidence | `features/analyze/atomicClaimSourceRelationContract.ts` mit AtomicClaim, Scope, SourceArtifact/-Segment/-Family, EvidenceAssessment, Relationen und SynthesisReceipt | reichhaltigeres Vokabular wiederverwenden; kein reduktiver zweiter Evidence-Graph |
| Research | `core/research/types.ts` mit ResearchTask/-Contribution | T0 referenziert Owner; T2 erweitert Plan/WorkItems und Lifecycle |
| Revision | `features/dossier/revisions.ts` mit Dossier-Revisions-/Hashkette | Revisionen referenzieren; T6 ergänzt DecisionBinding |
| Decision preview | `apps/web/src/features/create/dossierWorkspaceDecisionContract.ts` | Readmodel/Preview, ausdrücklich keine Runtime-/Publish-Behauptung |
| Poll/TopicRound | bestehende Decision-Owner laut System-Question-Standard | T0 verlagert Decision Ownership nicht in Dossier |
| Public Question Guard | `apps/web/src/features/create/safety/publicQuestionGeneralization.ts` | bestehender Guard bleibt; vollständige G1-Freigabe ist kein T0-Scope |

### 3.2 Bewusste Lücken

Die Begriffe `SystemQuestion`, `ContextEvent`, `ScenarioSet`,
`PolicyBuildingBlock` und `DecisionBinding` sind am geprüften Main nicht als
eine vollständige ausführbare T-Kette belegt. Das ist keine Freigabe, sie in T0
vollständig zu implementieren. T0 legt Owner, Referenzrichtung, Lifecyclegrenze
und spätere Taskzuständigkeit fest.

`DossierClaimKind = fact | interpretation | value | question` ist gröber als
das Atomic-Claim-Vokabular. Es darf nicht um eine zweite konkurrierende
Epistemik erweitert werden. Die zehn normativen Kategorien aus dem
System-Question-Standard werden in T0 als Mapping auf existierende
Claim-/Evidence-Semantik dokumentiert; tatsächliche Metrik-/Modellobjekte
gehören T3.

## 4. Verbindliche Owner-Matrix

| Zielbegriff | Kanonischer Owner / ID-Quelle | T0-Referenzregel | Spätere Umsetzung |
| --- | --- | --- | --- |
| SystemQuestion | Canonical Topic + DecisionQuestion; Topic-ID bleibt kanonisch | Systemfrage referenziert Topic und Jurisdiktion; konkrete Entscheidungsfrage bleibt eigenes Objekt | T1 |
| ResearchObject | Dossier-ID + bestehender ResearchTask-/Run-/Artifact-Bezug | genau ein Dossieranker; keine zweite Research-Wahrheit | T2 |
| ContextEvent | Dossier-Domäne, referenzierte Claim-/Source-/Revision-IDs | Ereignis-, Geltungs- und Beobachtungszeit getrennt; keine Behauptung aus Revision allein | T3 |
| Metric | Dossier/Atomic quantified claim + Evidence IDs | Einheit, Nenner, Population, Zeitraum und Methode müssen referenzierbar sein | T3 |
| Projection | Atomic prediction/quantified claim + Model-/Source-Provenienz | nie als gemessener Wert darstellen | T3 |
| Assumption | Dossier/Atomic Evidence-Kontext | explizit, revisionsgebunden, niemals stiller Default | T3 |
| PolicyBuildingBlock | Dossier-Scenario-Domäne | nur Referenz- und Ownervertrag in T0 | T4 |
| ScenarioSet/Scenario | Dossier-Scenario-Domäne; revisionsgebundene IDs | Status quo/No-change muss als Szenario referenzierbar sein | T4 |
| Impact/Tradeoff | Dossier-Domäne mit Claim-/Evidence-/Affected-Group-Refs | beobachtete Wirkung, Modellwirkung und normative Bewertung trennen | T5 |
| Comparator | Dossier-Domäne mit Source-/Jurisdiction-/Metric-Refs | Auswahlgrund, Messäquivalenz, Difference Drivers und Transfergrenzen | T5 |
| DecisionBinding | Poll/TopicRound als Decision-Owner | bindet exakte Dossier-, ScenarioSet-, Scenario- und Completeness-Revisionen | T6 |
| Decision Readiness | Dossier liefert Dimensionszustände; T6 bindet; T7 projiziert | kein Alias auf allgemeinen Anlassraum-`decision_ready`-Status | T3/T5/T6/T7 |

Owner bedeutet nicht, dass das jeweilige spätere Modell bereits implementiert
ist. T0 darf dafür weder leere Produktionsobjekte persistieren noch
Readiness-Werte vorwegnehmen.

## 5. Epistemik-Mapping

| Normative Kategorie | Vorhandener Anker | T0-Regel |
| --- | --- | --- |
| FACT | factual claim + geprüfte Relation/EvidenceAssessment | Faktstatus setzt geeignete Evidenz und Scopeprüfung voraus |
| MEASURED_VALUE | quantified claim | Einheit, Nenner, Population, Zeitraum, Quelle und Methode erforderlich |
| ESTIMATE | quantified/prediction claim + Unsicherheit | nicht als Messwert rendern |
| PROJECTION | prediction + Modellprovenienz | Basisjahr, Annahmen und Modellrevision erforderlich |
| MODEL_RESULT | quantified/prediction + Modellreferenz | Modelloutput ist keine Primärbeobachtung |
| ASSUMPTION | explizite Annahmereferenz | sichtbar und revisionsgebunden |
| INTERPRETATION | interpretation | referenziert Fakten, Actor und Scope |
| OPINION | non_checkable_opinion | nicht als Widerlegung oder Beleg zählen |
| NORMATIVE_JUDGMENT | normative_position/value | demokratische Abwägung, keine Auto-Truth |
| UNKNOWN | offene Evidence Gap / unknown Assessment | bleibt sichtbar und blockiert bei Materialität Decision Readiness |

Dieses Mapping ist eine Contract-Klassifikation. Es autorisiert kein neues
persistiertes Enum und keine automatische Statuspromotion.

## 6. Decision-Readiness-Verantwortung

T0 hält nur die Architekturpflicht fest:

- `ready_for_human_deliberation` und `decision_ready` sind getrennt;
- jede materielle Dimension besitzt Materialität, Status, Evidence-Refs,
  Reviewzustand, Gap, Freshness und Revision;
- eine sichtbare Lücke kann Beratung erlauben, aber keine Aktivierung;
- keine gewichtete Gesamtzahl darf einen harten Blocker kompensieren;
- Materialitätsänderungen brauchen Actor, Rationale, Revision und Review;
- eine materielle Änderung macht die gebundene Entscheidung stale.

Die vollständige Berechnung und Projektion gehört T3–T7.

## 7. Vorgeschlagener späterer Implementierungsslice

Nur nach separater Governance-Autorisierung:

1. neu: `features/dossier/decisionDossierArchitectureContract.ts`
2. neu: `apps/web/tests/decision-dossier-architecture-contract.test.ts`
3. neu nach bestandener Umsetzung:
   `docs/E150/DECISION_DOSSIER_ARCHITECTURE_T0_CLOSURE_2026-09-14.md`
4. Update nach bestandener Umsetzung: `docs/E150/OpenTasks.md`

Die Contractdatei darf ausschließlich:

- die Owner-/Referenzmatrix maschinenlesbar machen;
- erlaubte normative-zu-bestehender-Epistemik-Mappings ausdrücken;
- die T0–T8-Verantwortungsgrenze prüfen;
- reine, deterministische Contract-Validierung bereitstellen;
- keine DB-, Netzwerk-, Provider-, Queue-, Publish- oder Decisionaktion
  importieren oder ausführen.

Keine bestehende Runtime- oder Schemadatei wird in diesem Slice geändert. Wird
für die Umsetzung doch ein bestehendes Schema benötigt, stoppt der Slice mit
`FAIL_SCOPE_EXPANSION` und verlangt einen neuen Preflight.

## 8. Pflichtfixtures

1. **Nichtdeutsches Rechts-/Institutionensystem:** schwedischer
   Alterssicherungs-Comparator. Eigene Jurisdiktion, Original-/Lesesprache,
   andere Beitragsdefinition und Institutionen. Ergebnis: referenzierbar, aber
   nicht automatisch auf Deutschland übertragbar.
2. **Low-data-Jurisdiktion:** strukturelle Bildungsfrage mit fehlender
   belastbarer Baseline und keinem verlässlichen internationalen Comparator.
   Ergebnis: `UNKNOWN` bleibt materiell und `decision_ready=false`.
3. **Messdefinitionskonflikt:** Rentenniveau versus säulenübergreifende
   Nettoersatzquote. Ergebnis: kein Fact Conflict, bevor Nenner und Scope
   harmonisiert sind.
4. **Operationalisierungsunterschied:** Unterrichtsversorgung versus
   Unterrichtsausfall. Ergebnis: Werte dürfen nicht gleichgesetzt werden.
5. **Source Family:** Originalstudie, Agenturmeldung und Repost zählen nicht als
   drei unabhängige Quellen.
6. **Fakt/Wert:** „Beitragssatz beträgt X“ getrennt von „X ist gerecht“.
7. **Revision:** materielle Projection- oder Scenario-Revision invalidiert die
   bestehende DecisionBinding-Referenz.
8. **Kein Owner:** unbekannter oder doppelter kanonischer Owner schlägt
   fail-closed fehl.
9. **Taskgrenze:** T0 darf kein Scenario, keine Recommendation und keinen
   Research-Erfolg erzeugen.
10. **Public Guard:** T0-Referenz darf keinen öffentlichen Candidate freigeben
    oder G1 umgehen.

## 9. Security- und Privacy-Review

| Risiko | Ergebnis / Grenze |
| --- | --- |
| Neue Eingabe-/PII-Verarbeitung | keine |
| Persistenz-/Migrationsänderung | keine |
| Netzwerk/Provider/Feed | keine |
| Auto-Publish/Auto-Merge/Decision-Aktivierung | ausgeschlossen |
| Autorisierungsgrenze | Contract kann keinen Task- oder Produktstatus ändern |
| Prompt-/Trace-/Secret-Exposure | keine Rohprompts/Secrets im Contract oder Fixture |
| Politisches Profiling | keine Ableitung von Nutzerhaltung oder Partei |
| Übersetzung | Lesefassung ist keine neue Evidenz |
| Missing Data | kein Default; `UNKNOWN` bleibt sichtbar |
| Cross-track | reine neue T0-Dateien; keine aktive C4-Datei |

Security-Ergebnis: Für die vorgeschlagene reine Contractimplementierung ist
kein neuer Runtime-Angriffsweg erkennbar. Das ist keine Securityfreigabe für T1,
Research, Dossier-UI, Provider oder Produktion.

## 10. Collision-Matrix

| Track / Domäne | Klassifikation | Ergebnis |
| --- | --- | --- |
| aktives C4C-Preflight | NO COLLISION für T0 | keine Create-/Auth-/Session-/Adoption-/Resume-Datei |
| C5–C7 Topic/Jurisdiction | SHARED FOUNDATION | T0 referenziert vorhandene Owner; keine Implementierung vorziehen |
| C8 Sources | SOFT DEPENDENCY | für T0-Contract nicht erforderlich; spätere Researchintegration nutzt sicheren Owner |
| C9 Handoff | HARD DEPENDENCY nur für Create→T Runtime | kein T0-Blocker |
| G1 | HARD DEPENDENCY für Public Candidate/Release | kein Blocker für Offline-T0-Vertrag |
| G2–G5 | HARD DEPENDENCY je Producer-Release | kein T0-Blocker |
| Atomic Evidence | SHARED FOUNDATION | wiederverwenden, nicht duplizieren |
| Source Lineage/Relation Review/Synthesis | SOFT DEPENDENCY für T0, HARD für Live-Evidence | bleiben in bestehenden Tasks |
| Alpha2 | SHARED FOUNDATION | fehlende Autonomie blockiert manuell autorisierten T0-Contract nicht |
| OpenTasks | BLOCKER gegen Implementation ohne Autorisierung | dieser PR ändert den Status nicht |

## 11. T1-Vorbereitung, keine T1-Implementierung

Nach T0-`done` muss T1 genau fünf Klassen liefern:

- `transient_event`
- `factual_clarification`
- `policy_question`
- `structural_system_question`
- `long_term_societal_choice`

Pflichtausgabe: Klasse oder kontrollierte Abstention, Rationale, Scope,
Jurisdiktion, Horizont, kontrollierbare Hebel, Ausschlüsse, betroffene Gruppen,
Signal-IDs, Reviewzustand und Teilfragekandidaten. Social-/Community-Inhalt
bleibt Signal. Eine Faktenfrage wird nicht als Ballot umgeschrieben. Ein lokaler
Anlass darf materiellen Systemkontext nicht verlieren.

Vorgeschlagene T1-Fixtures nach T0:

- aktuelle lokale Unterrichtsausfallmeldung → transienter Anlass plus
  struktureller Bildungskontext, kein Landesfakt aus Einzelmeldung;
- „Stimmt die Zahl 93,7 %?“ → factual clarification, keine Abstimmung;
- „Soll das Land mehr Seiteneinsteiger qualifizieren?“ → policy question;
- ganzheitliche Bildungssicherung Sachsen-Anhalt → structural/system question;
- generationengerechte Alterssicherung bis 2050 → long-term societal choice;
- mehrdeutige Jurisdiktion oder Scope → review/abstention;
- parteipolitisches Framing → keine Stance-Inferenz;
- Social-Signal ohne Beleg → Signal-ID, kein Evidence-Status.

T1 darf nicht im T0-PR implementiert oder in OpenTasks vorzeitig hochgestuft
werden.

## 12. Preflight-Acceptance

| Gate | Ergebnis |
| --- | --- |
| Canonical Task/Status gelesen | PASS |
| Foundation-/System-Question-Standard gelesen | PASS |
| bestehende Owner und Codepfade geprüft | PASS |
| kein bestehender T0-Branch/PR gefunden | PASS |
| bounded reine Contract-Dateigrenze gefunden | PASS |
| kein zweiter Dossier-/Decision-/Research-Store | PASS |
| kein Runtime-/Migration-/Provider-/Publish-Scope | PASS |
| nichtdeutsches und Low-data-Fixture definiert | PASS |
| T1-Abhängigkeit erhalten | PASS |
| aktive C4-Dateien ausgeschlossen | PASS |
| OpenTasks-Status unverändert | PASS |
| separate Governance-Autorisierung noch erforderlich | BLOCKING BY DESIGN |

```text
PREFLIGHT_COMPLETE=true
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
BLOCKING_COLLISIONS=NONE_FOR_PROPOSED_T0_CONTRACT_SCOPE
IMPLEMENTATION_AUTHORIZED=false
NEXT_ACTION=REVIEW_THIS_PREFLIGHT_AND_ISSUE_SEPARATE_T0_IMPLEMENTATION_AUTHORIZATION
STOP
```
