# eDebatte Engineering Canon

Status: **kanonisch**  
Geltungsbereich: Entwicklung, Tests, Dokumentation, Betrieb, Sicherheit, KI, Daten und Delivery

## Zweck

Dieser Canon übersetzt Constitution, Vision und Architecture Canon in verbindliche Engineering-Regeln. Er ergänzt `AGENTS.md`, den Codex Run Pack Contract, ADRs und bereichsspezifische Qualitätsverträge.

## Grundsatz

Eine Funktion ist nicht fertig, wenn sie nur lokal sichtbar funktioniert. Sie ist fertig, wenn ihr Verhalten verständlich, getestet, sicher, beobachtbar, betreibbar, lokalisierbar und dokumentiert ist.

## Definition of Done

Je nach Relevanz umfasst „done“ mindestens:

- fachlicher Scope und Verantwortlichkeit sind klar,
- bestehende Architektur wurde wiederverwendet,
- Code und Dokumentation sind synchron,
- relevante Tests sind vorhanden und grün,
- Typecheck, Lint, Build und `git diff --check` sind grün,
- Fehlerzustände und Wiederholungsverhalten sind definiert,
- Monitoring oder nachvollziehbare Signale sind vorhanden,
- Datenschutz und Sicherheit wurden geprüft,
- Rollen und Berechtigungen sind fail-closed,
- Original-, Lese-, Bedien- und Ausgabesprache wurden berücksichtigt,
- Barrierefreiheit und verständliche Texte wurden geprüft,
- KI- und Automatisierungsanteile sind transparent,
- Quellen, Evidenzen und Unsicherheiten bleiben erhalten,
- Kosten und externe Abhängigkeiten sind bekannt,
- Migration, Rollback oder Abschaltung sind möglich,
- und `docs/E150/OpenTasks.md` bildet den aktuellen Stand ab.

Nicht jeder Punkt erfordert für jede Änderung neue Infrastruktur. Jeder relevante Punkt muss jedoch bewusst geprüft werden.

## 1. Menschen und Verantwortung

Jede fachlich oder gesellschaftlich folgenreiche Fähigkeit benötigt eine benannte menschliche Verantwortlichkeit.

KI, Agenten und Automatisierungen dürfen:

- recherchieren,
- strukturieren,
- vergleichen,
- übersetzen,
- zusammenfassen,
- priorisieren,
- und Vorschläge erzeugen.

Sie dürfen keine nicht autorisierten Governance-, Rollen-, Preis-, Veröffentlichungs- oder Moderationsentscheidungen treffen.

## 2. Bestehende Architektur vor neuen Pfaden

Vor der Einführung eines neuen Services, Datenmodells, Endpunkts, Workflows oder UI-Pfads ist zu prüfen:

1. Gibt es bereits eine kanonische Fähigkeit?
2. Kann sie sauber erweitert werden?
3. Entsteht eine zweite Fachwahrheit?
4. Wie wird der alte Pfad migriert oder beendet?

Neue Parallelpfade ohne dokumentierte Migrationsentscheidung sind nicht zulässig.

### Kanonische Domain Ownership

`features/*` besitzt die shared-, Domain- und Business-Contracts sowie die
kanonische Fachwahrheit einer Feature-Domain. `apps/web/src/features/*` besitzt
nur Web-UI, Adapter, Runtime-Bridges und Readmodels. Existiert
`features/<domain>/`, darf unter `apps/web/src/features/<domain>/` kein neuer
kanonischer Domain-Contract, keine doppelte Implementierung und keine zweite
Fachwahrheit entstehen. Neue Web-Dateien in einem solchen Domainpfad werden
explizit als `ui`, `adapter`, `runtime-bridge` oder `readmodel` klassifiziert;
historische Pfadschulden werden separat inventarisiert statt still migriert.

## 3. Dokumentation als Teil der Implementierung

Ändert eine Implementierung Verhalten, Routing, Rollen, Begriffe, Datenwahrheit, Kommunikation oder Architektur, müssen die relevanten Dokumente im selben Slice aktualisiert werden.

Dokumentation darf keine Funktionen als produktiv darstellen, die lediglich geplant, simuliert oder hinter nicht aktivierten Voraussetzungen vorhanden sind.

## 4. Tests nach Risiko

Tests richten sich nach Wirkung und Fehlerfolgen.

Mindestens zu prüfen sind, soweit relevant:

- Happy Path,
- Berechtigungsgrenzen,
- leere und unvollständige Zustände,
- Fehler externer Systeme,
- Wiederholung und Idempotenz,
- Sprach- und Formatvarianten,
- sensible Daten und Redaction,
- Migration und Rückwärtskompatibilität,
- sowie Recovery- und Rollback-Verhalten.

Sicherheits-, Rollen-, Zahlungs-, Veröffentlichungs- und Datenschutzpfade benötigen besonders belastbare negative Tests.

## 5. Fail-closed statt scheinbar erfolgreich

Fehlende Berechtigungen, Konfigurationen, Einwilligungen, Quellen oder Sicherheitsvoraussetzungen führen zu einem sicheren, erklärbaren Zustand.

Ein System darf keinen Erfolg vortäuschen, wenn eine Operation nicht nachweisbar ausgeführt wurde. Demo-, Fallback- und Mock-Daten müssen eindeutig gekennzeichnet und aus produktiven Wahrheiten getrennt sein.

## 6. Evidenz und Provenienz

Bei relevanten Inhalten und KI-Ausgaben werden – soweit technisch und rechtlich möglich – Herkunft, Zeitpunkt, Quelle, Verarbeitungsschritte, Sprache und Unsicherheit erhalten.

Zusammenfassungen dürfen den Quellenbezug nicht stillschweigend verlieren. Übersetzungen dürfen eine Aussage nicht sicherer oder eindeutiger erscheinen lassen als das Original.

### Geschützte Dokumente und vollständige Evidenz

Für `*_PREFLIGHT_*.md`, `*_AUDIT_*.md`, `*_CLOSURE_*.md`, kanonische Runbooks,
Architektur-/Security-Evidenz und Dokumente des Foundation-Canons gilt:
Bestehende Evidenz darf korrigiert, erweitert oder durch eine klar referenzierte
Ersatzquelle superseded werden, aber nicht still durch eine kürzere
Zusammenfassung ersetzt werden. **SUMMARY != REPLACEMENT.** Die Entfernung
erforderlicher Abschnitte braucht explizit `DOCUMENT_REWRITE_AUTHORIZED=true`,
eine belastbare Begründung und eine Replacement-/Supersession-Referenz. Die CI
prüft bei geänderten geschützten Dokumenten gegen den Merge-Base die erhaltene
Abschnittsstruktur; sie ersetzt keine fachliche Review der Evidenz.

## 7. Mehrsprachigkeit als Systemvertrag

Die Plattform darf keine einzelne Sprache als unsichtbare fachliche Wahrheit voraussetzen.

Engineering unterscheidet:

- Originalsprache,
- Lesesprache,
- Bedienungssprache,
- Ausgabesprache.

Texte werden lokalisierbar modelliert. Datums-, Zahlen-, Währungs-, Plural- und Anredeformen folgen dem jeweiligen Locale. Quellen und Originalformulierungen bleiben aufrufbar, sofern Rechte und Sicherheit dies erlauben.

## 8. Barrierefreiheit und verständliche Interaktion

Tastaturbedienung, semantische Struktur, Screenreader-Verständlichkeit, Fokusführung, Kontrast, Fehlermeldungen und verständliche Sprache werden im normalen Delivery-Prozess berücksichtigt.

KI darf Barrieren reduzieren, aber keine unüberprüfbare oder bevormundende Vereinfachung erzeugen.

## 9. Datenschutz und Datensparsamkeit

Vor jeder neuen Datenerhebung werden Zweck, Rechtsgrundlage oder Einwilligung, Aufbewahrung, Zugriff, Widerruf und Löschung geklärt.

Es gilt:

- nur erforderliche Daten erheben,
- sensible Daten besonders schützen,
- Zugriff minimal vergeben,
- Logs und Telemetrie redigieren,
- Testdaten von realen Personendaten trennen,
- und Löschung technisch durchsetzbar gestalten.

Platzhalter dürfen keine unkontrollierten Nachrichten an fremde oder nicht verwaltete Domains auslösen.

## 10. Sicherheit als kontinuierliche Aufgabe

Sicherheit umfasst mindestens:

- Authentifizierung und Autorisierung,
- Mandanten- und Rollenabgrenzung,
- Secret- und Konfigurationsschutz,
- Eingabevalidierung,
- Missbrauchs- und Rate-Limit-Schutz,
- Abhängigkeiten und Supply Chain,
- Auditierbarkeit,
- sowie sichere Fehlerausgaben.

Kritische Sicherheitsannahmen werden dokumentiert und getestet.

## 11. Beobachtbarkeit und Betrieb

Kritische fachliche Flüsse benötigen mehr als technische Uptime.

Beobachtbarkeit soll erkennen lassen:

- ob der fachliche Vorgang erfolgreich war,
- wo er abgebrochen ist,
- welche Nutzer oder Organisationen betroffen sind,
- ob Wiederholung sicher ist,
- welche Eskalation erforderlich ist,
- und ob Daten korrigiert oder kompensiert werden müssen.

Logs, Metriken, Events und Audits werden so gestaltet, dass sie hilfreich sind, ohne unnötig personenbezogene Daten offenzulegen.

## 12. Automatisierung nach Reifegrad

Automatisierungen beginnen assistiert und wachsen nur mit Evidenz.

- **Stufe 0 – manuell**
- **Stufe 1 – Empfehlung**
- **Stufe 2 – menschliche Freigabe**
- **Stufe 3 – automatische Ausführung innerhalb einer Policy**
- **Stufe 4 – kontrollierte Optimierung innerhalb fester Governance**

Jeder Übergang benötigt definierte Qualitäts-, Risiko- und Rückfallkriterien.

## 13. Confidence und Risiko

Konfidenzwerte werden nicht isoliert verwendet. Entscheidend sind gemeinsam:

- Verlässlichkeit der Evidenz,
- mögliche Wirkung,
- Reversibilität,
- Sensibilität des Kontexts,
- und Qualität der menschlichen Kontrollmöglichkeit.

Bei niedriger Konfidenz oder hoher Wirkung wird nicht automatisch ausgeführt.

## 14. Veröffentlichung und Außenwirkung

Es gilt kein allgemeines Auto-Publish.

Automatisch erlaubt sein können:

- Entwürfe,
- Recherche- und Enrichment-Vorschläge,
- Übersetzungsentwürfe,
- Formatempfehlungen,
- Termin- und Kanalvorschläge,
- sowie Publish-ready-Vorbereitung.

Eine automatische externe Veröffentlichung benötigt eine ausdrücklich beschlossene, eng begrenzte und auditierbare Policy.

## 15. Kosten und Abhängigkeiten

Neue Funktionen berücksichtigen laufende Kosten, Skalierung, Modell- und API-Verbrauch, menschliche Prüfzeit und Vendor Lock-in.

Eine technisch elegante Lösung ist nicht gut, wenn sie dauerhaft unwirtschaftlich, unkontrollierbar oder nicht ersetzbar ist.

## 16. Reversibilität und Migration

Relevante Änderungen benötigen einen realistischen Weg für:

- kontrollierten Rollout,
- Feature- oder Policy-Abschaltung,
- Datenmigration,
- Rückwärtskompatibilität,
- Rollback oder Kompensation,
- und nachvollziehbare Bereinigung alter Pfade.

„Self Healing“ darf keine unsichtbare Korrektur ohne Auditspur bedeuten.

## 17. Kleine, überprüfbare Slices

Arbeit wird in kohärenten PR-Slices umgesetzt. Jeder Slice besitzt:

- einen klaren Auftrag,
- eine begrenzte Dateifläche,
- dokumentierte Abhängigkeiten,
- prüfbare Akzeptanzkriterien,
- Evidence über Tests und Checks,
- sowie einen aktualisierten Backlogstatus.

Ungeplante Nachbarprobleme werden nicht still absorbiert, sondern als eigene Folgearbeit sichtbar gemacht.

## 18. Qualitätsmetriken

Neben klassischen technischen Kennzahlen werden – soweit sinnvoll – beobachtet:

- Automation Coverage,
- Human Touch Rate,
- Self-Healing- und Recovery-Rate,
- Trust- und Erklärbarkeitsindikatoren,
- Knowledge Reuse,
- Community Contribution,
- Kosten pro erfolgreichem Vorgang,
- und organisatorische Hebelwirkung.

Metriken dürfen nicht zu Anreizen führen, die Vertrauen, Qualität oder menschliche Würde unterlaufen.

## Engineering-Leitfragen

Vor Abschluss eines Slices fragen wir:

1. Welche fachliche Wahrheit wurde verändert?
2. Wer trägt Verantwortung?
3. Welche Evidenz und Unsicherheit müssen erhalten bleiben?
4. Was geschieht bei Fehlern?
5. Wie wird der Zustand beobachtet und erklärt?
6. Welche Daten, Rechte und Einwilligungen sind betroffen?
7. Funktioniert der Pfad sprachunabhängig und barrierearm?
8. Gibt es eine sichere Rückkehr?
9. Sind Kosten und Abhängigkeiten vertretbar?
10. Sind Code, Tests, Dokumentation und OpenTasks synchron?

## Leitsatz

> **Wir liefern nicht nur Funktionen. Wir liefern nachvollziehbare, sichere und betreibbare Verantwortung.**
