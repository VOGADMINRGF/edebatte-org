# SOURCE INTELLIGENCE GREEN CONTRACT

Stand: 2026-09-17
Status: proposed acceptance contract
Scope: RSS / Atom / API / Open Data / official web sources / documents -> Themenradar -> Review -> Dossier

## Mission

eDebatte betreibt genau eine kanonische Source-Intelligence-Schicht. Sie erkennt relevante externe Veraenderungen, bewahrt deren Provenienz und Evidenz dauerhaft, normalisiert sie und uebergibt sie review-first an den bestehenden Themenradar- und Dossier-Pfad.

Der Track ist abgeschlossen, sobald die unten definierten Referenzklassen und E2E-Acceptance-Gates nachweislich funktionieren. Danach sind neue Provider und Quellen Coverage-Erweiterungen, keine neue Source-Architektur.

## Non-negotiable invariants

- ZERO PARALLEL TRUTH.
- FAIL CLOSED bei fehlender erforderlicher Provenienz, Identitaet oder Evidence.
- REVIEW FIRST. NO AUTO-PUBLISH.
- Keine zweite Feed-, Open-Data-, Themen- oder Dossier-Wahrheit.
- Ein Provider-Adapter darf keine provider-spezifische Schattenpersistenz als fachliche Wahrheit etablieren.
- Jede materielle Aenderung an bereits reviewter Evidence erzeugt eine neue nachvollziehbare Revision bzw. einen neuen Evidence-Bezug.
- Politische Eigenaussagen bleiben als Eigenaussagen klassifiziert und werden nicht zu unabhaengiger Faktenbewertung hochgestuft.
- Sprache ist kein Identitaetsschluessel fuer Quelle, Ereignis, Cluster oder Dossier.

## Canonical pipeline

`Source Registry -> Connector -> durable raw snapshot/evidence -> change detection -> normalization -> jurisdiction/region/topic mapping -> dedupe/cluster -> Themenradar candidate/update -> QA/Review -> canonical Dossier handoff`

Alle Eingangsklassen muessen diesen Pfad verwenden:

1. offizielle/strukturierte APIs und Open Data
2. strukturierte Feeds
3. RSS/Atom
4. Sitemaps
5. offizielle Presse-/Aktuelles-Seiten
6. Dokument-/Publikationsarchive
7. manuell eingereichte Quellen

Create-/Citizen-Handoffs duerfen spaeter denselben Themenraum speisen, veraendern in diesem Track aber keine Create-Contracts.

## Source identity and evidence contract

Jede aktive Quelle braucht mindestens:

- stable sourceId und Provider-Identitaet
- canonical resource/endpoint identity
- source type und data class
- jurisdiction / region / organization scope soweit bestimmbar
- retrievedAt und lastSuccessfulSync
- immutable snapshot/hash oder gleichwertige durable Evidence-Referenz
- Content-/Resource-Version soweit vorhanden
- Lizenz und Lizenz-URL soweit vorhanden
- Provider/API-Version soweit vorhanden
- Health-, Error-, Retry- und Backoff-State
- Pagination/Cursor-State soweit erforderlich
- normalisierte Entity/Event-Identitaet
- Dedupe-/Cluster-Identitaet
- Provenienz bis in Review und Dossier

## Change intelligence

GREEN bedeutet nicht, moeglichst viele Artikel zu sammeln. Das System muss material changes erkennen und klassifizieren koennen, zum Beispiel:

- neues oder geaendertes Gesetz/Verfahren
- neuer Entwurf oder neue Dokumentrevision
- neue Abstimmung bzw. geaenderter parlamentarischer Verfahrensstand
- neue amtliche Statistik oder Revision
- neue Stellungnahme/Position
- neuer kommunaler Beschluss
- neue relevante Evidenz zu einem bestehenden Dossier

Ein Signal wird mindestens einer Aktion zugeordnet:

- observe
- enrich existing dossier
- propose new dossier/topic
- duplicate/cluster candidate
- irrelevant/no-action
- needs human review

Dedupe darf nicht still zusammenfuehren, wenn Identitaet oder materielle Differenz unsicher ist.

## API / Open Data reference connector

Issue #825 definiert `api/open-data` generisch. `abgeordnetenwatch` ist der erste verbindliche Referenzadapter, nicht eine Sonderarchitektur.

Der Referenzfall muss mindestens Poll und Vote als getrennte Datenklassen erhalten und folgenden Pfad reproduzierbar beweisen:

`abgeordnetenwatch API -> durable snapshot -> normalized parliamentary event -> region/topic mapping -> dedupe/cluster -> Themenradar -> Review -> Dossier parliamentary context`

Danach muessen weitere freie/oeffentliche APIs ueber denselben Adaptervertrag anschliessbar sein: Parlamente, Gesetzgebung, Behoerden, Statistik/Open Data, EU und internationale Institutionen.

## Discovery and coverage

Source Registry und Connectoren muessen spaeter skalieren koennen, ohne jede Kommune manuell zu konfigurieren. Source Discovery darf offizielle Quellen finden/vorschlagen und klassifizieren, aber eine neu entdeckte Quelle wird nicht allein aufgrund der Discovery zur vertrauenswuerdigen oder publizierbaren Quelle.

Coverage ist sichtbar nach mindestens:

- jurisdiction/region
- source class
- active/degraded/backoff/error
- freshness
- missing expected source class / source gap

## Admin proof surface

Admin muss den realen Betriebszustand statt Architekturversprechen zeigen:

- aktive Quellen nach Klasse und Region
- letzte erfolgreiche Synchronisation
- Freshness
- neue/materially changed Signale
- Fehler und Backoff
- Dedupe-/Cluster-Vorschlaege
- offene Reviews
- Dossier-Updates
- Regionen/Institutionen mit Source-Gaps
- Connector/API health und Rate-Limit-State

`cron-ready` oder `scheduler-ready` gilt nicht als laufende Automation. GREEN erfordert Runtime-Evidence fuer den tatsaechlich verwendeten Scheduler/Trigger.

## GREEN reference coverage

Der Track braucht fuer GREEN keine Vollabdeckung aller deutschen Kommunen oder aller weltweiten Quellen. Er braucht produktive, echte Referenzfaelle fuer die Architekturklassen:

- RSS/Atom
- freie API/Open Data (verbindlich: abgeordnetenwatch)
- offizielle API oder strukturierte offizielle Quelle
- offizielle Website oder Dokumentquelle
- Bund
- Land
- Kommune
- EU oder internationale Institution

Sind diese Klassen E2E bewiesen, wird weitere Provider-/Region-Abdeckung als laufende Connector-/Coverage-Arbeit behandelt.

## Hard E2E acceptance

Mindestens eine reale externe materielle Aenderung muss ohne manuelle Datenuebertragung reproduzierbar durchlaufen:

`external source -> automatic fetch -> durable snapshot -> material change detection -> normalize -> dedupe/cluster -> region/topic mapping -> Themenradar -> Review -> existing/new Dossier -> provenance-visible revision`

Zusaetzliche Acceptance-Gates:

- Retry ist idempotent und erzeugt keine Doppelereignisse.
- 429/5xx/Timeout fuehren zu kontrolliertem Backoff und sichtbarem Health-State.
- Unveraenderter Content erzeugt kein falsches neues Thema.
- Derselbe Sachverhalt aus mehreren Quellen wird als Cluster/Dedupe-Kandidat behandelt, nicht als parallele Themenwahrheit.
- Ein bestehendes Dossier kann durch neue Evidence review-first aktualisiert werden.
- Fehlende erforderliche Provenienz/Evidence blockiert den kanonischen Handoff.
- Kein Test darf Auto-Publish als Erfolgskriterium verwenden.
- Admin zeigt den Lauf und dessen Ergebnis nachvollziehbar.

## Completion rule

SOURCE INTELLIGENCE ist erst GREEN, wenn alle Hard-E2E-Gates mit echter Runtime-/CI-/Preview-Evidence belegt sind.

Danach gilt:

- Source-System-Architektur: DONE
- neue Provider: Connector-Erweiterung
- neue Regionen: Coverage-Erweiterung
- neue Datenklassen: Contract-kompatible Adapter-Erweiterung
- Architektur-Neubau: nur bei nachgewiesenem Contract-Gap

Ein Issue, PR oder Dokument allein darf SOURCE INTELLIGENCE niemals auf GREEN setzen.

## Target operating outcome

Der Zielzustand ist nicht: "eDebatte hat heute 500 Artikel importiert."

Der Zielzustand ist: "eDebatte hat seit dem letzten Lauf die politisch relevanten materiellen Veraenderungen erkannt, bestehenden oder neuen Themen korrekt zugeordnet, Dubletten/Cluster vorgeschlagen, die tragende Evidence und Provenienz bewahrt und alles review-first fuer Dossier-Aktualisierung oder neue Dossiers bereitgestellt."

Das ist die Ziellinie dieses Tracks.