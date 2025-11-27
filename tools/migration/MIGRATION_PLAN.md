## Überblick der Stände

### 01_vpm25_original
- Voller VPM25-V3-Monorepo-Stand (Landing + Web + Worker) inkl. alter Pipelines, Membership-Logik und Stream/Overlay-Experimenten.
- Dient als Referenz für Funktionen, die im aktuellen eDbtt fehlen (z. B. TV-/NGO-Dashboards, umfangreiche Landing-Assets).

### 02_vpm25_landing_legacy
- Reduzierter Auszug mit Fokus auf der Marketing-/Landing-App (statischer Content, CTA-Flows, Membership-Karte).
- Geeignet, um Landing-Seiten oder Marketing-Komponenten ins neue eDbtt zu portieren, ohne kompletten VPM-Code mitzuziehen.

### 03_edbtt_baseline_2025-11-19
- Snapshot des eDbtt-Stands unmittelbar vor der VPM25-Migration; enthält ältere E150-Entwürfe, UI-Experimente und Datenbank-Strukturen.
- Nutzt ähnliche Packages wie heute, aber ohne die aktuelle E150-Härtung – gut für Diff-Analysen während der Migration.

## Feature-Übersicht

| FeatureName                           | Quelle                            | Zielort im aktuellen Projekt                     | Kategorie | Kommentar |
|--------------------------------------|-----------------------------------|--------------------------------------------------|-----------|-----------|
| Landingpage / Marketing              | 02_vpm25_landing_legacy           | `src/app/(landing)`                              | MIGRATE   | Landing aus 02 wirkt moderner, kann als Basis für neue Marketing-Seiten dienen. |
| Mitgliedsbeiträge / Membership       | 01_vpm25_original                 | `src/features/membership/`                       | MIGRATE   | Nur rudimentär in eDbtt; Logik aus 01 bietet Abo-/Payment-Flows. |
| Dashboard (Admin/TV/NGO/Presse)      | 01_vpm25_original                 | `src/app/dashboard/...`                          | LEGACY    | Stark veraltet, muss komplett überarbeitet werden → derzeit nur Referenz. |
| Streams / Overlays                   | 01_vpm25_original                 | `src/features/stream/`                           | MIGRATE   | UI/UX aus 01 überlegen; Backend muss auf neue Analyze-API angepasst werden. |
| Reports / Map / Topics               | 03_edbtt_baseline_2025-11-19      | `src/app/map`, `src/features/report`             | KEEP      | Bereits Teil des aktuellen Projekts, nur modernisieren. |
| Auth-/User-/Org-Management           | current_edbtt                     | `src/app/api/auth`, `src/features/user`          | KEEP      | Aktuelle Strukturen bleiben maßgeblich, VPM25 nur Referenz. |
| E150 Analyze + Contributions/Statements | current_edbtt                  | `src/features/analyze`, `src/app/contributions`, `src/app/statements` | KEEP | Heilig: aktuelle Implementierung bleibt führend. |
| triMongo / DB-Connectoren            | current_edbtt                     | `core/db/triMongo`, `src/lib/db/*`               | KEEP      | Bereits vereinheitlicht – keine Migration aus VPM25 nötig. |
| TV/NGO/Politik/Presse-spezifische Views | 01_vpm25_original              | `src/app/(dashboard)`                            | MIGRATE   | Konzepte übernehmen, aber UI/Types müssen neu aufgebaut werden. |
| Landing-spezifische Media/Assets     | 02_vpm25_landing_legacy           | `/public/landing`, `src/components/marketing`    | MIGRATE   | Assets/Sektionen dort vollständiger gepflegt. |

## Feature-Paare

1. **Landing (VPM25) ↔ Landing/Marketing (eDbtt)**  
   - VPM25-Landing ist visuell kompletter; eDbtt sollte UI/Copy übernehmen, Backend bleibt minimal.  
   - Migration sinnvoll: nur UI/Assets portieren, keine Legacy-Build-Configs.

2. **Mitgliedsbeiträge (VPM25) ↔ aktuelle Membership-Struktur**  
   - VPM25 hat Payment-/Tier-Logik, eDbtt nur Basismodelle.  
   - Migration sinnvoll für UI + Geschäftslogik; API-Anbindung muss auf neue Services angepasst werden.

3. **Streams/TV-Ansicht (VPM25) ↔ aktuelle Stream-Komponenten**  
   - VPM25 enthält umfangreiche Moderations-/Overlay-Features, eDbtt nur Kern-Streams.  
   - Migration: UI/UX übernehmen, Backend strikt auf E150/triMongo-Stack aufsetzen.

4. **Dashboard (Admin/NGO/Presse) VPM25 ↔ eDbtt**  
   - Beide Varianten legacy; VPM25 bietet mehr Features, aber Technologien veraltet.  
   - Empfehlung: nur Informationsarchitektur übernehmen, UI/Code komplett neu schreiben.

5. **Reports/Map**  
   - 03_edbtt-Baseline enthält bereits Map/Topics; aktuelles eDbtt sollte diese Teile konsolidieren.  
   - Migration unnötig – eher aktuelles System weiterführen (KEEP).

6. **Auth/Org/Users**  
   - eDbtt (current) ist näher an aktuellen Security-Anforderungen.  
   - VPM25-Implementierungen nur als Referenz für Features wie Org-Onboarding, aber nicht direkt übernehmen.

## Hinweise

- Migration erfolgt ausschließlich nach Bewertung; aktuell werden keine Dateien aus 01/02/03 in den aktiven Code kopiert.
- Die Ordner dienen als Archiv; `node_modules` wurden entfernt und bleiben über `.gitignore` ausgeschlossen.
