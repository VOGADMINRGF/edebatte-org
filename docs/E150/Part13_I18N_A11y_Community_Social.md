# E150 Master Spec – Part 13: I18N, Accessibility & Community/Social

## 1. Zweck dieses Dokuments

Part13 bündelt drei Querschnittsthemen:

1. **Internationalisierung (I18N)** – Mehrsprachigkeit für Europa & darüber hinaus.
2. **Accessibility (A11y)** – barrierearme Nutzung für möglichst alle Menschen.
3. **Community & Social** – einfache, konstruktive Interaktionsformen ohne Bubble-Building.

Ziel:  
eDebatte / eDebatte ist von Anfang an **inklusive, europäisch und sozial verträglich** gedacht.

---

## 2. Internationalisierung (I18N)

### 2.1 Sprachen

Startziel (konfigurierbar):

- Deutsch (de),
- Englisch (en),
- Französisch (fr),
- Spanisch (es),
- Italienisch (it),
- Polnisch (pl),
- plus später weitere EU-Sprachen.

### 2.2 Locale-Handling

- UI-Sprache:
  - über Browser-Locale + manuellen Umschalter,
  - im Userprofil speicherbar.
- Content-Sprache:
  - jedes Statement/Contribution hat `language`-Feld,
  - Originalsprache bleibt immer erhalten.

### 2.3 Übersetzungen von UI-Texten

- alle UI-Strings in zentralen I18N-Dateien,
- keine hart codierten Strings im Code,
- Fallback: Englisch, wenn Übersetzung fehlt.

### 2.4 Übersetzungen von Inhalten

Regeln:

- KI-gestützte Übersetzung **erlaubt**, aber immer mit Hinweis („automatisch übersetzt“),
- für Reports, die „offiziellen“ Charakter haben (z.B. B2G):
  - Übersetzungen optional durch Menschen geprüft (Flag: `humanReviewed: true`).

Graph-Verknüpfung:

- Nodes unterschiedlicher Sprachen, die denselben Inhalt repräsentieren, werden:
  - mit Relation `equivalent_to` verknüpft,
  - über Übersetzungs-Hashes oder Mapping-Tabellen.

---

## 3. Accessibility (A11y)

Ziel: mindestens **WCAG 2.2 AA** als interner Standard.

### 3.1 Grundregeln

- Kontrastreiche Farbpalette,
- skalierbare Schriftgrößen (mind. 16px Base),
- vollständige Tastaturbedienbarkeit,
- sinnvolle Focus-Indikatoren.

### 3.2 Screenreader & Semantik

- Semantische HTML-Struktur (Landmarks, Headings),
- ARIA-Labels nur dort, wo nötig,
- Formulare:
  - Labels verknüpft mit Inputs,
  - klare Fehlermeldungen.

### 3.3 Video/Stream-Zugänglichkeit

Kurzfristig:

- Untertitel-Empfehlung für Hosts (z.B. automatische Tools),
- Transkript-Option für wichtige Streams/Reports.

Langfristig (E200+):

- Integration von Gebärdensprach-Videos für ausgewählte Inhalte (z.B. wichtige B2G-Reports),
- Auto-Clip mit Text-Overlay für Social-Teaser.

### 3.4 Weitere Features

- „High Contrast“-Toggle,
- „Reduced Motion“-Option (Animationsreduktion),
- Schriftgrößen-Regler (z.B. klein/normal/groß).

---

## 4. Community & Social Features

### 4.1 Prinzipien

- Austausch fördern – keine Echokammern.
- Fokus auf Themen, nicht Personen.
- Kein klassisches „Follower“-System,
- keine algorithmische Timeline.

### 4.2 Profile & Avatare

- Nutzerprofil:
  - Username (Pseudonym erlaubt),
  - Engagement-Level & Badges,
  - optionale kurze Selbstbeschreibung,
  - Profilbild (moderiert, keine Werbung/Hasssymbole).

- Kein Zwang zur Klarnamen-Nutzung, außer:
  - optional für B2G/B2B/Verwaltungskonten.

### 4.3 Chat & Räume

Angelehnt an einfache Systeme („Knuddels, aber 2025“):

- öffentliche Themenräume (z.B. „Klima“, „Mieten“, „Europa“),
- regionale Räume („Dein Landkreis“),
- **keine** privaten Gruppen für politische Agitation.

Private Nachrichten / kleine Räume:

- erst ab bestimmtem Engagement-Level (z.B. Engagiert),
- Rate-Limits zur Missbrauchsvermeidung,
- klare Meldefunktion bei Verstößen.

### 4.4 Social Sharing

- jedes Statement/Report hat:
  - Share-Buttons (Link, ggf. OpenGraph-Card),
  - Kurz-Tizer (Zitat + Link, kein Clickbait).

Regeln:

- keine automatischen „Du solltest Pro/Contra stimmen“-Texte,
- nur neutrale Beschreibung:
  - „Sieh dir dieses Thema bei eDebatte an“.

---

## 5. Jugend- & Diskriminierungsschutz

### 5.1 Filter

- Filter gegen Hate-Speech, Rassismus, Sexismus,
- Moderationsrichtlinien (Host/Admin),
- Meldesystem mit Eskalationsstufen.

### 5.2 Altersaspekte

- Grundplattform ab 16+ (konfigurierbar),
- Kennzeichnung evtl. sensibler Inhalte.

---

## 6. Community-Aufbau & Anerkennung

### 6.1 Badges & Achievements

Zusätzlich zu XP/Levels:

- thematische Badges:
  - „Klimaforscher:in light“ (viele Beiträge zum Thema Klima),
  - „Kommunalprofi“ (B2G-Engagement),
- Anerkennung für:
  - hochwertige Research-Beiträge (Part09),
  - faire Moderation.

### 6.2 Offizielle Rollen

- „Community Host“ (für Streams/Events),
- „Community Scout“ (meldet Probleme, Lücken, Research-Bedarf),
- „Community Translator“ (hilft bei Übersetzungen).

---

## 7. Codex-Anweisungen (kompakt)

Codex MUSS:

1. I18N-Infrastruktur aufbauen (zentrale Übersetzungsdateien, Locale-Handling).  
2. UI-Komponenten so gestalten, dass sie A11y-Regeln erfüllen (semantische Struktur, Tastaturnavigation, Kontraste).  
3. einfache Community-Funktionen implementieren:
   - Profile,
   - öffentliche Themen-/Regiosräume,
   - limitierte PN/Privaträume (Engagement-Gate).  
4. Social-Sharing-Funktionen integrieren (Links, OG-Meta, keine Empfehlungstexte).  
5. Mechanismen für Hate-/Missbrauchsmeldung implementieren.  
6. Mehrsprachigkeit von Content respektieren:
   - Sprache kennzeichnen,
   - Übersetzungs-Mapping vorbereiten.  
7. spätere Erweiterungen (Gebärdensprache, Auto-Teaser-Clips) technisch andeuten, aber noch nicht verpflichtend implementieren.  

Part13 sorgt dafür, dass alle vorherigen Parts nicht nur technisch funktionieren,  
sondern auch **sprachlich, sozial und barrierearm** bei den Menschen ankommen, für die die Plattform gebaut wird.