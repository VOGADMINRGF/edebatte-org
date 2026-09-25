# VOXY-HOMEPAGE-REFERENCE-FILMS-01 · Implementation Evidence

Stand: 2026-08-18

Status: `review`

## Ergebnis

Der Slice enthält weiterhin zwei getrennte private 16:9-Referenzfilme auf dem
akzeptierten NEWS-5.0-Canon:

1. eDebatte: **„Prüfen statt glauben.“**
2. VoiceOpenGov: **„Deine Stimme endet nicht am Wahltag.“**

Character, Studio, Mouth v4.1, VOG-Pin, genau eine eDebatte-Pocket-Marke,
genau eine Waveform, Evidence Memory und D1-only bleiben unverändert.
Homepage-Integration, Upload, Deployment und Publishing bleiben ausgeschlossen.

## Human Correction · 2026-08-18

Die erste Review-Fassung war technisch grün, wirkte menschlich aber zu stark
wie derselbe Slide-Baukasten mit ausgetauschtem Inhalt. Diese visuelle
Gleichförmigkeit ist ausdrücklich **nicht akzeptiert**.

Die Korrektur trennt deshalb nicht nur Story und Copy, sondern die sichtbare
Informationsgrammatik:

### eDebatte · `media_forensics`

Der Film wird als Newsroom-/Medienforensik inszeniert:

- Medienwand aus Headline, Push, Zahl und Zitat;
- eine Meldung wird angehalten und auf die Primärquelle zurückgeführt;
- Akteur, Datum, relevante Passage, Kontext, Gegenposition und offene Frage
  werden als Prüfkette sichtbar;
- Quelle und Interpretation werden visuell getrennt;
- die rechte Evidence Memory funktioniert als Quellenakte;
- Kernaussage: **„Die Schlagzeile ist der Anfang – nicht das Ende der
  Recherche.“**
- Schluss: **„Lies die Schlagzeile. Dann geh einen Schritt weiter.“**

Der Film kritisiert Medien nicht pauschal und behauptet keine systematische
Fehlberichterstattung. Er fordert objektiv mehr Nachprüfbarkeit und
Quellentransparenz.

### VoiceOpenGov · `democratic_journey`

Der Film wird als demokratischer Weg nach dem Stimmzettel inszeniert:

- Wahlzettel und Wahltag statt Medienwand;
- der Zeitstrahl läuft nach der Wahl sichtbar weiter;
- `WAHLTAG → PROGRAMM → VERHANDLUNG → ENTWURF → BESCHLUSS → UMSETZUNG → WIRKUNG`;
- Programme, Verhandlungen und Beschlüsse werden nicht miteinander
  gleichgesetzt;
- Beteiligung wird als gesellschaftliches Netzwerk dargestellt, nicht als
  Dokumenten-Slide;
- Kernaussage: **„Eine Wahl dauert einen Tag. Aber eine Entscheidung wirkt
  Jahre.“**

Gertrude Lübbe-Wolffs Buch **„Demophobie. Muss man die direkte Demokratie
fürchten?“** (Vittorio Klostermann, 2023) wird als klar gekennzeichneter
Diskussionsimpuls eingebunden. Daraus wird keine Produktfunktion und keine
Autoritätsbehauptung abgeleitet. Der Film formuliert ausdrücklich keine
Forderung, jede politische Sachfrage direkt abzustimmen.

## Source Update

Zusätzlich im Source Registry:

- Gertrude Lübbe-Wolff: *Demophobie. Muss man die direkte Demokratie
  fürchten?*, Vittorio Klostermann, 2023;
- Publisher Surface:
  `https://www.klostermann.de/Luebbe-Wolff-Getrude-Demophobie`;
- geprüft am 18.08.2026.

Die bestehende fail-closed Current-Offer-Trennung bleibt erhalten:

- `current_capability` darf als bestehendes Angebot beworben werden;
- `editorial_principle` darf als redaktionelle / demokratische Fragestellung
  verwendet werden;
- `future_intent` darf nicht als bereits vorhandenes Produktangebot erscheinen.

Die Frage nach direkter Demokratie ist deshalb als
`editorial_principle = direct-democracy-question` modelliert und
`marketable = false`.

## Motion-/Visual-Korrektur

Die beiden Filme besitzen jetzt getrennte Motion-Vokabulare.

### eDebatte

`headline_freeze`
→ `source_scan`
→ `primary_source_pull`
→ `passage_highlight`
→ `context_expand`
→ `counterposition_split`
→ `evidence_trace`
→ `dossier_dock`

### VoiceOpenGov

`ballot_cast`
→ `timeline_extend`
→ `coalition_transform`
→ `status_chain_advance`
→ `demophobie_question_reveal`
→ `citizen_network_expand`
→ `equal_voice_pulse`
→ `participation_path`

Die NEWS-5.0-Makrofolge bleibt erhalten; die sichtbaren Micro-Progressions sind
aber nicht mehr identisch.

## Frühere private Render-Evidence · superseded for human review

Der revisionsgebundene Render-Head
`10530072fd516b2057cf6c6d772ab8f2430cce0c` war technisch bestanden:

| Film | Dauer | Frames | Audio | Quellen | Evidence-Schritte | Motion-Ereignisse |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| eDebatte | 60,850 s | 1.461 | AAC, 48 kHz, mono | 4 | 7 | 23 |
| VoiceOpenGov | 68,750 s | 1.650 | AAC, 48 kHz, mono | 5 | 7 | 25 |

Diese Artefakte bleiben historische technische Evidence, sind nach der Human-
Korrektur aber **nicht mehr die aktuelle visuelle Review-Fassung**.

Nach den Änderungen an Narration, Quellenmodell und visueller Grammatik ist ein
neuer revisionsgebundener privater Render erforderlich. Bis dieser Render
vorliegt, dürfen die alten MP4s nicht als Human-Final-Candidate bezeichnet
werden.

## Unveränderte Voice-/Release-Gates

- aktive Stimme: ausschließlich D1 Conversational Dynamic;
- W1: geparkt und nicht hörbar;
- kein Voice-Fallback;
- akzeptierte Audio-Preservation-Regeln bleiben bestehen;
- `humanHomepageFilmAcceptance = pending`;
- `humanNews5VisualAcceptance = pending` für diese Filme;
- `productionEligible = false`;
- `autoPublish = false`.

## Aktueller Review-Status

Die Code-/Story-/Visual-Korrektur ist auf dem bestehenden Branch
`pr/voxy-homepage-reference-films-01` implementiert.

Vor Human Acceptance noch erforderlich:

1. aktueller CI-/Contract-PASS auf dem neuen Branch-Head;
2. neuer privater D1-Render beider Filme;
3. FFprobe, Audio-Preservation, Privacy, Source/Evidence/Motion Integrity;
4. menschliche Sichtung beider neuen MP4s.

Task bleibt `review`. Kein Merge, kein Ready-for-Review, keine Homepage-
Integration und kein Publishing vor ausdrücklicher Human-Abnahme.
