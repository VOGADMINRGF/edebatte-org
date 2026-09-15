# PROFESSIONAL-SERVICES-MONETIZATION-01

Stand: 2026-09-15  
Status: **review**  
Autorisierung: direkte Projektinhaber-Anweisung vom 2026-09-15, die zuvor vorgeschlagenen professionellen eDebatte-Leistungen als Produkte auf der Homepage abzubilden und eine kostenfreie Search-Kampagne aufzubauen.

## Zweck

Dieser Slice ergänzt die bestehende eDebatte-Paketwelt um eine klar abgegrenzte professionelle **Service-/Pilot-Ebene** für Decision Intelligence. Er ersetzt weder die bürgerseitige Freemium-Positionierung noch `/pricing`, `/pricing/institutionen`, `/order` oder bestehende institutionelle Aktivierungsmodelle.

Die neue Ebene ist bewusst **kein automatisierter SaaS-Checkout**. Sie beschreibt beauftragbare, menschlich geprüfte Leistungen, die auf vorhandenen eDebatte-Fähigkeiten zur Strukturierung, Evidenzdarstellung, Dossier-/Themenarbeit und professionellen Begleitung aufbauen.

## Beschlossene Pilotprodukte

| Produkt | Öffentlicher Preis | Abrechnung | Zweck |
| --- | ---: | --- | --- |
| Decision Dossier | 790 € | einmalig | ein komplexes Thema strukturiert als Entscheidungsgrundlage aufbereiten |
| 3-Dossier-Pilot | 1.990 € | einmalig | drei reale Themen und den wiederholbaren Arbeitsprozess mit einem Kunden testen |
| Topic Intelligence | ab 1.490 € | monatlich | ein priorisiertes Thema fortlaufend beobachten und einordnen |
| Topic Intelligence Pro | ab 2.990 € | monatlich | mehrere Themen, vertiefte Auswertung und Team-Workflow |
| Redaktion / Agentur / White Label | ab 4.900 € | monatlich | individuell abgestimmte professionelle Integration |

Enterprise/API bleibt individuell und wird in diesem Slice nicht als automatisiert bestellbares Produkt behauptet.

## Pricing-Grenze

Der Evidenzstandard ist nicht käuflich.

Kundinnen und Kunden bezahlen für:
- Umfang
- Strukturierung und Aufbereitung
- Monitoring
- Reporting / Exporte
- Team-Workflow
- individuelle Begleitung und Delivery

Nicht verkauft werden:
- ein höherer Wahrheitsstatus
- „bessere Fakten“ gegen Aufpreis
- eine gewünschte politische Schlussfolgerung
- politische Bevorzugung

Quellen, Gegenpositionen, Widersprüche und Unsicherheiten bleiben unabhängig vom Preis sichtbar.

## Produktwahrheit

- `checkoutIsAvailable=false` für diese Serviceebene.
- Beauftragung läuft über einen Kontakt-/Gesprächspfad.
- Die Leistung wird als menschlich geprüft beschrieben.
- Es wird keine feste automatische Lieferzeit versprochen.
- Es wird keine autonome KI-Entscheidung oder Wahrheitsprüfung versprochen.
- Die öffentliche Bürgerreise bleibt auf der Homepage vor der professionellen Serviceebene.

Kanonische technische Service-Konfiguration:
- `features/pricing/professionalServices.ts`

## Öffentliche Oberflächen

- Homepage: nachgelagerte professionelle Produktsektion
- `/leistungen`: professioneller Leistungshub
- `/leistungen/decision-dossier`: Intent-Landingpage
- `/leistungen/topic-intelligence`: Intent-Landingpage
- `/leistungen/organisationen`: Intent-Landingpage

Die Seiten werden über den bestehenden Public-Discovery-/Sitemap-Vertrag indexierbar gemacht.

## Search Acquisition

Die Search-Kampagne ist bewusst **zero budget**. Klassische SEA wird nicht als kostenlos umetikettiert. Umsetzung und Keyword-/Content-Backlog:
- `docs/marketing/ZERO_BUDGET_SEARCH_ACQUISITION_2026-09-15.md`

Google Search Console, Bing Webmaster Tools und optional IndexNow nach sauberer Domain-/Key-Einrichtung bleiben Deployment-/Operator-Schritte und sind keine im Code fingierte Erfolgsmeldung.

## Abgrenzung zu bestehendem Pricing

Die vorhandene institutionelle Paketwelt bleibt bestehen. Diese neuen Angebote sind ein vorgeschalteter, verkaufsfähiger Servicepfad für Kunden, die zunächst ein konkretes Thema oder Monitoring beauftragen wollen, ohne bereits eine vollständige eDebatte-Organisationsaktivierung einzuführen.

Eine spätere Zusammenführung mit `/pricing/institutionen`, Checkout, Stripe oder Entitlements benötigt einen separaten Pricing-/Billing-Entscheid und darf nicht still aus diesem Pilotvertrag abgeleitet werden.

## Acceptance

- Produkte auf der Homepage sichtbar, aber nach dem Bürgerkern.
- Preise und Leistungsgrenzen kommen aus einer zentralen Pricing-Domain-Konfiguration.
- Kein automatischer Checkout wird behauptet.
- Eigene SEO-Landingpages haben eindeutige Titles, Descriptions und Canonicals.
- Landingpages sind in der bestehenden Sitemap registriert.
- Search-Kampagne enthält Intent-Cluster, Snippets, Content-Plan, Messgrößen und kostenlose Webmaster-Schritte.
- Contract-Test schützt Preise, Checkout-Grenze und Sitemap-Pfade.

## OpenTasks-Sync

Der Slice wird als `review` dokumentiert. Ein operativer OpenTasks-Kopf-Sync ist vor einem finalen `done` erforderlich; die bestehende C-/G-/T-Autorisierungslogik wird durch diesen separaten, explizit autorisierten Monetarisierungs-Slice nicht verändert.
