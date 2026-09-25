# MARKETING-MULTIBRAND-CONTROL-PLANE-01

Stand: 2026-08-24
Status: `implementation_started`

## Ziel

Die bestehende Marketing-Zentrale in eDebatte wird zur technischen Leitstelle für drei klar getrennte öffentliche Marken ausgebaut:

- eDebatte – Evidenz, Debattenstände, Dossiers und Beteiligung;
- VoiceOpenGov – Mission, Community, Membership, Partner und gesellschaftliche Aktivitäten;
- Vote4Gov – Denkwerkstatt, Systemvergleich und Global-Governance-Lab.

Eine gemeinsame technische Marketingmaschine darf die öffentlichen Absender nicht vermischen. Insbesondere dürfen VoiceOpenGov- oder Vote4Gov-Kampagnen nicht still auf ein eDebatte-Brandprofil zurückfallen.

## Operatives Zielbild

`/admin/marketing` bleibt die gemeinsame Betreiberoberfläche. Sie steuert markenübergreifend:

- Opportunities,
- Kampagnen,
- Assets,
- Distribution,
- Insights,
- Membership-/Community-Übergaben,
- Partner-/Funding-Anlässe,
- Freigaben und Blocker.

Die sichtbare Kommunikation bleibt jedoch pro Kampagne und Asset eindeutig einer Marke zugeordnet.

## Agentenpipeline

Alpha-Foxtrott priorisiert. Danach arbeiten spezialisierte Rollen zusammen:

Research -> Evidence -> Editorial -> Voxy/Asset -> Brand & Trust -> Neutrality Review -> Distribution -> Analytics -> Growth/Learning.

Für VoiceOpenGov können Membership und Community in den Loop eingebunden werden. Für Vote4Gov werden Global-Governance-Agent und System-Challenger vorgeschaltet. Für eDebatte bleiben Evidenz- und Neutralitätsgrenzen maßgeblich.

## Pflichtfelder je MarketingCampaign

Jede Kampagne muss mindestens führen:

- `brandProfileId`,
- Ziel / Outcome,
- Zielgruppe,
- CTA,
- Evidence-/Source-Referenzen,
- Reviewstatus,
- Distributionstatus.

Zusätzlich soll die fachliche Marke aus dem referenzierten BrandProfile eindeutig ableitbar sein.

## Markenregeln

### eDebatte

Kein eigener politischer Kampagnenstandpunkt. Kommunikation erklärt Quellen, Positionen, offene Fragen, Beteiligung und Produktfunktion.

### VoiceOpenGov

Eigener Absender für Mission, Membership, Community, Partner und transparent beschlossene Positionen. eDebatte-Ergebnisse dürfen referenziert werden, aber eDebatte darf nicht als politischer Absender erscheinen.

### Vote4Gov

Eigener Absender für Systemvergleiche, institutionelle Alternativen, internationale Beispiele und Governance-Hypothesen. Hypothesen sind als solche zu kennzeichnen und dürfen nicht als eDebatte-Faktenlage ausgegeben werden.

## Distribution

Die bestehende Social Distribution Queue und der review-first Scheduler bleiben kanonisch. Kein zweiter Scheduler, kein Buffer-/Hootsuite-Zwang und kein Auto-Publish-Bypass.

Ziel ist:

Marketing-Zentrale -> freigegebenes Asset -> markenspezifischer Account/Kanal -> Scheduler -> DistributionRecord -> Analytics/Learning.

Solange reale Social-Connector-Credentials fehlen, bleibt manueller Export/Kopieren der ehrliche Fallback.

## Acceptance Criteria

- Vote4Gov existiert als eigener Brand-Modus im kanonischen Brandmodell.
- VoiceOpenGov-Kampagnen verwenden ein VoiceOpenGov-Brandprofil.
- Vote4Gov-Kampagnen verwenden ein Vote4Gov-Brandprofil.
- Kein stiller Fallback von VoiceOpenGov/Vote4Gov auf eDebatte.
- `/admin/marketing` kann markenübergreifend als technische Leitstelle dienen.
- Distribution bleibt review-first und auditierbar.
- eDebatte-, VoiceOpenGov- und Vote4Gov-Kommunikation bleiben fachlich und visuell unterscheidbar.
