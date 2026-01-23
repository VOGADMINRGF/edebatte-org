# Schema für initialStatements.json

## Felder und Erläuterung

- **id** (String): Eindeutige ID des Statements (z. B. MongoDB ObjectId oder fortlaufend als String)
- **statement** (String, Pflicht): Hauptfrage oder These (max. 280 Zeichen)
- **category** (String, Pflicht): Übergeordnete Kategorie (z. B. "Innenpolitik", "Digitales")
- **cluster** (String): Subthema/Fokus (z. B. "Wahlbeteiligung")
- **regionScope** (Array, Enum, mind. 1): Regionale Gültigkeit [ "lokal", "regional", "national", "eu", "g7", "g20", "un", "global" ]
- **societalFields** (Array, String): Gesellschaftliche Felder (z. B. ["Demokratie", "Teilhabe"])
- **focusTags** (Array, String): Tags für Suche/Filter/Cluster
- **languageOrigin** (String, Pflicht): Ursprungssprache (z. B. "de")
- **translations** (Array, String): Vorhandene Übersetzungen als ISO-Code (z. B. ["en", "fr"])
- **emotionalTone** (Array, String): Erhobene Grundemotion(en) (z. B. ["engagiert", "besorgt"])
- **expectedActionType** (String): Erwartete Folge (z. B. "Gesetzesänderung", "Pilotprojekt")
- **impactLevel** (Enum, Pflicht): ["hoch", "mittel", "niedrig"]
- **relevancePeriod** (Objekt, optional): Zeitliche Einordnung `{ start: "yyyy-mm-dd", end: "yyyy-mm-dd" }`
- **impactSocietyYes/No** (String): Wirkung auf Gesellschaft bei Ja/Nein
- **impactEconomyYes/No** (String): Wirkung auf Wirtschaft bei Ja/Nein
- **altUserQuestion** (String): Offene/Alternativfrage für User-Diskurs
- **alternatives** (Array): Alternativen als `{ text: String, impact: String }`
- **legalBasis** (Array, String): Gesetzliche Grundlage (z. B. ["Grundgesetz Art. 38"])
- **responsibleBodies** (Array, String): Zuständige Institutionen
- **relatedStatements** (Array, String): Verknüpfte Statements (z. B. ["001", "002"])
- **visibility** (Enum, Pflicht): ["public", "draft", "review", "internal"]
- **createdBy** (String, Pflicht): ID des Users/der Redaktion
- **createdAt** (ISO8601, Pflicht): Zeitpunkt der Erstellung
- **updatedAt** (ISO8601, Pflicht): Zeitpunkt der letzten Änderung

## Beispielobjekt

```json
{
  "id": "001",
  "statement": "Sollte eine Wahlpflicht eingeführt werden?",
  "category": "Innenpolitik",
  "cluster": "Wahlbeteiligung",
  "regionScope": ["national", "eu"],
  "societalFields": ["Demokratie", "Teilhabe"],
  "focusTags": ["Wahlrecht", "Partizipation"],
  "languageOrigin": "de",
  "translations": ["en"],
  "emotionalTone": ["engagiert"],
  "expectedActionType": "Gesetzesänderung",
  "impactLevel": "mittel",
  "relevancePeriod": { "start": "2025-01-01", "end": "2025-12-31" },
  "impactSocietyYes": "Mehr Teilhabe, Legitimität.",
  "impactEconomyYes": "Verwaltungskosten, Stabilität.",
  "impactSocietyNo": "Sinkende Beteiligung, Entfremdung.",
  "impactEconomyNo": "Unsicherheit, weniger Legitimation.",
  "altUserQuestion": "Was soll stattdessen passieren, wenn keine Wahlpflicht kommt?",
  "alternatives": [
    { "text": "Anreizsysteme für Wähler:innen (z. B. Prämien)", "impact": "Erhöhung der Beteiligung, evtl. Kosten" }
  ],
  "legalBasis": ["Grundgesetz Art. 38"],
  "responsibleBodies": ["Bundestag", "Bundeswahlleiter"],
  "relatedStatements": ["002", "003"],
  "visibility": "public",
  "createdBy": "system",
  "createdAt": "2025-07-18T12:00:00Z",
  "updatedAt": "2025-07-18T12:00:00Z"
}
