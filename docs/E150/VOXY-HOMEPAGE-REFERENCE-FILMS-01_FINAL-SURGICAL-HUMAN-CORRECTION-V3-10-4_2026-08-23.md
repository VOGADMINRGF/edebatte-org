# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — V3.10.4 FINAL SURGICAL HUMAN CORRECTION

Datum: 2026-08-23  
Definitiver eDebatte-Render-Head: `4a7665eed374bb17460782ef86a7b3d702138ca5`
Branch: `pr/voxy-homepage-reference-films-01`  
Draft-PR: `#624`  
Operativer Status: `review`

## Ergebnis und Grenze

Nach der erneuten menschlichen Zurückweisung des Schulterzustands ersetzt dieser Nachkorrektur-Pass ausschließlich die unzureichende gefiederte Schulter-Reparatur des früheren V3.10.4-Renders. Er trennt die bewegte eDebatte-Head-Source im 9:16-Profil hart vom kanonischen Body-/Master-Layer. Erst nach vier sauberen Preview-Proofs über den Bewegungszyklus wurde ausschließlich der eDebatte-9:16-Film neu gerendert.

VoiceOpenGov wurde weder geändert noch neu gerendert. Die bereits dokumentierten minimalen responsiven V3.10.4-Korrekturen der Beschluss-/Prozess-Szene und des `WIRKSAME MITBESTIMMUNG`-Cores bleiben unverändert auf Render-Head `d851551a21e4677d66a8843f7f743ced87c0d671`. Gesicht, Kopfbewegung, Körper, Sakko, VOG-Pin, Licht, Mikrofon, Hintergrund, Texte, Dramaturgie, Timings und alle akzeptierten Layouts blieben unverändert.

Das akzeptierte V3.10.3-D1-Audio wurde weder neu erzeugt noch verarbeitet. `spokenText` und der bestehende spoken-only-`Weeg`-Alias wurden nicht verändert. Es gab kein Publishing, Social Posting, Deployment, Homepage-Integration oder Merge. W1 bleibt geparkt. `productionEligible = false`, `autoPublish = false`; Task und PR bleiben bis zur erneuten menschlichen Sichtprüfung auf `review`.

## 1. eDebatte — Schulter/Ärmel

### Konkrete Ursache

Der Head-Rig bewegt eine ausgeschnittene Rasterplatte der kanonischen Voxy-Bühne. Deren bisherige `head-source-clip`-Geometrie reichte außerhalb der tatsächlichen Kopf-/Speech-Bubble-Silhouette bis in den linken Schulter-/Reversbereich. Bei der Kopfbewegung wurden damit fremde Hintergrund- und Kantenpixel über den intakten statischen Sakko-Master geschoben; im vergrößerten 9:16-Bild erschien der dunkle Keil beziehungsweise Patch.

Die erste V3.10.4-Reparatur über einen rekonstruierten und gefiederten Schulterstreifen war nicht ursachengerecht: Sie verdeckte die fehlerhafte Head-Überlagerung nur lokal und wurde nach Human Review verworfen. Diese Feather-Maske wurde vollständig entfernt und nicht weiter vergrößert oder verschoben.

### Definitive technische Korrektur

Nur für `filmId = edebatte` und `layoutProfile = vertical_9_16` gilt nun:

- Die bewegte Head-Source wird durch eine harte, ungefeatherte Silhouetten-Clip-Geometrie vor Schulter, Revers und Oberkörper beendet.
- Der vollständige sichtbare Sakko-/Schulter-/Ärmelbereich stammt aus dem statischen kanonischen Body-/Master-Layer.
- Die durch das begrenzte Head-Plate sichtbar werdende ehemalige statische Tail-Lücke wird ausschließlich innerhalb ihrer kleinen alten Tail-Silhouette mit statischen, angrenzenden Pixeln derselben kanonischen Master-Quelle geschlossen (`data-body-source = canonical-master-adjacent-tail-gap`). Dieser Layer bewegt sich nicht, liegt nicht über Schulter, Revers oder Oberkörper und verwendet exakt dieselbe Studio-Gradierung.
- Es existiert kein Schulter-Feather, kein bewegter Schulter-Patch und kein Beitrag der bewegten Head-Source außerhalb der Kopf-/Speech-Bubble-Silhouette.
- Die Trennung ist mit `data-head-body-separation = silhouette-clipped-head-over-canonical-body` revisionsgebunden.

Gesicht, Kopfbewegung und Speech-Bubble bleiben unverändert. Ebenso unverändert sind Körperproportionen, Sakko, Branding, VOG-Pin, Licht, Mikrofon, Hintergrund und restliche Komposition.

## 2. Schulter-Proofs vor dem Full Render

Commit-exakte Preview-Proofs auf Head `4a7665eed374bb17460782ef86a7b3d702138ca5`:

`/Users/RF/Arbeitsmappe/private-assets/voxy/proofs/voxy-homepage-v3-10-4-shoulder-silhouette-4a7665ee-node20`

| Phase | Datei | SHA-256 |
| --- | --- | --- |
| früh | `edebatte/vertical_9_16/shoulder-01-early.png` | `7ab0604bc8fd35f58584f5c31c0048c701239d87f77c6b3f378e155a11cdef53` |
| Mitte | `edebatte/vertical_9_16/shoulder-02-middle.png` | `ccef0217e7101c80e47bbd0b0247e03fd7a942ecd59c9b5e42e7f2a51c838aa6` |
| maximale Auslenkung | `edebatte/vertical_9_16/shoulder-03-maximum-deflection.png` | `189c9019abf182eb307b9695446e1c79571b50bf3b357aa018cadcd7f7b88b00` |
| spät | `edebatte/vertical_9_16/shoulder-04-late.png` | `9e73dd81f3fff0e373e88485dfd9ee532be16fe47ee9ad36ffc6b37f617000d1` |

Kontaktbogen: `edebatte/vertical_9_16/contact-sheet.png`, SHA-256 `73b8a5eb9107b0bf5d63f6248e490d4452035e7d230ca44e25bc46a42e65990d`.
Preview-Manifest: `preview-manifest.json`, SHA-256 `e79319248f1cda21eddf831ede05d7e0d1929823ea88e4637905624605bb21c3`.

Alle vier Proofs wurden in Originalauflösung `1080×1920` gegen den intakten kanonischen Master geprüft. Früh, Mitte, maximale Auslenkung und spät zeigen denselben natürlichen Stoff-/Ärmelverlauf ohne dunklen Keil, künstliche Naht, Patch oder Gradierungswechsel. Erst danach wurde der Full Render gestartet.

## 3. Privater eDebatte-9:16-Full-Render

Privater Root:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-4-final-human-review-4a7665ee-node20`

- Datei: `edebatte/vertical_9_16/voxy-edebatte-homepage-reference-v1.mp4`
- absoluter Pfad: `/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-4-final-human-review-4a7665ee-node20/edebatte/vertical_9_16/voxy-edebatte-homepage-reference-v1.mp4`
- Exact Render Head: `4a7665eed374bb17460782ef86a7b3d702138ca5`
- `1080×1920`, H.264, `24 fps`, AAC 48 kHz mono
- Dauer: `69,310 s`, `1.664` Frames
- SHA-256: `795e56ff201299c6c3e40eba4577e841823a20a3f61cfdcaf99bb3340c690fdf`
- Renderstatus: `TECHNICAL_PASS`

Der Root enthält absichtlich keinen `voiceopengov`-Ordner. Der Renderer wurde mit dem neuen fail-closed Filmfilter `--film=edebatte` ausgeführt; dadurch konnte VoiceOpenGov nicht versehentlich verändert oder erneut gerendert werden.

### Direkt aus dem finalen MP4 extrahierte Schulter-Evidence

Pfad:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-4-final-human-review-4a7665ee-node20/frame-evidence/mp4-shoulder-proof`

| Phase | Zeitpunkt | Datei | SHA-256 |
| --- | ---: | --- | --- |
| früh | `1,623 s` | `01-early-at-1.623s.png` | `9c006a082d43e687e81b98a237295649509be1a7dd7e1e8ce9bba6a57b275660` |
| Mitte | `31,459 s` | `02-middle-at-31.459s.png` | `4cc8257d7e56e1ddeb5a763c3d33ec1f565eb0c37f92c55aa7f5c1ce953b106` |
| maximale Auslenkung | `42,260 s` | `03-maximum-deflection-at-42.260s.png` | `87796ae6be57bbb0b94b3dd9e5c82df785ad1177e445aebab742dfecad7a2950` |
| spät | `66,144 s` | `04-late-at-66.144s.png` | `abad9798a9343a21e45e18613b918f56cdbae8b127952e938c9c21bee2ecd381` |

Kontaktbogen: `05-shoulder-cycle-contact-sheet.png`, SHA-256 `314e5c4368d7cc8f91d9d91fbafda15f927bbab40f244ad1ef08a1fa51e20d24`.

Auch die vier direkt aus dem finalen MP4 decodierten Frames wurden in Originalauflösung geprüft. Die saubere Silhouetten-Trennung bleibt nach der Videokompression über den gesamten geprüften Bewegungszyklus erhalten.

## 4. VoiceOpenGov unverändert

Es wurden weder VOG-Code noch VOG-Frames noch ein neuer VOG-Full-Render erzeugt. Der zuvor erzeugte V3.10.4-VOG-Kandidat bleibt unverändert unter:

`/Users/RF/Arbeitsmappe/private-assets/voxy/pilots/voxy-homepage-reference-films-v3-10-4-final-human-review-d851551a-node20/voiceopengov/vertical_9_16/voxy-voiceopengov-homepage-reference-v1.mp4`

SHA-256 weiterhin `34849eead2679a34d37b7620a3f9bd861687f034a91bd5a3adff8b501ea13a68`. Die bereits dokumentierten 9:16-Änderungen bleiben unverändert:

- Beschluss/Prozess: `living-mandate-path` und Stufenabstände responsiv entzerrt, `BESCHLUSS` `34 px / 1.08`, sekundäre Stufen `20 px / 1.1`, Loop-Breiten reduziert.
- `WIRKSAME MITBESTIMMUNG`: Core weiterhin `220×168 px`, Aussage `22 px / 1.08`, horizontales Padding `18 px`, Supporting Copy `174 px` maximal und Extremkarten `102 px`/`opacity:.28`.
- Mikrofon-, Presenter- und Face-Safe-Abstände bleiben unverändert.

## 5. D1-Audio byteidentisch und unverändert

Voice-ID: `voxy-d1-conversational-dynamic-pr621`; Human Audio Acceptance: `accepted`; W1: `parked_not_audible`.

- V3.10.3- und neuer eDebatte-Master-WAV: `cmp` byteidentisch
- SHA-256 beider Master-WAVs: `7f63aa0598d54052024782a1364cff91500088e24eeca5c48d5c561d1e59dd0e`
- decodierter Audio-Stream des V3.10.3- und neuen MP4: byteidentisch
- SHA-256 beider decodierter Audioströme: `d3dbff5fcf04feef9412f0833220ecf746637182698aa756e396883f3027ef14`
- Manifest: `mode = byte_identical_accepted_master`, `synthesisInvoked = false`, `processingInvoked = false`

Damit bleiben D1, die akzeptierte Aussprache `Weg`, Captions und Synchronität unverändert. Es wurde keine Sprachsynthese aufgerufen.

## 6. Contracts, lokale Checks und CI

Auf dem definitiven Visual-/Render-Head `4a7665eed374bb17460782ef86a7b3d702138ca5`:

```text
15 Homepage-Vertragsdateien / 129 Tests: PASS
pnpm --dir apps/web typecheck: PASS
pnpm --dir apps/web lint: PASS
git diff --check: PASS
commit-exakte Schulter-Proofs früh/Mitte/maximal/spät: VISUAL_PASS
direkte MP4-Schulter-Proofs früh/Mitte/maximal/spät: VISUAL_PASS
privater eDebatte-9:16-Full-Render: TECHNICAL_PASS
D1 Master-WAV und decodierter MP4-Audiostream: BYTE_IDENTICAL zu V3.10.3
VoiceOpenGov: nicht geändert, nicht gerendert
```

Der bestehende Draft-PR wird auf demselben Branch aktualisiert. Der finale CI-Stand des Evidence-Heads wird nach dem Push ergänzt. Es wird kein Merge ausgelöst.

## Offenes menschliches Gate

Der neue eDebatte-V3.10.4-Kandidat ist technisch für die erneute Human Final Acceptance vorbereitet, aber ausdrücklich noch nicht menschlich akzeptiert. Task und PR bleiben `review`; Merge, Homepage-Integration, Batch-Nutzung, Upload, Deployment und Publishing bleiben bis zur ausdrücklichen menschlichen Schlussfreigabe gesperrt.
