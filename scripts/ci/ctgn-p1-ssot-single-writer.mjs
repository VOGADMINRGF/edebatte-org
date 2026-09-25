#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const EXPECTED_MAIN = "0154522b4d6565278cfedf48511c58bd8512ef33";
const BRANCH = "docs/governance-ssot-sync-05";
const OPEN_TASKS = "docs/E150/OpenTasks.md";
const WORKFLOW = ".github/workflows/ctgn-p1-single-writer.yml";
const SCRIPT = "scripts/ci/ctgn-p1-ssot-single-writer.mjs";
const OPERATIVE = "## Kanonischer Operativteil";
const HISTORY = "## Historischer Katalog und Evidenz";
const C10_ID = "CREATE-OPERATOR-NOTIFICATIONS-01";

function run(args, options = {}) {
  return execFileSync(args[0], args.slice(1), {
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function statusMap(region) {
  const map = new Map();
  for (const line of region.split(/\r?\n/)) {
    const match = line.match(/\|\s*([A-Z0-9][A-Z0-9_.:/-]+)\s*\|\s*(blocked|codex_ready|in_progress|review|manual_gate|done)\s*\|/);
    if (!match) continue;
    const values = map.get(match[1]) ?? [];
    values.push(match[2]);
    map.set(match[1], values);
  }
  return map;
}

function removeLocalMainBranch() {
  try {
    run(["git", "branch", "-D", "main"]);
  } catch {
    // main may not exist locally on the writer checkout.
  }
}

function withMainWorktree(ref, callback) {
  removeLocalMainBranch();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctgn-main-"));
  run(["git", "worktree", "add", "--detach", dir, ref]);
  try {
    run(["git", "checkout", "-b", "main"], { cwd: dir });
    callback(dir);
  } finally {
    run(["git", "worktree", "remove", "--force", dir]);
    removeLocalMainBranch();
  }
}

run(["git", "config", "user.name", "github-actions[bot]"]);
run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
run(["git", "fetch", "origin", "main", BRANCH]);

const mainSha = run(["git", "rev-parse", "origin/main"]);
if (mainSha !== EXPECTED_MAIN) throw new Error(`main_moved:${mainSha}`);
const mergeBase = run(["git", "merge-base", "HEAD", "origin/main"]);
if (mergeBase !== EXPECTED_MAIN) throw new Error(`unexpected_merge_base:${mergeBase}`);

const changedBefore = run(["git", "diff", "--name-only", "origin/main...HEAD"])
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean)
  .sort();
const expectedBefore = [WORKFLOW, SCRIPT].sort();
if (JSON.stringify(changedBefore) !== JSON.stringify(expectedBefore)) {
  throw new Error(`unexpected_pre_writer_diff:${JSON.stringify(changedBefore)}`);
}

const branchOpenTasksBlob = run(["git", "rev-parse", `HEAD:${OPEN_TASKS}`]);
const mainOpenTasksBlob = run(["git", "rev-parse", `origin/main:${OPEN_TASKS}`]);
if (branchOpenTasksBlob !== mainOpenTasksBlob) {
  throw new Error(`opentasks_blob_drift:${branchOpenTasksBlob}:${mainOpenTasksBlob}`);
}

const transitions = new Map([
  ["QR-INTERNAL-REDIRECT-HARDENING-01", ["codex_ready", "review"]],
  ["CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01", ["codex_ready", "review"]],
]);
const newIds = [
  "NEWSLETTER-DELIVERY-SEND-TIME-SAFETY-01",
  "DOSSIER-REVISION-ATOMIC-WRITER-01",
];

withMainWorktree("origin/main", (dir) => {
  for (const id of transitions.keys()) {
    const output = run(["node", "scripts/codex-task-preflight.mjs", id], { cwd: dir });
    const result = JSON.parse(output);
    if (result.status !== "codex_ready" || result.executable !== true || result.branchCreationAllowed !== true) {
      throw new Error(`unexpected_before_preflight:${id}:${output}`);
    }
    console.log(output);
  }

  let c10Missing = false;
  try {
    run(["node", "scripts/codex-task-preflight.mjs", C10_ID], { cwd: dir });
  } catch (error) {
    const stderr = String(error?.stderr ?? "");
    const parsed = stderr ? JSON.parse(stderr) : null;
    c10Missing = parsed?.status === "missing" && parsed?.reason === "task_not_found";
  }
  if (!c10Missing) throw new Error("c10_expected_non_dispatchable_matrix_entry");
});

const text = fs.readFileSync(OPEN_TASKS, "utf8");
if ((text.match(new RegExp(OPERATIVE, "g")) ?? []).length !== 1) throw new Error("operative_marker_not_unique");
if ((text.match(new RegExp(HISTORY, "g")) ?? []).length !== 1) throw new Error("history_marker_not_unique");
const opStart = text.indexOf(OPERATIVE);
const histStart = text.indexOf(HISTORY);
if (opStart < 0 || histStart <= opStart) throw new Error("open_tasks_structure_unclear");

const operative = text.slice(opStart, histStart);
const historical = text.slice(histStart);
const historicalHash = sha256(historical);
const before = statusMap(operative);
for (const [id, statuses] of before) {
  if (statuses.length !== 1) throw new Error(`duplicate_task_before:${id}:${statuses.join(",")}`);
}
for (const [id, [from]] of transitions) {
  if (JSON.stringify(before.get(id)) !== JSON.stringify([from])) {
    throw new Error(`unexpected_before_status:${id}:${JSON.stringify(before.get(id))}`);
  }
}
for (const id of newIds) {
  if (before.has(id)) throw new Error(`target_already_present:${id}`);
}

const c10BeforeRegex = /^\| C10 \| `CREATE-OPERATOR-NOTIFICATIONS-01` — `codex_ready`(.*)$/gm;
const c10BeforeMatches = [...operative.matchAll(c10BeforeRegex)];
if (c10BeforeMatches.length !== 1) throw new Error(`c10_matrix_count:${c10BeforeMatches.length}`);

let next = text;
for (const [id, [from, to]] of transitions) {
  const regex = new RegExp(`^(\\|\\s*${esc(id)}\\s*\\|\\s*)${from}(\\s*\\|.*)$`, "gm");
  let count = 0;
  next = next.replace(regex, (_whole, prefix, suffix) => {
    count += 1;
    return `${prefix}${to}${suffix}`;
  });
  if (count !== 1) throw new Error(`transition_count:${id}:${count}`);
}

const c10Regex = /^(\| C10 \| `CREATE-OPERATOR-NOTIFICATIONS-01` — `)codex_ready(`.*)$/gm;
let c10Count = 0;
next = next.replace(c10Regex, (_whole, prefix, suffix) => {
  c10Count += 1;
  return `${prefix}manual_gate${suffix}`;
});
if (c10Count !== 1) throw new Error(`c10_transition_count:${c10Count}`);

const block = `### C/T/G/N P1 Audit-Repairs — 2026-09-25

Dieser additive Block autorisiert ausschließlich zwei durch den unabhängigen Audit reproduzierte, eng begrenzte Repairs auf den bestehenden kanonischen Ownern. Er eröffnet keine neue Runtime, keinen Store, keine Queue und keine Provider-/Production-Aktivierung. Vor Produktcode bleibt der taskbezogene Preflight auf frischem \`main\` Pflicht.

| ID | Status | Priorität | Abhängigkeiten / Evidence | Scope / Ziel | Akzeptanz / Guardrails |
| --- | --- | --- | --- | --- | --- |
| NEWSLETTER-DELIVERY-SEND-TIME-SAFETY-01 | codex_ready | P1 | Issue \`#865\`; \`docs/E150/CTGN_P1_REPAIR_INTAKE_2026-09-25.md\`; bestehende N1–N9 Runtime, \`public_updates_subscribers\`, \`newsletter_delivery_ledger\`, bestehender Delivery-Lease; Authorization \`preflight_only\` | F1+F2 gemeinsam im bestehenden Newsletter-Sendepfad reparieren: nach Lease aktuelle Subscription-/Consent-/Preference-Truth erneut aus dem kanonischen Subscriber-SSOT lesen und unmittelbar vor externem Handoff fail-closed binden; im bestehenden Delivery-Ledger einen dauerhaften External-Attempt-/Ambiguous-Zustand so modellieren, dass ein unbekannt erfolgreicher Provider-Handoff niemals allein durch Zeitablauf automatisch erneut sendbar wird | Tests müssen Unsubscribe, Suppression, stale consent, Frequenz-/Cadence-Opt-out und Read-Failure zwischen Selection→Lease→Send sowie Crash vor Handoff, Crash nach Handoff, fehlgeschlagenen \`sent\`-Write, Lease-Expiry, unbekannten Provider-Timeout, Concurrent Recovery und Retry/Idempotenz abdecken; kein zweiter Subscriber-/Delivery-Store; keine Behauptung von Exactly-once ohne Provider-Nachweis; \`NEWSLETTER_DELIVERY_ENABLED=false\` bleibt Production-Default; keine echte Empfänger-/Provideraktivierung |
| DOSSIER-REVISION-ATOMIC-WRITER-01 | codex_ready | P1 | Issue \`#787\`; \`docs/E150/CTGN_P1_REPAIR_INTAKE_2026-09-25.md\`; bestehende Dossier-Owner \`features/dossier/revisions.ts\` + \`features/dossier/db.ts\`; bestehende Mongo-Transaction-Capability bestätigt; Authorization \`preflight_only\` | F4 ohne neue Collection konvergieren: genau einen gemeinsamen bestehenden Dossier-Revision-Writer herstellen; CAS-Erschöpfung muss vor unverketteter Revision hart fehlschlagen; Dossier-Head-Mutation und \`dossier_revisions\`-Insert müssen in einer DB-gestützten atomaren Grenze oder einem explizit recoverbaren, durch Tests bewiesenen Protokoll zusammengeführt werden | Pflichtregressionen: zwei konkurrierende Writer, exhausted CAS, Revision-Insert-Fehler nach Head-CAS, Retry/Idempotenz desselben Vorgangs, Recovery ohne orphan/unlinked Revision sowie beide bisherigen Call-Pfade; kein zweiter Dossier-/Revision-Store; keine T6-/T3–T8-Freigabe; keine Graph-/Truth-/Publish-Autorität |

`;

if (next.includes("### C/T/G/N P1 Audit-Repairs — 2026-09-25")) throw new Error("repair_block_already_present");
const insertAt = next.indexOf(HISTORY);
next = next.slice(0, insertAt) + block + next.slice(insertAt);

const nextHistStart = next.indexOf(HISTORY);
const newOperative = next.slice(next.indexOf(OPERATIVE), nextHistStart);
const newHistorical = next.slice(nextHistStart);
if (newHistorical !== historical || sha256(newHistorical) !== historicalHash) throw new Error("historical_tail_changed");
const after = statusMap(newOperative);
for (const [id, statuses] of after) {
  if (statuses.length !== 1) throw new Error(`duplicate_task_after:${id}:${statuses.join(",")}`);
}
for (const [id, statuses] of before) {
  if (transitions.has(id)) continue;
  if (JSON.stringify(after.get(id)) !== JSON.stringify(statuses)) throw new Error(`unexpected_status_change:${id}`);
}
for (const [id, [, to]] of transitions) {
  if (JSON.stringify(after.get(id)) !== JSON.stringify([to])) throw new Error(`bad_transition:${id}`);
}
for (const id of newIds) {
  if (JSON.stringify(after.get(id)) !== JSON.stringify(["codex_ready"])) throw new Error(`new_task_bad_status:${id}`);
}
if (![...newOperative.matchAll(/^\| C10 \| `CREATE-OPERATOR-NOTIFICATIONS-01` — `manual_gate`(.*)$/gm)].length) {
  throw new Error("c10_manual_gate_not_serialized");
}

fs.writeFileSync(OPEN_TASKS, next);
run(["git", "diff", "--check", "--", OPEN_TASKS]);

fs.unlinkSync(WORKFLOW);
fs.unlinkSync(SCRIPT);
run(["git", "add", OPEN_TASKS, WORKFLOW, SCRIPT]);
const staged = run(["git", "diff", "--cached", "--name-only"])
  .split(/\r?\n/)
  .filter(Boolean)
  .sort();
const expectedStaged = [OPEN_TASKS, WORKFLOW, SCRIPT].sort();
if (JSON.stringify(staged) !== JSON.stringify(expectedStaged)) {
  throw new Error(`unexpected_staged:${JSON.stringify(staged)}`);
}
run(["git", "commit", "-m", "docs(e150): serialize CTGN P1 repair authorizations"]);

const candidate = run(["git", "rev-parse", "HEAD"]);
if (run(["git", "status", "--porcelain"]) !== "") throw new Error("dirty_candidate");
const finalChanged = run(["git", "diff", "--name-only", "origin/main...HEAD"])
  .split(/\r?\n/)
  .filter(Boolean);
if (JSON.stringify(finalChanged) !== JSON.stringify([OPEN_TASKS])) {
  throw new Error(`unexpected_final_diff:${JSON.stringify(finalChanged)}`);
}

withMainWorktree(candidate, (dir) => {
  for (const id of newIds) {
    const output = run(["node", "scripts/codex-task-preflight.mjs", id], { cwd: dir });
    const result = JSON.parse(output);
    if (result.status !== "codex_ready" || result.executable !== true || result.branchCreationAllowed !== true) {
      throw new Error(`new_task_preflight_failed:${id}:${output}`);
    }
    console.log(output);
  }
  for (const [id, [, status]] of transitions) {
    let result = null;
    try {
      run(["node", "scripts/codex-task-preflight.mjs", id], { cwd: dir });
    } catch (error) {
      const stderr = String(error?.stderr ?? "");
      result = stderr ? JSON.parse(stderr) : null;
    }
    if (result?.status !== status || result?.executable !== false) {
      throw new Error(`consumed_task_not_closed:${id}:${JSON.stringify(result)}`);
    }
  }
  const candidateText = fs.readFileSync(path.join(dir, OPEN_TASKS), "utf8");
  const candidateHead = candidateText.slice(candidateText.indexOf(OPERATIVE), candidateText.indexOf(HISTORY));
  if (![...candidateHead.matchAll(/^\| C10 \| `CREATE-OPERATOR-NOTIFICATIONS-01` — `manual_gate`(.*)$/gm)].length) {
    throw new Error("c10_post_status_failed");
  }
  run(["git", "diff", "--check"], { cwd: dir });
});

run(["git", "push", "origin", `HEAD:${BRANCH}`], { stdio: "inherit" });
console.log(JSON.stringify({
  candidate,
  historicalHash,
  added: newIds,
  transitions: Object.fromEntries(transitions),
  matrixTransition: { [C10_ID]: ["codex_ready", "manual_gate"] },
}, null, 2));
