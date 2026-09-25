# VOXY-DUAL-VOICE-EXPLAINER-PILOT-01

Stand: 2026-08-18
Status: `done` — Narrationsarchitektur, Voice-Auswahl, Pilot und NEWS-5.0-Visual-Canon menschlich angenommen

## Verbindliche Narrationsarchitektur

Die finale menschliche A/B-Entscheidung manifestiert Single Voice als
kanonischen Default:

- `canonicalNarrationArchitecture = single_voice_default`
- `humanNarrationArchitectureAcceptance = accepted`
- `humanSingleVsDualPreference = single_voice`
- `humanSingleVsDualPreferenceAcceptance = accepted`
- `canonicalVoxyVoice = D1 Conversational Dynamic`
- `humanVoxyVoiceAcceptance = accepted`
- `canonicalEditorialVoice = W1 Natural Editorial`
- `humanEditorialVoiceAcceptance = accepted`

`VOXY_SIGNATURE` ist D1 Conversational Dynamic mit der lokalen Voice-ID
`voxy-d1-conversational-dynamic-pr621` und der ausgewählten Variante
`d1-conversational-dynamic`. D1 ist die Default-Narration für den gesamten
normalen Beitrag und spricht Blöcke mit `speakerRole = "voxy"`. Die
reproduzierbare Pipeline nutzt Chatterbox
Multilingual `0.1.7`/V3 auf Modellrevision
`5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18`, die privacy-safe gebundene
Reference 02 / Segment B sowie die menschlich angenommene D1-Parameterkombination.
Time-Stretch ist ausgeschlossen.

`EDITORIAL_VOICE` ist W1 Natural Editorial mit der Voice-ID
`de_DE/m-ailabs_low#ramona_deininger`. Sie spricht ausschließlich Blöcke mit
`speakerRole = "editorial"` und bleibt als menschlich akzeptierte, optionale
redaktionelle Zweitebene erhalten. W1 ist keine Voxy-Variante, aber auch keine
automatische Erklärstimme. Frühere Gender- und Rollenannahmen sind keine
aktuelle kanonische Voice-Bezeichnung.

Die Editorial-Stimme stammt aus Mycroft Mimic 3 / VITS
`mycroft-mimic3-tts 0.2.4`, Modell-Repository
`MycroftAI/mimic3-voices` auf Revision
`b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42`, Datensatz
`M-AILABS German / Ramona Deininger`. Engine-, Modell- und Datensatzlizenzen
sowie die Weight-SHAs bleiben über den Documentary-Bake-off gebunden. Die
Laufzeit arbeitet nach Provisionierung offline und führt keine
Netzwerkanfragen aus. Eine öffentliche Audio- oder Produktionsfreigabe folgt
daraus nicht.

Produktprinzip ist „One host, multiple information states“. Voxy ist der
zentrale Erzähler: Er begrüßt, fragt, erklärt, ordnet ein, führt durch Quellen,
kommentiert Unterschiede, verbindet und synthetisiert Informationen,
reflektiert und schließt ab. Der Default für `HOST`, `FOCUS`, `EXPLAIN`,
`DOCK` und `SYNTHESIS` ist deshalb `speakerRole = "voxy"` mit D1. Visual State
und Speaker Role sind voneinander unabhängig.

Die kompatible Rolle `speakerRole = "editorial"` bleibt erhalten, muss aber
mit einem erlaubten `editorialIntent` bewusst authoriert werden. Erlaubte
Fälle sind Querinformation, ein klar abgegrenzter Kontextblock, ein
redaktioneller Einschub, eine zusätzliche Perspektive, ein bewusst als zweite
Ebene inszenierter Quellenhinweis, Meta-Einordnung oder eine bewusst markierte
Zusammenfassung außerhalb von Voxys Hauptnarration. Ohne `editorialIntent`
bindet der Resolver fail closed auf Voxy/D1; ein Visual State allein darf W1
nicht wählen. Ein unbekannter Intent ist ein Contract-Fehler.

Bei direkter Zuschaueransprache eröffnet Voxy den zusammenhängenden Beitrag
genau einmal mit „Hallo Nachbar,“. Die Begrüßung wird weder vor weiteren
Voxy-Segmenten wiederholt noch von Editorial verwendet. Sehr kurze
Einblendungen, Übergänge und nicht direkt adressierende Informationssegmente
erhalten keine erneute Begrüßung. Dies setzt die bestehende Brand Narrative
ohne Ausnahme um.

Während Editorial spricht, bleibt Voxys Mund neutral oder geschlossen und
erhält kein Lip-Sync auf die Editorial-Stimme. Voxy bleibt mit subtiler
Idle-Bewegung als Gastgeber anwesend. Es gibt keinen zweiten Avatar und genau
eine Waveform; sie reagiert jeweils auf die aktive Stimme.

Die historischen Bake-offs, v1 bis v1.3 sowie beide A/B-Varianten bleiben
unverändert erhalten. Sie belegen ausschließlich ihre historischen Pipeline-
und Review-Stände. A dokumentiert den technisch bestandenen D1/W1-Pfad, B den
technisch bestandenen D1-only-Pfad. Die Human-Entscheidung verwirft W1 nicht,
sondern ändert ausschließlich dessen Einsatz vom automatischen Default zur
explizit authorierten Editorial Layer.

## Evidence-first Visual Grammar

Voxy ist Gastgeber der Sendung, aber nicht permanent das größte visuelle
Element. Sobald konkrete Information erklärt wird, übernimmt das
Informationsobjekt die visuelle Hauptrolle.

### `HOST`

Voxy ist primärer Fokus für Einführung, Frage, Übergang, Reflexion und CTA.

### `FOCUS`

Die aktive Quelle, ein Chart, eine Karte, ein Dokument, Bild, eine Statistik,
ein Zitat oder eine Trenddarstellung fährt groß in den Vordergrund. Das
Informationsobjekt erhält maximalen visuellen Raum; Voxy tritt sichtbar zurück.
Quelle und Herkunft bleiben erkennbar, relevante Datenstellen dürfen gezielt
hervorgehoben werden.

### `EXPLAIN`

Voxy/D1 erklärt standardmäßig weiter, während die aktive Information groß
bleibt und die Visualisierung der Narration folgt. Charts dürfen sich entlang
der Narration aufbauen, Dokumentstellen markiert und Karten oder Trends
fokussiert werden. Dekorative Animation ohne Informationswert ist unzulässig.
W1 folgt aus `EXPLAIN` nicht automatisch und ist nur mit explizitem
`editorialIntent` zulässig.

### `DOCK`

Nach der Erklärung verkleinert sich das Informationsobjekt kontrolliert und
wandert in die rechte Evidence-/Summary-Zone. Es verschwindet nicht abrupt;
Quelle und Herkunft bleiben nachvollziehbar.

Diese Zone ist keine statische Sidebar, sondern das dynamische visuelle
Gedächtnis des Beitrags. Sie kann Quellen, Kennzahlen, Trends, Argumente,
Gegenargumente, Zitate, offene Fragen, Unsicherheiten und
Abstimmungsergebnisse speichern. Bereits gedockte Elemente dürfen erneut in
`FOCUS` geholt werden.

### `SYNTHESIS`

Mehrere zuvor erklärte Evidence-Elemente werden gemeinsam sichtbar.
Beziehungen, Widersprüche oder Übereinstimmungen dürfen visualisiert werden;
Voxy/D1 synthetisiert standardmäßig selbst. Eine bewusst markierte Editorial-
Zusammenfassung ist nur mit explizitem `editorialIntent` zulässig.

Der kanonische Informationsfluss lautet:

`VOXY / HOST → VOXY + INFORMATION / FOCUS → VOXY + INFORMATION / EXPLAIN → VOXY + INFORMATION / DOCK → VOXY / HOST → VOXY + nächste INFORMATION / FOCUS → VOXY + INFORMATION / EXPLAIN → VOXY + INFORMATION / DOCK → VOXY / SYNTHESIS → VOXY / REFLECTION OR CTA`

## Source-first-Prinzip und Chart-Verhalten

Die visuelle Priorität lautet:

1. Originalquelle oder Originaldaten
2. daraus nachvollziehbar erzeugte Visualisierung
3. klar gekennzeichnete redaktionelle Zusammenfassung

Zuschauende müssen nachvollziehen können, woher die Information kommt, was die
Quelle zeigt, welcher Teil relevant ist und wie daraus die gezeigte Aussage
abgeleitet wurde. Erfundenen Charts, dekorativen Fake-Daten und Quellen nur im
Kleingedruckten wird ausdrücklich widersprochen.

Charts sind narrative Objekte. Entlang der Erklärung dürfen zunächst Achse,
relevante Datenreihe, fokussierter Zeitraum, Vergleichswert und relevanter
Punkt erscheinen; anschließend folgt der vollständige Kontext und danach
gegebenenfalls `DOCK`. Die Animation folgt der Information.

## Privater Pilot „Was ist eDebatte?“

Der Pilot verwendet exakt diese sieben sichtbaren Textblöcke:

1. `voxy` / `VOXY_SIGNATURE`:

   > Hallo Nachbar,
   > ich bin Voxy.
   >
   > Und ich möchte dir zeigen, warum eDebatte mehr ist
   > als eine weitere Plattform für politische Meinungen.

2. `voxy` / `VOXY_SIGNATURE`: „Nehmen wir eine politische Frage. Meistens begegnen uns dazu Schlagzeilen, einzelne Zahlen und ziemlich schnell zwei gegensätzliche Lager.“
3. `editorial` / `EDITORIAL_VOICE`: „eDebatte führt Quellen, Argumente und unterschiedliche Perspektiven zusammen. Dabei wird sichtbar, was belegt ist, wo Aussagen einander widersprechen und welche Fragen noch offen sind.“
4. `voxy` / `VOXY_SIGNATURE`: „Und genau hier komme ich wieder ins Spiel. Ich sage dir nicht, welche Seite recht hat.“
5. `voxy` / `VOXY_SIGNATURE`: „Ich helfe dir dabei, selbst herauszufinden, was du davon hältst.“
6. `editorial` / `EDITORIAL_VOICE`: „Kurz gesagt: verstehen, prüfen, einordnen und anschließend selbst entscheiden.“
7. `voxy` / `VOXY_SIGNATURE`: „Das ist eDebatte. Und ich bin Voxy.“

Der implementierte Pilot erreicht 1920 × 1080 Pixel, 24 fps und 45,928
Sekunden. Er zeigt
`HOST → FOCUS → EXPLAIN → DOCK → HOST` und abschließend eine
`SYNTHESIS`-Situation. Die privaten Outputs enthalten MP4, WebM, WAV-Master,
Preview, Contact Sheet, `speaker-timeline.json`,
`visual-state-timeline.json`, fünf State-Standframes und Manifest. Jede
Timeline-Zeile enthält `start`, `end`, `speakerRole`, `voiceId` und `text`.

Charakter, Kopf, Kopfhörer, Jacke, Pin, Pocket-Mark, Mouth v4.1, Mundanker,
Pivot, Studio, Kamera und die einzelne Waveform bleiben eingefroren. Es gibt
keinen zweiten Avatar und kein visuelles Redesign.

Der Pilot ist ausschließlich private Human-Review-Evidence. Er wurde lokal in
einem ignorierten Symlink-Ziel außerhalb des Git-Worktrees gerendert. Keine
private Rohreferenz, kein privater Referenzpfad und kein synthetisiertes Audio
wird committed oder als PR-/CI-Artefakt hochgeladen. Es wurde keine allgemeine
autonome News-Produktion implementiert und weder Upload, Deployment,
Publishing noch Production autorisiert. `humanPilotAcceptance = pending`,
`productionEligible = false` und `autoPublish = false`.

## Spätere Formatfamilie

`VOXY_NEWS`, `VOXY_EXPLAINER`, `VOXY_DOSSIER`, `VOXY_BALLOT` und
`VOXY_SOCIAL_SHORT` sollen denselben Single-Voice-Default, optionalen
Editorial-Intent und Visual-State-Vertrag nutzen. Für sie werden in diesem
Slice weder parallele Voice-Systeme noch eine Produktion implementiert.

## Technische Pilot-Evidence — 2026-08-17

Der revisionsgebundene lokale Render auf Exact Head
`c8c67a500c3fae9d1f926a55cc6ab23a83a1b814` hat den technischen Pilot-Gate
bestanden. Artifact-ID:
`voxy-dual-voice-explainer-pilot-01-c8c67a500c3f`.

Das private Paket unter
`artifacts/voxy-dual-voice-explainer-pilot-01/` enthält:

- `voxy-dual-voice-explainer-pilot-01.mp4` mit H.264/AAC;
- `voxy-dual-voice-explainer-pilot-01.webm` mit VP9/Opus;
- `master-audio.wav` als 48-kHz-Mono-PCM;
- `preview.png`, `contact-sheet.png` und Standframes für `HOST`, `FOCUS`,
  `EXPLAIN`, `DOCK` und `SYNTHESIS`;
- explizite Speaker- und Visual-State-Timelines;
- ein SHA- und FFprobe-gebundenes `manifest.json`.

FFprobe bestätigt 1920 × 1080, 24 fps, Audio in beiden Videocontainern und
45,928 Sekunden MP4-/WAV-Dauer; WebM liegt containerbedingt bei 45,936
Sekunden. Die Timeline enthält exakt sieben Blöcke. Voxy nutzt ausschließlich
`voxy-signature-e-5a465a33`, Editorial ausschließlich
`de_DE/m-ailabs_low#ramona_deininger`. Editorial erzwingt sichtbar den
geschlossenen Mouth-v4.1-Zustand; nur Voxy erhält amplitudenbasiertes
Mouth-Sync. Genau eine Waveform reagiert auf die jeweils aktive Stimme.

Die visuelle Timeline lautet vollständig:

`HOST → FOCUS → EXPLAIN → DOCK → HOST → FOCUS → EXPLAIN → DOCK → SYNTHESIS → HOST`.

Alle fünf Informationsobjekte sind deutlich als `DEMO / FORMAT-FIXTURE`
markiert. Der zweite Explain-Zyklus baut Dokumentstruktur, relevante Stelle
und abgeleiteten Kontext narrationsgeführt auf. Die Synthese verwendet alle
zuvor gedockten Objekte erneut. Die visuelle Selbstprüfung der fünf
Standframes bestätigt den technischen Vertrag; die qualitative menschliche
Bewertung von Stimme, Rhythmus, Fokuswechsel, Docking und Formatwirkung bleibt
ausdrücklich offen.

Bekannte Restabweichungen:

- Mouth-Sync ist geglättet amplituden- statt phonem- oder wortbasiert;
- die visuelle Bewegung wird mit 12 einzigartigen Zuständen pro Sekunde
  gerendert und frameverdoppelt in einen validen 24-fps-Container geschrieben;
- die Informationsobjekte belegen ausschließlich die Formatgrammatik und sind
  keine realen Quellen, Statistiken oder Produktdaten;
- `humanPilotAcceptance = pending`, `productionEligible = false` und
  `autoPublish = false` bleiben unverändert.

## Human-Review Correction Pass v1.1 — 2026-08-17

Der bestehende technische Pilot bleibt unverändert erhalten. Der ausdrücklich
autorisierte Correction Pass liegt separat unter
`artifacts/voxy-dual-voice-explainer-pilot-01/v1.1/` und simuliert einen
redaktionellen Demokratie-Beitrag ohne aktuelle Tatsachenbehauptung. Alle drei
Informationsobjekte sind sichtbar als `DEMO · ILLUSTRATION` gekennzeichnet:

- E1 `democracy-trust`: illustrierter Vertrauensverlauf ohne reale Werte;
- E2 `democracy-participation`: eigenständiger illustrierter
  Beteiligungsindikator;
- E3 `democracy-open-question`: „Fühlen sich Menschen politisch wirksam?“.

Der revisionsgebundene Render auf Exact Head
`afc6cccfc81df0e0f6b7ba8f9c7d462853e94dcb` hat den technischen Gate
bestanden. Artifact-ID: `voxy-democracy-pilot-v1-1-afc6cccfc81d`. FFprobe
bestätigt 1920 × 1080, 24 fps, H.264/AAC im MP4, VP9/Opus im WebM sowie
56,005 Sekunden MP4-/WAV-Dauer; die WebM-Containerdauer beträgt 56,013
Sekunden.

Die neun Sprechersegmente setzen das verbindliche Demokratie-Skript um. Voxy
spricht ausschließlich mit der männlichen Signature-Stimme
`voxy-signature-e-5a465a33`, Variante `e-02-warm-sovereign`; Editorial
ausschließlich mit der weiblichen Stimme
`de_DE/m-ailabs_low#ramona_deininger`. Der Renderer verifiziert die akzeptierte
private First-Party-Referenzauswahl und ihren ausgewählten Segment-Hash, bindet
die Synthese-Backends hart an die Rollen und bricht bei jeder Kreuzung
geschlossen ab. Zusätzlich werden alle normalisierten Segmente auf
Nicht-Stille und ihre PCM-identische Präsenz im finalen WAV-Master geprüft.
Das Manifest bestätigt für alle neun Segmente `pcmIdentityMatch = true`, keine
Rollen-/Voice-Kreuzung und beide Stimmen tatsächlich im finalen Master.

Gesprochene Sätze werden nicht im Bild wiederholt. Accessibility-Untertitel
liegen ausschließlich separat als `captions.de.vtt` und `captions.de.srt` vor;
`burnedInLowerText = false`. Sichtbarer Text beschränkt sich auf semantische
Frage-, Evidence- und Herkunftsangaben.

E1 und E2 verwenden in `FOCUS`, `EXPLAIN`, der kontinuierlichen
Scale-/Translation-Bewegung nach `DOCK` und im dynamischen Gedächtnis jeweils
dieselbe `evidenceId` und `visualIdentity`. Es gibt weder harte Substitution
noch Crossfade auf ein anderes Objekt. In `SYNTHESIS` werden E1 und E2 sichtbar
in Beziehung gesetzt und E3 als offene Frage abgeleitet, nicht als dritter
unabhängiger Kartenstapel. Der zehnteilige Review-Satz enthält ausdrücklich
einen Frame mitten im ersten FOCUS→DOCK-Morphing.

Während Editorial spricht, bleibt Voxy sichtbar und subtil präsent, sein Mund
jedoch neutral geschlossen und ohne amplitudenbasierte Bewegung; das
Informationsobjekt übernimmt den Fokus. Charakter, Studio, Mouth-v4.1-Geometrie,
Pivot, Material-/Lichtwirkung und die einzelne aktive Waveform bleiben
eingefroren.

Das private v1.1-Paket enthält die benannten MP4-, WebM- und WAV-Dateien,
separate VTT-/SRT-Untertitel, Preview, Contact Sheet, zehn Standframes,
Speaker-, Visual-State- und Evidence-Timeline sowie ein SHA- und
FFprobe-gebundenes Manifest. Der Privacy-Scan findet keine privaten
Referenzpfade in den JSON-Artefakten. Die älteren Pilot-Artefakte im
übergeordneten Ordner wurden nicht überschrieben.

Der Pass ist ausschließlich technische Human-Review-Evidence:
`technicalPilotGate = passed`, `humanPilotAcceptance = pending`,
`humanVoiceMappingAcceptance = pending`,
`humanNews5VisualAcceptance = pending`, `productionEligible = false` und
`autoPublish = false`. Es erfolgten weder Upload, Deployment, Publishing noch
eine Produktionsfreigabe.

## Human Voice Identity Checkpoint — 2026-08-17

Dieser Abschnitt ersetzt alle früheren Identitäts- und Gender-Ableitungen in
diesem Dokument. Die historischen technischen Voice-IDs, Backends, Parameter
und Audio-SHAs bleiben als Provenienz erhalten, sind aber kein Beweis für eine
menschlich wahrgenommene Sprecheridentität.

Der verbindliche Human Review von v1.1 widerspricht dem technischen
Voice-Mapping-Gate:

- `technicalVoiceMappingGate = passed` bedeutet nur, dass die vorgesehenen
  technischen Pfade den Rollen zugeordnet und deren PCM-Segmente im Master
  enthalten waren;
- `humanVoiceIdentityAcceptance = failed`;
- `humanEditorialVoiceAcceptance = failed_for_v1.1`;
- `humanPilotAcceptance = needs_changes`;
- `canonicalVoxyVoice = pending` und `canonicalEditorialVoice = pending`;
- Gender-Labels sind bis zur menschlichen Auswahl unzulässig;
- `videoRenderingAllowed = false`, `productionEligible = false` und
  `autoPublish = false`.

Der Provenienz-Audit weist nach, dass `candidate-b`
`reference-02-segment-b` nutzt, während `candidate-c` und `candidate-e`
`reference-01-segment-b` nutzen. Die beiden Originalreferenzen stammen laut
verbindlichem Human-Befund von verschiedenen Personen. Historische Namen wie
„Ricky“, „Voxy“ oder „Signature“ und Kandidatenbuchstaben dürfen daher nicht
als Identitätsnachweis verwendet werden. Sowohl v1 als auch v1.1 nutzten für
die als Voxy getaggten Blöcke `candidate-e` mit Referenz 01.

Der formal als Editorial markierte Pfad ist in v1 und v1.1 dagegen technisch
identisch: Mycroft Mimic 3 / VITS `0.2.4`, Modellrevision
`b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42`, Voice
`de_DE/m-ailabs_low#ramona_deininger`, deterministisch, `noise-scale = 0`,
`noise-w = 0`, `length-scale = 1.12` und identisches Loudness-Finishing. Zwei
unabhängige Reproduktionen desselben Vergleichssatzes sind byteidentisch. Die
Hördifferenz lässt sich deshalb nicht mit einer geänderten Voice-ID oder einem
anderen Modell erklären.

Für v1.1 ist zusätzlich ein konkreter textabhängiger Qualitätsfehler belegt:
Der Block mit vier offenen Fragen wird mit genau diesem Pfad reproduzierbar auf
1,038 Sekunden verkürzt. Der SHA der reproduzierten fertigen Datei stimmt mit
dem im v1.1-Manifest dokumentierten Segment-SHA überein. Außerdem bestand v1
aus 31,737 Sekunden `candidate-e`-/Referenz-01-Audio und nur 10,471 Sekunden
formal getaggtem Editorial-Audio. Es ist deshalb plausibel, aber technisch
nicht entscheidbar, dass die positiv erinnerte weibliche Stimme aus v1 die
dominante Referenz-01-Stimme war. Diese Zuordnung bleibt dem Human Review
vorbehalten.

Der private, nicht getrackte Audio-Audition-Pack liegt außerhalb des Repos
unter `voxy/voice/review/voxy-identity-check-pr621/`. Er enthält B, C und E mit
identischem Text, den Editorial-A/B-Vergleich, einen unveränderten Ausschnitt
des ersten formal getaggten v1-Editorial-Blocks sowie privacy-safe README- und
Manifest-Metadaten. Zu diesem damaligen Checkpoint wurde kein Video und kein
v1.2-Render erzeugt.

## Finaler Voice-Freeze und Pilot v1.2 — 2026-08-17

Dieser Abschnitt ersetzt den vorstehenden Human-Voice-Checkpoint als aktuellen
Entscheidungsstand, ohne dessen historische Audit-Evidence umzuschreiben. Die
verbindliche menschliche Auswahl lautet:

- `canonicalVoxyVoice = D1 Conversational Dynamic` und
  `humanVoxyVoiceAcceptance = accepted`;
- `canonicalEditorialVoice = W1 Natural Editorial` und
  `humanEditorialVoiceAcceptance = accepted`;
- keine weitere Voice-Auswahl, Optimierung oder Fallback-Pipeline.

Der private v1.2-Render wurde revisionsgebunden auf Exact Head
`4f7a30c7feda68d7afde6f592acf394dae444031` erzeugt. Artifact-ID:
`voxy-democracy-pilot-v1-2-4f7a30c7feda`. Er liegt separat unter
`artifacts/voxy-dual-voice-explainer-pilot-01/v1.2/`; v1 und v1.1 wurden nicht
überschrieben.

Die D1-Pipeline ist an die private menschliche Review-Evidence mit SHA-256
`0cbbacefd3f19332fdc879deae4b683a86a586a431b81d4ce668b4880a52da48`,
Reference 02 mit SHA-256
`ffd2dd8686f0d29c524174c57572a3c188da64d59a0a8451ae94cbb5252ae5bd`
und deren Segment B mit SHA-256
`72e1b6ce77bad94da04babd1d66c3c7401f89b42fe7ff8df2076ac076b713f09`
gebunden. Die Synthese nutzt Seed `62122`, Exaggeration `0.47`, CFG Weight
`0.32`, Temperature `0.7`, Repetition Penalty `1.2`, Min-P `0.05`, Top-P `1`
und Pause Scale `0.92`. Es gibt kein Time-Stretch.

Die W1-Pipeline ist an die private menschliche Review-Evidence mit SHA-256
`773e7cf521a1760e463d50a3d27be25247ebaba06025c582985c1a45a00d3f90`
gebunden. Mimic 3 `0.2.4` nutzt Modellrevision
`b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42`, die verifizierten Modellfiles,
deterministische Synthese, Noise Scale und Noise Width Scale `0`, Length Scale
`1.12` sowie ausschließlich Loudness-Finishing. Es gibt keine Zeitkompression.

Der Audio-Assembly-Gate prüft nicht nur Voice-IDs: Alle neun fertigen
Rollensegmente sind nicht-stumm und ihre PCM-Daten liegen byteidentisch in den
zugehörigen Fenstern des finalen WAV-Masters. Alle Voxy-Fenster stammen aus D1,
alle Editorial-Fenster aus W1. Das Manifest bestätigt keine Rollenvertauschung,
keinen Fallback, keine Zeitkompression und ausschließlich die beiden
kanonischen Pipelines.

FFprobe bestätigt für MP4 und WebM 1920 × 1080 Pixel, 24 fps sowie Audio. Das
MP4 und der 48-kHz-Mono-PCM-Master dauern 64,173 Sekunden, das WebM
containerbedingt 64,181 Sekunden. Der natürliche Sprachlauf wurde nicht auf
die v1.1-Slots komprimiert; die Bildregie passt ihre Dauer an die Sprache an.
Der MP4-SHA ist
`973e019e33b6c4ad18100c78b9ee7e8d34eed870011641a90575ba947abe6f0a`,
der Master-Audio-SHA
`da1df257a3172faa470ce80d4e6b3e07a20e6f7ebeb0e88bd52459bcbb9bb688`.

Die visuelle Timeline bleibt vollständig
`HOST → FOCUS → EXPLAIN → DOCK → HOST → FOCUS → EXPLAIN → DOCK → SYNTHESIS → HOST`.
Review-Frames und Contact Sheet bestätigen die unveränderte Evidence Memory,
identitätsstabiles FOCUS→DOCK, die vorhandenen Demo-/Illustration-Labels, keine
eingebrannten Captions sowie den neutral geschlossenen Voxy-Mund während W1.
Mouth v4.1, Visual Canon und genau eine aktive Waveform bleiben eingefroren.

Der Privacy-Scan der JSON-, VTT- und SRT-Artefakte findet keine privaten
Referenz-, Evidence-, Cache- oder Benutzerpfade. Private Audios und alle
v1.2-Artefakte bleiben außerhalb von Git; es erfolgten kein Upload, Deployment,
Publishing oder Produktionsfreigabe.

Der aktuelle Gate-Stand lautet:

- `technicalPilotGate = passed`;
- `humanVoiceAcceptance = accepted`;
- `humanPilotAcceptance = pending`;
- `humanNews5VisualAcceptance = pending`;
- `productionEligible = false`;
- `autoPublish = false`.

## Human-Accepted Voice Preservation — Audio-only Micro-Fix

Der nachgelagerte Human Review bestätigt D1 und W1 weiterhin als kanonische
Stimmen, verwirft aber dynamisches oder klanggestaltendes Mastering nach der
Synthese. Der künftige Renderpfad ist deshalb fail-closed auf technisch
notwendige Sample-/Formatangleichung und transparenten PCM-Zusammenbau
umgestellt. Es wurde in diesem Pass kein Video gerendert; das bestehende
v1.2-Paket bleibt unverändert.

Für beide Rollen sind dynamische Normalisierung, Compressor, Pitch-, Tempo-
oder Time-Stretch-Bearbeitung und EQ deaktiviert. W1 erhält ausschließlich
22,05→48-kHz-Mono/PCM-Resampling und `0 dB` statischen Gain. D1 erhält
24→48-kHz-Mono/PCM-Resampling sowie `+9 dB` transparenten statischen Gain. Der
D1-Gain beruht nicht auf einem abstrakten LUFS-Ziel: Im konkreten Dialogtest
lag das ungefilterte D1-Opening bei −26,9 LUFS gegenüber W1 bei −16,0 LUFS;
`+9 dB` bringt D1 auf −17,9 LUFS und erhält −1,4 dBFS Peak-Headroom.

Ein Limiter oder anderer Peak-Prozessor war nicht erforderlich. W1 berührt in
einem isolierten Sample die negative Vollaussteuerung, zeigt aber weder
aufeinanderfolgende Vollaussteuerungs-Samples noch ein Clipping-Plateau.

Der private Audio-only-Check liegt außerhalb von Git unter
`voxy/voice/review/voice-preservation-check/`. Für W1 und D1 ist die jeweilige
Accepted-Evidence byteidentisch mit ihrem transparenten Master-Pfad:

- W1: SHA-256
  `773e7cf521a1760e463d50a3d27be25247ebaba06025c582985c1a45a00d3f90`,
  −17,7 LUFS, −2,3 dBFS Peak, 48 kHz, 9,008271 Sekunden;
- D1: SHA-256
  `0cbbacefd3f19332fdc879deae4b683a86a586a431b81d4ce668b4880a52da48`,
  −18,2 LUFS, −1,5 dBFS Peak, 48 kHz, 26,987 Sekunden.

Der 13,990771 Sekunden lange D1/W1-Dialogtest verwendet 320-ms-Übergänge,
keine künstlich langen Pausen und keine dynamische Normalisierung. D1 und W1
bestehen den technischen Voice-Preservation-Gate. Menschliche Abnahme des
Audio-only-Dialogtests bleibt von diesem technischen Befund getrennt.

## Finaler Human-Review-Render v1.3 — Voice Preservation

Der private v1.3-Render wurde revisionsgebunden auf Exact Head
`cc17906f9fe04a75b5256529ea6284ba32d6ad5b` erzeugt. Artifact-ID:
`voxy-democracy-pilot-v1-3-cc17906f9fe0`. Er liegt separat unter
`artifacts/voxy-dual-voice-explainer-pilot-01/v1.3/`; v1, v1.1 und v1.2
blieben unverändert. Der v1.2-MP4-SHA ist weiterhin
`973e019e33b6c4ad18100c78b9ee7e8d34eed870011641a90575ba947abe6f0a`.

Der v1.3-Pfad ersetzt den pauschalen D1-`+9 dB`-Wert aus dem vorstehenden
Audio-only-Dialogtest ausdrücklich durch eine segmentweise Mess- und
Entscheidungskette. Für jedes der neun Segmente dokumentiert
`audio-preservation.json` Eingangsloudness, Eingangs-True-Peak, tatsächlich
angewendeten statischen Gain, Ausgangsloudness, Ausgangs-True-Peak,
Sample-Rates, Dauer und die konkrete FFmpeg-Filterliste. Es gibt fünf
unterschiedliche D1-Gains (`+5,2` bis `+10,6 dB`) und vier unterschiedliche
W1-Gains (`−2,7` bis `−4,3 dB`); es wurde somit kein Rollen-Gain pauschal
angewendet. Positive Gains wurden segmentweise durch den gemessenen
True-Peak-Headroom begrenzt.

Der einzige Audiofilter eines Segments ist, sofern der gemessene statische
Gain nicht `0 dB` beträgt, ein transparenter `volume`-Filter. Anschließend
erfolgen ausschließlich Mono-/PCM-Formatangleichung und technisch notwendiges
Resampling von D1 `24→48 kHz` beziehungsweise W1 `22,05→48 kHz`. Loudnorm,
dynamische Normalisierung, Compressor, Limiter, EQ, Pitching, Tempoänderung,
Time Stretch, Reverb und Exciter sind nicht Teil des Pfads. Alle Segmentdauern
bleiben dabei auf die Millisekunde unverändert. Der höchste gemessene
Ausgangs-True-Peak beträgt `−1,0 dBFS`; Clipping wurde nicht festgestellt.

Der PCM-Assembly-Gate bestätigt erneut alle neun nicht-stummen Segmente
byteidentisch in den zugehörigen Fenstern des finalen WAV-Masters. Alle
Voxy-Fenster sind D1, alle Editorial-Fenster W1; Rollenvertauschung, alte
Voice-Pipeline und Fallback sind ausgeschlossen. Das Master-Audio misst
`−19,1 LUFS`, `5,8 LU` LRA und `−1,0 dBFS` True Peak. Der Master-SHA ist
`2dd4a07ae7482ef30bf2c3fb76ee99a148c695718be73d02ee41b79478547293`.

FFprobe bestätigt 1920 × 1080 Pixel und 24 fps. MP4 und PCM-Master dauern
64,173 Sekunden; das WebM dauert containerbedingt 64,181 Sekunden. Der
MP4-SHA ist
`85096379498e0f6eeeb688e53c18471a4be2bb4632c160a0276bce2f41a23af6`,
der WebM-SHA
`8cf1898affe04c3bbd0a2bba0c96b408e5ac05443bcb28605e7ee3a327f5cdcd`.
Die natürliche Sprache bestimmt weiterhin die Szenendauer; kein Audio wurde
auf ältere Bildslots gezwungen.

Preview und Contact Sheet bestätigen den unveränderten Visual Canon mit
`HOST → FOCUS → EXPLAIN → DOCK → HOST → FOCUS → EXPLAIN → DOCK → SYNTHESIS → HOST`,
identitätsstabilem FOCUS→DOCK, Evidence Memory, genau einer Waveform, Mouth
Sync nur für D1, neutralem Editorial-Mund und Sidecar-Captions ohne
eingebrannten Text. Der Privacy-Scan der JSON-, VTT- und SRT-Dateien findet
keine privaten Benutzer-, Referenz-, Evidence- oder Cachepfade. Private
Audios und Renderartefakte bleiben außerhalb von Git.

Der Gate-Stand nach v1.3 lautet:

- `technicalPilotGate = passed`;
- `humanVoiceAcceptance = accepted`;
- `humanPilotAcceptance = pending`;
- `humanNews5VisualAcceptance = pending`;
- `productionEligible = false`;
- `autoPublish = false`.

Es erfolgten kein Merge, Ready-for-Review, Deployment, Upload, Publishing oder
Produktionsfreigabe.

## Human-A/B-Evidence und finale Narrationsentscheidung

Als zunächst nicht-kanonische Variante B wurde auf Exact Head
`e6363026303b83d5ff52a338e917176ed2ad1d48` ein separater privater
Single-Voice-Render erzeugt. Artifact-ID:
`voxy-democracy-pilot-v1-3-single-voice-e6363026303b`. Er liegt unter
`artifacts/voxy-dual-voice-explainer-pilot-01/v1.3-single-voice/`. Variante A
bleibt der unveränderte v1.3-Dual-Voice-Render. Dessen MP4-, Master-Audio- und
Manifest-SHAs sind weiterhin
`85096379498e0f6eeeb688e53c18471a4be2bb4632c160a0276bce2f41a23af6`,
`2dd4a07ae7482ef30bf2c3fb76ee99a148c695718be73d02ee41b79478547293`
und `93ff73626b8e45102b2c9f616d8036765a3447689f43d027c4f7fd9f0a305a9d`.

Variante B verwendet für alle neun unveränderten Textsegmente ausschließlich
D1 Conversational Dynamic. Die Speaker-Timeline enthält neunmal
`speakerRole = voxy` und die Voice-ID
`voxy-d1-conversational-dynamic-pr621`; W1, eine alte Voice-Pipeline oder ein
Fallback wurden nicht verwendet. Die fünf bereits in A vorhandenen
D1-Segmente behalten ihre Seeds und ihre fertig bearbeiteten PCM-SHAs exakt.
Nur die vier in A von W1 gesprochenen Textsegmente wurden als zusätzliche
D1-Takes mit denselben eingefrorenen Synthese- und Prosodieparametern erzeugt.

Der Voice-Preservation-Pfad entspricht v1.3: segmentweiser statischer Gain,
24→48-kHz-Mono/PCM-Resampling und transparenter PCM-Zusammenbau. Loudnorm,
Compressor, Limiter, EQ, Pitching, Tempoänderung, Time Stretch, Reverb und
Exciter sind ausgeschlossen. Alle neun nicht-stummen D1-Segmente liegen
byteidentisch in ihren Masterfenstern. Der 70,983 Sekunden lange Master misst
`−20,0 LUFS`, `5,2 LU` LRA und `−1,0 dBFS` True Peak. Der Master-SHA ist
`6e3182db9d7fc01d0cdcb69c625f6a8457b494518f884cdfc29f449323e0f09d`.

FFprobe bestätigt für B 1920 × 1080 Pixel, 24 fps und 48-kHz-Mono-Audio. Der
MP4-SHA ist
`3760d1bcd5b40ffafa18ce9239c5d5aa579ad95af7673a02bad494ba1a8ed47c`,
der WebM-SHA
`22b366d68a5cf2c19469783bf730bd47c79328b7d5675af681812e941418f048`.
Die natürliche D1-Sprechdauer bestimmt die neue Timeline; der Text wurde nicht
geändert und nicht auf A-Zeitfenster gezwungen.

Die visuelle State-Folge bleibt
`HOST → FOCUS → EXPLAIN → DOCK → HOST → FOCUS → EXPLAIN → DOCK → SYNTHESIS → HOST`.
FOCUS, identitätsstabiles DOCK, Evidence Memory, SYNTHESIS und genau eine
Waveform bleiben unverändert. Da alle Segmente D1 sind, bleibt Mouth-Sync auch
in sichtbaren EXPLAIN-/SYNTHESIS-Frames aktiv. Preview und Contact Sheet
bestätigen dies ohne Redesign. Der Privacy-Scan findet keine privaten Pfade.

`ab-comparison-notes.md` dokumentiert ausschließlich A, B und die fünf
vorgegebenen Human-Review-Fragen. Es enthält keine subjektive
Gewinnerentscheidung, weil es den technischen Evidence-Stand vor der
nachgelagerten Human-Entscheidung festhält.

Die anschließende menschliche Produktentscheidung bevorzugt Single Voice,
weil sie Voxy als zentrale Persönlichkeit stärkt, und manifestiert B als
kanonischen Default. Dies ist eine Human-Entscheidung und keine technische
Behauptung über subjektive Überlegenheit. A und B bleiben als Evidence
erhalten. Der aktuelle Status lautet:

- `technicalDualVoiceTest = passed`;
- `technicalSingleVoiceTest = passed`;
- `humanSingleVsDualPreference = single_voice`;
- `humanSingleVsDualPreferenceAcceptance = accepted`;
- `canonicalNarrationArchitecture = single_voice_default`;
- `humanNarrationArchitectureAcceptance = accepted`;
- `canonicalVoxyVoice = D1 / accepted`;
- `canonicalEditorialVoice = W1 / accepted`;
- `defaultExplainSpeaker = voxy`;
- `defaultSynthesisSpeaker = voxy`;
- `humanPilotAcceptance = pending`;
- `humanNews5VisualAcceptance = pending`;
- `productionEligible = false`;
- `autoPublish = false`.

## Final Target Layout v1.4 — 2026-08-18

Der gezielte visuelle Korrekturpass baut ausschließlich auf dem menschlich
bevorzugten Single-Voice-B-Piloten auf. Der private Render wurde auf Exact Head
`279ea0f9596f09dc0bf5be401a360b99089bd9ad` erzeugt. Artifact-ID:
`voxy-democracy-pilot-v1-4-final-layout-279ea0f9596f`. Er liegt separat unter
`artifacts/voxy-dual-voice-explainer-pilot-01/v1.4-final-layout/`; v1 bis v1.3
und die A/B-Evidence wurden nicht überschrieben.

Die Narration wurde weder neu synthetisiert noch neu assembliert. Alle neun
gesprochenen Segmente bleiben D1 Conversational Dynamic mit der Voice-ID
`voxy-d1-conversational-dynamic-pr621`; W1 ist in diesem Render vollständig
geparkt und es gibt keinen Fallback oder versteckte zweite Spur. Das
48-kHz-Mono-PCM-Master-Audio ist byte- und PCM-identisch zum akzeptierten
Single-Voice-B-Master. Beide Dateien haben SHA-256
`6e3182db9d7fc01d0cdcb69c625f6a8457b494518f884cdfc29f449323e0f09d`.
Es wurden keine Audiofilter, kein Gain, Resampling, Loudnorm, Compressor,
Limiter, EQ, Pitching, Tempo-/Time-Stretch oder Reverb angewendet.

Das 1920×1080-Broadcastraster setzt die ausdrücklich benannten
Zielbildkorrekturen um:

- links ruhige `VoiceOpenGov`-/`eDebatte`-Brand-Zone;
- klar lesbarer `VOG`-Revers-Pin und genau eine einzeilige
  `eDebatte`-Pocket-Mark ohne Badge, Box, Glow oder Duplikat;
- Thema und Renderdatum oben rechts sowie die dynamische Evidence-Memory-Zone
  direkt darunter;
- identitätsstabiles FOCUS→DOCK als Scale-/Translation desselben
  Evidence-Objekts in die obere rechte Memory-Zone;
- höchstens drei vollständige Memory-Karten und datengetriebene kompakte
  Gruppierung älterer Evidenzen;
- dauerhaftes semantisches Lower Third mit sechs stabilen Inhaltsblöcken,
  360-ms-Fade/Translation, ohne Blinken, Flash, Typewriter,
  Wort-für-Wort-Aufbau oder Spiegelung der gesprochenen Captions;
- separate deutsche VTT-/SRT-Captions ohne eingebrannte Untertitel;
- unveränderter Character-/Studio-/Mouth-v4.1-Canon und genau eine
  audioaktive Waveform hinter Voxy.

Die zehn revisionsgebundenen Standframes decken HOST, stabilen Lower Third,
FOCUS, EXPLAIN, den Mittelpunkt des FOCUS→DOCK-Morphings, einen sowie zwei und
drei gedockte Evidence-Zustände, SYNTHESIS und den finalen HOST ab. Preview und
Contact Sheet wurden daraus neu erzeugt und lokal gegen Pin, Pocket-Mark,
Brand-Zone, obere rechte Memory-Zone, ruhige Textführung, Objektkontinuität und
Waveform-Anzahl geprüft.

FFprobe bestätigt für MP4 H.264/AAC und für WebM VP9/Opus, jeweils 1920×1080,
24 fps und 48-kHz-Mono-Audio. MP4 und PCM-Master dauern 70,983 Sekunden, WebM
containerbedingt 70,991 Sekunden. SHA-256: MP4
`dfb2d4813a708cfc366bd7bcbdfa578f7a44e1b89c29f0748d3c2d011cfd38ca`,
WebM `33022b5775276195edd280f2630a14606c51de106ffee34de9ea99a9f0c9c5ec`,
Preview `c46ef89dc65c842b1c16b1292185d1fafa0260db863ff089ec02200b084c5fb6`
und Contact Sheet
`ca54b2d2bc01443f9b972dd82c02ce441e26eb0a908d77a5057361cdab85f954`.
Der Privacy-Scan der JSON-, VTT- und SRT-Ausgaben findet keine privaten
Benutzer-, Evidence-, Cache- oder Referenzpfade. Private Medien bleiben
außerhalb von Git.

Der Gate-Stand nach v1.4 lautet:

- `technicalFinalLayoutGate = passed`;
- `canonicalNarrationArchitecture = single_voice_default`;
- `canonicalVoxyVoice = D1 / accepted`;
- `canonicalEditorialVoice = W1 / accepted_optional_layer`;
- `w1Used = false`;
- `humanPilotAcceptance = pending_final_layout_review`;
- `humanNews5VisualAcceptance = pending_final_layout_review`;
- `productionEligible = false`;
- `autoPublish = false`.

Der Task bleibt `review`. Der technische Pass ist keine menschliche
Pilot-/NEWS-5.0-Visual-Abnahme und autorisiert weder Merge, Ready-for-Review,
Upload, Deployment, Publishing noch Production.

## Human Final Visual Acceptance und Closing — 2026-08-18

Der Human-Final-Kommentar auf PR #621 akzeptiert den v1.4-Final-Layout-Piloten
als Design- und Format-Canon. Die Entscheidung bezieht sich auf das private,
revisionsgebundene Artefakt
`voxy-democracy-pilot-v1-4-final-layout-279ea0f9596f` und erlaubt den
technischen Closing-Pass:

- `humanPilotAcceptance = accepted`;
- `humanNews5VisualAcceptance = accepted`;
- `canonicalNarrationArchitecture = single_voice_default`;
- `canonicalVoxyVoice = D1`;
- `humanVoxyVoiceAcceptance = accepted`;
- `canonicalEditorialVoice = W1 / accepted_optional_layer`;
- `w1ProductionPathStatus = parked`;
- `productionEligible = false`;
- `autoPublish = false`.

W1 bleibt als menschlich akzeptierte optionale Editorial-Evidence erhalten,
ist im aktuell kanonischen Produktionspfad jedoch nicht aktiv. Es gibt keinen
Fallback, keine Mischung und keine versteckte zweite Spur.

Der Human-Hinweis zu den relativ langen Evidence-/Slide-Standzeiten ist kein
Blocker für PR #621 und keine nachträgliche Einschränkung der visuellen
Acceptance. Verbindlich gilt:

- `pilotEvidenceDwellTimesCanonical = false`;
- `visualStillnessMustNotEqualNarrationDuration = true`;
- `adaptiveEvidenceDwellTimesRequiredForProduction = true`;
- `adaptiveVisualProgressionRequiredForProduction = true`.

Die Demo-Timings aus v1.4 dürfen deshalb nicht unverändert als Homepage-,
Social- oder allgemeiner Produktionsstandard übernommen werden. Während eines
Narrationsblocks müssen semantisch sinnvolle Micro-Progressions möglich sein,
etwa Quellenfokus, Markierung, Chartaufbau, Vergleich, Statusableitung,
Relation, Docking oder Memory-Reorganisation. Diese Folgeanforderung verändert
weder die akzeptierte v1.4-Datei noch deren Human-Gate.

Der Closing-Preflight auf PR-Head
`a9de72e8e9505a629f04542a97a1a0323b335de0` bestätigt:

- 0 Commits hinter `origin/main`;
- PR offen, Draft und `MERGEABLE`;
- Web Contracts, Web Quality, Web Security und Vercel erfolgreich;
- keine offenen, nicht veralteten Reviewthreads;
- Privacy- und Git-Tracking-Gates erfolgreich;
- private Voice- und Renderartefakte außerhalb von Git.

Damit ist `VOXY-DUAL-VOICE-EXPLAINER-PILOT-01` fachlich und technisch `done`.
Merge, Ready-for-Review, Homepage-Integration, Deployment und Publishing
bleiben außerhalb dieses Closing-Passes.
