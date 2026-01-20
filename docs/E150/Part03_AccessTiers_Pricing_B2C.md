# E150 Master Spec – Part 3: Access Tiers & Pricing (B2C)

## 1. Zweck dieses Parts

Dieser Part beschreibt **alle B2C-Zugangsmodelle (Tiers)** und das vollständige **Pricing-Modell für Endnutzer:innen** der Plattform eDebatte / eDebatte.

Ziele:

- klare technische Zuordnung von Features → Rollen/Tiers,
- transparente und faire Bepreisung,
- keine versteckten Mechaniken,
- Gamification & Pricing miteinander verzahnt (über XP & Credits),
- spätere Erweiterbarkeit für E200/E500.

Dieser Part ergänzt Part 02 (Roles, Levels, XP) und Part 01 (Systemvision).

---

## 2. Grundprinzipien für Pricing & Zugang

1. **Demokratie bleibt frei zugänglich**  
   - Swipes kosten nichts.  
   - Grundfunktionen bleiben für immer gratis.

2. **Beiträge & Streams sind „Premium-Engagement“**  
   - wer intensiver beitragen will, bekommt faire Upgrades,
   - wer nur konsumiert, bleibt kostenlos.

3. **Keine Pay-to-Win Mechanik**  
   - Geld darf nie Einfluss auf Mehrheiten, Rankings oder inhaltliche Sichtbarkeit haben.

4. **Credits statt harte Bezahlschranken**  
   - Nutzer:innen sammeln Nutzungs-Credits (Swipes → Contribution Credits),
   - Abos erweitern Limits, aber ersetzen nicht XP.

5. **Faire Unterscheidung zwischen Nutzer:innen und Organisationen**  
   (Organisationen → Part04)

---

## 3. Access Tiers (B2C)

Im B2C existieren die folgenden Tiers:

- `public` (Gast)
- `citizenBasic` (kostenfrei, registriert)
- `citizenPremium`
- `citizenPro`
- `citizenUltra`

### 3.1 Kurzbeschreibung der Tiers

| Tier | Preis | Zielgruppe | Hauptnutzen |
|------|--------|-------------|--------------|
| **public** | 0 € | Besucher | bis 3 Swipes, keine Beiträge, kein Stream |
| **citizenBasic** | 0 € | registrierte Bürger | unbegrenzt swipes, 100 Swipes → 1 Contribution |
| **citizenPremium** | 9,99 € | engagierter Bürger | mehr Contribution Credits, bessere Tools |
| **citizenPro** | 29 € | sehr aktiver Bürger | Streams möglich (ab Level „Brennend“), mehr Credits |
| **citizenUltra** | 49–99 € | maximal engagiert | frühe Features, große Credits, Community Leadership |

Alle Preise sind über Config steuerbar.

**Canon (Run B2C, Code-Stand):**
- Plan/Tier-IDs = `citizenBasic`, `citizenPremium`, `citizenPro` (plus `citizenUltra`, Staff/Institution).
- Limits per Config (`features/pricing/limits`): Beiträge/Monat aktuell 2 / 10 / 20 / 50 (Basic → Ultra).
- Feature-Matrix & Gates via `features/pricing/featureMatrix` (re-export in `apps/web/src/config/*`).
- Plan-Slug in Session/API: `planSlug` = `b2cPlanId` = Tier-ID.

---

## 4. Free Plan – citizenBasic

Der Free-Plan ist das Herzstück der Plattform. Er muss stark genug sein, um echte demokratische Beteiligung zu ermöglichen.

### 4.1 Rechte im Free-Plan

- **unbegrenzt Swipes**
- XP sammeln
- 100 Swipes → **1 Contribution Credit**
- Contribution (bis 3 Statements)
- keine Streams hosten
- Streams anschauen erlaubt (öffentlich)
- Eventualitäten erstellen (XP-relevant)

### 4.2 Limitierungen

- nur 1 aktiver Beitrag ohne Abo (mit Credit möglich)
- Stream-Host nur ab Pro + Level „Brennend“
- Eventualitäten nur für eigene Themen
- weniger Zugriff auf Community-Insights

---

## 5. Premium-Plan – citizenPremium (9,99 €)

Für Bürger:innen, die häufiger beitragen oder mehr Funktionen nutzen wollen.

### 5.1 Leistungen

- alles aus Free +
- zusätzliche Contribution Credits (z.B. 1 pro Woche)
- mehr Analytics/Insights zu Themen, Regionen, Debatten
- Early Access zu Streams
- teils erweiterte Eventualitäten

### 5.2 Motivator

Premium ist der Einstieg in tieferes Engagement, aber kein Machtinstrument.

---

## 6. Pro-Plan – citizenPro (29 €)

Für Nutzer:innen, die echte Community-Arbeit leisten wollen.

### 6.1 Leistungen

- alles aus Premium +
- **Streams hosten**, wenn:  
  - Level ≥ **Brennend**,  
  - Verifizierte Community-Historie (Anti-Abuse),
- unbegrenzt Contributions (kein Credit-Limit),
- erweitertes Dashboard für Themenentwicklung,
- Erstellung kleiner Community-Umfragen (10 Fragen)

### 6.2 Ziel

Die „Community-Builder“ der Plattform zu befähigen.

---

## 7. Ultra-Plan – citizenUltra (49–99 €)

Für Nutzer:innen, die:

- große Themen hosten wollen,
- Community-Research leiten,
- im Governance-Modell (Council) sichtbar sein wollen.

### 7.1 Leistungen

- alles aus Pro +
- Streams & Panels moderieren (Level „Inspirierend+“)
- Premium-Support
- priorisierte KI-Analyse (schnellere SSE)
- Einladung zum Community-Council (wenn XP erfüllt)
- erweiterte KnowledgeGraph-Daten

### 7.2 Hinweis

Ultra darf **nie** Macht über Inhalte kaufen.  
Nur Tools, Geschwindigkeit, Anzahl, Komfort.

---

## 8. Preis- und Zugriffsmatrix (B2C)

| Feature | public | basic | premium | pro | ultra |
|--------|--------|--------|---------|------|--------|
| Swipes | 3 | ∞ | ∞ | ∞ | ∞ |
| Contribution | – | Credits | Credits+ | ∞ | ∞ |
| Eventualitäten | – | ✓ | ✓ | ✓ | ✓ |
| Streams ansehen | – | ✓ | ✓ | ✓ | ✓ |
| Stream hosten | – | – | – | Level ≥ Brennend | Level ≥ Brennend |
| Stream moderieren | – | – | – | – | Level ≥ Inspirierend |
| Community-Insights | – | – | Basis | ✦ | ✦✦ |
| KI-Schnellmodus | – | – | – | – | ✓ |
| Credits erhalten | – | 1 pro 100 Swipes | + wöchentliche | viele | viele+ |

(`✦` = erweitert, `✦✦` = maximal)

---

## 9. Credits – das zentrale B2C-Währungssystem

Credits sind nicht käuflich.  
Credits basieren auf:

- Swipes,
- Engagement,
- XP,
- Abos,
- Likes (nur als Trigger).

### 9.1 Arten von Credits

- **Contribution Credits**  
  → Beiträge schreiben (1 Credit = 1 Beitrag)

- **Stream Credits**  
  → für Streamer (Qualitätsgebunden)

### 9.2 Credits verdienen

| Aktion | Credits |
|--------|----------|
| 100 Swipes | 1 Contribution Credit |
| Eventualität (bewertet von Council) | 0.2–0.5 Credits |
| 5.000 Likes auf eigene Inhalte | 1 Stream Credit |
| Premium/Pro/Ultra | Abo-spezifische Zusatzcredits |

---

## 10. Monetarisierung – Regeln & Grenzen

### 10.1 Verbote

- Kein Verkauf von Mehrheiten
- Keine Bevorzugung bestimmter Parteien
- Keine höhere Sichtbarkeit durch Geld
- Keine Werbeeinkäufe in politische Themen

### 10.2 Erlaubt

- Komfortfunktionen
- Geschwindigkeit (KI SSE Priority)
- Anzahl der Beiträge
- Anzahl der Streams
- Community-Tools / Research-Tools

---

## 11. Upgrade-Logik

### 11.1 Wann soll UI ein Upgrade vorschlagen?

- nach 3 Swipes (public → basic)
- nach 100 Swipes (basic → premium/pro)
- nach 1.000 Swipes (premium → pro)
- wenn Hosting eines Streams versucht wird
- wenn mehr als 3 Contribution-Entwürfe
- wenn Community-Tools geöffnet werden

Codex:

- soll die Upgrade-Signale zentral in `/config/upgradeTriggers.ts` verwalten.

---

## 12. Anti-Abuse-Mechanismen bei Pricing

- unnatürliche Swipe-Bursts → Credits nicht vergeben
- monetäre Upgrades blocken keine Warnungen/Rate-Limits
- Streaming nur nach Manuellem oder Semi-Auto-Check
- Rückbuchungen führen zu Deaktivierung einzelner Premium-Funktionen

---

## 13. Interoperabilität mit Part 02

Part 02 und Part 03 sind verzahnt:

- XP beeinflusst **Level**  
- Tiers beeinflussen **Features**  
- Level+Tiers beeinflussen **Stream-Berechtigung**  
- Swipes → XP & Credits  
- Credits → Contribution-Möglichkeiten  
- Pricing → Tiers  

Codex muss eine klare Matrix implementieren:

can(user, action) → boolean


Basierend auf:



user.role
user.level
user.xpTotal
user.credits


Keine direkte Logik in UI/Server-Endpoints verstreuen.

---

## 14. Anforderungen an Codex (Part 03)

Codex MUSS:

1. Access Tiers als zentrale Enum pflegen.
2. Pricing in Config hinterlegen (keine Hardcodierung).
3. Upgrade-Signale dynamisch verwalten.
4. Credits-Logik korrekt umsetzen.
5. Mehrsprachige Preismodelle für Part13 vorbereiten.
6. Payment-Integrationen optional halten (nicht erzwingen).
7. Free-Zugang unantastbar lassen.
8. Keine UI-Elemente anzeigen, die nicht erlaubt sind.
9. Abo-Logik robust implementieren, aber keine eigene Wirtschaft erfinden.
10. Anti-Abuse-Filter mit berücksichtigen (XP & Credits).

---

## 15. Profil-Pakete (Basis / Pro / Premium)

Neben den Access Tiers gibt es eine zweite Dimension: **Profil-Pakete**. Sie beschreiben Sichtbarkeit und Gestaltungsmöglichkeiten des Profils und nutzen segment-agnostische Namen – identisch für B2C, B2B und B2G:

- `profileBasic`
- `profilePro` (erweitert)
- `profilePremium`

### 15.1 B2C (Bürger:innen)

- **Basic**: Avatar, DisplayName, kurze Bio, Top-3-Themen, „Warum…“-Texte, Opt-in für Stats → deckt praktisch alles ab, was eine Privatperson braucht.
- **Pro**: Alles aus Basic + Highlight-Beitrag pinnen + einfache Profil-Styles (2–3 Farbschemata).
- **Premium**: Alles aus Pro + zusätzliche Visuals (z.B. Themen-Badges, Stream-Host-Badge, Organisationen verknüpfen) – nur aktiv, wenn bewusst mehr Sichtbarkeit gewünscht (Creator, Host, Kandidat:in).

### 15.2 B2B / B2G (Organisationen, Kommunen, NGOs)

- **Basic**: Organisationsprofil mit Logo, Kurzbeschreibung, Kontaktkanal, Standard-Themenprofil (Schwerpunkte aus den 15 Kategorien).
- **Pro**: Zusätzlich Teamliste (öffentliche Ansprechpartner:innen inkl. Profil-Verknüpfungen) und Verlinkung auf eigene Streams/Kampagnen.
- **Premium**: Dashboard-Features, Deep-Links in Entscheidungen, ggf. Co-Branding im Profil-Bereich.

### 15.3 Regeln

- Profil-Paket entscheidet nur über **Darstellung und Komfort** – nie darüber, ob jemand abstimmen oder sich beteiligen darf.
- Marketing-Labels (z.B. „Starter“, „Plus“, „Institution Gold“) dürfen die technische Paket-Zuordnung nicht verändern.

## 16. Verbindung von Access Tier und Profil-Paket

Standard-Zuordnungen (anpassbar in der Pricing-Matrix, aber einheitlich benannt):

- B2C:
  - `public` → `profileBasic`
  - `citizenBasic` → `profileBasic`
  - `citizenPremium` → `profilePro`
  - `citizenPro` / `citizenUltra` → `profilePremium`

- B2G / B2B:
  - `institutionBasic` → `profileBasic`
  - `institutionPremium` → `profilePro` oder `profilePremium` (vertragsabhängig)

Diese Zuordnungen müssen in allen Segmenten konsistent sein und spiegeln die Darstellungs-Ebene des Profils wider, nicht die demokratischen Rechte.

---

Part 03 bildet die Grundlage für:

- Part 04 (B2G / B2B Modelle & Abrechnung),
- Part 11 (Streams & Engagement),
- Part 12 (Admin & Telemetrie),
- Part 13 (I18N & Social/Community Features),
- sowie alle Feature Gates im User-Modell (Part 02).
## eDebatte Mitgliedschaft (Basis/Pro/Premium)

- `/mitglied-werden` präsentiert die drei B2C-Produkte:
  - **Basis (0 €)** – CitizenBasic, XP → Contribution Credits.
  - **Pro (14,99 €/Monat)** – mehr Credits, Insights, Stream-Aktivierung.
  - **Premium (34,99 €/Monat)** – unbegrenzte Contributions, priorisierte Betreuung.
- Mitglieder können den 25-%-Mitgliederrabatt auf eDebatte Pro/Premium aktivieren (Checkbox „Ich bin Mitglied …“).
- `/mitglied-antrag` erzwingt Login und sammelt Pflichtfelder (Vor-/Nachname, Adresse inkl. PLZ, Land, Geburtsdatum, Telefon optional).
- Nach dem Submit zeigt der Client sofort Bank-Details + Verwendungszweck an und der API-Endpunkt `/api/membership/apply` verschickt dieselben Infos per Mail.
- Mitgliedsstatus in `users.membership` → `pending` (inkl. `lastApplication`-Snapshot), PII liegt in `pii.user_profiles`.
