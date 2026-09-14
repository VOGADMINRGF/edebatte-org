# Media Evidence, QR und institutionelles Pricing – Produktentscheidung (2026-09-14)

Status: **verbindlicher Produkt- und Governance-Contract**

## 1. Entscheidung

eDebatte Media stellt Redaktionen den gemeinsamen Evidenzstand bereits vor und waehrend der
Berichterstattung als Arbeitsgrundlage bereit. Redaktionen duerfen Quellen, Gegenquellen,
Claims, Widersprueche, Unsicherheiten und offene Fragen fuer eigene Berichte verwenden, soweit
Urheber-, Lizenz-, Datenschutz-, Embargo- und Quellenschutzregeln dies erlauben.

Faktencheck, Quellenpruefung, Community-Wissen und normale Recherche werden nicht als einzelne
Wahrheitsprodukte bepreist. Sie gehoeren zum offenen Evidenzauftrag von eDebatte. Bepreist
werden ausschliesslich professionelle Betriebs- und Organisationsleistungen:

- Organisations-, Team- und Arbeitsbereiche,
- Rollen, Freigaben und Mandantentrennung,
- CMS-, API-, Embed- und QR-Integration,
- Betrieb, Servicelevel, Support und Schulung,
- individuelle Exporte, Aufbereitung und Reporting,
- ausdruecklich beauftragte menschliche Zusatzleistungen.

Ein Preis, Rabatt, Vertrag oder Medienstatus darf niemals Faktenstatus, Prioritaet, Sichtbarkeit,
politische Gewichtung, Review-Ergebnis oder QR-Freigabe kaufen.

## 2. Redaktionen duerfen vom Evidenzstand profitieren

Der journalistische Arbeitsweg kann vor der Veroeffentlichung beginnen:

1. Redaktion reicht Thema, Entwurf, URL oder zentrale Claims ein.
2. eDebatte stellt vorhandene Quellen, Gegenquellen, Widersprueche, Unsicherheiten und offene
   Prueffragen im bestehenden review-first Kern bereit.
3. Redaktion kann den Bericht auf dieser Grundlage ergaenzen oder korrigieren.
4. Der finale eingereichte Revisionsstand wird agent-first und policy-gebunden auf
   QR-/Companion-Eignung geprueft.
5. Freigabe erzeugt keine Aussage, dass eDebatte Meinung, Schlussfolgerung oder politische
   Bewertung des Mediums teilt.

Oeffentliche Evidenz bleibt auch ohne Medienvertrag zugaenglich. Ein Medienvertrag darf keinen
exklusiven Zugriff auf oeffentliche Erkenntnisse erzeugen. Nichtoeffentliche, sensible,
personenbezogene oder unter Embargo stehende Informationen bleiben rollen-, zweck- und
einwilligungsgebunden.

## 3. QR-/Companion-Freigabe

Freigabemassstab ist Evidenz-, Transparenz- und Methodenkompatibilitaet, nicht Meinungsgleichheit.

Eine Freigabe verlangt mindestens:

- der gepruefte Artikel-/Beitragsstand ist revisionsgebunden,
- zentrale ueberpruefbare Behauptungen sind im Pruefscope erfasst,
- Quellenherkunft und wesentliche Unsicherheiten bleiben sichtbar,
- relevante Gegenquellen oder Widersprueche werden nicht manipulativ verschwiegen,
- Nachricht, Meinung, Prognose und offene Behauptung sind unterscheidbar,
- wesentliche Abweichungen zum aktuellen Evidenzstand werden transparent ausgewiesen,
- Korrektur, Ablauf, erneute Pruefung und Widerruf sind moeglich und auditiert,
- Agent-Review, Policy-Version, verwendete Evidenz, Konfidenz, Risikoklasse und Begruendung sind
  dokumentiert und auditierbar.

Eine abweichende Meinung oder politische Schlussfolgerung ist kein Ablehnungsgrund. Eine zentral
belegbar falsche, erheblich irrefuehrende, manipulativ verkuerzte oder propagandistische
Darstellung kann nicht mit einem aktiven eDebatte-QR-/Companion-Status verbunden werden.

### 3.1 Agent-first Review und Human-on-exception

`Review-first` bedeutet fuer diesen Pfad nicht menschliche Vollpruefung jedes Vorgangs, sondern:

1. Ein spezialisierter Review-Agent prueft den eingereichten Revisionsstand gegen eine
   versionierte Policy und den nachvollziehbaren Evidenzstand.
2. Bei hoher Konfidenz, beherrschbarem Risiko und keinen materiellen offenen Widerspruechen kann
   der Agent `eligible` vergeben.
3. Bei behebbaren Maengeln erzeugt der Agent wenige konkrete, begruendete Rueckfragen oder eine
   Korrekturanforderung an Redaktion, Verfasser oder Kunde.
4. Die Antwort oder neue Revision wird erneut agentisch geprueft.
5. Nur verbleibende materielle Unsicherheit, hohe Wirkung, sensible Quellen, Policy-Konflikt,
   Einspruch oder wiederholte Unklarheit fuehren in den Human Loop.

Der Human Loop erhaelt keinen ungefilterten Rohfall, sondern den Agent-Pruefbericht mit Claims,
Quellen/Gegenquellen, offenen Widerspruechen, Risikoklasse, Konfidenz, bisheriger Rueckfrage und
Antwort. Menschen behalten Verantwortung fuer Governance, Policy, Einsprueche und folgenreiche
Ausnahmen; sie muessen nicht jeden Standardfall manuell sichten.

Der Agent entscheidet keine absolute Wahrheit. Er bewertet ausschliesslich die dokumentierte
QR-/Companion-Eignung gegen die geltende Policy. Entscheidungen muessen erklaerbar,
widerrufbar, erneut pruefbar und auditierbar bleiben.

Der QR-/Companion-Hinweis darf nicht `eDebatte bestaetigt diesen Artikel` behaupten. Die
vorgesehene Bedeutung lautet sinngemaess:

> Evidenz- und Debattenraum zu diesem Beitrag – von eDebatte geprueft angebunden.

## 4. Statusmodell

Der spaetere Admin-Workflow verwendet mindestens:

- `submitted`
- `agent_review`
- `author_clarification`
- `changes_requested`
- `human_loop`
- `eligible`
- `qr_active`
- `re_review_required`
- `revoked`
- `rejected`

`eligible` und `qr_active` sind getrennte Zustaende. Ein positives Agent-Review darf die
Eligibility setzen, aktiviert aber nicht automatisch die externe Veroeffentlichung des
Medienbeitrags. Die QR-Aktivierung erfolgt als eigener policy- und auditgebundener Schritt.
Inhaltliche Revision, relevante neue Evidenz, abgelaufene Freigabe oder wesentliche
Quellenkorrektur fuehren mindestens zu `re_review_required`.

## 5. Community- und Hinweisgeberwissen

Community-Beitraege, Betroffenen-/Zeugenberichte und Hinweise koennen Pruefpfade anstossen und den
Evidenzstand erweitern. Sie erzeugen fuer sich allein keinen Fakten-, Finding-, Dossier-,
Publikations- oder QR-Freigabestatus.

- Ein Hinweis ist ein Pruefauftrag, noch kein Fakt.
- Anonyme Hinweise sind nie alleinige Veroeffentlichungsgrundlage.
- Identitaet und Inhalt werden soweit erforderlich getrennt verarbeitet.
- Sensible Unterlagen gelangen nicht ungeprueft in Medien- oder Public-Surfaces.
- eDebatte verspricht keinen rechtlichen Whistleblower-Schutz ohne dafuer geprueften Kanal,
  Prozess und fachliche Rechtsgrundlage.

## 6. Festes Schema fuer individuelle institutionelle Preise

Jedes individuelle Angebot wird aus denselben dokumentierten Achsen gebildet:

`Basispaket + Organisationsumfang + Integrationen + Betrieb/SLA + menschliche Zusatzleistungen - zulässiger Rabatt`

Verpflichtende Angebotsfelder:

- Segment und Basispaket,
- Vertrags- und Abrechnungszeitraum,
- Organisationen, Teams, Rollen und Arbeitsbereiche,
- Integrationsumfang,
- Betriebs-/SLA-Stufe,
- menschliche Zusatzleistungen,
- einmalige Einfuehrungsleistung,
- Rabattart, Betrag/Prozent, Begruendung und Gueltigkeit,
- Preis vor/nach Rabatt, Steuerstatus und Waehrung,
- verantwortliche Freigabe und Auditspur.

Rabatte bleiben auf hoechstens 30 Prozent begrenzt, component-scoped und zeitlich befristet.
Eine hohe Rabattstufe benoetigt Approval und Audit. Unzulaessige Preisachsen sind insbesondere:

- Anzahl oder Ergebnis von Faktenchecks,
- Wahrheit, Fakten-, Finding- oder Evidenzstatus,
- politische Meinung oder Uebereinstimmung mit eDebatte,
- gewuenschtes Review-/QR-Ergebnis,
- Abstimmungs-, Ranking- oder Debattenausgang,
- Community-Signalhoehe oder Hinweisgebermaterial.

## 7. Implementierungsgrenzen

Diese Entscheidung aktiviert keine Runtime, keinen Provider, keinen Checkout und keinen
oeffentlichen QR-Pfad. Die Admin-Preisoberflaeche kann nach eigenem positiven Preflight auf dem
bestehenden Pricing-Control-Contract erweitert werden. Der agent-first Media-Review- und
Public-QR-Pfad bleibt an die kanonische Review-Queue, Confidence-/Risk-Policy sowie den
vorhandenen Public-QR-Guard-Owner `G4` gebunden.
