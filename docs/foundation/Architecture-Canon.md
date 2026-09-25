# eDebatte Architecture Canon

Status: **kanonisch**  
Geltungsbereich: Produktarchitektur, Plattformarchitektur, Datenflüsse, KI, Kommunikation, Betrieb und Agenten

## Zweck

Dieser Canon übersetzt Constitution und Vision in verbindliche Architekturprinzipien. Er ersetzt keine bestehenden technischen Verträge, sondern ordnet sie ein und verhindert parallele, widersprüchliche Systempfade.

## Architekturauftrag

Die Architektur von eDebatte muss gleichzeitig:

- Vertrauen und Nachvollziehbarkeit stärken,
- mehrsprachige und barrierearme Beteiligung ermöglichen,
- menschliche Verantwortung sichtbar halten,
- Evidenz, Quellen und Unsicherheit bewahren,
- einen sicheren und wirtschaftlichen Betrieb ermöglichen,
- und langfristig erweiterbar sowie interoperabel bleiben.

## Primärer Produktbezug und Bürgerkern

Der primäre Adressat der öffentlichen eDebatte-/VoiceOpenGov-Produkterscheinung ist der einzelne Bürger beziehungsweise die einzelne Bürgerin mit einem konkreten Anliegen, einer Frage, einer Beobachtung, einer Position, einem Vorschlag oder einer Quelle. Organisationen, Verbände, Parteien, Verwaltungen, Kommunen, Medien, Initiativen und weitere institutionelle Akteure bleiben wichtige Nutzer, Auswerter, Empfänger und Spezialpfade derselben Plattform. Sie bilden jedoch keinen konkurrierenden primären Produktkern.

Der bürgerseitige Wirkpfad lautet:

```text
Anliegen
→ Region / Zuständigkeit
→ Strukturierung / Qualifizierung
→ gemeinsames Lagebild
→ Debatte / Priorisierung / Evidenz
→ Mandat / Handlung
→ Umsetzung / Impact
```

Dieser Wirkpfad ersetzt nicht den bestehenden fachlichen Kernfluss `Signal → Anlassraum → Dossier → Runde → Mandat → Umsetzung → Impact`, sondern ist dessen bürgerverständliche Projektion:

- ein Anliegen kann ein direktes Signal oder einen reviewpflichtigen Signalkandidaten erzeugen;
- Region und Zuständigkeit werden über bestehende Place-, Registry- und Jurisdiction-Verträge aufgelöst;
- Strukturierung und Qualifizierung nutzen den vorhandenen Intake-/Create-Pfad;
- Anlassraum und Dossier bilden gemeinsam Kontext und nachvollziehbares Lagebild;
- Dossier, Runde und Beteiligung tragen Evidenz, Debatte und Priorisierung;
- Mandat, Umsetzung und Impact bleiben die nachgelagerten Wirkungsschichten.

Keine dieser Zuordnungen erlaubt eine automatische Veröffentlichung, Zusammenführung, Dossier-/Rundenerzeugung oder Mandatsbehauptung. Mehrdeutigkeit, geringe Konfidenz und hohe Wirkung führen weiterhin zu Review oder menschlicher Entscheidung.

## Die fünf Plattformebenen

### 1. Core Platform

Die Core Platform trägt Identität, Rollen, Organisationen, Inhalte, Beteiligung, Dossiers, Abstimmungen, Berechtigungen und kanonische Datenmodelle.

Sie bleibt die fachliche Quelle der Wahrheit. KI-Ausgaben, Kommunikationskanäle und Agenten dürfen keine davon losgelöste Schattenwahrheit etablieren.

### 2. Voxy Intelligence

Voxy unterstützt Recherche, Strukturierung, Übersetzung, Einordnung, Zusammenfassung und Vorbereitung. Ergebnisse müssen Quellenbezug, Unsicherheit, Sprache, Modell- oder Prozesskontext und verantwortliche Freigabe nachvollziehbar machen.

Voxy darf keine autonome Wahrheitsinstanz werden.

Für öffentliche und dialogische Nutzerinteraktion gilt **Voxy-First**: Voxy ist die primäre sichtbare KI-Schnittstelle, versteht die Nutzerabsicht, hält den erlaubten Kontext, erklärt Ergebnisse und Quellen verständlich und stellt nur Fragen, deren Antwort den nächsten fachlichen Schritt tatsächlich verändert. Spezialisierte Agenten werden intern delegiert und bleiben im Normalfall verborgen. Ausgenommen sind ausdrücklich vorgesehene Admin-, Operator-, Debug-, Governance- und Mission-Control-Flächen.

Voxy-First bedeutet keine eigene Voxy-Daten-, Fakten-, Graph- oder Governance-Wahrheit. Voxy projiziert die kanonische Core-, Knowledge-, Evidence- und Runtime-Wahrheit und legt relevante Unsicherheit sowie menschliche Entscheidungsgrenzen offen.

### 3. Unified Communication Platform

Kommunikation beginnt mit einem fachlichen Ereignis und nicht mit einem Kanaltemplate.

Kanonischer Fluss:

```text
Business Event
→ Policy und Entscheidung
→ Zielgruppe und Präferenzen
→ Aufbereitung und optionale KI-Unterstützung
→ Übersetzung
→ Rendering
→ E-Mail / Push / In-App / Voice / PDF / API
→ Zustellung, Nachweis und Audit
```

Ein Ereignis soll kanalunabhängig modelliert werden. E-Mail, Push, In-App, Voice und weitere Ausgaben sind Renderer derselben fachlichen Kommunikation, keine getrennten Wahrheiten.

### 4. Autonomous Operations Platform

Betrieb, Qualität, Sicherheit, Support, Community, Marketing, Finanzen und weitere Organisationsbereiche werden nach dem Prinzip **Automation by Design** gestaltet.

Jede betriebliche Fähigkeit beantwortet:

- Wie wird sie überwacht?
- Wie werden Fehler erkannt?
- Wie wird sie wiederhergestellt?
- Wie wird ihr Verhalten erklärt?
- Wann wird ein Mensch einbezogen?
- Wie wird aus Ergebnissen gelernt?

### 5. Agent Platform

Agenten arbeiten innerhalb klarer Rollen, Policies und Berechtigungen.

Die Agent Fleet bleibt fachlich spezialisiert. Engineering, Architecture, Review, QA, SRE, Security, Research, Source Discovery, Evidence, Fact Checking, Dossier/Synthesis, Legal/Compliance, Moderation, Growth/Marketing, Membership/Community und Funding dürfen als getrennte Rollen oder Capability-Gruppen geführt werden. Spezialisierung ist eine interne Verantwortungs- und Qualitätsgrenze, keine Auswahlpflicht für normale Nutzer.

Kanonischer Fluss:

```text
Agent
→ Evidenz und Vorschlag
→ Policy- und Risikoprüfung
→ Freigabe oder erlaubte Ausführung
→ Audit
→ Ergebnis und Lernen
```

Agenten dürfen keine nicht dokumentierten Governance-, Produkt-, Preis-, Rollen- oder Veröffentlichungsentscheidungen treffen.

Alpha2 ist der organisationsweite Control- und Orchestration-Layer der Agent Platform. Bis zur belegten Produktionsreife arbeitet Alpha2 im Build-/Completion-Modus auf der kanonischen OpenTasks-SSOT. Erst nach dem dafür definierten End-to-End-, Recovery- und Human-Gate-Nachweis darf Alpha2 als autonomer Regelbetrieb bezeichnet oder aktiviert werden. Der konkretisierende Vertrag liegt in `docs/foundation/ALPHA_FOXTROTT_2_AGENTIC_ORG_RUNTIME.md`.

## Die acht Domänen

Die Plattform wird entlang folgender fachlicher Domänen weiterentwickelt:

1. **Identity** – Menschen, Konten, Einwilligungen, Rollen und Berechtigungen.
2. **Community** – Beziehungen, Räume, Moderation und gemeinsame Verantwortung.
3. **Knowledge** – Quellen, Evidenzen, Claims, Widersprüche, Unsicherheit und Dossiers.
4. **Participation** – Beiträge, Positionen, Bewertungen, Abstimmungen und Lösungswege.
5. **Intelligence** – Voxy, Modelle, Retrieval, Übersetzung und Entscheidungsunterstützung.
6. **Communication** – Ereignisse, Präferenzen, Kanäle, Rendering und Zustellung.
7. **Operations** – Monitoring, Support, Sicherheit, Qualität, Kosten und Wiederherstellung.
8. **Governance** – Regeln, Policies, Freigaben, Audits und menschliche Zuständigkeit.

Domänengrenzen sollen Verantwortung klären, aber keinen unnötigen technischen Monolithenbruch erzwingen.

## Zehn verbindliche Architekturprinzipien

### 1. Human Leadership

Menschen besitzen Verantwortung. KI und Agenten besitzen vorbereitende oder ausdrücklich delegierte Fähigkeiten.

### 2. Evidence First

Quellen, Belege, Unsicherheiten und Herkunftsinformationen müssen durch relevante Systemflüsse erhalten bleiben.

### 3. Community First

Architekturentscheidungen sollen Zusammenarbeit, Beteiligung und faire Zugänglichkeit stärken, nicht nur technische Effizienz.

### 4. AI Native, nicht AI Sovereign

KI wird als grundlegende Fähigkeit berücksichtigt, aber nie als souveräne Entscheidungsinstanz behandelt.

### 5. Language Independent

Originalsprache, Lesesprache, Bedienungssprache und Ausgabesprache werden getrennt modelliert. Deutsch oder Englisch dürfen keine unsichtbare Systemvoraussetzung sein.

### 6. Event Driven

Relevante fachliche Änderungen erzeugen klar definierte Ereignisse. Kommunikation, Automatisierung und Agenten reagieren auf fachliche Wahrheit, nicht auf fragile Oberflächenzustände.

### 7. Automation by Design

Neue Fähigkeiten berücksichtigen Monitoring, Eskalation, Wiederherstellung, Erklärbarkeit und menschliche Übergabe von Anfang an.

### 8. Trust by Design

Datenschutz, Sicherheit, Auditierbarkeit, Einwilligung und Erklärbarkeit sind Teil der Architektur, keine nachgelagerte Prüfung.

### 9. Operational Leverage

Optimiert wird nicht der maximale Automatisierungsgrad, sondern das Verhältnis aus Wirkung, Qualität, Vertrauen, Kosten und menschlichem Aufwand.

### 10. Continuous Evolution

Architektur darf sich weiterentwickeln. Migrationen müssen explizit, reversibel und dokumentiert sein. Bestehende Kanons werden erweitert statt durch parallele Wahrheiten umgangen.

## Confidence Driven Automation

Automatisierung wird anhand von Risiko, Wirkung und Konfidenz gesteuert.

- **Hohe Konfidenz, geringe Wirkung:** automatische Ausführung kann erlaubt werden.
- **Mittlere Konfidenz oder mittlere Wirkung:** Empfehlung oder Freigabe-Workflow.
- **Niedrige Konfidenz oder hohe Wirkung:** menschliche Entscheidung ist erforderlich.

Schwellenwerte werden je Domäne dokumentiert. Ein globaler Konfidenzwert ohne Risikokontext ist unzulässig.

## Progressive Automation

Fähigkeiten reifen schrittweise:

0. **Manuell** – Menschen führen vollständig aus.
1. **Assistiert** – das System bereitet Informationen oder Vorschläge vor.
2. **Freigabepflichtig** – das System plant, ein Mensch genehmigt.
3. **Automatisch** – das System führt innerhalb einer dokumentierten Policy aus.
4. **Selbstoptimierend** – das System verbessert kontrolliert Parameter, nicht die grundlegende Governance.

Eine höhere Stufe erfordert belastbare Evidenz aus der vorherigen Stufe.

## Eine Quelle der Wahrheit

Fachliche Wahrheit liegt in kanonischen Domänenmodellen und dokumentierten Contracts.

Nicht zulässig sind:

- getrennte Wahrheiten für Web, E-Mail, Voice oder Agenten,
- kopierte Regeln ohne verantwortlichen Ursprung,
- nicht auditierbare KI-Zwischenergebnisse als dauerhafte Fachwahrheit,
- und neue parallele Routen, wenn ein kanonischer Pfad existiert.

## Erklärbarkeit

Jede folgenreiche automatisierte oder KI-unterstützte Entscheidung soll beantworten können:

- Warum wurde dieses Ergebnis erzeugt?
- Welche Policy galt?
- Welche Evidenz wurde verwendet?
- Welche Unsicherheit bestand?
- Welche Alternativen gab es?
- Wer oder was führte aus?
- Wie kann das Ergebnis angefochten oder korrigiert werden?

## Selbstüberwachung und Wiederherstellung

Kritische Flüsse benötigen:

- definierte Zustände und Fehlerklassen,
- technische und fachliche Signale,
- verantwortliche Eskalation,
- sichere Wiederholung oder Kompensation,
- und eine nachvollziehbare Ereignis- und Auditspur.

„Self Healing“ darf keine stille Datenveränderung ohne Nachweis bedeuten.

## Wirtschaftliche Intelligenz

Architekturentscheidungen berücksichtigen:

- Infrastruktur- und Modellkosten,
- externe APIs,
- Token- und Speicherkosten,
- menschlichen Prüfaufwand,
- erwartete Wirkung,
- und Abhängigkeiten von einzelnen Anbietern.

Kostenoptimierung darf Vertrauen, Sicherheit, Quellenqualität oder menschliche Rechte nicht unterlaufen.

## Experience Layer

Web, Mobile, Voice, API, Video, TV und assistive Technologien sind Zugänge zur selben fachlichen Plattform. Unterschiede in Darstellung und Interaktion sind erlaubt; fachliche Bedeutung, Rechte, Quellenbezug und Governance bleiben konsistent.

## Veröffentlichung

Es gilt **kein Auto-Publish** als allgemeiner Standard.

Erlaubt sind insbesondere:

- automatische Entwürfe,
- Enrichment,
- Format- und Zeitvorschläge,
- Publish-ready-Vorbereitung,
- und One-click-Review.

Eine automatische Veröffentlichung erfordert eine eigene, ausdrücklich beschlossene Policy mit Scope, Risiko, Widerruf, Monitoring und Audit.

## Architekturentscheidung

Eine neue Architekturentscheidung soll mindestens zwei Dimensionen verbessern:

- Vertrauen,
- Gemeinschaft,
- Nachhaltigkeit.

Sie muss außerdem prüfen, ob eine bestehende Fähigkeit erweitert werden kann, bevor ein neuer Pfad entsteht.

## Verhältnis zu bestehenden Dokumenten

Dieser Canon wird konkretisiert durch ADRs, Contracts, Run Packs und `docs/E150/OpenTasks.md`. Bei Konflikten gilt die Dokumenthierarchie aus `Constitution.md`. Tatsächliche Produkt- und Laufzeitwahrheit muss dokumentiert werden und darf nicht durch visionäre Formulierungen ersetzt werden.
