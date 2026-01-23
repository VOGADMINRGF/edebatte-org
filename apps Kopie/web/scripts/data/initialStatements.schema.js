
---

## **3. (Nicht-empfohlen!) Schema/Beispielobjekt mit Kommentaren direkt im JSON (z. B. für Tests in JS/TS, aber **nicht** für echten Import)**

```js
// initialStatements.schema.js
module.exports = [
  {
    // Eindeutige ID (z.B. MongoDB ObjectId)
    id: "string",
    // Hauptfrage oder -these, max. 280 Zeichen, **Pflichtfeld**
    statement: "string",
    // Übergeordnete Kategorie, z.B. "Innenpolitik", "Digitales", **Pflichtfeld**
    category: "string",
    // Subthema/Fokus, z.B. "Wahlbeteiligung"
    cluster: "string",
    // [ "lokal", "regional", "national", "eu", "g7", "g20", "un", "global" ] **mind. 1**
    regionScope: ["enum"],
    // Gesellschaftliche Felder, z.B. ["Demokratie", "Teilhabe"]
    societalFields: ["string"],
    // Schlagwörter, für UI, Suche, Filter
    focusTags: ["string"],
    // Sprachcode, z.B. "de", **Pflichtfeld**
    languageOrigin: "string",
    // Vorhandene Übersetzungen (ISO-Codes, z.B. ["en", "fr"])
    translations: ["string"],
    // Erhobene Grundemotion(en), z.B. ["engagiert", "besorgt"]
    emotionalTone: ["string"],
    // Erwartete politische/gesellschaftliche Folge (Enum)
    expectedActionType: "string",
    // ["hoch", "mittel", "niedrig"], **Pflichtfeld**
    impactLevel: "enum",
    // Zeitliche Einordnung (optional, für Archiv/Framing)
    relevancePeriod: {
      start: "yyyy-mm-dd",
      end: "yyyy-mm-dd"
    },
    // Wirkung auf Gesellschaft bei Zustimmung (max. 140 Zeichen)
    impactSocietyYes: "string",
    // Wirkung auf Wirtschaft bei Zustimmung (max. 140 Zeichen)
    impactEconomyYes: "string",
    // Wirkung auf Gesellschaft bei Ablehnung
    impactSocietyNo: "string",
    // Wirkung auf Wirtschaft bei Ablehnung
    impactEconomyNo: "string",
    // Ergänzungs-/Alternativfrage für offenere Debatte
    altUserQuestion: "string",
    // Alternativvorschläge
    alternatives: [
      { text: "string", impact: "string" }
    ],
    // Gesetzliche Grundlagen (Normen, Artikel, Paragraphen)
    legalBasis: ["string"],
    // Zuständige Institutionen/Behörden (z.B. ["Bundestag"])
    responsibleBodies: ["string"],
    // Referenzen auf andere Statement-IDs für Kontext/Netzwerk
    relatedStatements: ["string"],
    // ["public", "draft", "review", "internal"], **Pflichtfeld**
    visibility: "enum",
    // Ersteller-ID (User/Redaktion), **Pflichtfeld**
    createdBy: "string",
    // Zeitstempel, **Pflichtfeld**
    createdAt: "ISO8601",
    // Zeitstempel der letzten Änderung, **Pflichtfeld**
    updatedAt: "ISO8601"
  }
]
