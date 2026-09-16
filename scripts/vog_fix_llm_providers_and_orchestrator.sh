#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
ERROR: scripts/vog_fix_llm_providers_and_orchestrator.sh is deprecated and intentionally disabled.

This historical repair script rewrites provider adapters and orchestration files. Running it against
the current E150 runtime would bypass the central model lifecycle registry and can reintroduce
retired provider model ids or obsolete API behavior.

Use the production runtime instead:
  - features/ai/providerModelRegistry.ts
  - features/ai/aiRuntimePolicy.ts
  - features/ai/providers/*
  - apps/web/scripts/ai-provider-smoke.ts

No files were changed.
EOF

exit 2
