# Voxy Production Operations Runbook

Stand: 2026-09-25
Owner: `V3-AGENTIC-RUNTIME-ACTIVATION-CLOSURE-01` / #552 Slice 1

## Zweck

Dieses Runbook betreibt ausschließlich die bestehende Voxy Local Composition Runtime (#568). Es führt keine zweite Queue, keinen zweiten Renderer, keinen zweiten Review-Store und keine allgemeine Alpha2-Production-Aktivierung ein.

Die Production-Readiness wird ausschließlich deterministisch aus persistenter Runtime-/Audio-/Review-/Council-Wahrheit, Worker-Heartbeat, Queue-Alter, Recovery-Drift und sicheren Failure-Klassen berechnet. Agenten sind read-only/advisory und dürfen den Health-Status niemals hochstufen oder technische/inhaltliche Mutationen auslösen.

## Harte Betriebsgrenzen

- kein Auto-Render aus Agentenentscheidungen;
- kein Auto-Publish, Upload, Scheduling oder Social Posting;
- kein Agent darf Restart, Repair, Deploy, Rollback, Reapproval, Evidence-/Truth-Promotion oder Renderfreigabe auslösen;
- keine Prompts, Quellvolltexte, Secrets oder personenbezogenen Rohdaten in Ops-Logs;
- Production-Ready setzt `persistent_primary` für Runtime, Audio, Editorial Review, Editorial Council und Heartbeat-Telemetrie voraus;
- fehlender oder staler Heartbeat, orphan `rendering`, stale `rendered`, unbeherrschter Queue-Rückstau oder wiederholte sichere Fehler blockieren Production-Ready.

## Kanonischer Worker-Start

Der betriebliche Einstieg ist der Supervisor; der bestehende Worker bleibt die einzige Ausführungsruntime.

```bash
cd apps/web
pnpm exec tsx scripts/run-voxy-local-composition-supervised-worker.ts \
  --audio-root=/ABSOLUTER/TRUSTED/AUDIO/ROOT \
  --output-root=/ABSOLUTER/TRUSTED/OUTPUT/ROOT \
  --limit=1
```

Optional kann `VOXY_LOCAL_COMPOSITION_WORKER_ID` gesetzt werden. Der Wert ist nur eine sichere technische Kennung und darf keine Hostnamen, Personennamen, Secrets oder Kundendaten enthalten.

Der Supervisor:

1. schreibt einen `running`-Heartbeat;
2. startet exakt `scripts/run-voxy-local-composition-worker.ts` ohne Shell-Interpolation;
3. übernimmt dessen CAS-/Recovery-/Freshness-/Final-Canon-Grenzen unverändert;
4. schreibt bei Erfolg `healthy`, bei Fehler `failed`;
5. protokolliert ausschließlich strukturierte technische Metadaten und sichere Error-Codes.

## Doctor / Readiness

```bash
cd apps/web
pnpm exec tsx scripts/doctor-voxy-production-operations.ts
```

Exit `0` bedeutet: der deterministische Snapshot ist `productionReady=true`.
Exit `1` bedeutet: mindestens ein Blocker ist aktiv. Agent-Advisories ändern dieses Ergebnis nie.

Der gleiche Snapshot ist für Admins im Voxy Studio unter `Production Operations` sichtbar.

## Start / Stop

### Start

- Mongo-/Core-Persistenz erreichbar prüfen;
- Audio- und Output-Roots als trusted absolute roots bereitstellen;
- Supervisor starten;
- anschließend Doctor ausführen;
- erst bei `productionReady=true` gilt der Worker als betriebsbereit.

### Stop

- keine neuen Supervisor-Zyklen starten;
- laufenden Renderer nicht gewaltsam doppelt starten;
- nach Ablauf/Beendigung Doctor ausführen;
- fehlender/staler Heartbeat darf sichtbar `Production blockiert` ergeben — das ist korrekt fail-closed.

## Recovery

Die bestehende #978-Recovery bleibt maßgeblich:

- `rendering` wird erst nach dem definierten Orphan-Fenster recoverbar;
- aktive CAS-Ownership darf nicht durch einen zweiten Worker überschrieben werden;
- `rendered` wird nur nach Output-Validierung in den Recoverypfad überführt;
- echte Re-Ausführung muss erneut die vorhandene Freshness-/Evidence-/Gate-Prüfung passieren;
- kein Operator und kein Agent darf diese Grenzen umgehen.

Bei `rendering_orphan_recovery_required` oder `rendered_recovery_drift_detected`:

1. zweiten parallelen Worker ausschließen;
2. Supervisor einmal kontrolliert ausführen;
3. Doctor erneut ausführen;
4. bleibt der Blocker bestehen, Incident eröffnen und keine manuelle Statusmutation durchführen.

## Incident

Production-Ready bleibt blockiert bei insbesondere:

- `worker_heartbeat_missing` / `worker_heartbeat_stale`;
- `worker_last_cycle_failed`;
- `*_persistence_not_production_truth`;
- `queue_oldest_job_exceeds_ready_age`;
- `rendering_orphan_recovery_required`;
- `rendered_recovery_drift_detected`;
- `repeated_safe_worker_failures`;
- `operations_job_query_cap_reached`.

Incident-Evidence sichern:

- aktueller Git SHA / Deployment SHA;
- Doctor-JSON ohne Secrets/PII;
- betroffene sichere Error-Codes und Zähler;
- GitHub Actions Exact-Head-Evidence;
- keine Quelltexte, Narrationen, Prompts oder Roh-Audioinhalte in Tickets kopieren.

## Disable

Der sichere Disable-Weg ist betrieblich: keine neuen Supervisor-Zyklen starten. Bereits persistierte Jobs und Outputs bleiben als kanonische Audit-Wahrheit bestehen. Keine Collection löschen und keine Statuswerte manuell überschreiben.

## Rollback

Rollback bedeutet ausschließlich Application-/Worker-Code auf einen zuvor grünen Git-/Deployment-Stand zurückführen. Persistierte Jobs, Outputs, Review- und Council-Artefakte werden nicht zurückgerollt oder gelöscht.

Nach Rollback:

1. Supervisor auf dem freigegebenen Stand starten;
2. Doctor ausführen;
3. Freshness-/Evidence-/Human-Gates unverändert beibehalten;
4. keine automatische Wiederfreigabe alter Drafts.

## Agentische Unterstützung

Folgende bestehende Alpha2-Rollen prüfen denselben Snapshot advisory:

- `sre_support_agent` — Heartbeat, Queue, Recovery, Incident;
- `security_agent` — Persistenz, sichere Telemetrie, denied actions;
- `qa_agent` — Fehler-/Regression-Signale;
- `visual_qa_agent` — Render-/Review-Pipeline-Bereitschaft;
- `risk_governor` — Human-Gates und fail-closed Verhalten;
- `review_agent` — unabhängiger Operations-Readiness-Check;
- `voxy_agent` — Editorial-Runtime-Servicekontinuität.

Für alle gilt: `mayMutate=false`, `mayUpgradeHealth=false`, `providerInvocationUsed=false` in diesem Slice.

## Release-Gate

Vor Production-Rollout müssen mindestens grün sein:

- fokussierter Operations-Contract-Test;
- bestehender Voxy Local Composition Runtime Gate;
- Final-Canon-Smoke;
- realer 16:9/9:16/1:1 MP4/WebM-Recovery-Smoke;
- Typecheck, Lint, Web Production Build, `git diff --check`;
- keine offenen P0/P1/P2-Regressionen aus dem Voxy-Closeout.
