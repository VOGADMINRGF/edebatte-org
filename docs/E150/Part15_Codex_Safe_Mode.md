# E150 Master Spec – Part 15: Codex Safe Mode

## 1. Zweck

Dieses Dokument definiert einen **Safe Mode** für Codex-Arbeiten im Repo  
„eDbtt / eDebatte“.

Ziele:

- Kosten und Tokenverbrauch begrenzen.
- Endlosschleifen („Reading… Thinking… nothing changed“) vermeiden.
- Änderungen klein, überschaubar und reviewbar halten.
- E150-Logik schützen (keine wilden Refactorings, kein Billing-Chaos).

Codex soll **alle hier definierten Regeln als harte Leitplanken** behandeln.

---

## 2. Grundprinzipien

1. **Kleine Schritte, nie Monster-PRs**
   - Maximal **6 Dateien pro Run** ändern.
   - Ideal: **1–3 Dateien** pro Run.
   - Kein globales „einmal alles anfassen“.

2. **Nur arbeiten, wenn der Auftrag sehr konkret ist**
   - Jeder Run bekommt genau **1 Ziel** (z.B. „Eventualities read-only im Admin anzeigen“).
   - Keine vagen „Verbessere alles“-Aufträge.
   - Bei Mehrdeutigkeiten: konservative Option wählen oder TODO/Next Steps notieren.

3. **Bestehende Architektur respektieren**
   - E150-Doku (Part00–Part14) ist maßgeblich.
   - Keine neuen Paradigmen einführen (keine neuen Frameworks, keine neuen State-Manager, etc.).
   - Bestehende Patterns (z.B. vorhandene Telemetry, Graph-Sync, Store-Helpers) wiederverwenden.

4. **Im Zweifel: lieber nichts ändern**
   - Wenn eine Änderung zu viele Folgen hat oder unklar ist:
     - Änderung abbrechen,
     - TODO in „Next Steps“ notieren,
     - keine riskanten Groß-Refactorings starten.

---

## 3. Verbotene Bereiche und No-Gos

Codex DARF NICHT:

- **Billing / Zahlungen** anfassen:
  - keine Änderungen an Stripe/Payment-Integrationen,
  - keine PLZ-/Steuer-/Rabattlogiken,
  - keine Änderungen an Bankdaten-Flows.

- **Infra / DevOps / CI** groß umbauen:
  - keine neuen Workflows außer explizit im Auftrag,
  - keine Container-/Docker-/Kubernetes-Konfigurationen erstellen oder löschen,
  - keine Änderungen an `.github/workflows` außer E150-bezogenen Kleinigkeiten.

- **Migrations-Archive & Legacy-Ordner** verändern:
  - `tools/migration/**` nur lesen, **nicht schreiben/löschen**,
  - frühere Snapshots (z.B. `01_vpm25_original`, `02_vpm25_landing_legacy`) nicht mehr anfassen.

- **Node-/Package-Setup „mal eben“ upgraden**:
  - keine Node-Versionen ändern,
  - keine großen Dependency-Upgrades,
  - keine Paketmanager-Wechsel.

---

## 4. Erlaubte Arbeitsbereiche (Safe Zones)

Codex SOLL sich vor allem in diesen Bereichen bewegen:

- **E150-spezifische Features**
  - `features/analyze/**`
  - `features/ai/**`
  - `features/statement/**`
  - `core/graph/**`
  - `core/eventualities/**`
  - `apps/web/src/app/(contributions|statements|admin)/**`

- **E150-Dokumentation**
  - `docs/E150/Part0*.md`
  - `docs/E150/Part1*.md`
  - `docs/E150/Part14_Implementation_Roadmap.md`
  - diese Datei: `Part15_Codex_Safe_Mode.md`

- **Gezielt genannte Files**
  - Alles, was im Prompt explizit erwähnt ist (z.B. `syncAnalyzeResult.ts`, `StatementImpactPreview.tsx`).

---

## 5. Arbeitsmodus pro Run

Jeder Codex-Run folgt diesem Muster:

1. **Kontext lesen (minimal):**
   - `tools/codex/e150_master_codex_briefing.ts`
   - `docs/E150/Part14_Implementation_Roadmap.md`
   - `docs/E150/Part15_Codex_Safe_Mode.md`
   - plus die 1–2 Parts, die für die Aufgabe relevant sind (z.B. Part06, Part08, Part10).

2. **Ziel klären (intern):**
   - Exakt 1 Feature oder Teilaufgabe lösen,
   - PR-Größe im Blick behalten,
   - Änderungen lokal halten.

3. **Änderungen durchführen:**
   - Max. 6 Dateien ändern.
   - Kein wildes Suchen/Ersetzen über das gesamte Repo.
   - Kein Neuorganisieren von Ordnerstrukturen.

4. **Checks & Output:**
   - Mindestens einen Typ- oder Lint-Check simulieren:
     - z.B. `pnpm tc:web` oder `pnpm -C apps/web run lint`.
   - Immer „Changes / Verification / Next Steps“ ausgeben.

---

## 6. Verhalten bei Problemen

- **Wenn der Kontext zu groß wird oder der Run hängen bleibt:**
  - Sofort abbrechen,
  - **keine halb fertigen Großänderungen** hinterlassen,
  - in „Next Steps“ vermerken, was versucht wurde.

- **Wenn eine Aufgabe mehr als 6 Dateien erfordert:**
  - Aufteilen in mehrere Teil-Runs (z.B. „Schritt 1/3“),
  - im Code/Kommentar kenntlich machen, wo die Grenze ist.

- **Wenn es mehrere mögliche Interpretationen gibt:**
  - Die **konservativste, stabilste** Variante wählen,
  - Alternative als TODO in „Next Steps“ notieren.

---

## 7. Ausgabeformat (verpflichtend)

Am Ende JEDES Runs:

- **Changes**
  - Dateien + Stichpunkte (max. 10 Bulletpoints),
  - keine Romane.

- **Verification**
  - Welche Commands hypothetisch liefen (z.B. `pnpm tc:web`),
  - ob sie nach Einschätzung von Codex durchlaufen.

- **Next Steps**
  - 3–5 klare, kleine Folgeaufgaben,
  - referenziert auf E150-Parts (Part06, Part08, Part10, …),
  - keine Wiederholung von „alles besser machen“.

---

## 8. E150-Bezug

Safe Mode ändert nichts an den E150-Prinzipien:

- E150 bleibt Leitlinie für:
  - Claims,
  - Kontext,
  - Fragen,
  - Knoten,
  - Eventualitäten,
  - Konsequenzen,
  - Verantwortlichkeiten.

Safe Mode regelt NUR **WIE** Codex daran arbeitet, nicht **WAS** E150 inhaltlich ist.

Codex soll Safe Mode als „Guardrails“ verstehen, die **immer gelten**,  
egal, für welchen Part (00–14) ein Run gerade arbeitet.
