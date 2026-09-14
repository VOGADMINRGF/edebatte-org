# eDebatte Commerce und Pricing – Produktentscheidung (2026-09-14)

Status: **verbindlicher Produkt- und Governance-Contract**

## Endkundenpreise

| Plan | Preis | Produktnutzen |
| --- | ---: | --- |
| Free | 0 € | offener Einstieg und direkte Beteiligung; Anmeldung erst dort, wo Speicherung, Personalisierung oder Missbrauchsschutz sie erfordern |
| Plus | 7,99 €/Monat | persönlicher Verlauf, eigene Beiträge/Abstimmungen/Perspektiven, Themen-Follows, Merkliste, erweiterte Swipe-Filter, Benachrichtigungen und geräteübergreifende Synchronisierung |
| Pro | 19,99 €/Monat | Plus sowie Monitoring, Änderungen im Debattenstand, Vergleiche, Briefings, Quellen-/Widerspruchsmonitoring, Arbeitsordner, Dossiers, Exporte und ein höheres, weiterhin begrenztes KI-Budget |

Sichtbare Beitrags-, Anlassraum- oder Recherchequoten sind keine primäre Planlogik. Technische
Kosten- und Missbrauchsgrenzen bleiben intern, fair, erklärbar und für alle Pläne wirksam.
Faktencheck, Quellenprüfung, Community-Wissen und normale Recherche werden nicht als einzelne
Wahrheitsprodukte verkauft.

## VoiceOpenGov-Handoff

Aktive laufende VoiceOpenGov-Unterstützung ab 4,99 €/Monat kann eDebatte Plus bereitstellen;
aktive laufende VoiceOpenGov-Förderung ab 15 €/Monat kann eDebatte Pro bereitstellen. Die
Freischaltung erfolgt über einen minimalen, widerrufbaren und auditierten Entitlement-Vertrag,
nicht über eine direkte Kopplung oder Zusammenlegung der MongoDB-Datenbanken. Nutzeridentität,
Einwilligung und Kontoverknüpfung bleiben explizit. Eine VOG-Mitgliedschaft allein erzeugt kein
bezahltes eDebatte-Entitlement.

## Merchandise und Shops

eDebatte erhält einen eigenständigen Shop mit zugänglichem, alltagstauglichem und community-nahem
Merchandise. VoiceOpenGov erhält einen getrennten, hochwertigeren und repräsentativeren Shop.
Katalog, Bestellung, Steuern, Versand, Retouren, Rechtstexte und Merchant-/Stripe-Zuordnung bleiben
pro Marke getrennt. Gemeinsame technische Bausteine dürfen wiederverwendet werden, aber es gibt
keinen gemeinsamen Warenkorb und keine stille Kundendatenübernahme.

Der erste technische Shop-Schnitt ist provider-neutral und fail-closed: nur konfigurierte Produkte
sind kaufbar; Checkout, Webhooks und Fulfilment werden erst aktiv, wenn Merchant, Produkt-/Preis-IDs,
Versand-/Steuerregeln, Retourenprozess und Rechtstexte für die jeweilige Marke vorliegen.

## Harte Grenzen

- Geld, Plan oder Merchandise kaufen weder politische Stimme noch Moderations-, Review-, Fakten-,
  Ranking-, QR- oder redaktionelle Rechte.
- Empfehlungen und Filter bleiben erklärbar und dürfen keine politische Mikroprofilierung erzeugen.
- eDebatte- und VoiceOpenGov-Konten/Datenbestände werden nicht zu einer gemeinsamen MongoDB
  verschmolzen.
- Stripe verarbeitet Zahlungen; Kartendaten werden nicht selbst gespeichert.
- Webhooks sind signaturgeprüft und idempotent; Entitlements folgen dem bestätigten Zahlungsstatus.
