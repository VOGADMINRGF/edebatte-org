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

function run(args, options = {}) {
  return execFileSync(args[0], args.slice(1), {
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
  }).trim();
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function statusMap(region) {
  const rx = /\|\s*([A-Z0-9][A-Z0-9_.:/-]+)\s*\|\s*(blocked|codex_ready|in_progress|review|manual_gate|done)\s*\|/g;
  const map = new Map();
  for (const line of region.split(/\r?\n/)) {
    rx.lastIndex = 0;
    const m = rx.exec(line);
    if (!m) continue;
    const list = map.get(m[1]) ?? [];
    list.push(m[2]);
    map.set(m[1], list);
  }
  return map;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  .map((v) => v.trim())
  .filter(Boolean)
  .sort();
const expectedBefore = [WORKFLOW, SCRIPT].sort();
if (JSON.stringify(changedBefore) !== JSON.stringify(expectedBefore)) {
  throw new Error(`unexpected_pre_writer_diff:${JSON.stringify(changedBefore)}`);
}

const mainOpenTasks = run(["git", "show", `origin/main:${OPEN_TASKS}`]);
const text = fs.readFileSync(OPEN_TASKS, "utf8");
if (text !== mainOpenTasks + "\n" && text !== mainOpenTasks) throw new Error("opentasks_branch_not_identical_to_main");
if ((text.match(new RegExp(OPERATIVE, "g")) ?? []).length !== 1) throw new Error("operative_marker_not_unique");
if ((text.match(new RegExp(HISTORY, "g")) ?? []).length !== 1) throw new Error("history_marker_not_unique");
const opStart = text.indexOf(OPERATIVE);
const histStart = text.indexOf(HISTORY);
if (opStart < 0 || histStart <= opStart) throw new Error("open_tasks_structure_unclear");

const operative = text.slice(opStart, histStart);
const historical = text.slice(histStart);
const historicalHash = hash(historical);
const before = statusMap(operative);
for (const [id, statuses] of before) {
  if (statuses.length !== 1) throw new Error(`duplicate_task_before:${id}:${statuses.join(",")}`);
}

const transitions = new Map([
  ["QR-INTERNAL-REDIRECT-HARDENING-01", ["codex_ready", "review"]],
  ["CREATE-OPERATOR-NOTIFICATIONS-01", ["codex_ready", "manual_gate"]],
  ["CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01", ["codex_ready", "review"]],
]);
const newIds = [
  "NEWSLETTER-DELIVERY-SEND-TIME-SAFETY-01",
  "DOSSIER-REVISION-ATOMIC-WRITER-01",
];
for (const [id, [from]] of transitions) {
  const actual = before.get(id);
  if (JSON.stringify(actual) !== JSON.stringify([from])) {
    throw new Error(`unexpected_before_status:${id}:${JSON.stringify(actual)}`);
  }
}
for (const id of newIds) {
  if (before.has(id)) throw new Error(`target_already_present:${id}`);
}

let next = text;
for (const [id, [from, to]] of transitions) {
  const rx = new RegExp(`^(\\|\\s*${escapeRegex(id)}\\s*\\|\\s*)${from}(\\s*\\|.*)$`, "gm");
  let count = 0;
  next = next.replace(rx, (_whole, prefix, suffix) => {
    count += 1;
    return `${prefix}${to}${suffix}`;
  });
  if (count !== 1) throw new Error(`transition_count:${id}:${count}`);
}

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
if (newHistorical !== historical || hash(newHistorical) !== historicalHash) throw new Error("historical_tail_changed");
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
if (JSON.stringify(staged) !== JSON.stringify(expectedStaged)) throw new Error(`unexpected_staged:${JSON.stringify(staged)}`);
run(["git", "commit", "-m", "docs(e150): serialize CTGN P1 repair authorizations"]);

const candidate = run(["git", "rev-parse", "HEAD"]);
if (run(["git", "status", "--porcelain"]) !== "") throw new Error("dirty_candidate");
const finalChanged = run(["git", "diff", "--name-only", "origin/main...HEAD"])
  .split(/\r?\n/)
  .filter(Boolean);
if (JSON.stringify(finalChanged) !== JSON.stringify([OPEN_TASKS])) throw new Error(`unexpected_final_diff:${JSON.stringify(finalChanged)}`);

try { run(["git", "branch", "-D", "main"]); } catch {}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ctgn-preflight-"));
run(["git", "worktree", "add", "-b", "main", tmp, candidate]);
try {
  for (const id of newIds) {
    const output = run(["node", "scripts/codex-task-preflight.mjs", id], { cwd: tmp });
    const result = JSON.parse(output);
    if (result.status !== "codex_ready" || result.executable !== true || result.branchCreationAllowed !== true) {
      throw new Error(`new_task_preflight_failed:${id}:${output}`);
    }
    console.log(output);
  }
  const candidateText = fs.readFileSync(path.join(tmp, OPEN_TASKS), "utf8");
  const candidateOp = candidateText.slice(candidateText.indexOf(OPERATIVE), candidateText.indexOf(HISTORY));
  const candidateStatuses = statusMap(candidateOp);
  const expected = new Map([
    ["QR-INTERNAL-REDIRECT-HARDENING-01", "review"],
    ["CREATE-OPERATOR-NOTIFICATIONS-01", "manual_gate"],
    ["CROSS-LINGUAL-MEDIA-EVENT-RESEARCH-INTAKE-01", "review"],
  ]);
  for (const [id, status] of expected) {
    if (JSON.stringify(candidateStatuses.get(id)) !== JSON.stringify([status])) throw new Error(`post_status_failed:${id}`);
  }
  run(["git", "diff", "--check"], { cwd: tmp });
} finally {
  run(["git", "worktree", "remove", "--force", tmp]);
}

run(["git", "push", "origin", `HEAD:${BRANCH}`], { stdio: "inherit" });
console.log(JSON.stringify({ candidate, historicalHash, added: newIds, transitions: Object.fromEntries(transitions) }, null, 2));
