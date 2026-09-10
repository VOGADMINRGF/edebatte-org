# eDebatte System Question / Global Context Standard

Stand: 2026-09-09

Status: normativer Produkt- und Architekturvertrag; keine Implementierungs-, Schema-, Provider-, Publish- oder Produktionsfreigabe

## 1. Zweck und Geltungsbereich

eDebatte darf eine strukturelle öffentliche Frage nicht auf ein isoliertes lokales Ereignis oder eine Tagesmeldung verkürzen, wenn der breitere Systemkontext für eine tragfähige Entscheidung materiell ist. Dieser Standard bindet Topic-Qualifikation, Research, Dossier, Szenarien, Entscheidungsfragen, öffentliche Lesemodelle und spätere Wirkungsmessung. Er erweitert die vorhandenen kanonischen Topic-, Claim-, Evidence-, Dossier-, Poll- und TopicRound-Verträge und begründet weder einen zweiten Dossier-Speicher noch eine zweite Entscheidungs- oder Research-Wahrheit.

## 2. Kanonische Begründungs- und Entscheidungskette

```text
GOAL
→ CURRENT STATE
→ HISTORY
→ ROOT CAUSES
→ NO-CHANGE COUNTERFACTUAL
→ NATIONAL / REGIONAL COMPARISON
→ INTERNATIONAL COMPARISON
→ DIFFERENCE DRIVERS
→ SUCCESSFUL AND FAILED MODELS
→ TRANSFERABILITY
→ UNIVERSAL PRINCIPLES VS CONTEXT-SPECIFIC DESIGN
→ POLICY BUILDING BLOCKS
→ COMBINABLE SCENARIOS
→ IMPACTS / TRADE-OFFS
→ UNCERTAINTY
→ FACT/MODEL CONFLICT VS VALUE CONFLICT
→ STRESS TEST
→ DECISION READINESS
→ VERSION-BOUND DECISION
→ IMPLEMENTATION
→ IMPACT MEASUREMENT
→ REVISION
```

Die Kette ist ein Pflichtprüfraster, keine Aufforderung zu erfundenem Fülltext. Nicht materielle Dimensionen werden begründet als nicht anwendbar markiert; materielle Lücken bleiben sichtbar und blockieren die Entscheidungsreife.

## 3. Verbindliche Produktgesetze

1. Die Zieldefinition geht jedem Lösungsdesign voraus.
2. Jede ernsthafte Entscheidung besitzt, soweit zeitlich sinnvoll, eine belegte aktuelle Baseline und eine No-change-/Counterfactual-Trajektorie.
3. Symptom und kausale beziehungsweise systemische Grundursache sind getrennte Objekte und dürfen nicht still gleichgesetzt werden.
4. Internationaler Vergleich ist eine nachvollziehbare Comparator-Matrix statt einer Sammlung von Anekdoten. Sie umfasst, wo materiell, strukturell ähnliche Systeme, Best Performer, wesentlich andere Gegenmodelle, gescheiterte oder zurückgenommene Reformen und begründete Sonderfälle.
5. Jeder Vergleich erklärt relevante Difference Drivers, insbesondere Recht, Institutionen, Finanzierung, Demografie, Kultur, Geografie, Arbeitsmarkt, Verwaltungsstruktur, Ausgangslage und Zeithorizont.
6. Transferierbarkeit wird ausdrücklich bewertet. Ein ausländisches Modell wird nie still zur Empfehlung.
7. Weltweit identische Umsetzung wird nicht erzwungen. Potenziell universelle Prinzipien, übertragbare Mechanismen und kontextabhängige Ausgestaltung bleiben getrennt.
8. Optionen sind keine bloßen Pro-/Contra-Labels. `PolicyBuildingBlock`-Kandidaten werden auf Kompatibilität geprüft und zu vollständigen, vergleichbaren Szenarien kombiniert.
9. Jedes Szenario enthält, wo materiell: Ziele, Hebel, Annahmen, Finanzierung, Implementierung, Übergang, Abhängigkeiten, rechtliche Grenzen, Kosten oder Bandbreiten, betroffene Gruppen, Zeithorizont, Evidenz und Unsicherheit.
10. Jedes Szenario wird als Best Case, Base Case, Worst Case und Adverse/Unintended Consequence geprüft. Zusätzlich ist zu beantworten: Welche Annahme müsste falsch sein, damit dieses Szenario scheitert?
11. Epistemische Klassifikation ist verpflichtend: `FACT`, `MEASURED_VALUE`, `ESTIMATE`, `PROJECTION`, `MODEL_RESULT`, `ASSUMPTION`, `INTERPRETATION`, `OPINION`, `NORMATIVE_JUDGMENT`, `UNKNOWN`.
12. Faktische/evidenzbezogene, modell-/projektionsbezogene, Ziel-/Trade-off-bezogene und normative Wertkonflikte werden getrennt. Wissenschaft und Evidenz informieren über Folgen; sie entscheiden gesellschaftliche Werte nicht still.
13. Community- und Social-Media-Inhalte sind standardmäßig `SIGNAL` beziehungsweise Relevanzsensor, nicht Evidenz.
14. Keine Lösung oder Empfehlung erscheint ohne sichtbare Alternativen, Trade-offs, Transferierbarkeit, Unsicherheit und Evidenzlücken.
15. Eine Entscheidung bindet exakt an die freigegebene Dossier-Revision, ScenarioSet-Revision, Scenario-Revisionen sowie den dokumentierten Evidence-/Research-Completeness-Zustand. Eine spätere materielle Revision macht den alten Entscheidungsentwurf stale.
16. Vor Aktivierung werden Erfolgsmetriken, Monitoring-Horizont, Review-Zeitpunkte und bekannte Fehlschlagindikatoren festgelegt.
17. Der Lebenszyklus endet nicht mit der Entscheidung: `DECISION → IMPLEMENTATION → OBSERVED OUTCOME → IMPACT → ASSUMPTION REVIEW → DOSSIER REVISION`.

## 4. Abbildung auf vorhandene kanonische Verträge

Die Großschreibung oben ist eine normative Klassifikation, kein Auftrag für sofortige neue Enums. Vor Implementierung muss T0 jede Kategorie auf vorhandene Claim-/Evidence-/Source-Vokabulare abbilden. Bestehende kanonische Typen gewinnen; fehlende Begriffe werden erst nach Architekturreview ergänzt. `SystemQuestion`, `ResearchObject`, `ContextEvent`, Metric/Projection/Assumption, `ScenarioSet`, `Scenario`, Impact/Tradeoff, Comparator und `DecisionBinding` referenzieren vorhandene IDs. Dossier bleibt fachlicher Inhalts- und Evidenzanker; Poll/TopicRound bleibt Entscheidungsowner.

## 5. Decision-Readiness-Gate

Zwei Reifestufen sind strikt getrennt:

- `ready_for_human_deliberation` darf wahr sein, wenn offene materielle Lücken vollständig sichtbar, korrekt klassifiziert und für die menschliche Beratung verständlich sind. Das erlaubt Beratung, aber keine Aktivierung.
- `activation_ready` beziehungsweise `decision_ready` darf nur wahr sein, wenn **jede materielle Pflichtdimension `SUFFICIENTLY_EVIDENCED_AND_REVIEWED`** ist. Jede ungelöste materielle Lücke erzwingt `activation_ready=false` und `decision_ready=false`.

Eine sichtbare Lücke ist somit kein alternativer Erfüllungsweg für Entscheidungsreife. Fehlende Inhalte dürfen nie durch erfundene Prosa, Defaultwerte oder fingierte Kennzahlen ersetzt werden. Ein menschlicher Override darf eine Lücke zur Beratung anerkennen, aber keinen harten Aktivierungsblocker unsichtbar überstimmen.

Pflichtdimensionen sind:

- Ziel, aktueller Zustand, Geschichte, Ursachen und No-change-Baseline;
- nationaler/regionaler Kontext, internationale Comparatoren, Difference Drivers und Transferierbarkeit;
- Szenariovollständigkeit, relevante Gegenmodelle, Auswirkungen/Trade-offs und betroffene Gruppen;
- Finanzierung/Kosten, rechtliche Grenzen, Unsicherheit und epistemische Klassifikation;
- Review quantitativ hochwirksamer Aussagen sowie Trennung von Fakten-/Modell- und Ziel-/Wertkonflikten;
- Stresstests, Integrität der Scenario-Revisionen und Bindung von Ballot/Entscheidung an freigegebene Revisionen;
- Erfolgsmetriken und Review-Horizont.

Nicht übersteuerbare Aktivierungsblocker sind mindestens:

- fehlende oder stale materielle Baseline;
- fehlende materielle No-change-Trajektorie, wo anwendbar;
- fehlende materiell betroffene Gruppe;
- ungelöste materielle rechtliche oder verfassungsrechtliche Grenze;
- nicht reviewte quantitativ hochwirksame Aussage;
- materiell asymmetrische Evidenzauswahl oder materiell verzerrtes ScenarioSet;
- unterdrückter materieller wissenschaftlicher oder professioneller Dissens;
- Projektion ohne Provenienz oder nicht offengelegte Schlüsselannahme;
- stale materielle Dossier-, Evidence-, ScenarioSet- oder Scenario-Revision;
- gebrochenes `DecisionBinding`.

Das Gate speichert pro Dimension mindestens Materialität, Status, Evidenzreferenzen, Reviewzustand, offene Lücke, Frische und Revision. Die Materialitätsentscheidung selbst ist auditierbar und bindet mindestens Actor, Rationale, Revision, Reviewstatus und – wo die kanonischen Konventionen es verlangen – Timestamp. Es gibt keinen unsichtbaren Override. Materialität darf nur mit reviewter Begründung geändert werden; eine faktische Lücke wird nur durch Hinzufügen und Review der erforderlichen Evidenz geschlossen.

Verbindliche False-positive-Fixtures beweisen `decision_ready=false` bei jedem einzelnen materiellen Fall: fehlender Comparator oder betroffene Gruppe, stale Projektion oder Revision, ungelöste Rechtsgrenze, nicht reviewte zentrale quantitative Aussage, materiell unterbelegtes Szenario, fehlender Status quo oder anwendbare No-change-Baseline, politisch beziehungsweise anderweitig verzerrt unvollständiges ScenarioSet, ausgelassener materieller Dissens sowie fälschlich als nicht materiell klassifiziertes `UNKNOWN`.

## 6. Evidenzstandard

Kontextabhängig gilt folgende bevorzugte Quellenhierarchie:

1. primäre amtliche und rechtliche Quellen;
2. amtliche Statistik und Verwaltungsdaten;
3. peer-reviewte systematische Reviews und Meta-Analysen;
4. hochwertige peer-reviewte Einzelstudien;
5. anerkannte wissenschaftliche oder institutionelle Berichte;
6. transparente hochwertige Datensätze;
7. seriöser Journalismus für aktuellen Kontext;
8. nachvollziehbare Experteninterpretation;
9. Community-/Social-Signale ausschließlich als Signal oder Kontext, nicht standardmäßig als Evidenz.

Die Hierarchie ist kein blinder Score. Die folgenden Dimensionen sind reviewbare Qualitätsmerkmale, keine automatische Scoring- oder Wahrheitsmaschine:

- **Research-Plan-Qualität:** systematischer Such-/Research-Plan, begründete Ein- und Ausschlüsse, Primary-/Secondary-Source-Mix, Quellenunabhängigkeit, widersprechende Evidenz, wissenschaftlicher Konsens und legitimer Dissens sowie Frische;
- **Methodenqualität:** Selection Bias, Publication Bias, Stichprobenqualität, Methodik, statistische Unsicherheit, Robustheit/Sensitivität, Replikation soweit relevant, Korrelation versus Kausalität, Confounding und Grenzen kausaler Inferenz;
- **Modellqualität:** Annahmen, Modellprovenienz, Unsicherheitsbandbreiten, Kalibrierung soweit relevant und Sensitivität gegenüber Annahmen;
- **Expert-/Institutionsqualität:** Interessenkonflikte, Funding-/Conflict-Provenienz, Status rechtlicher Interpretation und Jurisdiktionsfit;
- **globale Qualität:** Übersetzungstreue, Terminologieäquivalenz, Datenvergleichbarkeit, unterschiedliche Messdefinitionen und Grenzen internationaler Vergleichbarkeit.

Unabhängigkeit, Frische, Methodik, Jurisdiktion, Interessenkonflikte, Widersprüche und Quellenbeziehungen bleiben explizit. Abweichende Quellen werden nicht durch Mittelung oder Mehrheitszählung unsichtbar gemacht. Generierte Medien und abgeleitete Outputs sind keine Primärbelege für ihre eigenen Aussagen.

## 7. Vergleich, Szenarien und Transferabilität

Eine Comparator-Matrix dokumentiert pro Fall Auswahlgrund, Strukturähnlichkeit, Zeitraum, Ausgangslage, Maßnahmen, beobachtete Ergebnisse, Quellen, Difference Drivers, Grenzen und Transferabilität. Erfolgreiche und gescheiterte Modelle werden symmetrisch geprüft. Aus `PolicyBuildingBlock`-Kandidaten entstehen nur kompatible Kombinationen; Status quo/No-change bleibt als Vergleichsszenario darstellbar.

Auswirkungen werden nach betroffenen Gruppen, Verteilung, Generation, Region, Zeit, Kosten/Finanzierung, rechtlichen Grenzen und unbeabsichtigten Folgen sichtbar. Bandbreiten und Modellresultate bleiben als solche klassifiziert. Eine Empfehlung ist ein reviewpflichtiger, revisionsgebundener Schluss aus Alternativen und Trade-offs, niemals autonome Systemwahrheit.

## 8. Versionsbindung und Wirkungsschleife

Jede Entscheidungsfrage und jede Option referenziert exakt die freigegebenen Dossier-, ScenarioSet- und Scenario-Revisionen sowie den Completeness-/Evidence-Zustand. Materielle Änderungen an Evidenz, Annahmen, Szenarien, Finanzierung, Recht oder Wirkung invalidieren den alten Entwurf fail-closed. Reaktivierung verlangt erneutes Review; es gibt keinen stillen stale Ballot.

Vor der Entscheidung werden Messgrößen, Baseline, Zielbereich, Datenquelle, Beobachtungszeitraum, Reviewpunkte und bekannte Fehlersignale dokumentiert. Nach Umsetzung werden beobachtetes Ergebnis und Wirkung von Output und politischer Absicht getrennt, Annahmen überprüft, Widersprüche erhalten und das Dossier revisioniert.

## 9. Grenzen

Dieser Standard autorisiert keine Runtime, Schemaänderung, autonome Recherche, Provider-/Feed-Aktivierung, Veröffentlichung oder Entscheidungsaktivierung. Er erlaubt kein Auto-Publish, keine Auto-Truth, keine politische Profilierung und keinen Ersatz menschlicher Verantwortung. Die Umsetzung bleibt den in `docs/E150/OpenTasks.md` dispositionierten T0–T8-Slices, ihren Reviews und den globalen Production Gates vorbehalten.
