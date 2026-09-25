# ORGANIZATION-BRAND-SOURCE-REGISTRY-01

Stand: 2026-09-03  
Issue: #684  
Parent: #683  
Branch: `feat/organization-brand-source-registry-01`  
Base: `main@fcc7c44fd7be27c492da973833818cdaa08fa1b3`

## Auftrag

Dieser Slice vereinheitlicht die bereits vorhandenen Organization-, Entity- und Source-Verträge additiv zu einem global erweiterbaren Registry-Vertrag. Es entsteht keine zweite Organization-, Entity-, Region-, Feed-, Source- oder Anlassraum-Runtime.

Die öffentliche Produktlogik bleibt citizen-first. Organisationen, Parteien, Fraktionen, Verbände, Verwaltungen und Medien sind Akteure beziehungsweise Betreiber- und Quellenkontexte derselben Plattform und erhalten kein institutionelles Stimmgewicht.

## Preflight und Collision Gate

Vor Branch-Erstellung wurde `ORGANIZATION-BRAND-SOURCE-REGISTRY-01` auf einem frischen, sauberen Checkout von aktuellem `main` ausgeführt. Der taskbezogene Preflight lieferte:

```json
{
  "taskId": "ORGANIZATION-BRAND-SOURCE-REGISTRY-01",
  "status": "codex_ready",
  "executable": true,
  "branchCreationAllowed": true
}
```

Vor Branch-Erstellung wurden außerdem die tatsächlichen Changed-Files aller zu diesem Zeitpunkt offenen Pull Requests gegen die #684-Kernflächen geprüft. Es bestand keine Dateiüberschneidung mit den für diesen Slice relevanten Organization-/Entity-/Source-Verträgen.

## Kanonische Organization-Typen

`features/organization/registryContract.ts` ist der gemeinsame, dependency-arme Typ- und Registry-Vertrag. Er unterscheidet mindestens:

- `political_party`
- `parliamentary_group`
- `parliamentary_caucus`
- `civic_initiative`
- `association`
- `ngo`
- `trade_union`
- `professional_association`
- `foundation`
- `public_administration`
- `ministry`
- `agency`
- `municipality`
- `public_body`
- `research_institution`
- `company`
- `media_publisher`
- `media_outlet`
- `public_broadcaster`
- `other`

Partei und Fraktion sowie Publisher und Outlet bleiben getrennte Identitäten. Die bestehenden Entity-Typen bleiben kompatibel und wurden additiv um die neuen kanonischen Subtypen erweitert.

## Legacy-Kompatibilität statt stiller Migration

Bestehende Persistenz- und Onboarding-Werte werden nicht massenhaft umgeschrieben. Der Registry-Vertrag führt deshalb eine explizite Compatibility-Schicht:

- eindeutige Altwerte wie `party` werden auf `political_party` aufgelöst;
- eindeutige Verwaltungsaltwerte wie `district_office`, `city_administration` und `county_administration` werden als `public_administration` aufgelöst;
- mehrdeutige Altwerte wie `media`, generisches `organization` oder `school` werden **nicht** still spezialisiert und bleiben `review_required`;
- bestehende Claims, Memberships, Rollen und Berechtigungen behalten ihre bisherigen gespeicherten Werte und werden in diesem Slice nicht automatisch verändert.

Das alte Mongoose-Organization-Modell und der ältere `OrganizationType` verwenden nun dieselbe Storage-Typbasis aus dem Registry-Vertrag. Das Legacy-Feld `region` bleibt für Rückwärtskompatibilität bestehen; additive `canonicalId`, `localeTags` und `jurisdictionIds` ermöglichen eine schrittweise Migration ohne Big-Bang-Datenrewrite.

## Relations, Jurisdiktion und Sprache

Organization-Relations unterstützen:

- `parent_of` / `child_of`
- `affiliated_with`
- `parliamentary_group_of`
- `regional_branch_of`
- `published_by`
- `operated_by`
- `successor_of` / `predecessor_of`

Jede Relation führt eine Provenienzreferenz, Reviewstatus und optionale zeitliche Gültigkeit. Self-Relations und rückwärts laufende Gültigkeitsintervalle werden fail-closed abgelehnt.

Der Registry-Vertrag führt einen generischen Jurisdiction-Kontext mit `global`, `supranational`, Länder-, föderalen/subnationalen und lokalen Ebenen. IDs bleiben von lokalisierten Labels getrennt. Die vollständige weltweite Jurisdiction-/Fixture-Migration bleibt Eigentum von `EU-GLOBAL-EXPANSION-CONTRACT-01` (#689) und wird hier nicht vorweggenommen.

Locale-Tags werden als BCP-47 validiert und bleiben von stabilen Organization-IDs getrennt. Übersetzung oder Primärsprache ändern keine Organization-ID.

## Source Connections ohne Fake-Region

Der bestehende regionale Source-Connection-Pfad bleibt streng regiongebunden:

- `RegionSourceConnection` verlangt weiterhin eine echte `regionId`;
- `RegionSourceConnectionUpsertSchema` bleibt fail-closed ohne `regionId`;
- bestehende `/admin/region`-, Dry-Run-, SourceSnapshot- und Feed-Signal-Runtimes werden nicht in einen globalen Crawler umgebaut.

Additiv kann `OrganizationSourceConnection` nun `regionId: null` führen. Für solche Quellen verlangt `OrganizationSourceConnectionUpsertSchema` einen generischen Jurisdiction-Kontext. Damit sind beispielsweise eine EU-weite Organisation oder eine globale Medienquelle ohne künstliche deutsche Lokalregion darstellbar.

Die Feed-Automation war bereits auf nullable `regionId` vorbereitet. Durable Fetch-, Snapshot-, ETag-/Last-Modified-, Hash-, Dedupe-, Versionierungs-, Health- und Recovery-Erweiterungen bleiben bewusst Eigentum von #685.

## BrandAsset und Rechte

`BrandAsset` beschreibt `logo`, `icon` oder `mark` mit:

- Organization-ID
- `sourceUrl`
- Kennzeichnung offizieller Quelle
- Abrufzeit
- Content Hash
- MIME-Typ und optionale Dimensionen
- Rechtebasis und Rechtenotiz
- Rechtejurisdiktion
- Reviewstatus
- Gültigkeit und Supersession

Rechtebasen sind `official_provided`, `licensed`, `public_domain`, `official_site_reference` und `unknown`.

Ein Asset darf durch den Registry-Contract nur öffentlich verwendet werden, wenn sein Reviewstatus `approved` ist, die Rechtebasis nicht `unknown` ist, es nicht superseded ist und seine zeitliche Gültigkeit passt. Andernfalls ist die kanonische Darstellung `monogram_text_fallback`.

Dieser Slice lädt keine Logos herunter und legt keine Logo-Binaries in Git ab. Das bestehende Legacy-Feld `branding.logoUrl` wird nicht zu einer neuen öffentlichen Rechtewahrheit erhoben; im aktuellen Repo-Audit wurde keine direkte `branding.logoUrl`-Nutzung als Organization-Logo-Renderer gefunden.

## Acceptance-Fixtures

Contract-Tests bilden ausdrücklich ab:

1. deutsche Bundespartei und Bundestagsfraktion als getrennte Organization-IDs plus `parliamentary_group_of`-Relation;
2. EU-weite Organisation mit `supranational` Jurisdiction und Organization-Source ohne `regionId`;
3. globales Medienhaus und Outlet als `media_publisher` beziehungsweise `media_outlet` plus Provenienzrelation;
4. freigegebenes BrandAsset gegenüber ungeklärten Rechten mit Monogramm-/Textfallback;
5. BCP-47-Validierung und sprachunabhängige IDs;
6. explizite Compatibility-Auflösung aller bestehenden regionalen Onboarding-Typen;
7. unverändert fail-closed bleibenden regionalen Source-Connection-Contract.

## Bewusste Grenzen

Nicht Teil dieses Slices:

- kein dauerhafter SourceSnapshot-/Fetch-/Freshness-Ausbau (#685);
- keine PositionClaim-/OrganizationPosition-/MediaCoverage-Semantik (#686);
- kein Organization-Anlassraum- oder Swipe-UI (#687);
- keine Parteien-/Fraktions-/Medien-Massendaten oder Logo-Binaries (#688);
- keine vollständige weltweite Jurisdiction-Migration oder Länder-Fixture-Matrix (#689);
- kein Auto-Claim, Auto-Merge, Auto-Publish oder Provider-/Crawler-Activation;
- keine Medien-Bias-, Links-/Rechts-, Trust- oder politische Nutzerprofilierung.

`docs/E150/OpenTasks.md` wird in diesem Implementierungsbranch wegen des verbindlichen Single-Writer-Vertrags nicht parallel verändert. Eine Statusfortschreibung erfolgt ausschließlich über den kanonischen Governance-/Single-Writer-Pfad nach belastbarer Review-/Merge-Evidence.
