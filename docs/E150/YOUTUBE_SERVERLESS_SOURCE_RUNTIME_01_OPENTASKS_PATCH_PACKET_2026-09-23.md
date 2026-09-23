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

Verifizierter Blob auf `main@d303a7296f6cf35c94023191e24c2c4678283cad` vor Apply:

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
7. `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01` bleibt semantisch auf `review`; kein Reserved-#588-Delta wird zurückgedreht;
8. `VOXY-EU24-MULTILINGUAL-EDITORIAL-01` wird durch diesen #644-Write nicht verändert; dessen Post-Merge-Reconciliation ist ein eigener belegter Single-Writer-Schritt;
9. kein paralleler OpenTasks-Writer darf aktiv dieselbe Datei verändern;
10. kein bestehender Task-Status, keine bestehende Tabellenzeile und keine historische Evidenz wird geändert oder gelöscht;
11. kann eine Bedingung nicht mechanisch bewiesen werden: **STOP / kein Write**.

## Deterministischer lokaler Apply

Nur auf einem sauberen, exakt auf dem erwarteten Ziel-Commit basierenden Single-Writer-Worktree:

```bash
python3 - <<'PY'
from pathlib import Path
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

operative_region = text[op_index:history_index]
if task_id in operative_region:
    raise SystemExit("STOP: task already present in operative region")
for required in (
    "CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01",
    "VOXY-EU24-MULTILINGUAL-EDITORIAL-01",
):
    if required not in operative_region:
        raise SystemExit(f"STOP: expected operative truth missing: {required}")
if "VOXY-200PCT-VISUAL-QA-CHECKPOINT-01" not in text:
    raise SystemExit("STOP: reserved Voxy review truth cannot be located")

new_text = text[:history_index] + block + text[history_index:]
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
