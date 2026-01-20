# E150 Master Spec – Part 11: Streams & „Brennende Bürger:innen“

## 1. Zweck dieses Dokuments

Part11 beschreibt das **Streaming- und Live-Format** von eDebatte / eDebatte:

- wie „Brennende Bürger:innen“ und andere Engagierte Streams hosten,
- wie Graph/Reports/Eventualitäten als Grundlage dienen,
- wie Zuschauer:innen interaktiv teilnehmen (Swipes, Fragen, Eventualitäten),
- wie alles in XP, Level, Reports und Graph zurückfließt,
- wie B2G/B2B-Partner Streams für ihre Themen nutzen können,
- unter welchen Sicherheits- und Fairness-Regeln das Ganze läuft.

Ziel:  
Streams sollen **Demokratie-Abende** werden – keine Shitstorms.

---

## 2. Rollen & Gating

### 2.1 Wer darf streamen?

Streaming ist kein Basis-Feature.

Voraussetzungen (konfigurierbar):

- **Engagement-Level** mindestens:  
  - Standard: `Brennend`  
  - oder `Begeistert` + aktives Abo (z.B. citizenPro/citizenUltra)
- **Verifizierter Account**:  
  - E-Mail + OTP, optional ID-Check (z.B. B2G-Partner, bekannte Hosts)
- **Community-Richtlinien akzeptiert** (One-Click-Agreement, Versioniert)

Optionale Sonderfälle:

- Offizielle B2G/B2B-Kampagnen können Hosts benennen,  
  die abweichend vom XP-Level streamen dürfen (Flag: `orgApprovedHost`).

### 2.2 Stream-Typen

- **Themen-Stream**  
  - Fokus auf ein Thema (z.B. „Mieten in Berlin“).
  - Basis: TopicReport + Graph + Eventualitäten.

- **Regions-Stream**  
  - Fokus auf eine Region (z.B. Kommune/Landkreis).
  - Basis: RegionReport.

- **Kampagnen-Stream (B2G/B2B)**  
  - Begleitformat zu einer konkreten Kampagne (z.B. Umfrage Stadt XY).

- **Community-Lab**  
  - Offenes Format, in dem neue Eventualitäten, Fragen, Knoten entwickelt werden.

---

## 3. Technische Architektur (High Level)

### 3.1 Streaming-Plattform

eDebatte selbst ist **kein** Video-CDN.  
Stattdessen:

- externe Plattformen (Twitch, YouTube, ggf. OBS/RTMP),
- eDebatte stellt:
  - Overlays (HTML/CSS),
  - Companion-UI (Web/App),
  - API für interaktive Elemente.

Konzept:

- Host erstellt in eDebatte eine **Stream-Session**.
- Er/sie hinterlegt:
  - Streaming-URL (Twitch/YouTube),
  - Startzeit, Dauer, Thema, Region.
- Zuschauer:innen sehen:
  - eingebetteten Stream **plus** interaktive Elemente (Swipes, Fragen etc.).

### 3.2 Datenmodelle (vereinfacht)

```ts
type StreamSession = {
  id: string;
  hostUserId: string;
  type: "topic" | "region" | "campaign" | "lab";
  topicId?: string;      // für Topic-Streams
  regionCode?: string;   // für Regions-Streams
  campaignId?: string;   // für B2G/B2B
  title: string;
  description: string;
  locale: string;
  scheduledStart: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  externalUrl: string;   // Twitch/YouTube-Link
  status: "scheduled" | "live" | "ended" | "canceled";
};
4. Vorbereitung eines Streams
4.1 Themen-Karten
Vor einem Stream generiert das System automatisch eine „Stream-Deck“-Struktur:

aus Graph & Reports:

~5–12 Kern-Statements (Claims),

passende Fragen,

relevante Knoten (Konflikte),

zentrale Eventualitäten (Pro/Neutral/Contra-Szenarien).

Diese Karten werden dem Host angezeigt als:

Agenda-Vorschlag,

mit Möglichkeit:

Karten zu priorisieren,

Karten zu deaktivieren,

eigene Karten hinzuzufügen.

4.2 Checkliste für Hosts
Mindestens:

Thema/Region geprüft,

Richtlinien akzeptiert,

Moderations-Tools verstanden (Mute, Ban, Slowmode für Chat),

Option: Co-Host / Moderator:in benannt.

5. In-Stream-Interaktion
5.1 Viewer-Seite (Companion UI)
Zuschauer:innen sehen:

eingebettetes Video,

darunter / daneben:

aktuelle Karte (Statement/Eventualität),

Buttons für Pro/Neutral/Contra-Swipes,

Schaltfläche „Was-wäre-wenn?“-Fragen,

Feld für Fragen (mit Upvotes).

5.2 Swipes im Stream
Swipes zählen wie normale Swipes (XP, Credits),

zusätzlich:

separate Kennzahl streamSwipeCount,

spätere Auswertung in Stream-Report.

Regeln:

Pro Stream begrenztes Swipe-Budget (Anti-Spam),

Rate-Limits je User.

5.3 Fragen & Eventualitäten
User können Fragen vorschlagen,

Host/Mod-Team können sie:

hervorheben,

beantworten,

in Eventualitäten überführen („Wenn wir eure Sorge ernst nehmen, folgt…“).

Alle akzeptierten Fragen/Eventualitäten fließen:

in den Graph,

in ResearchTasks (Part09),

in spätere Reports.

6. Nachbereitung des Streams
6.1 Automatischer Stream-Report
Enthält:

Anzahl Zuschauer:innen (falls verfügbar),

Anzahl Swipes (pro Option),

neue Fragen/Eventualitäten,

Stimmungsbild im Zeitverlauf,

XP-Zuwachs Host & Community.

6.2 Integration in Graph & Reports
neue Claims/Fragen/Knoten/Eventualitäten werden als Nodes & Edges gespeichert,

Topic-/Region-Reports werden aktualisiert (oder beim nächsten Rebuild neu generiert).

6.3 Clips & Social
kurze Text-Zusammenfassung,

optional:

Social-Snippets (Statements + Link zum Report),

später: Auto-Clips (wenn rechtlich/technisch möglich).

7. Moderation & Sicherheit
7.1 Community-Richtlinien
Verbindlich:

kein Hass, Rassismus, Sexismus,

keine Aufrufe zu Gewalt,

keine Werbung,

keine parteipolitischen Kampagnen im Sinne klassischer Wahlwerbung.

7.2 Moderations-Tools
Für Host/Mods:

User stummschalten,

Chat-Nachrichten löschen,

User melden,

Stream bei schweren Verstößen sofort beenden („Panic Button“).

7.3 Automatische Filter
Textfilter für Chat (Hatewords, Beleidigungen),

optional KI-Unterstützung (Hinweis „Message riskant“),

aber Entscheidungen bleiben bei Menschen.

8. XP & Monetarisierung
8.1 XP-Vergabe
Stream hosten: +200 XP (Baseline)

besonders erfolgreiche Streams:

Bonus je nach Zuschauerzahl & Interaktion (konfigurierbar).

8.2 Abo/Plan-Abhängigkeit
Bestimmte Stream-Typen:

z.B. Kampagnen-Streams nur mit citizenPro/Ultra oder B2G/B2B-Plan,

Normale Community-Streams:

gratis, aber Level-Gate (Brennend).

8.3 Keine direkte Geldverteilung
keine Trinkgeld-Funktion,

kein direktes „Streamer verdient an Votes“,

Fokus: Ehrenamt & gemeinwohlorientierte Motivation.

9. Codex-Anweisungen (kompakt)
Codex MUSS:

Models für StreamSession und zugehörige Tabellen anlegen.

Routen erstellen:

/api/streams (create/list/update),

/api/streams/:id (Details),

ggf. /api/streams/:id/metrics.

UI-Seiten bauen:

/streams (Übersicht),

/streams/:id (Viewer),

/streams/:id/host (Host-Panel).

Stream-Deck-Logik implementieren:

Bezug zu Graph/Reports/Eventualitäten.

XP-Integration um Host-/Viewer-Aktivitäten erweitern.

Moderationstools + Anti-Spam-Regeln implementieren.

B2G/B2B-spezifische Stream-Typen berücksichtigen.

PII, Fairness, Neutralität beachten (keine Empfehlungen, kein Tracking-Wildwuchs).

Part11 baut damit auf allen vorherigen Parts auf und macht sie „live erlebbar“.
