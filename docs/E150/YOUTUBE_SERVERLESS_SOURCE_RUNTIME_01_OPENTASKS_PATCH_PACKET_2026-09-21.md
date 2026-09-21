# YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 — OpenTasks Single-Writer Patch Packet

Stand: 2026-09-21

## Zweck

Dieses Paket schließt ausschließlich den verbleibenden Governance-Schritt für Issue #644 / `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01`: eine verlustfreie additive Serialisierung im operativen Kopf von `docs/E150/OpenTasks.md`.

Es autorisiert **keinen** Media-Provider, kein Secret, keinen Runtime-Adapter, keine `/create`-Umschaltung, keinen #629-Specialist-Slice und kein Production-/Publish-Verhalten.

## Exakter Ausgangszustand

Zieldatei:

```text
docs/E150/OpenTasks.md
```

Erwarteter Blob vor Apply:

```text
6b9a6fbd7a7c003c08579dd79e63e04f37ae0dfe
```

Kanonischer Operativ-Marker:

```text
## Kanonischer Operativteil
```

Eindeutiger History-Anker:

```text
## Historischer Katalog und Evidenz
```

Die Einfügung erfolgt unmittelbar **vor** diesem History-Anker. Der historische Körper bleibt byte-semantisch unverändert.

## Exakter additive Block

```md
### #644 — YouTube / Media Source Runtime

| ID | Status | Authorization | Issue | Rolle / harte Grenze |
| --- | --- | --- | --- | --- |
| YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 | codex_ready | preflight_only | #644 | P0 Media-/YouTube-Acquisition-Owner; erster Produkt-Slice nur `MediaSourceArtifact` + sichere Failure Taxonomy + credential-freie Fixtures; `sourceLoaded=true` nur mit realer Segment-/Timestamp-Evidence; keine Provider-/Secret-Aktivierung, kein zweiter Media-/Create-Store, keine #629-Komposition, kein Auto-Publish/Production-Write. |

```

## Harte Preconditions

Vor jedem Write müssen mechanisch alle Bedingungen wahr sein:

1. aktueller Blob von `docs/E150/OpenTasks.md` ist exakt `6b9a6fbd7a7c003c08579dd79e63e04f37ae0dfe`;
2. `## Kanonischer Operativteil` kommt exakt einmal vor;
3. `## Historischer Katalog und Evidenz` kommt exakt einmal vor und liegt nach dem Operativ-Marker;
4. `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` kommt im operativen Bereich noch nicht vor;
5. die bestehende C13/T9/G6-Matrix unmittelbar vor dem History-Anker bleibt vollständig erhalten;
6. `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01` bleibt semantisch auf `review`; kein Reserved-#588-Delta wird zurückgedreht;
7. kein paralleler OpenTasks-Writer darf aktiv dieselbe Datei verändern;
8. kein bestehender Task-Status, keine bestehende Tabellenzeile und keine historische Evidenz wird geändert oder gelöscht;
9. kann eine dieser Bedingungen nicht mechanisch bewiesen werden: **STOP / kein Write**.

## Deterministischer lokaler Apply

Auf einem sauberen Worktree des aktuellen Zielbranches oder eines dedizierten Single-Writer-Branches:

```bash
python3 - <<'PY'
from pathlib import Path
import subprocess

path = Path("docs/E150/OpenTasks.md")
expected_blob = "6b9a6fbd7a7c003c08579dd79e63e04f37ae0dfe"
operative = "## Kanonischer Operativteil"
history = "## Historischer Katalog und Evidenz"
task_id = "YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01"
block = """### #644 — YouTube / Media Source Runtime

| ID | Status | Authorization | Issue | Rolle / harte Grenze |
| --- | --- | --- | --- | --- |
| YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 | codex_ready | preflight_only | #644 | P0 Media-/YouTube-Acquisition-Owner; erster Produkt-Slice nur `MediaSourceArtifact` + sichere Failure Taxonomy + credential-freie Fixtures; `sourceLoaded=true` nur mit realer Segment-/Timestamp-Evidence; keine Provider-/Secret-Aktivierung, kein zweiter Media-/Create-Store, keine #629-Komposition, kein Auto-Publish/Production-Write. |

"""

actual_blob = subprocess.check_output(
    ["git", "hash-object", str(path)], text=True
).strip()
if actual_blob != expected_blob:
    raise SystemExit(f"STOP: blob mismatch {actual_blob} != {expected_blob}")

text = path.read_text(encoding="utf-8")
if text.count(operative) != 1:
    raise SystemExit("STOP: operative marker is not unique")
if text.count(history) != 1:
    raise SystemExit("STOP: history marker is not unique")

op_index = text.index(operative)
history_index = text.index(history)
if history_index <= op_index:
    raise SystemExit("STOP: history marker is not after operative marker")

operative_region = text[op_index:history_index]
if task_id in operative_region:
    raise SystemExit("STOP: task already present in operative region")
if "CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01" not in operative_region:
    raise SystemExit("STOP: expected C13 matrix missing")
if "VOXY-200PCT-VISUAL-QA-CHECKPOINT-01" not in text or "review" not in text:
    raise SystemExit("STOP: reserved Voxy review truth cannot be mechanically located")

new_text = text[:history_index] + block + text[history_index:]
path.write_text(new_text, encoding="utf-8")
PY

git diff --check
git diff -- docs/E150/OpenTasks.md
```

Der Diff muss ausschließlich den obigen additiven Block unmittelbar vor dem History-Anker zeigen. Bei jeder weiteren Änderung: **STOP**.

## Postconditions

Nach Apply müssen gelten:

```text
YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 = codex_ready
AUTHORIZATION = preflight_only
ISSUE = #644
PROVIDER_ACTIVATION = false
SECRET_MUTATION = false
NEW_MEDIA_RUNTIME = false
#629_COMPOSITION_AUTHORIZED_BY_THIS_PATCH = false
AUTO_PUBLISH = false
PRODUCTION_MUTATION = false
```

Danach erst Commit/Push des Single-Writer-Deltas, Exact-Head CI und Governance-Review. Erst nach Merge auf `main` darf auf sauberem aktuellen `main` ausgeführt werden:

```bash
node scripts/codex-task-preflight.mjs YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01
```

Nur ein Ergebnis mit `status=codex_ready`, `executable=true` und `branchCreationAllowed=true` autorisiert den ersten #644-Produktslice aus dem Run-Pack.
