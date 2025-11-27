# E150 Master Spec – Part 4: B2G & B2B Models

## 1. Zweck dieses Parts

Dieser Part definiert alle **B2G- (Behörden/Gemeinden/Landkreise)**  
und **B2B- (Unternehmen/Organisationen)** Modelle, Pläne, Limits und  
Entscheidungslogiken für VoiceOpenGov / eDebatte.

Ziele:

- eine einheitliche und skalierbare Struktur für Organisationen,
- Tarif- & Feature-Modelle für Gemeinden, Landkreise, Unternehmen,
- klare Regeln für Einwohner-Billing (0,95 € / Bürger),
- Governance-grade Limits für öffentliche Nutzergruppen,
- zentrale Organisationstabellen und Plan-Enums für Codex,
- Interoperabilität mit XP-, Pricing- & Stream-Mechaniken (Part 02/03).

Hinweis: Dieses Dokument verwendet die Profil-Paket-Namen aus Part03 (`profileBasic`, `profilePro`, `profilePremium`). Eigene Marketing-Begriffe (z.B. „Starter“, „Plus“, „Institution Gold“) sind reine UI-/Kommunikationslabels und **ändern nicht** die technische Paket-Zuordnung.

Dieser Part bildet die Grundlage für:

- Kampagnen (Part10),
- Admin & Telemetrie (Part12),
- KnowledgeGraph (Part09),
- I18N (Part13).

---

## 2. Organisationstypen

Es gibt zwei Hauptkategorien:

1. **B2G (Public Sector)**  
   - Gemeinden  
   - Städte  
   - Landkreise  
   - Ministerien  
   - Bildungseinrichtungen  

2. **B2B (Private Sector)**  
   - Unternehmen  
   - Vereine  
   - Verbände  
   - NGOs  
   - Agenturen

Codex muss diese Typen als Enum führen:

enum OrganizationType {
MUNICIPALITY = "municipality",
DISTRICT = "district",
GOVERNMENT = "government",
SCHOOL = "school",
COMPANY = "company",
NGO = "ngo",
ASSOCIATION = "association",
OTHER = "other"
}

yaml
Code kopieren

---

## 3. Organisations-Modelle (technisch)

### 3.1 Organisations-Modell

organization {
id: string
type: OrganizationType
name: string
region: string
populationCount?: number // nur B2G
staffCount?: number // optional, teilweise B2B
seatCount?: number // optionale Metrik für Unternehmen
plan: OrgPlan // siehe unten
billingCycle: "monthly" | "yearly"
createdAt: Date
updatedAt: Date
}

shell
Code kopieren

### 3.2 OrgPlan (B2G/B2B Tarife)

enum OrgPlan {
ORG_FREE = "org_free",
ORG_BASIC = "org_basic",
ORG_PRO = "org_pro",
ORG_ULTRA = "org_ultra"
}

yaml
Code kopieren

### 3.3 Plan-Mapping

- B2G nutzt ORG_FREE, ORG_PRO, ORG_ULTRA  
- B2B nutzt ORG_FREE, ORG_BASIC, ORG_PRO  

Staff kann ORG_ULTRA für Test und Governance besitzen.

---

## 4. B2G — Gemeinden & Landkreise

### 4.1 Grundprinzipien

- Gemeinden sollen **politische Beteiligung modernisieren**, nicht kaufen.
- Abos dürfen **keinen Einfluss** auf demokratische Ergebnisse haben.
- Die Kategorien „Thema“, „Frage“, „Eventualität“, „Report“ bleiben gleich.

### 4.2 Pricing-Logik für B2G

**Pilotphase (kostenlos):**

- 3–5 Themen / Jahr kostenfrei  
- einfache Community-Beteiligung  
- Nutzung der Basis-Tools  
- Nutzung des KnowledgeGraph-Auszuges (reduziert)

**Darüber hinaus:**

> **0,95 € pro Bürger ≥16 Jahre und Monat**

Berechnung:

preis = populationCount * 0.95€

yaml
Code kopieren

oder via echten Kampagnen:

- jede registrierte Teilnahme (mit E-Mail oder SMS verifiziert) zählt als **Kampagnen-Teilnahme** → wird abgerechnet
- bei anonymen Kiosk-Geräten zählt nur die Einwohnerzahl

### 4.3 Abrechnungsmodi

#### Modus A: Einwohnermodell (Standard)
- Fixpreis pro Einwohner ≥16 Jahre
- Gemeinde erhält vollständiges Reporting & Community Tools

#### Modus B: Kampagnenmodell
- Abrechnung nur für tatsächliche Teilnehmer
- pro registriertem Teilnehmer ca. **0,35–0,50 €**  
  (später anpassbar)

#### Modus C: Frontdesk/Kiosk
- Gerät im Rathaus (99 €/Monat)
- für Bürger vor Ort 100% kostenfrei
- Reporting wie bei Modus A

### 4.4 Feature-Matrix für Gemeinden

| Feature | ORG_FREE | ORG_PRO | ORG_ULTRA |
|--------|----------|---------|-----------|
| Kampagnen | 5/Jahr | 20/Jahr | ∞ |
| Fragen pro Kampagne | 10 | 25 | ∞ |
| Reports (automatisch) | Basis | erweitert | vollständig |
| KnowledgeGraph | limited | erweitert | full |
| Region-Streams | – | ✓ | ✓ |
| Custom Branding | – | ✓ | ✓ |

---

## 5. B2B — Unternehmen, Vereine & NGOs

### 5.1 Motivation

Unternehmen sollen:

- Mitarbeitende beteiligen,
- Fragen zur Kultur, Sicherheit, Politik, Klima etc. klären,
- Insights für Führungskräfte generieren,
- ohne Einfluss auf öffentliche Debatten.

### 5.2 B2B Pricing

Pläne:

#### 1. Business Free (0 €)
- 1 Kampagne
- bis 10 Fragen
- Basis-Analyse (E150)
- keine Streams

#### 2. Business Plus (Preis: variabel, z.B. 49–199 €)
- mehrere Kampagnen
- bis 50 Fragen
- interne Streams
- KnowledgeGraph (intern)
- Reporting-Tools

#### 3. Business Pro / Brennend (Preis: 199–999 €)
- unbegrenzte Kampagnen
- unbegrenzte Fragen
- automatische Reports
- interne Konsensfindung
- HR-Integration möglich
- Community-Engagement optional

### 5.3 B2B Feature-Matrix

| Feature | Free | Plus | Pro |
|--------|------|------|------|
| Kampagnen | 1 | 10 | ∞ |
| Fragen pro Kampagne | 10 | 50 | ∞ |
| Reports | Basis | erweitert | full |
| Streams | – | intern | intern+ |
| Branding | – | ✓ | ✓ |
| API-Zugriff | – | – | ✓ |

---

## 6. Gemeinsame B2G/B2B Modelle

### 6.1 Kampagnen-Modell

campaign {
id: string
orgId: string
name: string
description: string
questions: Question[]
allowedRegions: string[] // optional für B2G
visibility: "private" | "public"
createdAt: Date
}

markdown
Code kopieren

### 6.2 Reporting-Modell

Reports haben E150-Kern:

- Claims
- Fragen
- Knoten
- Eventualitäten
- Verantwortlichkeiten
- Folgen
- Konsens/Polarität
- Regionale Verteilung

Report-Typen:

- municipalReport
- districtReport
- orgReport
- communityReport

### 6.3 Verknüpfung mit Pricing

- mehr Kampagnen → höherer Plan
- mehr Fragen → höherer Plan
- Streaming → Pro/Ultra
- KnowledgeGraph → Pro/Ultra

Codex verknüpft dies in:

config/orgPlans.ts
config/campaignLimits.ts
config/reportingLimits.ts

yaml
Code kopieren

---

## 7. Verknüpfung zwischen Bürgern & Gemeinden

Eine Gemeinde kann:

- Bürger automatisch erkennen (via Region in Profil)
- Bürger verifizieren (Adresse / SMS)
- Streams lokal priorisieren
- Kiosk-Nutzer kostenfrei aktivieren

Ein Bürger kann:

- regionale Themen kostenlos beantworten,
- aber andere Features (z.B. Stream-Hosten) weiterhin nur über B2C-Tiers nutzen.

---

## 8. Sicherheit & Governance (B2G/B2B)

### 8.1 Prioritäten

- Datenschutz (siehe Part00)
- Einhaltung demokratischer Standards
- keine gezielte Manipulation durch Unternehmen oder Gemeinden
- transparente Reporting-Kriterien

### 8.2 Moderationsstufen

- Gemeinde-Admins (nur lokale Themen)
- Organisations-Admins (nur interne Kampagnen)
- Staff (übergreifend)
- Community Council (nur Bewertungsrolle)

---

## 9. Internationalisierung (I18N)

B2G/B2B sollen in Zukunft international nutzbar sein. Anforderungen:

- Regionale Übersetzungen (Part13)
- flexible Einwohnerdaten-Modelle
- Währungen variabel
- Kampagnen-Zeitpläne auf Länderregeln anpassbar

---

## 10. Anforderungen an Codex (Part 4)

Codex MUSS:

1. Organisationen als eigene Entität pflegen.  
2. korrekte Tarife + Limits je Plan hinterlegen.  
3. Einwohner-basierte Abrechnung vorbereiten.  
4. Kampagnen vollständig implementieren.  
5. Reporting-Struktur an E150 ausrichten.  
6. Admin-Interfaces für Gemeinden & Firmen bauen.  
7. Streams an Pläne + XP koppeln (Pläne definieren „ob“, XP definiert „wer“).  
8. Kiosk-Modus unterstützen (einfache, sichere Frontends).  
9. Anti-Abuse und Governance-Sicherheitsmechaniken beachten.  
10. Part02+03 korrekt integrieren (Tiers, XP, Credits).

---

Part04 bildet die Grundlage für Kampagnen (Part10), Streams (Part11), Admin & Telemetrie (Part12), sowie I18N & Social Features (Part13).
