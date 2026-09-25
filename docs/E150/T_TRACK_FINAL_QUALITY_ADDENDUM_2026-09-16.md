# T-Track Final Quality Addendum

Stand: 2026-09-16

Status: Governance-/Acceptance-Ergaenzung fuer den bestehenden T0-T8 Decision-Dossier-Track. Keine Runtime-Autorisierung. Kein zweiter Orchestrator, keine zweite SSOT.

## Zweck

Dieses Addendum schliesst Restpunkte aus dem Review von Issue #787. Bestehende Owner, Contracts und Guards bleiben kanonisch. Die Punkte sind bei der weiteren T-Track-Umsetzung in bestehende T0-T8-Vertraege einzuordnen und duerfen keine parallelen Wahrheiten erzeugen.

## 1. Expliziter Dossier-Lifecycle

Ein Dossier ist ein dauerhaftes, revisionsgebundenes Objekt und keine einmalige Publikation.

Mindestens nachvollziehbare Zustaende:

- draft
- in_review
- approved
- published
- materially_changed
- re_review_required
- superseded
- archived

Ein materieller Wechsel invalidiert die Freigabe nicht still. Abhaengige Outputs wie Voice, Video, QR, Marketing, Poll-/Decision-Kontext und Zusammenfassungen muessen ihren Revision-/Stale-Status nachvollziehbar aktualisieren.

## 2. Decision Context Snapshot

Eine Nutzerentscheidung bzw. ein Poll-/TopicRound-Vorgang bleibt an die exakte freigegebene Dossier-/ScenarioSet-/Scenario-Revision gebunden. Zusaetzlich muss ein historisch lesbarer Decision Context Snapshot rekonstruierbar sein.

Der Snapshot referenziert mindestens:

- Dossier-Revision
- ScenarioSet-/Scenario-Revision
- relevante Evidenz-/Source-Revisionen bzw. deren kanonische IDs
- damals sichtbare materielle Luecken und Unsicherheiten
- Actor-/Position-Stand, soweit fuer die Entscheidung relevant
- Sprach-/Uebersetzungsrevision der Nutzeransicht
- Freigabe-/Review-Receipt

Der Snapshot erzeugt keine zweite Wahrheit und kopiert keine Daten unkontrolliert; er bindet kanonische IDs und Revisionen fuer historische Nachvollziehbarkeit.

## 3. Intra-Actor Conflict

Actor-Positionen duerfen nicht zu einer einzigen Position geglaettet werden, wenn offizielle Quellen desselben Akteurs materiell voneinander abweichen.

Beispiele: Programm, Fraktionsbeschluss, Landes-/Regionalorganisation, Vorstandsaussage oder spaetere offizielle Stellungnahme.

Mindestens folgende Zustaende muessen darstellbar sein:

- consistent
- partially_conflicting
- conflicting
- superseded
- unclear

Parent-/Child-Organisationen bleiben eigenstaendig revisionsfaehig; eine uebergeordnete Organisation ueberschreibt Untergliederungen nicht automatisch.

## 4. Source-Challenge-Workflow

Parteien, Verbaende, Organisationen, Fachakteure und andere betroffene Quelleninhaber duerfen eine eDebatte-Darstellung bzw. Quelleninterpretation beanstanden.

Eine Beanstandung:

- aendert Evidenz oder Dossier nicht automatisch;
- erzeugt einen dokumentierten Review-Fall;
- referenziert betroffenen Claim, SourceSegment und Revision;
- erlaubt Begruendung und neue Quelle/Gegenquelle;
- traegt einen Status wie open / under_review / resolved / rejected / accepted_correction;
- behaelt Audit-Historie und fruehere Revisionen.

Die oeffentliche Darstellung kann bei materiellem offenen Streit transparent markieren, dass eine Darstellung beanstandet und in Pruefung ist.

## 5. Missing-Question / Scope Review

Der Dossier-Orchestrator prueft nicht nur, ob Antworten, Quellen oder Perspektiven fehlen, sondern auch, ob die Problemdefinition selbst zu eng, falsch geschnitten oder durch den Anlass verzerrt ist.

Der Review muss insbesondere testen:

- fehlt eine vorgelagerte Systemfrage?
- werden Ursache und Symptom verwechselt?
- wurde ein realistischer Policy-Hebel ausgeschlossen?
- ist Jurisdiktion oder Zeithorizont falsch begrenzt?
- erzeugt die Frage einen unnoetigen False Binary?
- fehlen materielle No-change-/Status-quo-Optionen?
- ist der Anlasssignal-Frame staerker als die neutrale Systemfrage?

Ein materieller Scope-Fehler blockiert Decision Readiness bis Review oder explizitem, auditiertem Human-Risk-Override.

## 6. Explainability Acceptance

Die drei Nutzer-Ebenen Kurz verstehen / Einordnen / Tief einsteigen bleiben bestehen. Zusaetzlich muss die Kurzebene testbar korrekt sein.

Acceptance fuer die Kurzebene:

Ein Nutzer soll nach der Darstellung korrekt wiedergeben koennen:

1. welche neutrale Kernfrage behandelt wird;
2. welche wesentlichen realistischen Alternativen existieren;
3. welche wichtigsten Trade-offs bzw. Betroffenheiten bestehen;
4. was als gut belegt, umstritten oder unbekannt gilt;
5. wo er Quellen, Details und offene Luecken findet.

Vereinfachung darf Scope, Unsicherheit, Quantifizierung oder normative Staerke nicht veraendern. Falls korrekte Vereinfachung nicht moeglich ist, muss die Darstellung dies sichtbar sagen statt falsche Eindeutigkeit zu erzeugen.

## 7. Partner-neutrale Demonstration

Ein Dossier muss fuer unterschiedliche demokratische Parteien, Verbaende, Kommunen, Medien, Wissenschaft, Initiativen oder andere Partner demonstrierbar sein, ohne dass Methodik, Ranking oder Evidenzdarstellung zugunsten eines Partners veraendert wird.

Regeln:

- kein Pay-to-Rank oder Pay-to-Prominence;
- Partner-/Kundenstatus beeinflusst weder Evidenzgewicht noch Actor-Ranking;
- gebrandete Einladungs-/Kampagnenoberflaechen duerfen den kanonischen Dossier-Inhalt nicht veraendern;
- Partner kann auf den neutralen Anlassraum verlinken oder per QR einladen;
- Herkunft/Trigger der Einladung darf sichtbar sein, bleibt aber getrennt von Dossier-Evidenz und Systemfrage;
- dieselbe kanonische Dossier-Revision bleibt fuer alle Partner identisch.

## T0-T8-Zuordnung

- T0: Lifecycle-, Snapshot-, Actor-Conflict-, Challenge- und Explainability-Vertraege auf vorhandene kanonische IDs/Revisionen mappen.
- T1: Missing-Question-/Scope-Review als Teil der SystemQuestion-Qualifikation.
- T2: Challenge-/Actor-Conflict-/Coverage-Anforderungen in ResearchPlan und WorkItems aufnehmen.
- T3: Epistemische Trennung, SourceSegment-Provenienz, Actor-Conflict und Challenge-Status reviewbar machen.
- T4/T5: False-Binary-, Missing-Alternative- und No-change-Pruefung gegen ScenarioSet/PolicyBuildingBlocks.
- T6: Decision Context Snapshot revisionsgebunden an bestehende Decision Owner anbinden; keine zweite Decision-SSOT.
- T7: Lifecycle-/Stale-Status, Conflict-/Challenge-Hinweise und Explainability-Surface fuer Nutzer sichtbar machen.
- T8: Full-/Delta-/Re-Review um Missing-Question-, Scope-, Lifecycle-, Snapshot- und Explainability-Checks erweitern; Human Gate bleibt final.

## Acceptance

Der T-Track ist in diesen Punkten erst ausreichend, wenn nachgewiesen ist:

- materielle Aenderungen erzeugen keinen stillen Published-Status;
- historische Entscheidungen sind ueber Revisionen und Context Snapshot nachvollziehbar;
- widerspruechliche offizielle Actor-Positionen werden nicht geglaettet;
- Source Challenges koennen Dossier-Claims gezielt pruefen lassen, ohne Auto-Override;
- ein eigener Scope-/Missing-Question-Review erkennt bewusst eingebaute False-Binary- und Scope-Fehler;
- Kurzfassungen bestehen einen semantischen Explainability-/Compression-Test;
- Partnerdarstellung veraendert weder kanonische Dossier-Wahrheit noch Ranking, Evidenz oder Decision Readiness.

## Nicht enthalten

- keine Runtime-Aktivierung;
- keine DB-Migration;
- kein neuer Store;
- kein neuer Orchestrator;
- kein Auto-Publish;
- keine Aenderung der G3-/G4-Owner;
- keine Umgehung bestehender Human-Review-/Truth-/Source-Guards.
