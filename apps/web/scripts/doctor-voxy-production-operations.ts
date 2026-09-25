import {
  buildVoxyOperationsAgentAdvisories,
  loadVoxyOperationsSnapshot,
} from "../src/features/voxyVideo/localCompositionOperations";

async function main() {
  const snapshot = await loadVoxyOperationsSnapshot();
  const advisories = buildVoxyOperationsAgentAdvisories(snapshot);
  console.log(
    JSON.stringify(
      {
        ok: snapshot.productionReady,
        snapshot,
        advisories,
        agentHealthAuthority: "deterministic_snapshot_only",
        agentsMayMutate: false,
        agentsMayUpgradeHealth: false,
      },
      null,
      2,
    ),
  );
  if (!snapshot.productionReady) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: "voxy_operations_doctor_failed",
      safeErrorCode:
        error instanceof Error && error.message.includes("persistence")
          ? "operations_persistence_unavailable"
          : "operations_doctor_exception",
    }),
  );
  process.exitCode = 1;
});
