# VOXY-SELF-HOSTED-MOTION-STRATEGY-01

Stand: 2026-08-14

## Betreiberentscheidung

Voxy verfolgt dauerhaft **self-hosted / open-source first**. Ein kostenpflichtiger Avatar-SaaS wie HeyGen ist kein Standardpfad und kein notwendiges Gate für die weitere Voxy-Entwicklung.

Der bevorzugte technische Weg ist ein kontrolliertes 2D-Rig, das die Voxy-Identität vollständig im eigenen Assetbestand hält. Primärer Evaluationspfad ist **Stretchy Studio** beziehungsweise ein kompatibler lokaler 2D-Rig-Workflow mit PSD-/Layer-, Bone-, Mesh- und Pivot-Unterstützung. Die Auswahl bedeutet keine ungeprüfte Runtime-Abhängigkeit: Drittcode wird erst nach Lizenz-, Supply-Chain- und Reproduzierbarkeitsprüfung in einen produktiven Build übernommen.

## Zielarchitektur

1. **Owned master asset**
   - kanonische visuelle Referenz bleibt im eDebatte-Repo;
   - Kopf, Augen, Lider, Brauen, Arme und Hände werden als kontrollierbare Ebenen/Pivots geführt;
   - VOG-Pin und eDebatte-Markierung bleiben separate Overlays;
   - keine externe Plattform wird Source of Truth für Voxy.

2. **Primary motion path: local 2D rig**
   - primärer Bake-off: Stretchy-Studio-kompatibles Rig;
   - deterministische Gesten statt generativ neu erfundener Hände;
   - mindestens `neutral_idle`, `listening`, `explaining`, `questioning`, `highlighting_source`, `showing_contrast`, `inviting_participation`;
   - feste 16:9-, 9:16- und 1:1-Safe-Zones;
   - keine Lip-Sync-Abhängigkeit.

3. **Optional face-motion layer**
   - LivePortrait oder vergleichbare Open-Source-Komponente nur optional;
   - kommerzielle Nutzung nur mit vollständig lizenzsauberer Modell-/Detector-Kette;
   - keine standardmäßig nicht-kommerziell lizenzierten Gewichte als Production-Abhängigkeit.

4. **Optional lip-sync layer**
   - MuseTalk oder vergleichbare lokale Komponente frühestens nach stabiler Character-Identität;
   - Lip-Sync ist Qualitätsverbesserung, kein Blocker für Voxy-Video;
   - Drittmodell-Lizenzen werden separat geprüft.

5. **Composition stays in-house**
   - Audio, Captions, Lower Third, Waveform, VOG-/eDebatte-Branding und Export bleiben im eigenen Composition-/FFmpeg-Pfad;
   - #590 bleibt providerneutral;
   - kein Auto-Publish.

## Kosten- und Datenregel

Der lokale Self-hosted-Pfad benötigt **keine** Freigabe für externe Accounts, Credentials, Datentransfer, Provider-Retention oder SaaS-Spend. Diese Gates gelten nur, wenn später bewusst ein externer Dienst als Fallback aktiviert werden soll.

Für den Standardpfad gelten stattdessen:

- `execution_mode = self_hosted`
- `primary_rig_engine = stretchy_studio_compatible`
- `external_upload = false`
- `commercial_saas_default = disabled`
- `provider_credentials_required = false`
- `provider_budget_required = false`
- `human_visual_acceptance = required`
- `auto_publish = false`

## Verhältnis zu den bisherigen Versuchen

Die verworfenen Attempts 1–6 bleiben als Evidenz dafür bestehen, dass Masken-, Crop-, CSS-Affine- und nachträgliche Rastersegmentierung keine belastbare Anatomie erzeugt haben. Diese konkreten Reparaturwege werden nicht wieder geöffnet.

Die neue Entscheidung erlaubt dagegen ausdrücklich ein **echtes neu aufgebautes Rig** mit kontrollierten Bones/Meshes/Pivots. Das ist kein siebter Maskierungsversuch, sondern ein anderer Produktionsansatz.

## #589 — neue Gate-Logik

`VOXY-ANIMATABLE-MASTER-ASSET-01` bleibt der zuständige Slice. Die bisherige Annahme, dass für den nächsten Schritt zwingend Providerwahl, Account, externer Datentransfer, Retention und Budget freigegeben werden müssen, gilt **nicht für den Self-hosted-Standardpfad**.

Der Self-hosted-Pfad ist technisch ausführbar, sobald:

1. der lokale Rig-Workflow reproduzierbar eingerichtet ist;
2. die Voxy-Ebenen und Pivotpunkte dokumentiert sind;
3. mindestens eine 8-Sekunden-Fixture lokal erzeugt wurde;
4. Hände, Gesicht, Branding und Crops die bestehenden QA-Verträge bestehen;
5. die Ausgabe revisionsgebunden an den Exact Head dokumentiert ist.

Danach bleibt ausschließlich die **menschliche visuelle Abnahme** der Voxy-Identität ein notwendiges Human Gate.

Der erste lokale SVG-Motion-Kandidat aus Exact Head
`7f0ad050e4079b823c3bb6c7b2ef5fc991b662cb` hat dieses Gate trotz grüner
technischer Render- und Detector-Evidence nicht bestanden. Daraus folgt eine
verbindliche Reihenfolge für den weiteren Self-hosted-Pfad:

1. zuerst drei hochwertige statische Mastervarianten direkt gegen die vier
   freigegebenen Canon-Boards herstellen;
2. genau einen statischen Charakter-/Broadcast-Master menschlich auswählen;
3. erst danach ein neues geschichtetes Rig oder Motion-Profil aus dem
   akzeptierten Master ableiten;
4. Detector-, Format- und Exact-Head-Evidence erneut ausführen, ohne die
   visuelle Abnahme zu ersetzen.

Rig-Komfort oder technische Detektierbarkeit dürfen niemals Vorrang vor
Wiedererkennbarkeit, Anatomie und Broadcast-Qualität erhalten. Die menschliche
Prüfung hat am statischen Exact Head
`ecba53e4167a6382d16dc2dda25c2f162dab8162` A als Primary Master und C als
Editorial-/Anlass-Variante final akzeptiert; B ist verworfen. Damit ist ein
kontrollierter Animationstest freigegeben. Die Acceptance gilt nicht für dessen
Motion-Ausgabe: diese beginnt erneut bei `humanVisualAcceptance = pending`.

Der sichtbare Motion-v2-Sakko-Stand hat die anschließende menschliche Prüfung
vom 15.08.2026 nicht bestanden. Vor jedem neuen Layer- oder Motion-v3-Schritt
ist deshalb ein eigener Jacket-Canon-Gate verbindlich. Der pixelidentische
CANON-04-Buchstabenstand am Head `64b79c797450fe4c6202b6d0e3bad8c1afa2ed4b`
wurde menschlich abgelehnt. Der reparierte Pfad ersetzt ausschließlich die
beiden kleinen Markenflächen durch lokale Vektorlayer mit exakt `VOXY` und
`eDebatte`. CANON-04 bleibt Geometriequelle; ein maskierter Bytevergleich
erhält die Jacket-Pixel außerhalb der Ersatzflächen. Für beide Marken ist
menschliche Lesbarkeitsprüfung verbindlich. `animationEligible = false` und
`humanVisualAcceptance = pending` bleiben bis zur menschlichen Sichtung
unverändert. Ein lokaler technischer PASS ersetzt diesen visuellen Human Gate
nicht.

Der folgende technische Jacket-PASS am Head
`02a83e832890f12fe9843d2dc1cb8e543ddef07b` wurde für die eDebatte-Pocket-Mark
erneut menschlich abgelehnt. Die Folgekorrektur ist auf diese eine Markenfläche
begrenzt: natives hochauflösendes SVG, eine Textinstanz `eDebatte`, keine
Stroke-/Glow-/Box-Regel, kein Raster-Upscale und nur leichte Rotation ohne
Perspektiv-Skew. Die alte Rasterglyphe wird nur in einer nativen, deterministisch
bereinigten CANON-04-Kompositionsquelle entfernt; die Wortmarke selbst bleibt
ein separater Vektor. Der VOXY-Pin bleibt unverändert. Ein eigener Pocket-Mark-
Final-Gate belegt 100-/200-/400-%-Evidence und Pixelgleichheit außerhalb der
Pocket-Maske; alle Motion-, Production- und Publish-Gates bleiben geschlossen.

## #588 — Freigabebedingung

#588 wird nicht durch eine SaaS-/Budgetentscheidung freigegeben. Er wird freigegeben, sobald ein lokales Self-hosted Rig eine revisionsgebundene Fixture liefert, die als kanonische animierbare Voxy-Identität menschlich akzeptiert wurde. Anschließend prüft #588 die 200-%-Qualitätszonen fail-closed.

## Fallback

Ein kommerzieller externer Avatar-/Motionanbieter darf später nur als expliziter Fallback evaluiert werden, wenn der Self-hosted-Ansatz die dokumentierten Qualitätskriterien nicht erreicht. Dann greifen erneut Providerwahl-, Account-, Datenschutz-, Retention-, Budget- und Transfer-Gates. Es gibt keinen automatischen Wechsel zu einem SaaS-Anbieter.

## Abnahmeziel

Der erste akzeptable Voxy-Video-Stack benötigt keinen fotorealistischen Mund. Vorrang haben:

- stabile Wiedererkennbarkeit;
- korrekte Hände und Anatomie;
- ruhige Kopf-/Augenbewegung;
- wenige kontrollierte Gesten;
- saubere Audio-/Caption-/Brand-Composition;
- reproduzierbare lokale Renderbarkeit;
- keine laufenden Avatar-SaaS-Kosten.

## Konkrete Implementierung in #589

Der erste lokale Rig-Satz ist ohne zusätzliche Stretchy-Studio-GUI- oder
Runtime-Abhängigkeit als äquivalenter nativer SVG-Layer-/Pivot-Vertrag
implementiert:

- Rig-ID: `voxy-stretchy-compatible-svg-rig`
- Rig-Version: `voxy-local-2d-rig-v1`
- Asset: `apps/web/public/brands/voxy/characters/voxy-sitting-master.svg`
- Renderer:
  `apps/web/scripts/render-voxy-animatable-rig-evidence.ts`
- keine externen Requests, Provider, Uploads, Modelle oder Modellgewichte;
- 8 Sekunden, 24 fps, MP4 und WebM primär in `16:9`, Stand-/Crop-Evidence
  zusätzlich in `9:16` und `1:1`;
- Exact-Head-Artefakt im PR-Workflow;
- Human Visual Acceptance bleibt `pending`, Production bleibt gesperrt.

Das additive Profil `voxy-motion-polish-v2` belässt Rig und Identität
unverändert, reduziert Hand-Basisrotation und Gestenausschläge, setzt pro
Aussage eine dominante Hand, lässt Blick/Kopf die verzögert und weich
eingesetzten Arme führen und hält Oberkörper-/Idle-Bewegung bewusst klein. Der
lokale #588-Detector aus Exact Head
`0756ad48bfd61cf88696f91bc41da87e988020c0` akzeptiert alle 24 realen
Standframe-Hand-Crops der drei Formate mit fünf Fingern und Confidence `1.0`;
seine unveränderten Negativ-Fixtures bleiben fail-closed. Diese technische
Kompatibilität ersetzt keine Human Visual Acceptance.

Die menschliche Prüfung hat den Motion-Stand anschließend abgelehnt. Seine
technischen Ergebnisse bleiben historische Evidence, dürfen aber nicht als
Freigabe oder als aktueller visueller Master gelesen werden. Aus der statischen
Recovery-Prüfung wird Primary A gemeinsam mit Editorial C finalisiert; B bleibt
verworfen. A und C verwenden dieselbe CANON-04-Pixelquelle, Kamera, Licht-,
Marken-, Typografie- und Materialbehandlung und genau eine statische Waveform
hinter Voxy. Nur ihre Inhaltszonenarchitektur unterscheidet sich. Der Lauf bleibt
vollständig lokal, ohne Audioanalyse oder generatives Redraw.

Die statische Human Visual Acceptance ist inzwischen erfolgt. Der erste
kontrollierte Explainer übernimmt deshalb die akzeptierte abgeflachte
CANON-04-Pixelquelle direkt, ohne das abgelehnte Rig zu reaktivieren oder eine
neue Figur zu zeichnen. Weil die Quelle keine getrennten Kopf-/Handebenen hat,
bleibt Motion v2 bewusst auf fünf sparsame Blinzler, eine höchstens zwei Pixel
große lokale Blicklichtbewegung und Editorial-Easing begrenzt; die gefaltete
Handpose wird im #588-Cross-Check fail-closed als nicht Open-Palm-prüfbar
markiert. Die verbindliche Branding-Korrektur nutzt VOG am Revers, eine
badgefreie eDebatte-Wortmarke auf der Brusttasche und VoiceOpenGov/eDebatte als
dauerhaften Studio-Absender. Ein späterer unabhängiger Kopf-, Oberkörper- oder
Gestenpfad erfordert ein aus dem akzeptierten Master abgeleitetes, erneut
menschlich abzunehmendes Layer-/Rig-Asset.

Damit sind die technischen Provider-, Credential-, Transfer-, Retention- und
Budget-Gates für den Standardpfad tatsächlich entfallen. Nur die menschliche
visuelle Abnahme und der unabhängige #588-QA-Checkpoint bleiben notwendige
Freigabeschritte.
