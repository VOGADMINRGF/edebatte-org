# T1 Preflight — Topic Qualification / System Question

Stand: 2026-09-17

```text
TASK=TOPIC-QUALIFICATION-SYSTEM-QUESTION-01
ROLE=T1
BASE_MAIN_SHA=ce5d5c1921393c291c99a59329e53aebb5bb8fa7
T0_STATUS=done
T0_GLOBAL_DONE=true
T1_PREFLIGHT=PASS_WITH_EXTERNAL_OWNERSHIP_BLOCKER
T1_IMPLEMENTATION_AUTHORIZED=false
T1_RUNTIME_AUTHORIZED=false
T1_PROVIDER_AUTHORIZED=false
T1_SCHEMA_MIGRATION_AUTHORIZED=false
T1_PUBLISH_AUTHORIZED=false
T1_DECISION_ACTIVATION_AUTHORIZED=false
T1_AUTO_TRUTH_AUTHORIZED=false
BLOCKER=CANONICAL_TOPIC_DECISIONQUESTION_OWNER_LOCATION_MUST_BE_SETTLED_BY_MASTER_HARDENING
SAFE_TO_PREPARE_FIXTURES=true
SAFE_TO_IMPLEMENT=false
```

## 1. Auftrag

T1 qualifiziert ein eingehendes Thema, Ereignis oder eine öffentliche Frage so,
dass eDebatte eine neutrale und ausreichend weit geschnittene Systemfrage
vorbereiten kann, bevor Research, Szenarien oder Entscheidungsaktivierung
beginnen.

Die verbindlichen Qualifikationsklassen sind:

- `transient_event`
- `factual_clarification`
- `policy_question`
- `structural_system_question`
- `long_term_societal_choice`

Diese Klassen beschreiben den Problemtyp. Sie sind weder politische Bewertung
noch Wahrheitsurteil und dürfen keine Empfehlung erzeugen.

T1 setzt den System-Question-Standard um, insbesondere:

- Zieldefinition vor Maßnahmen;
- Scope und Jurisdiktion explizit;
- Zeithorizont explizit;
- kontrollierbare Hebel getrennt von Symptomen;
- Ausschlüsse und betroffene Gruppen sichtbar;
- Anlass-/Signalframe darf die neutrale Systemfrage nicht dominieren;
- Faktenklärung darf nicht in eine Präferenzabstimmung umgedeutet werden;
- Social-/Community-Signale bleiben Signal und werden nicht automatisch Evidenz;
- materielle Scope-Fehler bleiben sichtbar und blockieren den weiteren Decision-Readiness-Pfad.

## 2. Kanonische Owner und harte Eigentumsgrenze

T0 hat den Owner-Vertrag geschlossen:

```text
SYSTEM_QUESTION_OWNER=CanonicalTopic + DecisionQuestion
JURISDICTION_OWNER=JurisdictionContext
DECISION_OWNER=Poll/TopicRound
```

Der aktuell belegte Owner für `CanonicalTopic`, `DecisionQuestion` und
`JurisdictionContext` liegt in:

`apps/web/src/features/create/canonicalTopicResolutionContract.ts`

T1 darf deshalb **keine** zweite Topic-, DecisionQuestion- oder Jurisdiction-
Wahrheit unter `features/dossier`, `core`, einem neuen Store oder einem zweiten
Create-Modul erzeugen.

Der spätere T1-Contract darf nur:

1. bestehende kanonische Topic-/DecisionQuestion-/Jurisdiction-IDs referenzieren;
2. eine Qualifikations-/Scope-Review-Entscheidung als eigenen, revisionsgebundenen
   T1-Vertrag ausdrücken;
3. keinerlei Topic oder DecisionQuestion still duplizieren, mergen oder umbenennen;
4. keine Entscheidungsaktivierung oder Veröffentlichung auslösen.

### Externer Ownership-Blocker

Die kanonischen Typen liegen aktuell app-lokal unter
`apps/web/src/features/create/*`. Ein neuer Root-T-Contract unter
`features/dossier/*` würde entweder rückwärts in die App-Schicht importieren oder
CanonicalTopic/DecisionQuestion duplizieren. Beides widerspricht der
Repository-Integritätsregel `ZERO PARALLEL CANONICAL TRUTH`.

Daher gilt:

```text
T1_IMPLEMENTATION_AUTHORIZED=false
```

bis der bereits separat laufende Master-Hardening-Schritt die
Create-/Domain-Ownership-Richtung kanonisch geklärt hat. Dieser T1-Preflight
implementiert diese fremde Ownership-Reparatur ausdrücklich nicht.

## 3. T1-Ausgabe — fachlicher Zielvertrag

Nach Auflösung des Ownership-Blockers soll genau **eine** reine T1-
Qualifikationsstruktur entstehen. Sie referenziert kanonische IDs und enthält
mindestens:

```text
qualificationId
canonicalTopicId
canonicalDecisionQuestionId? 
jurisdictionId
classification
rationale
neutralSystemQuestion
primaryGoal
scope
horizon
controllableLevers[]
explicitExclusions[]
affectedGroups[]
signalRefs[]
missingQuestionScopeReview
reviewState
revision
```

### Pflichtfelder

`primaryGoal`
: beschreibt das gesellschaftliche oder operative Ziel, ohne bereits eine
  Maßnahme als Ziel auszugeben.

`scope`
: beschreibt die sachliche Problemgrenze. Ein Anlassereignis ist nicht
  automatisch der vollständige Scope.

`horizon`
: trennt kurzfristige Ereignisbewertung von struktureller beziehungsweise
  langfristiger Entscheidung.

`controllableLevers`
: benennt realistische beeinflussbare Policy-/Umsetzungshebel als
  Untersuchungsraum, nicht als Empfehlung.

`explicitExclusions`
: macht bewusst nicht betrachtete Bereiche sichtbar, damit Auslassungen nicht
  wie Vollständigkeit wirken.

`affectedGroups`
: erfasst materiell betroffene Gruppen als Research-Scope. Das ist keine
  politische Zielgruppenprofilierung.

`signalRefs`
: dürfen Relevanz oder Anlass erklären, aber niemals T1-seitig zu Evidenz
  promoviert werden.

## 4. Missing-Question / Scope Review

T1 übernimmt den im T-Track-Quality-Addendum zugewiesenen
Missing-Question-/Scope-Review.

Der Review muss für jede Qualifikation explizit prüfen:

1. Fehlt eine vorgelagerte Systemfrage?
2. Werden Ursache und Symptom verwechselt?
3. Wurde ein realistischer beeinflussbarer Hebel ohne Begründung ausgeschlossen?
4. Ist die Jurisdiktion zu eng, zu weit oder unklar?
5. Ist der Zeithorizont für die Problemklasse ungeeignet?
6. Erzeugt die Formulierung ein unnötiges False Binary?
7. Fehlt eine materielle No-change-/Status-quo-Perspektive als späterer
   Untersuchungsbedarf?
8. Ist der Anlass-/Signalframe stärker als die neutrale Kernfrage?
9. Wird eine Faktenfrage in eine normative Präferenzfrage verwandelt?
10. Wird eine normative Abwägung fälschlich als reine Faktenfrage behandelt?

### Review-Zustände

```text
clear
review_required
blocked_material_scope_error
```

`blocked_material_scope_error` bedeutet **nicht**, dass T1 die richtige Antwort
selbst erfindet. Es bedeutet nur, dass die aktuelle Problemdefinition nicht als
tragfähige Systemfrage an T2 weitergereicht werden darf.

Ein späterer Human-Risk-Override muss auditierbar sein. Er darf einen
materiellen Scope-Fehler nicht unsichtbar machen und erzeugt niemals
`decision_ready=true`.

## 5. Fail-closed-Regeln

T1 muss später mindestens folgende Fälle blockieren oder in Review halten:

- fehlende oder leere kanonische Topic-ID;
- fehlende oder leere Jurisdiktion;
- unbekannte Qualifikationsklasse;
- leeres Ziel;
- Maßnahme als Ziel ohne getrennte Zieldefinition;
- leere neutrale Systemfrage;
- widersprüchliche oder unklare Jurisdiktion;
- ungelöster Duplicate-Topic-Risk;
- sprachübergreifende Unsicherheit ohne Review;
- Signalquelle als Evidenz ausgegeben;
- Fakten-/Wahrheitsfrage als Preference Ballot formuliert;
- personenbezogene oder akteurszentrierte Frage, wenn der vorhandene Public
  Question Guard Review oder Block fordert;
- materieller Scope-Fehler;
- ungelöster False-Binary-Befund;
- fehlende betroffene Gruppen, wenn sie für den Scope materiell sind;
- fehlende Revision oder Review-Bindung für eine freizugebende T1-
  Qualifikation.

Kein Score und keine Provider-Konfidenz darf diese Hard Gates kompensieren.

## 6. Abgrenzung zu bestehenden Guards

T1 ersetzt **nicht** den bestehenden Public Question Generalization Guard.
Dieser Guard bleibt für Akteursbezug, Fakt-/Wahrheitsfragen, Safety und
öffentliche Question-Drafts zuständig.

T1 konsumiert nur dessen Ergebnis beziehungsweise Reviewstatus, sofern für die
Systemfrage relevant. T1 darf keinen blockierten Public-Question-Entwurf
freigeben und keine G-Owner übernehmen.

Ebenso bleibt `resolveCanonicalTopic(...)` die bestehende read-only Topic-
Resolution. T1 darf dessen `review_required`, `ambiguous_candidates` oder
`create_extension_required` nicht in einen vermeintlich sicheren bestehenden
Topic-Match umdeuten.

## 7. Keine Sprach- oder Providerwahrheit im Contract

Die kanonische T1-Entscheidung darf nicht an deutsche Schlüsselwörter oder eine
bestimmte Modellantwort gekoppelt werden. Sprachspezifische NLP-/LLM-Schritte
können später Kandidaten liefern, aber der Contract muss eine strukturierte
Entscheidung prüfen können, unabhängig davon, ob sie aus Deutsch, Englisch,
Schwedisch oder einer anderen Sprache stammt.

Provider, Prompt, Modellkonfidenz und Rohantwort sind keine fachliche Wahrheit.
Ein Providerfehler führt nicht zu einer erfundenen Klassifikation.

## 8. Pflichtfixtures für die spätere Implementierung

Die spätere T1-Testmatrix muss mindestens abdecken:

### A — transient_event

Ein einzelnes aktuelles Ereignis ohne belegten strukturellen Scope.

Erwartung:

- Klassifikation `transient_event` möglich;
- kein automatischer Ausbau zur Systemfrage;
- Review, wenn ein möglicher struktureller Hintergrund materiell ungeklärt ist.

### B — factual_clarification

Eine überprüfbare Tatsachenfrage.

Erwartung:

- `factual_clarification`;
- keine Preference-Abstimmung;
- Research-/Evidence-Klärung später T2/T3;
- kein Wahrheitsurteil durch T1.

### C — policy_question

Eine sachlich begrenzte Entscheidungsfrage mit klarer Jurisdiktion und
mehreren realistischen Handlungsoptionen.

Erwartung:

- `policy_question`;
- Ziel bleibt von Maßnahme getrennt;
- keine automatische Empfehlung.

### D — structural_system_question

Golden-Case-orientierte Bildungsfrage Sachsen-Anhalt.

Erwartung:

- regionaler Anlass darf nicht auf ein Einzelereignis reduziert werden;
- Landes-/Bundes-/internationaler Vergleich wird als späterer Researchbedarf
  referenziert, nicht in T1 vorweggenommen;
- Symptom-/Ursachenprüfung aktiv;
- Missing-Question-/Scope-Review muss zu enge Frames erkennen.

### E — long_term_societal_choice

Golden-Case-orientierte Alterssicherungsfrage mit langem Zeithorizont.

Erwartung:

- `long_term_societal_choice`;
- Ziel, Horizon und betroffene Generationen/Populationen als Scope sichtbar;
- keine Reformvariante wird zur impliziten Ausgangswahrheit.

### F — ambiguous jurisdiction

Erwartung:

- kein Default auf Deutschland oder eine andere Jurisdiktion;
- `review_required`.

### G — false binary

Eine Frage, die nur zwei Optionen vorgibt, obwohl der Untersuchungsraum weitere
realistische Hebel enthält.

Erwartung:

- Scope Review schlägt an;
- kein T2-Handoff bis Review.

### H — signal-frame domination

Ein Social-/Medien-Anlass beschreibt ein Ereignis stark wertend, während die
neutrale Systemfrage breiter ist.

Erwartung:

- Signal bleibt Signal;
- neutrale Systemfrage übernimmt die Wertung nicht;
- kein Evidenzstatus aus dem Signal.

### I — symptom/cause confusion

Erwartung:

- `review_required` oder `blocked_material_scope_error`;
- T1 erfindet keine Ursache.

### J — multilingual equivalence

Inhaltsgleiche strukturierte Eingaben in unterschiedlichen Sprachen.

Erwartung:

- gleiche fachliche Qualifikationslogik bei gleicher struktureller Bedeutung;
- keine deutschsprachige Regex als kanonischer Owner der Klassifikation.

## 9. Golden-Case-Bezug

T1 darf die Golden Cases noch nicht vollständig lösen. Es muss lediglich den
korrekten Research-Scope erzeugen, damit spätere Stufen nicht auf einem falschen
Problemzuschnitt aufbauen.

Für **Rente** muss T1 mindestens erkennen können, dass eine langfristige
Systemfrage nicht auf eine einzelne Beitragssatz-/Leistungszahl reduziert
werden darf.

Für **Bildung / Sachsen-Anhalt** muss T1 mindestens erkennen können, dass ein
regionaler Anlass breitere Ursachen-, Vergleichs- und Transferfragen auslösen
kann und eine Landeskennzahl nicht automatisch die Systemfrage definiert.

Diese Aussagen sind Acceptance-Fixtures zur Scope-Architektur, keine politischen
oder empirischen Sachurteile.

## 10. Vorgesehener Implementierungsslice nach Blockerauflösung

Erst wenn die Create-/Domain-Ownership-Richtung kanonisch geklärt ist, darf ein
kleiner T1-Slice autorisiert werden.

Bevorzugter Umfang:

```text
1 pure contract file
1 focused contract test file
1 deterministic property/edge test file if needed
1 closure/evidence doc
CI wiring only if no existing T-track command can include the suite
```

Der Slice darf keine DB, Migration, Netzwerk-, Provider-, Queue-, Feed-, Publish-
oder Decision-Aktion enthalten.

Falls für T1 ein neues persistiertes Schema, ein zweiter Topic-Owner oder eine
Runtime-Integration notwendig erscheint, stoppt der Slice mit
`FAIL_SCOPE_EXPANSION` und verlangt einen neuen Preflight.

## 11. Production Definition of Done — T1-spezifisch

T1 ist später nicht allein durch grüne Unit Tests fertig. Vor einem echten
Produktionsabschluss müssen zusätzlich nachgewiesen werden:

- Security/Privacy: keine politische Profilierung aus betroffenen Gruppen oder
  Nutzersignalen;
- Persistenz: falls später persistiert, revisionsgebunden und mit genau einem
  Owner;
- Recovery: unvollständige Klassifikation bleibt reviewpflichtig, nicht
  erfunden;
- Accessibility/Localization: Systemfrage und Scope-Zustand sind unabhängig von
  UI-Sprache korrekt darstellbar;
- Observability: Fehlercodes zeigen Scope-/Owner-/Review-Grenzen ohne
  Rohinhalte/Secrets zu leaken;
- Performance/Abuse: keine automatische Freigabe unter Timeout oder degraded
  Provider;
- Human Acceptance: Golden-Case-Scope wird vom Projektowner abgenommen;
- Rollback: spätere T1-Runtime kann deaktiviert werden, ohne CanonicalTopic oder
  DecisionQuestion zu beschädigen;
- E2E-Evidenz: erst in späteren T-Stufen, nicht durch diesen Contract-Preflight
  vorgetäuscht.

## 12. Preflight-Ergebnis

```text
T0_DEPENDENCY=PASS
SYSTEM_QUESTION_STANDARD_MAPPING=PASS
T_TRACK_QUALITY_ADDENDUM_MAPPING=PASS
CANONICAL_TOPIC_OWNER_IDENTIFIED=PASS
DECISION_QUESTION_OWNER_IDENTIFIED=PASS
PUBLIC_QUESTION_GUARD_BOUNDARY=PASS
MISSING_QUESTION_SCOPE_REVIEW_DEFINED=PASS
CLASSIFICATION_VOCABULARY_DEFINED=PASS
GOLDEN_CASE_FIXTURES_DEFINED=PASS
NO_SECOND_SSOT=true
NO_RUNTIME=true
NO_PROVIDER=true
NO_MIGRATION=true
NO_PUBLISH=true
NO_DECISION_ACTIVATION=true
OWNERSHIP_DIRECTION_GATE=BLOCKED_EXTERNAL
T1_PREFLIGHT=PASS_WITH_EXTERNAL_OWNERSHIP_BLOCKER
T1_IMPLEMENTATION_AUTHORIZED=false
```

Der T-Track kann damit ohne weitere fachliche Grundsatzklärung in die T1-
Implementierung gehen, sobald der externe Repository-Ownership-Blocker
nachweislich geschlossen ist. Bis dahin darf dieser Preflight nicht als T1-
Implementierung, T1-Abnahme oder T2-Freigabe ausgegeben werden.
