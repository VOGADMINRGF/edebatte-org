# YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 — OpenTasks Single-Writer Patch Packet

Stand: 2026-09-23

## Zweck

Dieses Paket ersetzt das veraltete Patch-Paket vom 2026-09-21 für Issue #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01`. Es beschreibt ausschließlich die verlustfreie additive Serialisierung im operativen Kopf von `docs/E150/OpenTasks.md`.

Es autorisiert **keinen** Media-Provider, kein Secret, keinen Runtime-Adapter, keine `/create`-Umschaltung, keinen #629-Specialist-Slice, kein Deployment und kein Publish-Verhalten.

### Korrektur 2026-09-23

Der erste One-shot-Writer gegen den unten gepinnten Blob stoppte korrekt fail-closed, weil der bisherige Guard `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01 = review` nicht mehr der aktuellen operativen Wahrheit entsprach. PR #588 wurde am 2026-09-21 gemergt; der kanonische Parser liest den Checkpoint im aktuellen operativen Kopf als `done`.

Diese Korrektur verändert **keinen** bestehenden Status. Sie ersetzt ausschließlich den veralteten Preserve-Guard durch: vorhandene operative Statuswerte vor dem Insert vollständig parsen und nach dem Insert byte-semantisch/inhaltlich unverändert erhalten; insbesondere muss `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01 = done` erhalten bleiben.

## Exakter Ausgangszustand

Zieldatei:

```text
docs/E150/OpenTasks.md
```

Verifizierter Blob auf `main@0769a36cde3b46ceb2877061cc081e6abb3ad079` vor Apply:

```text
ed6eb0e09daa97b52a57e93dc0262cff36b02888
```

Der Task `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` kommt in diesem Blob im operativen Inhalt noch nicht vor. Der operative Kopf enthält bereits C13/T9/G6 sowie den serialisierten Voxy-EU24-Slice-A-Eintrag. Deren nachgelagerte Reconciliation wird durch dieses #644-Paket **nicht** still verändert.

Kanonischer Operativ-Marker:

```text
## Kanonischer Operativteil
```

History-Anker:

```text
## Historischer Katalog und Evidenz
```

Verifizierter SHA-256 des historischen Tails ab einschließlich History-Anker:

```text
305e888efeb5d12c3450bd4399107f4be78d3c0f3a4c7279af1a0828216531c7
```

Die Einfügung darf ausschließlich unmittelbar vor dem ersten kanonischen History-Anker des tatsächlichen Datei-Contents erfolgen. Wrapper-/API-Duplikate zählen nicht als Dateiinhalt. Der historische Körper bleibt byte-semantisch unverändert.

## Exakter additiver Block

```md
### #644 — YouTube / Media Source Runtime

| ID | Status | Authorization | Issue | Rolle / harte Grenze |
| --- | --- | --- | --- | --- |
| YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 | codex_ready | preflight_only | #644 | P0 Media-/YouTube-Acquisition-Owner; erster Produkt-Slice nur `MediaSourceArtifact` + sichere Failure Taxonomy + credential-freie Fixtures; `sourceLoaded=true` nur mit realer Segment-/Timestamp-Evidence; keine Provider-/Secret-Aktivierung, kein zweiter Media-/Create-Store, keine #629-Komposition, kein Auto-Publish/Production-Write. |

```

## Harte Preconditions

Vor jedem Write müssen mechanisch alle Bedingungen wahr sein:

1. der aktuelle Git-Blob von `docs/E150/OpenTasks.md` ist exakt `ed6eb0e09daa97b52a57e93dc0262cff36b02888`;
2. der vollständige Dateiinhalt ist verlustfrei lokal vorhanden; kein Write aus einer truncierten API-/Connector-Antwort;
3. `## Kanonischer Operativteil` kommt im tatsächlichen Dateiinhalt exakt einmal vor;
4. der kanonische `## Historischer Katalog und Evidenz`-Anker kommt im tatsächlichen Dateiinhalt exakt einmal vor und liegt nach dem Operativ-Marker;
5. `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` kommt im operativen Bereich noch nicht vor;
6. die bestehende C13/T9/G6-Matrix und alle danach serialisierten operativen Einträge bleiben vollständig erhalten;
7. `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01` wird mit dem kanonischen Tabellenparser als `done` gelesen und bleibt `done`; kein #588-Delta wird durch diesen Writer verändert;
8. `VOXY-EU24-MULTILINGUAL-EDITORIAL-01` wird durch diesen #644-Write nicht verändert; dessen Post-Merge-Reconciliation ist ein eigener belegter Single-Writer-Schritt;
9. alle bereits vorhandenen operativen Task-IDs und Statuswerte werden vor dem Insert geparst und müssen danach unverändert vorhanden sein;
10. der historische Tail besitzt vor und nach dem Write exakt SHA-256 `305e888efeb5d12c3450bd4399107f4be78d3c0f3a4c7279af1a0828216531c7`;
11. kein paralleler OpenTasks-Writer darf aktiv dieselbe Datei verändern;
12. kein bestehender Task-Status, keine bestehende Tabellenzeile und keine historische Evidenz wird geändert oder gelöscht;
13. kann eine Bedingung nicht mechanisch bewiesen werden: **STOP / kein Write**.

## Deterministischer lokaler Apply

Nur auf einem sauberen, exakt auf dem erwarteten Ziel-Commit basierenden Single-Writer-Worktree:

```bash
python3 - <<'PY'
from pathlib import Path
from hashlib import sha256
import re
import subprocess

path = Path("docs/E150/OpenTasks.md")
expected_blob = "ed6eb0e09daa97b52a57e93dc0262cff36b02888"
expected_history_sha256 = "305e888efeb5d12c3450bd4399107f4be78d3c0f3a4c7279af1a0828216531c7"
operative = "## Kanonischer Operativteil"
history = "## Historischer Katalog und Evidenz"
task_id = "YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01"
reserved_id = "VOXY-200PCT-VISUAL-QA-CHECKPOINT-01"

block = """### #644 — YouTube / Media Source Runtime

| ID | Status | Authorization | Issue | Rolle / harte Grenze |
| --- | --- | --- | --- | --- |
| YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 | codex_ready | preflight_only | #644 | P0 Media-/YouTube-Acquisition-Owner; erster Produkt-Slice nur `MediaSourceArtifact` + sichere Failure Taxonomy + credential-freie Fixtures; `sourceLoaded=true` nur mit realer Segment-/Timestamp-Evidence; keine Provider-/Secret-Aktivierung, kein zweiter Media-/Create-Store, keine #629-Komposition, kein Auto-Publish/Production-Write. |

"""

def parse_statuses(region: str) -> dict[str, str]:
    statuses: dict[str, str] = {}
    active_header: list[str] | None = None
    for raw_line in region.splitlines():
        line = raw_line.strip()
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if not cells:
            continue
        if all(re.fullmatch(r":?-{3,}:?", cell or "") for cell in cells):
            continue
        if "ID" in cells and "Status" in cells:
            active_header = cells
            continue
        if not active_header or len(cells) < len(active_header):
            continue
        row = dict(zip(active_header, cells))
        row_id = row.get("ID", "")
        status = row.get("Status", "")
        if not row_id or not status:
            continue
        if row_id in statuses:
            raise SystemExit(f"STOP: duplicate operative task ID: {row_id}")
        statuses[row_id] = status
    return statuses

actual_blob = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()
if actual_blob != expected_blob:
    raise SystemExit(f"STOP: blob mismatch {actual_blob} != {expected_blob}")

raw = path.read_bytes()
text = raw.decode("utf-8")
if text.count(operative) != 1:
    raise SystemExit("STOP: operative marker is not unique in actual file content")
if text.count(history) != 1:
    raise SystemExit("STOP: history marker is not unique in actual file content")

op_index = text.index(operative)
history_index = text.index(history)
if history_index <= op_index:
    raise SystemExit("STOP: history marker is not after operative marker")

head = text[:history_index]
operative_region = text[op_index:history_index]
historical_tail = text[history_index:]
if sha256(historical_tail.encode("utf-8")).hexdigest() != expected_history_sha256:
    raise SystemExit("STOP: historical tail hash mismatch before write")

statuses_before = parse_statuses(operative_region)
if task_id in statuses_before or task_id in operative_region:
    raise SystemExit("STOP: task already present in operative region")

for required in (
    "CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01",
    "GLOBAL-TOPIC-INTELLIGENCE-VERIFICATION-ORCHESTRATION-01",
    "PROVENANCE-EVIDENCE-LINEAGE-CROSS-LINGUAL-TOPIC-GRAPH-01",
    "VOXY-EU24-MULTILINGUAL-EDITORIAL-01",
):
    if required not in statuses_before:
        raise SystemExit(f"STOP: expected operative task missing: {required}")

if statuses_before.get(reserved_id) != "done":
    raise SystemExit(
        f"STOP: reserved Voxy status is {statuses_before.get(reserved_id)!r}, expected 'done'"
    )

updated = head + block + historical_tail
updated_op_index = updated.index(operative)
updated_history_index = updated.index(history)
updated_operative = updated[updated_op_index:updated_history_index]
updated_history = updated[updated_history_index:]
statuses_after = parse_statuses(updated_operative)

if statuses_after.get(task_id) != "codex_ready":
    raise SystemExit("STOP: #644 task is not codex_ready after insert")
if statuses_after.get(reserved_id) != "done":
    raise SystemExit("STOP: reserved Voxy done status changed")

for row_id, status in statuses_before.items():
    if statuses_after.get(row_id) != status:
        raise SystemExit(f"STOP: existing operative task status changed: {row_id}")

if set(statuses_after) != set(statuses_before) | {task_id}:
    raise SystemExit("STOP: operative task set changed beyond #644 addition")

if sha256(updated_history.encode("utf-8")).hexdigest() != expected_history_sha256:
    raise SystemExit("STOP: historical tail changed")

path.write_text(updated, encoding="utf-8")
PY

git diff --check
git diff -- docs/E150/OpenTasks.md
```

Der Diff muss ausschließlich den obigen additiven #644-Block unmittelbar vor dem History-Anker zeigen. Bei jeder weiteren Änderung: **STOP**.

## Postconditions

Nach einem späteren sicheren Apply müssen gelten:

```text
YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 = codex_ready
AUTHORIZATION = preflight_only
ISSUE = #644
VOXY-200PCT-VISUAL-QA-CHECKPOINT-01 = done (unchanged)
ALL_PREEXISTING_OPERATIVE_STATUSES = unchanged
HISTORICAL_TAIL_SHA256 = 305e888efeb5d12c3450bd4399107f4be78d3c0f3a4c7279af1a0828216531c7
PROVIDER_ACTIVATION = false
SECRET_MUTATION = false
NEW_PARALLEL_MEDIA_RUNTIME = false
#629_COMPOSITION_AUTHORIZED_BY_THIS_PATCH = false
AUTO_PUBLISH = false
PRODUCTION_MUTATION = false
```

Erst nach Single-Writer-Commit, Exact-Head-CI, Governance-Review und Merge auf `main` darf auf sauberem aktuellem `main` ausgeführt werden:

```bash
node scripts/codex-task-preflight.mjs YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01
```

Nur `status=codex_ready`, `executable=true` und `branchCreationAllowed=true` autorisieren den ersten #644-Produktslice aus dem Run-Pack.
