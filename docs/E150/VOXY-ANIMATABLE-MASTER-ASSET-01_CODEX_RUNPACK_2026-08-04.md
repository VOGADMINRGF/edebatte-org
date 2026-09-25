# VOXY-ANIMATABLE-MASTER-ASSET-01 — Codex Run-Pack

Stand: 2026-08-04

## Status

`done`

Dieser Run-Pack ist eine additive Ausführungsvorbereitung zu Issue #569. `docs/E150/OpenTasks.md` bleibt die alleinige operative Implementierungs-SSOT. Dieser Text ersetzt die Queue nicht.

Der historische Branch-Start und die ursprüngliche animierbare Definition of
Done unten sind durch den Recovery-/Finalisierungsstand in PR `#589` überholt.
Verbindlich ist die spätere menschliche Abnahme: Der Character-/Motion-Master
auf Head `58548d2a5f6e4a59e84464a5c4aea3875f38662c` ist vollständig eingefroren,
einschließlich Mouth und Motion v4.1. E — VOXY SIGNATURE ist als männliche
`VOXY_SIGNATURE` angenommen, Documentary Candidate A — Ramona Deininger als
weibliche `EDITORIAL_VOICE`; jeder gesprochene Block bindet Rolle und Stimme
über `speakerRole = "voxy" | "editorial"` und `voiceId`. Die NEWS-5.0-Zustände
`HOST`, `FOCUS`, `EXPLAIN`, `DOCK` und `SYNTHESIS` sind als Evidence-first-
Vertrag manifestiert. `humanVisualAcceptance = accepted`,
`humanVoiceArchitectureAcceptance = accepted`,
`voxyMaleSignatureAcceptance = accepted`,
`editorialFemaleVoiceAcceptance = accepted`, `productionEligible = false` und
`autoPublish = false` sind der Abschlussstand. Private Voice-/Review-Medien
bleiben außerhalb von Repository, PR-Artefakten, Vercel und Production.

Die Produkt-, Marken-, Look- und kommerzielle Nutzungsfreigabe wurde am 04.08.2026 erteilt. PR #558 ist gemergt. Der 200-%-Kontrollpunkt ist in Issue #580 manifestiert.

## Verbindlicher Start

Vor Produktcode:

```bash
cd /path/to/edebatte-org
git fetch origin
git switch main
git pull --ff-only
node scripts/codex-task-preflight.mjs VOXY-ANIMATABLE-MASTER-ASSET-01
```

Der Implementierungsbranch darf erst nach positivem Preflight erstellt werden. Falls der Preflight `task_not_found` meldet, ist ausschließlich die verlustfreie Serialisierung dieses Tasks in `docs/E150/OpenTasks.md` zulässig. Kein Produktcode vor positivem Preflight.

Empfohlener Implementierungsbranch:

```text
feat/voxy-animatable-master-asset-01
```

## Ziel

Ein kanonisches, reproduzierbar animierbares und markensicheres Voxy-Master-Asset mit getrennten Ebenen, stabilen Layer-IDs und dokumentierten Pivotpunkten schaffen. Das bestehende Raster-Fixture bleibt als Fallback erhalten.

## Designvertrag

- ein gemeinsamer Voxy-Charakter und ein gemeinsames Rig
- eDebatte-Variante: Blau / Electric Blue
- VoiceOpenGov-Member-Variante: Türkis beziehungsweise Türkis–Electric-Blue-Verlauf
- eindeutig digitale Moderatorfigur, keine reale Person
- seriös, modern, freundlich, sachlich
- keine Fuchsassoziation als Leitmotiv
- keine aggressive, triumphierende oder parteipolitische Mimik
- VOG-Pin und eDebatte-Pocket-Mark als getrennte Overlays
- Outfitvariationen zulässig bei stabilen Proportionen und Layerverträgen
- Dark- und Light-Anschluss
- sichere Crops für 16:9, 9:16 und 1:1
- keine Lip-Sync-Abhängigkeit

## Muss-Layer

```text
studio-background
studio-screens
desk
microphone
microphone-arm
torso
jacket
head
left-eye
right-eye
left-eyelid
right-eyelid
left-eyebrow
right-eyebrow
left-upper-arm
left-forearm
left-hand
right-upper-arm
right-forearm
right-hand
character-shadow
character-light
vog-pin
edebatte-pocket-mark
waveform
```

Optional sind zwei bis drei neutrale geschlossene Mundformen für Ausdrucksvariation. Keine Viseme- oder phonetische Lip-Sync-Pflicht.

## Pivotvertrag

Mindestens:

```text
headPivot
neckPivot
leftShoulderPivot
rightShoulderPivot
leftElbowPivot
rightElbowPivot
leftWristPivot
rightWristPivot
leftEyeAnchor
rightEyeAnchor
waveformAnchor
```

Alle Koordinaten müssen canvasbezogen, versioniert und maschinenlesbar im bestehenden Rig-Manifest dokumentiert sein.

## Motion-Zustände

- `neutral_idle`
- `listening`
- `explaining`
- `questioning`
- `highlighting_source`
- `showing_contrast`
- `inviting_participation`

## Technischer Umfang

1. Bestehende Dateien unter `apps/web/public/brands/voxy/` und den aktuellen Rig-/Manifestvertrag vollständig lesen.
2. Das gemergte Character-Motion-Fixture aus #558 additiv erweitern, nicht ersetzen.
3. SVG bleibt bevorzugte Source of Truth; Fallbacks als transparente PNG/WebP-Ausgaben erzeugen.
4. Stabile Layer-IDs und Pivotpunkte in `apps/web/public/brands/voxy/rig/` dokumentieren.
5. eDebatte- und VOG-Member-Variante über Tokens/Overlays ableiten, nicht über zwei unabhängige Charaktere.
6. Eine reale 8-Sekunden-Fixture-Ausgabe mit echten Ebenen in 16:9 erzeugen.
7. 9:16- und 1:1-Crops aus derselben kanonischen Figuren- und Timeline-Wahrheit nachweisen.
8. Bestehende Review-, Export- und Workflow-Pfade wiederverwenden.
9. Keine Veröffentlichung, kein Upload, kein Deployment und kein Auto-Publish.

## 200-%-Qualitätscheckpoint

Issue #580 ist verbindlicher Bestandteil der Abnahme. Reproduzierbare Prüfausschnitte müssen mindestens enthalten:

- Gesicht und Augen
- beide Hände
- VOG-Pin
- eDebatte-Pocket-Mark
- Logo-Zone
- Mikrofonkante
- Waveform
- Lower Third
- Untertitel-Safe-Zone

Fail-closed bei:

- vier oder sechs Fingern
- zusammengewachsenen Fingern
- Halos oder unscharfen Brand-Overlays
- abgeschnittenem Kopf, Hand oder Mikrofon
- Logo-/Waveform-Überlagerung
- eingebrannter falscher Typografie
- Crop- oder Safe-Zone-Verletzung

## Provenienz- und Markenabstand

Die Betreiberfreigabe ist dokumentiert, bleibt aber keine pauschale Garantie gegen Rechte Dritter. Der PR muss daher nachvollziehbar dokumentieren:

- verwendete Referenzboards und deren Rolle als Zielbild
- eigenständige Vektor-/Layer-Neukonstruktion
- keine reale Person oder bekannte Fremdfigur als Identitätsgrundlage
- keine eingebrannten fremden Logos oder Marken
- keine beauftragte Nachahmung einer geschützten Künstlerhandschrift
- getrennte eigene VOG-/eDebatte-Markenoverlays

## Tests und Evidence

- Contract-Test für vollständige Pflichtlayer
- Contract-Test für stabile eindeutige Layer-IDs
- Contract-Test für alle Pflichtpivotpunkte
- exakt fünf Finger je sichtbarer freigegebener Handpose
- Variantenvertrag eDebatte Blau / VOG-Member Türkis-Gradient
- 16:9-, 9:16- und 1:1-Crop-Tests
- 200-%-Golden-Snapshot-Evidence
- Character-Fixture-Workflow grün
- Web Security, Contracts, Lint, Typecheck und Production Build grün
- `git diff --check` grün

## Definition of Done

- animierbares Master-Asset mit getrennten Ebenen liegt im kanonischen pluralen Assetpfad
- Layernamen und Pivotpunkte sind dokumentiert und maschinenlesbar
- bestehende Rasterlösung bleibt als Fallback funktionsfähig
- 8-Sekunden-Fixture mit echten Layern ist reproduzierbar
- 16:9, 9:16 und 1:1 bestehen die Crop- und 200-%-Prüfung
- beide Markenvarianten basieren auf demselben Charakter und Rig
- Provenienz-, Ähnlichkeits- und Markenabstandscheck ist dokumentiert
- genau ein Draft-PR, kein Deployment, kein Upload, kein Auto-Publish

## Übergabezustände

- `ready_for_review`: alle technischen Gates grün, 200-%-Evidence vorhanden
- `needs_changes`: visuelle, anatomische, Crop- oder Markenfehler
- `manual_gate`: finale menschliche Sichtabnahme der neuen Layer-Ausgabe
- `blocked`: Preflight negativ, fehlende Source-Datei oder unklare Provenienz
