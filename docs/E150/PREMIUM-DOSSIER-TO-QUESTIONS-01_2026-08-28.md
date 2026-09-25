# PREMIUM-DOSSIER-TO-QUESTIONS-01

## Produktziel

Premium soll den Einstieg von **einer Frage** auf **ein ganzes Dokument / Dossier** erweitern.

Beispiele:
- Parteiprogramm oder Wahlprogramm
- wissenschaftliche Veröffentlichung / Studie
- Vereinskonzept oder Satzungs-/Strategiedokument
- Unternehmensstrategie, Mitarbeiter- oder Kundenunterlage
- journalistisches Recherche-Dossier

Gewünschter Flow:

`Dokument hochladen → lokal vollständig extrahieren → semantisch in Abschnitte/Kapitel gliedern → Materialwissen mit Provenienz speichern → vorhandenes Graph-Wissen abgleichen → Lücken bestimmen → Fragen/Antwortmöglichkeiten nur für relevante Arbeitsschritte erzeugen → menschliche Prüfung → ausgewählte Fragen als private Create-Arbeitsstände vorbereiten`

Das Dokument ist damit nicht nur Eingabe für einen einmaligen KI-Lauf. Es wird – nach Review und Freigabe – zu einer wiederverwendbaren, quellengebundenen Wissensbasis. Spätere Arbeit darf auf diesem Wissen aufsetzen, ohne dieselbe Vollanalyse technisch erneut durchführen zu müssen.

## Kanonische Trennung: Wissen, Arbeit, Preis

1. **Public Core bleibt offen.**
2. **Professional Layer monetarisiert Arbeitsfähigkeit, nicht Wahrheit, Signalhöhe, Faktenstatus, Priorität oder Abstimmungsergebnis.**
3. Technische Provider-/Analyse-Kosten und kommerzielle Preise/Credits sind getrennte Ebenen.
4. Wiederverwendung senkt interne Grenzkosten, hebt aber nicht automatisch die kommerzielle Leistung auf. Wiederverwendung, Vergleich, Erweiterung, Dossierbildung, Folgefragen oder neue Ausarbeitung können jeweils eigenständige bezahlte Arbeitsleistungen sein.
5. Keine Token-, Seiten- oder Zeichenpreise als öffentliches Leitmodell. Interne Cost Units dienen Cost-Control und Routing; kommerzielle Pakete/Credits bilden Kundenwert und Produktleistung ab.
6. Kein Earn-to-participate und kein Pricing-Mechanismus darf demokratische Gewichtung, Wahrheit oder Sichtbarkeit kaufen.

Diese Regeln konkretisieren den bestehenden GOV-PRICING-Kanon und ersetzen ihn nicht.

## Knowledge-Ingest statt Frage-Explosion

Der erste Lauf eines großen Dokuments soll nicht reflexartig möglichst viele Abstimmungsfragen erzeugen. Zuerst wird ein dauerhafter Material-Korpus aufgebaut:

`Dokument → Kapitel/Abschnitte → Themen → Positionen/Claims → Quellenanker → offene Punkte → Graph-Matches/Gaps`

Erst danach werden bei Bedarf Fragen erzeugt. Dadurch bleiben Wissensspeicherung und Beteiligungsfrage getrennt und die Plattform produziert keinen Graph voller KI-generierter Fragen ohne konkreten Arbeitskontext.

## Semantische Chunking-Regel

Große Dokumente dürfen nie still abgeschnitten werden. Technische Analysefenster werden bevorzugt an semantischen Grenzen gebildet:

- Kapitelüberschriften
- Zwischenüberschriften
- Abschnitte/Paragraphen
- erst als Fallback harte Zeichengrenzen

Interne Standardgröße: ca. 60.000 Zeichen pro Analyse-Einheit. Die Einheit ist Cost-/Routing-Infrastruktur und kein öffentliches Preismodell.

## Dokumentidentität, Provenienz und Versionierung

Ein Fingerprint allein reicht nicht als fachliche Identität. Jeder persistierte Materialkorpus soll mindestens führen:

- `contentFingerprint`
- `publisher/issuer`
- `documentType`
- `title`
- `publishedAt` oder dokumentierte Versions-/Standangabe, sofern vorhanden
- `sourceUrl/sourceRef`, sofern vorhanden
- `sourceFormat`
- `ingestedAt`
- Herkunft des extrahierten Textes
- Review-/Freigabestatus

Wahlprogramm 2017, Wahlprogramm 2025 und spätere Revisionen bleiben getrennte Quellen. Aussagen/Claims dürfen nicht zwischen Versionen verschmolzen werden, nur weil Themen ähnlich sind.

## Wiederverwendung / Aufsatteln

Bei vorhandenem Materialwissen gilt Graph-first:

1. bestehende Quelle/Version erkennen,
2. vorhandene Themen/Claims/Fragen/Dossiers/Open Points finden,
3. relevante Ausschnitte statt Volltext laden,
4. Nutzerarbeit als `reuse`, `continue`, `enrich` oder `create_new` einordnen,
5. nur den zusätzlichen fachlichen Bedarf mit KI bearbeiten.

Technische Wiederverwendung kann sehr günstig sein. Kommerziell bleibt sie trotzdem eine eigenständige Professional-Layer-Leistung, wenn dadurch neue Arbeitsfähigkeit entsteht. Das ist keine Bezahlung für Wahrheit oder gespeicherten Text, sondern für Retrieval, Vergleich, Strukturierung, Erweiterung und Erstellung neuer Arbeitsstände.

## Economics / Cost-Margin-Ledger

Jeder kostenrelevante Material-/Voxy-Lauf soll auditierbar erfassen:

- interner Vorgangstyp (`ingest_new_material`, `reuse_existing_material`, `extend_existing_topic`)
- Provider / Modellroute
- Input-/Output-Verbrauch soweit verfügbar
- interne Analyse-Einheiten
- Cache-/Reuse-Anteil
- geschätzte und – soweit Providerdaten verfügbar – tatsächliche Providerkosten
- belastete kommerzielle Einheit/Paketleistung
- Pricing-/Policy-Quelle und ggf. Override
- Zeitstempel / Actor / Organisation

Ziel: reale Unit Economics und Marge messen können, ohne technische Providerpreise an Kunden durchzureichen. Keine stillen Pricing-Overrides; bestehende GOV-PRICING-Explainability-/Auditregeln bleiben bindend.

## Volumen- und Kostenfreigabe

- Lokale PDF/DOCX-Textextraktion startet keine kostenpflichtige KI.
- Vor kostenrelevanter Analyse großer Dokumente wird das voraussichtliche interne Volumen bestimmt.
- Kleine Läufe können innerhalb vorhandener Pakete/Quoten direkt laufen.
- Große Läufe benötigen explizite Volumen-/Kostenfreigabe oder ausreichendes Kontingent.
- Nie still Providerkosten auslösen, wenn ein Guard/Cap eine Freigabe verlangt.
- Bei bereits analysiertem identischem Material ist bevorzugt Wiederverwendung statt erneuter Vollanalyse zu wählen.

## Öffentliche Kommunikation

Bis der End-to-End-Flow produktionswahr verfügbar ist, darf die Landingpage **nicht** behaupten, dass ein Dossier bereits automatisch in mehrere veröffentlichbare Fragen umgewandelt wird.

Zulässige Vorankündigung:

> **Premium: Ganze Dossiers statt Frage für Frage.** Lade künftig z. B. ein Parteiprogramm, eine Studie oder Vereinsunterlagen hoch. eDebatte bereitet daraus Themen, Quellenbezüge, offene Punkte sowie mehrere Fragen und mögliche Antworten zur Prüfung vor. Veröffentlichung bleibt immer deine Entscheidung.

Sobald die DoD unten erfüllt ist, kann `künftig` entfallen.

## Bestehende Grundlage

- Material-/Upload-Intake existiert.
- Dossier-Studio-Entitlement existiert.
- Material Extraction / Dossier Handoff ist im Repository angelegt.
- Der Upload-Endpunkt extrahiert Textdateien sowie textbasierte PDF- und DOCX-Dateien lokal aus den echten Upload-Bytes und speichert den Volltext privat und reviewpflichtig.
- Bildbasierte Scan-PDFs starten kein OCR und degradieren mit einem expliziten Leertext-Status. Legacy-`.doc` benötigt weiterhin eine externe Konvertierung.
- Lokale Textextraktion startet weder KI-Recherche noch Veröffentlichung. Deshalb bleibt der öffentliche Premium-End-to-End-Claim bis zur vollständigen Review- und Persistenzabnahme als Vorankündigung markiert.

## Implementierungsstand `PREMIUM-DOC-01`

Der P0-Parserpfad verwendet serverseitig `pdf-parse` für PDF und `mammoth` für DOCX. Er begrenzt Dateigröße, PDF-Seiten und Volltextlänge, plausibilisiert MIME-Typ, Endung und Binärsignatur und liefert stabile Fehlergründe ohne Rohmaterial in Responses oder öffentliche Stores zu schreiben. Der bestehende Material-Intake führt lokale Dokumentextraktion als eigenen Zustand; Herkunft und Format bleiben am privaten Volltext nachvollziehbar. Stille Volltextkappung ist nicht zulässig; zu große Inhalte müssen explizit blockiert oder in persistente Segmente überführt werden.

P1 verwendet die bestehende `material_grounding`-Providerreihenfolge und akzeptiert ausschließlich strikt validiertes JSON. Fragen benötigen echte Dokumentanker; als Dokumentinhalt deklarierte Optionen müssen wörtlich im privaten Volltext vorkommen. Zusätzliche Optionen sind sichtbar als KI-Vorschlag markiert. Bei fehlendem oder ungültigem Provider-Output bleibt der Flow kontrolliert degradiert und erzeugt keine Fake-Drafts. Mehrteilige Analysen dürfen unterschiedliche zugelassene Provider verwenden; der Review-Store muss deshalb `mixed` als nachvollziehbaren Providerzustand unterstützen.

Eine eigene Review-Ansicht zeigt reale Graph-Matches, Gap-Analyse und Empfehlung, bezeichnet diese aber ausdrücklich nicht als Entscheidung. Alle Fragen, Optionen, Weiterführungsarten und Auswahlen sind vor der Bestätigung editierbar. Nichts ist vorausgewählt. Erst eine explizite Bestätigung persistiert die ausgewählten Vorschläge über den bestehenden Create-Saved-Workstate-Store als private beziehungsweise organisationsinterne `question_candidate`-Arbeitsstände. Dabei entstehen keine Runde, keine Veröffentlichung, kein Graph-Write und kein Merge.

## Definition of Done

- [ ] authentifizierter Premium-/Dossier-Studio-Nutzer kann ein unterstütztes Dokument hochladen
- [ ] Extraktion läuft vollständig, produktionswahr und nachvollziehbar; keine stille Kürzung
- [ ] semantische Segmentierung bevorzugt Kapitel-/Abschnittsgrenzen
- [ ] Materialidentität, Provenienz und Version sind persistent nachvollziehbar
- [ ] bestehendes Materialwissen wird vor neuer Vollanalyse erkannt und wiederverwendet
- [ ] Knowledge-Ingest ist fachlich von Question Generation getrennt
- [ ] System schlägt mehrere getrennte Fragen nur im konkreten Arbeits-/Review-Kontext vor
- [ ] System schlägt pro Frage geeignete Antwortmöglichkeiten vor, ohne sie als Fakten auszugeben
- [ ] Quellen-/Seitenbezug bleibt nachvollziehbar
- [ ] Nutzer kann jede Frage/Antwort ändern, verwerfen oder freigeben
- [ ] keine automatische Veröffentlichung
- [ ] kein automatischer Graph-Write/Merge aus KI-Drafts
- [ ] Review-/AI-Transparenz sichtbar
- [ ] Cost-/Margin-Ledger erfasst interne Kosten, Reuse und kommerzielle Leistung getrennt
- [ ] Volumen-/Kostenfreigaben greifen vor kostenrelevanten großen Läufen
- [ ] Tests für Programm/Studie/Vereinsdokument sowie große Mehrsegment-Dokumente
- [ ] Landingpage-Claim wird erst danach von `künftig` auf verfügbar umgestellt

## Priorität

P0/P1 nach Stabilisierung von #656 und offenem Beitragsmodus #657. Der Premium-Mehrwert soll auf der GTM-Landingpage sichtbar werden, aber nur produktionswahr.

## Finaler Architekturentscheid 2026-08-28

Für große Dokumente gilt dauerhaft:

**einmal vollständig und quellengebunden erschließen, dauerhaft als versioniertes Materialwissen nutzbar machen, Graph-first wiederverwenden, zusätzliche Arbeit gezielt analysieren und Professional-Layer-Arbeitsfähigkeit monetarisieren.**

Nicht zulässig sind stille Textkappung, automatische Veröffentlichung, ungeprüfte Verschmelzung von Quellenversionen, öffentliche Token-/Zeichenpreislogik oder Monetarisierung demokratischer Gewichtung/Wahrheit.
