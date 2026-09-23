# YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 — OpenTasks Single-Writer Patch Packet

Stand: 2026-09-23

## Zweck

Dieses Paket ersetzt das veraltete Patch-Paket vom 2026-09-21 für Issue #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01`. Es beschreibt ausschließlich die verlustfreie additive Serialisierung im operativen Kopf von `docs/E150/OpenTasks.md`.

Es autorisiert **keinen** Media-Provider, kein Secret, keinen Runtime-Adapter, keine `/create`-Umschaltung, keinen #629-Specialist-Slice, kein Deployment und kein Publish-Verhalten.

## Exakter Ausgangszustand

Zieldatei:

```text
docs/E150/OpenTasks.md
```

Verifizierter Blob auf `main@0769a36cde3b46ceb2877061cc081e6abb3ad079` vor Apply:

```text
ed6eb0e09daa97b52a57e93dc0262cff36b02888
```

Der Task `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` kommt in diesem Blob im operativen Inhalt noch nicht vor. Der operative Kopf endet unmittelbar vor dem History-Anker mit dem bereits serialisierten Voxy-EU24-Slice-A-Eintrag; dessen inzwischen erfolgter Merge ist ein separater Post-Merge-Reconciliation-Punkt und wird durch dieses #644-Paket **nicht** still verändert.

Kanonischer Operativ-Marker:

```text
## Kanonischer Operativteil
```

History-Anker:

```text
## Historischer Katalog und Evidenz
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
7. `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01` bleibt semantisch auf dem im aktuellen operativen Kopf belegten Status `done`; kein bereits abgeschlossener #588/#580-Visual-QA-Status wird zurückgedreht;
8. `VOXY-EU24-MULTILINGUAL-EDITORIAL-01` wird durch diesen #644-Write nicht verändert; dessen Post-Merge-Reconciliation ist ein eigener belegter Single-Writer-Schritt;
9. kein paralleler OpenTasks-Writer darf aktiv dieselbe Datei verändern;
10. kein bestehender Task-Status, keine bestehende Tabellenzeile und keine historische Evidenz wird geändert oder gelöscht;
11. kann eine Bedingung nicht mechanisch bewiesen werden: **STOP / kein Write**.

### Korrekturhinweis zum früheren Paketstand

Ein vorheriger Paketstand verlangte für `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01` fälschlich `review`. Der vollständige operative Kopf des oben gepinnten Blobs wird vom selben `ID`/`Status`-Tabellenvertrag wie `scripts/codex-task-preflight.mjs` als `done` geparst. Der #644-Write darf diese aktuelle operative Wahrheit weder auf `review` zurücksetzen noch anderweitig verändern.

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
operative = "## Kanonischer Operativteil"
history = "## Historischer Katalog und Evidenz"
task_id = "YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01"

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

text = path.read_text(encoding="utf-8")
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
historical_hash_before = sha256(historical_tail.encode("utf-8")).hexdigest()
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

reserved_id = "VOXY-200PCT-VISUAL-QA-CHECKPOINT-01"
if statuses_before.get(reserved_id) != "done":
    raise SystemExit(
        f"STOP: reserved Voxy status is {statuses_before.get(reserved_id)!r}, expected 'done'"
    )

new_text = head + block + historical_tail
new_op_index = new_text.index(operative)
new_history_index = new_text.index(history)
new_operative = new_text[new_op_index:new_history_index]
new_history = new_text[new_history_index:]
statuses_after = parse_statuses(new_operative)

if statuses_after.get(task_id) != "codex_ready":
    raise SystemExit("STOP: #644 task is not codex_ready after insertion")
if statuses_after.get(reserved_id) != "done":
    raise SystemExit("STOP: reserved Voxy status changed")

for row_id, status in statuses_before.items():
    if statuses_after.get(row_id) != status:
        raise SystemExit(f"STOP: existing operative task status changed: {row_id}")

if set(statuses_after) != set(statuses_before) | {task_id}:
    raise SystemExit("STOP: operative task set changed beyond #644 addition")
if sha256(new_history.encode("utf-8")).hexdigest() != historical_hash_before:
    raise SystemExit("STOP: historical tail changed")

path.write_text(new_text, encoding="utf-8")
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
