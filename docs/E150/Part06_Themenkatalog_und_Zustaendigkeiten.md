# E150 Master Spec – Part 6: Themenkatalog & Zuständigkeiten

## 1. Zweck

Dieser Part bündelt den verbindlichen Themenkatalog mit 15 Hauptkategorien. Alle Profil-Themen, Onboarding-Interessen und Filter in Streams/Reports leiten sich daraus ab. Die Kategorien orientieren sich an realen Zuständigkeiten (Ministerien, Kommunen, EU), damit Bürger:innen schneller verstehen, wer für welches Thema verantwortlich ist.

## 2. Hauptkategorien (15)

| key | Label | Zuständigkeits-Level (Beispiel) | Beispiel-Institutionen |
| --- | --- | --- | --- |
| democracy_elections | Demokratie & Wahlen | Bund / Land / Kommune | Bundestag, Landtage, Wahlleitungen |
| budget_finance | Haushalt & Finanzen | Bund / Land / Kommune | Finanzministerium, Haushaltsausschüsse |
| work_economy | Arbeit & Wirtschaft | Bund / Land | Arbeitsministerium, Wirtschaftskammern |
| social_family | Soziales & Familie | Bund / Land / Kommune | Sozialministerium, Jugendamt |
| education_research | Bildung & Forschung | Bund / Land / Kommune | Bildungsministerium, Hochschulen, Schulbehörden |
| health_care | Gesundheit & Pflege | Bund / Land | Gesundheitsministerium, Pflegekassen |
| climate_environment | Klima & Umwelt | Bund / Land / EU | Umweltministerium, Umweltbundesamt, EU-Umweltagentur |
| energy_infrastructure | Energie & Infrastruktur | Bund / Land / Kommune | Wirtschafts-/Energieministerium, Stadtwerke |
| mobility_urban | Mobilität & Stadtentwicklung | Kommune / Land | Verkehrsministerium, Stadtplanung, ÖPNV |
| interior_security | Inneres & Sicherheit | Bund / Land | Innenministerium, Polizei, Katastrophenschutz |
| justice_law | Justiz & Recht | Bund / Land | Justizministerium, Gerichte |
| migration_integration | Migration & Integration | Bund / Land / Kommune | Innen-/Integrationsministerium, Ausländerbehörden |
| digital_media | Digitalisierung & Medien | Bund / Land / EU | Digitalministerium, Medienanstalten, EU-Kommission |
| europe_foreign | Europa & Außenpolitik | Bund / EU | Auswärtiges Amt, EU-Parlament, EU-Kommission |
| local_community | Kommunales & Lebensumfeld | Kommune | Rathäuser, Kreistage, Ortsbeiräte |

## 3. Vorgaben für Implementierung

- `TOPIC_CHOICES` sind ein Mapping/Subset dieser 15 Kategorien und werden zentral gepflegt (Profil-Editor, Onboarding, Filter/Sortierung in Streams/Reports).
- `profile.topTopics` in `core.users` sind max. 3 Einträge aus dieser Liste.
- Zusätzliche Tags/Unterthemen sind erlaubt, hängen aber immer an einer der 15 Hauptkategorien (z.B. `energy_infrastructure` + Tag „Netzausbau“).

## 4. Verknüpfung zu anderen Parts

- Part01 verweist auf diesen Katalog als Backbone der Systemvision.
- Part02 nutzt die Kategorien für Profil-Freischaltungen (Top-Themen) entlang der Engagement-Levels.
- Part03/Part04 verwenden dieselben Labels für B2C/B2B/B2G Profile-Pakete und öffentliche Darstellungen.

