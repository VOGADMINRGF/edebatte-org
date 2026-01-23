// scripts/ensureIndexes.ts  (Orchestrator ohne execa)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

function run(cmd: string, args: string[], cwd = resolve(__dirname, "..")) {
  return new Promise<void>((res, rej) => {
    const p = spawn(cmd, args, { stdio: "inherit", cwd, shell: process.platform === "win32" });
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${args.join(" ")} → exit ${code}`))));
  });
}

async function main() {
  await run("pnpm", ["tsx", "apps/web/scripts/core.ensureIndexes.ts"]);
  await run("pnpm", ["tsx", "apps/web/scripts/pii.ensureIndexes.ts"]);
  await run("pnpm", ["tsx", "apps/web/scripts/votes.ensureIndexes.ts"]);
  console.log("🎉 all indexes ensured");
}

main().catch((e) => { console.error(e); process.exit(1); });
