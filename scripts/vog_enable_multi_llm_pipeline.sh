#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'MSG'
This legacy bootstrap script is retired and intentionally performs no writes.

The multi-provider runtime is already implemented in the repository. Recreating provider/orchestrator files from this historical script would bypass the current lifecycle registry, runtime policy, contracts, telemetry and fail-closed guardrails.

Use current runtime configuration instead:
  AI_PROVIDER_ORDER=openai,anthropic,mistral,gemini
  AI_MODEL_ROUTING_MODE=legacy   # current behavior
  AI_MODEL_ROUTING_MODE=profiled # explicit cost/balanced/quality profile routing

Validate with:
  pnpm -C apps/web run typecheck
  pnpm -C apps/web run ai:provider-smoke
MSG

exit 2
