# VOG-50-THEMES-TO-EDEBATTE-VIDEO-PIPELINE-01 — Governance-Handoff

- Datum: 2026-08-24
- Vorgänger: `VOXY-HOMEPAGE-REFERENCE-FILMS-01`
- Status: Governance-Handoff; noch nicht verlustfrei in den kanonischen operativen Kopf von `docs/E150/OpenTasks.md` serialisiert und daher noch kein ausführbarer Taskstatus
- Ausführungsgrenze: keine Themen importiert, keine Videos oder Audios gerendert, kein Publishing und kein Auto-Publish

## Ziel

Der nächste kanonische Slice soll eine review-first Batch-Pipeline für genau folgenden fachlichen Fluss vorbereiten:

`VoiceOpenGov-Themen → eDebatte Intake → Quellen/Evidence → Thema/Dossier → Voxy Brief → lokaler Multiformat-Render → Human Review`

Die Pipeline darf keine zweite fachliche Wahrheit neben eDebatte etablieren. Themen, Quellen, Evidenzen, Widersprüche, Unsicherheiten und Statusinformationen bleiben revisionsgebunden nachvollziehbar; über Fakten oder Wahrheit wird nicht abgestimmt. Menschliche Verantwortung bleibt an Intake-, Brief-, Render- und Veröffentlichungsgrenzen sichtbar.

## Wiederzuverwendender V3.10.5-Canon

Der Folge-Slice verwendet den ausdrücklich menschlich akzeptierten V3.10.5-Canon aus `VOXY-HOMEPAGE-REFERENCE-FILMS-01`:

- D1 als kanonische aktive Stimme und die bestehenden Voice-/Pronunciation-Contracts
- gemeinsamer Canonical-Alpha-Compositor aus `canonicalAlphaHeadRelativeFaceRigHtml.ts`
- NEWS-5.0-/Evidence-first-Grammatik
- responsive Produktionsformate `16:9`, `9:16`, `4:5` und `1:1`
- Quellen-, Evidence-, Motion-, Caption-, Safe-Area- und Dwell-Verträge
- Review-first; kein Auto-Publish

Der akzeptierte Canon darf nicht durch ältere opake Head-/`neck-plate`-Pfade, neue Voice-Charaktere oder formatlokale Reparaturpfade ersetzt werden.

## Künftiger Scope

Nach einer verlustfreien OpenTasks-Serialisierung und einem positiven taskbezogenen Preflight soll der Slice:

1. ein revisionsgebundenes Intake- und Provenienzmodell für die 50 autorisierten VoiceOpenGov-Themen festlegen,
2. jedes Thema durch den bestehenden eDebatte-Quellen-/Evidence- und Thema-/Dossier-Pfad führen,
3. daraus einen prüfbaren Voxy Brief ableiten,
4. lokale Multiformat-Render ausschließlich als private Review-Kandidaten erzeugen,
5. jede Ausgabe vor weiterer Nutzung an eine explizite Human Review binden.

Nicht Teil dieser Governance-Manifestierung sind der Import der 50 Themen, Recherche- oder Dossiererzeugung, TTS-/Audioerzeugung, Video-Rendering, Upload, Social Posting, Deployment, Homepage-Integration oder Publishing.

## Serialisierungsblocker und nächster Schritt

Der frühere Main-/Single-Writer-Konflikt des Vorgängers wurde in PR `#624` durch den verlustfreien Merge von `origin/main@fd6bbe7757e39e70e50056d7e7a3082dbf0caa4f` aufgelöst. `VOXY-HOMEPAGE-REFERENCE-FILMS-01` steht im synchronisierten PR-Branch kanonisch auf `done`; die Human Final Acceptance und beide MP4-Hashes bleiben unverändert.

Der Folge-Task wird trotzdem noch nicht parallel in `OpenTasks.md` serialisiert: PR `#624` ist noch nicht in `main` gemergt, die offenen PRs `#628` und `#588` verändern weiterhin ihre jeweils eigenen OpenTasks-Zeilen und ein separater taskbezogener Preflight für `VOG-50-THEMES-TO-EDEBATTE-VIDEO-PIPELINE-01` wurde nicht ausgeführt. Es wurden keine Themen importiert und keine Videos oder Audios gerendert.

Der nächste zulässige Schritt ist eine verlustfreie Single-Writer-Serialisierung, die:

- die akzeptierte V3.10.5-Evidence und die beiden exakten MP4-Hashes übernimmt,
- nach Merge von PR `#624` den Vorgängerstatus `done` auf aktuellem `main` bestätigt,
- `VOG-50-THEMES-TO-EDEBATTE-VIDEO-PIPELINE-01` mit Abhängigkeit vom geschlossenen Vorgänger und PR `#624` in den kanonischen operativen Kopf aufnimmt,
- einen ausführbaren Status erst nach separatem positivem Preflight vergibt,
- Review-first und das Verbot von Auto-Publish erhält.
