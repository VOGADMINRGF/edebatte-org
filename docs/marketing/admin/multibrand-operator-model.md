# Multi-Brand Marketing Operator Model

Status: `implementation_started`

## Bedienmodell

`/admin/marketing` ist die gemeinsame technische Leitstelle für eDebatte, VoiceOpenGov und Vote4Gov. Die Oberfläche soll dieselben Marketing-Objekte und denselben Review-/Audit-Unterbau nutzen, aber jede Kampagne, jedes Asset und jede Distribution eindeutig einem öffentlichen Absender zuordnen.

Empfohlene Betreiberfilter:

- `Alle Marken`
- `eDebatte`
- `VoiceOpenGov`
- `Vote4Gov`

Die Filter verändern ausschließlich die Betreiberansicht. Sie verschmelzen niemals öffentliche Absender oder Governance.

## Content-Produktion

Kanonischer Agentenfluss:

`Alpha -> Research -> Evidence -> Editorial -> Voxy/Asset -> Brand & Trust -> Neutrality Review -> Distribution -> Analytics -> Growth/Learning`

Markenspezifische Ergänzungen:

- eDebatte: Evidence + Neutrality sind Pflicht vor externer Kommunikation zu Debattenständen.
- VoiceOpenGov: Membership/Community können nach Editorial eingebunden werden; offizielle Positionen brauchen einen transparenten Herkunfts-/Freigabestatus.
- Vote4Gov: Global Governance + System Challenger werden vor Editorial eingebunden, wenn institutionelle Vergleiche oder Alternativmodelle erzeugt werden.

## Freigabelogik

Ein freigegebenes Asset ist noch nicht veröffentlicht. Distribution bleibt eigenständiger Zustand. Kein Agent darf aus `review_ready` automatisch `published` ableiten.

Für jede geplante Ausspielung müssen mindestens feststehen:

- Marke / BrandProfile,
- Zielkanal und Account,
- Asset-Version,
- CTA,
- Evidence-/Source-Referenzen,
- Freigabestatus,
- geplanter Zeitpunkt,
- Audit-/DistributionRecord.

## Technische Trennung

Eine gemeinsame Daten- und Bedienebene ist ausdrücklich zulässig. Nicht zulässig ist eine stille inhaltliche oder visuelle Verschmelzung der drei Marken.

Insbesondere:

- eDebatte darf nicht als Absender einer VoiceOpenGov-Position erscheinen;
- VoiceOpenGov darf eDebatte-Ergebnisse nicht als eigene wissenschaftliche oder neutrale Wahrheit umetikettieren;
- Vote4Gov-Hypothesen dürfen nicht als eDebatte-Faktenlage ausgegeben werden;
- ein fehlendes VoiceOpenGov- oder Vote4Gov-Brandprofil führt zu Blockade, nicht zu eDebatte-Fallback.

## Ziel der Betreiberoberfläche

Die Hauptsicht soll nicht technische Agentendetails zeigen, sondern:

- Was ist heute wichtig?
- Welche Kampagnen laufen je Marke?
- Welche Assets werden produziert?
- Was wartet auf Freigabe?
- Was ist für Distribution bereit?
- Was wurde tatsächlich veröffentlicht?
- Welche Wirkung ist real gemessen?
- Welche nächsten Aktionen empfiehlt Alpha?

Agenten-, Provider- und Run-Diagnostik gehört in Alpha Mission Control; Marketing bleibt auf Wirkung, Entscheidung und nächste Aktion fokussiert.
