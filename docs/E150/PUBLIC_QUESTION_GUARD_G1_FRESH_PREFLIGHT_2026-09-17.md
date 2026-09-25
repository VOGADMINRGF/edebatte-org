# G1 Fresh Preflight — Shared Public Question Guard & Evidence

Stand: 2026-09-17

```text
TRACK=G
SLICE=G1
TASK=SHARED-PUBLIC-QUESTION-GUARD-EVIDENCE-01
ISSUE=705
BASE_MAIN_SHA=520162f2dcce6361176baf5eea399cdc2c9af97d
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
AUTO_PUBLISH=false
OPEN_TASKS_MUTATED=false
OPEN_TASKS_SINGLE_WRITER_CONFLICT_PR=777
G2_G3_G4_G5_AUTHORIZED=false
```

## 1. Ergebnis

Der aktuelle `main` enthält die über PR #707 integrierte `publicQuestionGeneralization`-Foundation. Sie wird erweitert, nicht ersetzt. Der historische PR #708 ist ausschließlich Evidence für fehlende Invarianten; er ist kein Merge-, Rebase- oder Cherry-Pick-Quellbranch für G1.

Der aktuelle Main-Stand beweist bereits:

- Originalinput und Candidate werden durch die vorhandene Create-Safety-Runtime geprüft;
- Personen als direkte bzw. semantische Abstimmungsziele werden blockiert;
- Anschuldigungen, Charakterurteile und Sanktionen gegen benannte Akteure werden blockiert;
- Fakten-/Wahrheitsfragen werden nicht in Präferenzabstimmungen umgewandelt;
- benannte Akteure ohne gültige Generalisierung bleiben reviewpflichtig;
- neutrale verfahrensgebundene Entity-Fragen bleiben human-review-gated;
- `noAutoPublish`, `noPositionInference` und `noBiasOrTrustInference` bleiben invariant.

G1 ist dennoch nicht vollständig: Der gemeinsame Contract besitzt noch keine explizite Trust-Boundary für Actor-/Entity-Extraction, keine im Ergebnis getrennt referenzierbaren Original-/Candidate-Safety-Entscheidungen, keine aggregierte Evidence-Referenzschicht und keinen gemeinsamen fail-closed Audit-before-Release-Persistenzhelper.

Das ist ein begrenzter G1-Slice. Es ist kein weiterer Split in Producer-spezifische Verantwortung erforderlich.

## 2. Exakte G1-Ownership

G1 besitzt ausschließlich Shared Guard & Evidence:

1. `apps/web/src/features/create/safety/publicQuestionGeneralization.ts`
2. `apps/web/src/features/create/safety/questionGuardReviewPersistence.ts`
3. `apps/web/tests/public-question-generalization.contract.test.ts`
4. ein fokussierter Contracttest für die gemeinsame Review-/Audit-Persistenz, vorzugsweise `apps/web/tests/question-guard-review-persistence.contract.test.ts`

Die Implementierung darf nur dann über diese vier Dateien hinausgehen, wenn ein neuer Fresh Preflight den zusätzlichen Shared-G1-Bedarf belegt. Andernfalls gilt `FAIL_SPLIT_REQUIRED`.

## 3. Nicht Teil von G1

G1 darf keine Producer-spezifische Runtime verändern.

- G2 besitzt Participation.
- G3 besitzt Anlassraum.
- G4 besitzt QR/Public Entry.
- G5 besitzt Material Producer/Review Integration.

Insbesondere sind aus dem historischen #708-Diff für G1 ausgeschlossen:

- Participation Publish APIs und Workflows;
- Anlassraum Activation APIs und Workflows;
- QR Sets, Resolve, Vote, Protocol, Summary und Studio;
- Runden Public Input;
- Material-Review-Routen und Material Stores;
- Voxy Producer State;
- Canonical Topic, Create Handoff und weitere producer-spezifische Release-Adapter.

Diese Flächen bleiben historische Integrations-Evidence und werden erst in G2–G5 separat bewertet.

## 4. Verbindliche Implementierungsinvarianten

### 4.1 Actor-/Entity-Extraction Trust Boundary

Der Guard muss einen expliziten Extraction-Status besitzen. `draft_allowed` ist nur zulässig, wenn Actor-/Entity-Extraction unabhängig vollständig belegt ist.

Eine Candidate erzeugende Providerstufe darf ihre eigene Actor-Extraction nicht als unabhängig vollständig attestieren. Zulässige unabhängig verifizierende Quellen müssen explizit allowlisted sein, z. B. kanonische Entity Registry, Actor Graph oder dokumentierter Human Review.

Fehlende, unvollständige, unverified oder selbstattestierte Extraction führt fail-closed zu `review_required`.

### 4.2 Original und Candidate Safety bleiben getrennt beweisbar

Der Result Contract muss mindestens enthalten:

- `originalSafetyDecision`;
- `candidateSafetyDecision`;
- den unveränderten reviewbaren Originalinput;
- den bewerteten Candidate;
- Actor-/Procedure-Kontext;
- referenzierbare Evidence-Refs.

Ein sicher aussehender Candidate darf einen unsicheren, moderation- oder factcheck-pflichtigen Ursprung nicht freigeben.

### 4.3 Procedure Review ist explizit und nicht übersteuernd

Entity-spezifische formale Verfahren dürfen nur nach explizitem, evidenzgebundenem Human Review aus `review_required` in einen Draft-Zustand übergehen.

Diese Resolution darf niemals Person-Targeting, Anschuldigungs-/Charakter-Safety, Fakten-/Wahrheitsblockaden oder andere höhere Sicherheitsentscheidungen überschreiben.

### 4.4 Durable Evidence vor Release

Eine Review-Reevaluation darf `draft_allowed` erst exponieren, nachdem:

1. die reviewpflichtige Reservation fail-closed persistiert wurde;
2. erforderliche Shared-G1-Side-Effects erfolgreich abgeschlossen wurden;
3. das dauerhafte Review-/Audit-Evidence-Objekt erfolgreich persistiert wurde;
4. erst danach der freigegebene Record über einen zweiten versionierten/CAS-kompatiblen Write persistiert wurde.

Fehler in Reservation, Side Effect, Audit oder Release dürfen niemals einen sichtbaren `draft_allowed`-Zustand erzeugen.

Der Helper bleibt generisch. Producer-spezifische Stores, Collections und Release-Routen gehören nicht zu G1.

### 4.5 Stale Evidence

Review-/Audit-Evidence muss an den bewerteten Guard-/Record-Stand gebunden sein. Eine geänderte Frage oder neu bewertete Guard-Version darf alte Evidence nicht stillschweigend als Freigabe wiederverwenden.

Der G1-Slice muss dafür versionierungs-/CAS-kompatible primitive Semantik liefern; die producer-spezifische Bindung erfolgt später in G2–G5.

## 5. Pflichttests

Der getrennt zu autorisierende Implementierungsslice muss mindestens belegen:

- neutrale bereits generalisierte Entscheidungsfrage;
- Generalisierung eines benannten Unternehmens-/Parteiziels;
- Person Targeting;
- Anschuldigung/Charakter/Sanktion;
- Fact-/Truth-Frage und factual origin mit normativem Candidate;
- Safety-blocked Original trotz safe-looking Candidate;
- moderation-/factcheck-pflichtiger Ursprung bleibt aus normalem Draftpfad;
- fehlende/unverified/incomplete Actor Extraction;
- vermeintlich vollständige selbstattestierte Provider-Extraction bleibt Review;
- unabhängig vollständige Extraction mit Evidence;
- entity-spezifisches Verfahren bleibt Review;
- explizit human-reviewed Verfahren kann nur unter vollständiger Safety/Evidence in Draft übergehen;
- Procedure Resolution kann Safety-/Person-/Fact-Block nicht übersteuern;
- Review-Reservation vor Audit vor Release;
- Auditfehler und Releasefehler fail-closed;
- Versionsnormalisierung / stale-evidence-kompatible CAS-Semantik;
- `noAutoPublish=true` durchgehend.

## 6. P-Layer für G1

G1 kann erst als `done` gelten, wenn zusätzlich zur Implementierung geschlossen sind:

- **Security:** fail-closed Safety-/Extraction-/Review-Grenzen und keine Candidate-Self-Attestation;
- **Persistence/Recovery:** Reservation/Audit/Release-Reihenfolge und reproduzierbarer blockierter Recovery-State nach Zwischenfehlern;
- **Accessibility/Localization:** G1 selbst erzeugt keine neue UI; spätere sichtbare Review-/Blockgründe dürfen nicht aus diesem Core als hartcodierte alleinige UI-Wahrheit abgeleitet werden;
- **Observability/Audit:** referenzierbare, user-safe Evidence statt privater Originalinhalte in Logs;
- **Performance/Abuse:** keine neue Providerkaskade oder öffentliche Mutation in G1;
- **Rollback:** additive Contract-Erweiterung, keine zweite Question-/Safety-/Review-SSOT;
- **Human Acceptance:** Downstream-Handoff-Evidence muss belegen, dass G2–G5 `blocked`, `review_required` und `draft_allowed` eindeutig konsumieren können;
- **E2E:** G1-spezifische E2E-Evidence endet am Shared-Handoff. Öffentliche Producer-E2E-Abnahme ist Eigentum von G2–G5.

## 7. Größen- und Architektur-Gate

Fresh Preflight Ergebnis:

```text
PLANNED_FILES=4
PLANNED_RUNTIME_FILES=2
PLANNED_TEST_FILES=2
NEW_API_BOUNDARIES=0
NEW_COLLECTIONS=0
NEW_INDEXES=0
NEW_BROWSER_STORAGE=0
NEW_COOKIES=0
NEW_PROVIDER_CALLS=0
NEW_PUBLISH_PATHS=0
CORE_CONTRACTS_MAX=2
PRODUCER_RUNTIME_CHANGES=0
```

Damit bleibt der Slice innerhalb einer separaten Implementierungsautorisierung handhabbar.

## 8. Governance / Single Writer

PR #777 verändert aktuell `docs/E150/OpenTasks.md`. Dieser Preflight erzeugt daher absichtlich **keinen parallelen OpenTasks-Diff**.

Dieses Dokument ist Evidence für den auf Issue #705 bereits autorisierten Fresh Preflight, ersetzt aber die operative OpenTasks-SSOT nicht. Vor Implementierung muss eine separate G1-Implementierungsautorisierung kanonisch und konfliktfrei serialisiert werden. Bis dahin gilt:

```text
G1_IMPLEMENTATION_AUTHORIZED=false
G1_IMPLEMENTED=false
G1_DONE=false
G2_G3_G4_G5_AUTHORIZED=false
AUTO_PUBLISH=false
```

## 9. Nächster erlaubter Schritt

`SEPARATE_G1_IMPLEMENTATION_AUTHORIZATION`

Die Autorisierung muss exakt die oben definierte Vier-Dateien-Grenze, die G1-Invarianten, die Pflichttests und die P-Layer-Gates übernehmen. Sie darf weder #708 reaktivieren noch G2–G5 vorziehen.
