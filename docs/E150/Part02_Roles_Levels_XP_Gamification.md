# E150 Master Spec – Part 2: Roles, Levels, XP & Gamification

## 1. Zweck dieses Parts

Part 02 beschreibt alle **Rollen**, **Zugangsmodelle (Tiers)**,  
**Engagement-Level**, **XP-Logiken**, sowie alle **Gamification-Elemente**  
der Plattform VoiceOpenGov / eDebatte.

Ziel:

- klare, technische Grundlage für Codex,
- eindeutige Verknüpfung zwischen User-Typ, Berechtigung, XP-Level & Pricing,
- gamifiziert, aber gesellschaftlich verantwortungsvoll,
- fair, transparent, ohne „Pay-to-Win“.

Alle Mechaniken hier greifen in spätere Parts ein:
- Streams (Part11),
- Community Research (Part10),
- Admin (Part12),
- I18N (Part13),
- Pricing (Part03 & Part04),
- Consequences / Eventualitäten / Responsibility-Modelle.

---

## 2. System der Roles (technische Rollen)

### 2.1 Technische Rollen (Access Tiers)

Diese Rollen definieren **technische Rechte**, nicht soziale Bedeutung:

- `public`
- `citizenBasic`
- `citizenPremium`
- `citizenPro`
- `citizenUltra`
- `institutionBasic`
- `institutionPremium`
- `staff`

### 2.2 Eigenschaften der Rollen

| Rolle | Zugang | Beschreibung |
|------|--------|--------------|
| **public** | minimal | Gast, max. 3 Swipes, keine Streams, keine Contributions |
| **citizenBasic** | free | unbegrenzt Swipes, XP, 100-Swipe-Credit → 1 Contribution |
| **citizenPremium** | paid | alle citizenBasic-Funktionen + mehr Credits, Events |
| **citizenPro** | paid | Streams hosten unter Bedingungen, Community-Features |
| **citizenUltra** | paid | uneingeschränkte Pro-Funktionen, Priorität im Research |
| **institutionBasic** | org | Kampagnen, Reports (bis 10 Fragen), keine Streams |
| **institutionPremium** | org | volle B2G/B2B-Funktionen, Multi-Region, Reports |
| **staff** | admin | Moderation, Audit, Council-Sichten, Telemetrie |

Codex soll:

- **Rolle im User-Objekt** halten: `role: AccessTier`
- Feature-Gates ausschließlich darüber steuern
- Keine UI-Elemente anzeigen, die Rolle nicht nutzen darf

---

## 3. Engagement Levels (soziale Stufen)

Die Levels zeigen **gesellschaftliches Engagement** und steigern Ansehen & Einfluss – ohne Macht über das System.

Levels:

1. **Interessiert**  
2. **Engagiert**  
3. **Begeistert**  
4. **Brennend**  
5. **Inspirierend**  
6. **Leuchtend**

Diese Levels hängen ausschließlich von XP ab.

### 3.1 Level-Schwellen (konfigurierbar)

| Level | XP (Vorschlag) |
|-------|----------------|
| Interessiert | 0 |
| Engagiert | 250 |
| Begeistert | 1.500 |
| Brennend | 5.000 |
| Inspirierend | 15.000 |
| Leuchtend | 50.000 |

**Codex:**  
XP-Schwellen kommen aus Config (`config/levels.ts`), nicht hardcoded.

---

## 4. XP-System (Ereignisse & Gewichtung)

XP sind das Rückgrat des Engagement-Systems.

### 4.1 XP-Events (Basiswerte)

| Event | XP |
|-------|-----|
| Swipe | **1 XP** |
| Eventualität schreiben | **10 XP** |
| Frage/Knoten übernehmen | **20 XP** |
| Report-Research beitragen | **35 XP** |
| Stream-Teilnahme | **50 XP** |
| Stream hosten (Qualität > 80%) | **200 XP** |
| Qualitätsbeitrag (durch Council markiert) | **500 XP** |

Alle Werte konfigurierbar.

### 4.2 Regeln

- XP können nicht verloren gehen (kein Abstieg).
- XP werden sofort gutgeschrieben.
- XP werden in einem Audit-Log gespeichert.
- XP sind NICHT kaufbar (kein Pay-to-Win).

Codex muss:

- XP als Append-Only-Ereignisliste speichern,
- Rebuild-Funktion bereitstellen: XP neu berechnen aus History,
- keine Abkürzungen/Fehler bei Betrug zulassen.

---

## 5. Gamification – fair & gesellschaftlich verantwortungsvoll

### 5.1 Grundprinzipien

Gamification dient:

- Motivation,
- Orientierung,
- sichtbarer Anerkennung,
- Förderung konstruktiver Beteiligung.

Gamification dient **nicht**:

- Manipulation,
- Belohnung extremer Aussagen,
- parteiischer Einflussnahme.

### 5.2 Level-Badges

Jedes Level hat:

- Icon (SVG),
- Farbe,
- Animation (optional),
- Tooltip (mehrsprachig).

Codex soll:

- Badge-Komponenten zentral unter `/ui/badges` ablegen,
- alle Badges dynamisch aus Config generieren.

### 5.3 Achievements (optional, später)

Erweiterungen:

- „1000 Swipes“
- „50 Eventualitäten“
- „Erster Stream“
- „Community-Favorit“
- „Regionen-Engager“
- „Faktenheld“

Achievements haben **keinen** funktionalen Einfluss – nur Darstellung.

---

## 6. Integration von Levels & Roles

### 6.1 Warum Levels UND Rollen?

- Rollen = was Nutzer **darf**
- Levels = was Nutzer **geleistet hat**

Beispiel:

- ein **public** User, der 200 XP sammelt → bleibt trotzdem **public**
- ein **citizenPro** ohne XP hat alle Pro-Features, aber geringere Anerkennung
- ein **citizenUltra** + „Brennend“ kann Streams hosten & Panels moderieren

### 6.2 Matrix (Kurzform)

| Rolle/Tier | Swipes | Contributions | Streams | Community Council | Admin |
|------------|--------|---------------|---------|-------------------|-------|
| public | 3 | – | – | – | – |
| citizenBasic | ∞ | 1/100 Swipes | – | – | – |
| citizenPremium | ∞ | mehr Credits | – | – | – |
| citizenPro | ∞ | viele Credits | ✗ (ab Brennend) | ✗ | – |
| citizenUltra | ∞ | viele Credits | ✓ | ✓ (ab Inspirierend) | – |
| staff | ∞ | alle | ✓ | ✓ | ✓ |

Codex soll:

- explizite `can()`-Funktionen nutzen (z.B. `canHostStream(user)`),
- keine verstreuten `if(user.role === ...)` im Code erzeugen.

### 6.3 Profil-Freischaltungen nach Engagement-Level

Engagement-Level schalten **optionale Profil-Funktionen** frei, niemals demokratische Grundrechte oder Teilnahmerechte.

| Feature | Interessiert | Engagiert | Begeistert | Brennend | Inspirierend | Leuchtend |
| --- | --- | --- | --- | --- | --- | --- |
| Basisprofil (Avatar, DisplayName) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profil-Headline setzen | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kurz-Bio („Über mich“) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Top-3-Themen aus 15 wählen | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ |
| „Warum ist mir dieses Thema wichtig?“ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profil-Stats anzeigen (opt-in) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Highlight-Beitrag pinnen | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ |
| Erweiterte Profil-Styles (Farbschemata) | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ |

Legende: ✅ = verfügbar, ➖ = (noch) nicht verfügbar.

Wichtig:

- diese Freischaltungen sind **reine Komfort-/Darstellungsfeatures**,
- Top-Themen beziehen sich auf den 15er-Katalog aus `docs/E150/Part06_Themenkatalog_und_Zustaendigkeiten.md`,
- Rechte zur Beteiligung (Stimmen, Beiträge einreichen, live diskutieren) hängen an Access Tiers / Verifikation, nicht an Gamification.

---

## 7. XP-Economy & Anti-Abuse-Mechanik

### 7.1 Anti-Spam-Regeln

- mehrere Swipes in < 0.3 Sekunden → nur 1 XP pro 3 Sekunden
- Copy-Paste-Eventualitäten → XP halbieren
- botartige Muster → XP-Queue einfrieren + Hinweis

Codex:

- soll einfache Heuristiken vorbereiten,
- Admin-Panels für Auffälligkeiten anzeigen.

### 7.2 „Fairness Boosts"

Optional:

- XP-Multiplikator für Beiträge zu Minderheitenthemen,
- XP-Bonus für konstruktive Kommentare (vom Council markiert).

---

## 8. Community Council (Vorstufe zu Part01 Governance)

Gemeinschaftlich getragenes Gremium aus:

- Level **Brennend+**,
- 5000+ Swipes,
- 10+ konstruktive Eventualitäten,
- 3+ Community-befürwortete Beiträge.

Aufgaben:

- Bewertung konstruktiver Inhalte,
- Vorschläge für Streams,
- Feedback für Admin/Owner.

Codex:

- soll Council-Mitglieder in eigener Tabelle pflegen,
- automatische Ernennung (kein manueller Admin-Knopf).

---

## 9. Streams – Verbindung zu XP & Levels

Streams sind ein **Engagement-Feature**.

- Teilnahme gibt XP,
- Hostrolle nur ab „Brennend“ + citizenPro,
- Moderation nur ab „Inspirierend“ + citizenUltra.

Codex muss die Feature-Gates an XP + Role koppeln.

---

## 10. Rollen & XP in der User-DB

Codex soll im primären User-Modell folgende Felder führen:

role: AccessTier
xpTotal: number
level: EngagementLevel
swipeCountTotal: number
contributionCredits: number
achievements?: string[]


sowie Tabellen:



xp_events (
id,
userId,
type,
amount,
createdAt
)

council_members (
userId,
appointedAt
)


---

## 11. Anforderungen an Codex (Part 2)

Zusammenfassung:

Codex SOLL:

1. **XP-System vollständig implementieren**  
   - XP-Events, XP-History, Level-Berechnung.

2. **Role + Level sauber trennen**  
   - Role = Tier/Plan, Level = Engagement.

3. **Feature-Gates zentral ablegen**  
   - z.B. `/config/permissions.ts`

4. **Gamification fair gestalten**  
   - Badges, optional Achievements, keine manipulativen Mechaniken.

5. **Anti-Abuse-Checks** vorbereiten  
   - Rate-Limits, Spam-Erkennung.

6. **Council-Automatik** ermöglichen  
   - ab bestimmten XP/Events automatische Ernennung.

Part 02 bildet das Fundament für Pricing (Part 03), B2B/B2G (Part 04), sowie Streams (Part 11).
