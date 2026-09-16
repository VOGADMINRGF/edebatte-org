#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
ERROR: scripts/vog_enable_multi_llm_pipeline.sh is deprecated and intentionally disabled.

It predates the current E150 provider runtime and can reintroduce parallel model configuration,
legacy provider adapters, and obsolete orchestration paths.

Use the production runtime instead:
  - features/ai/providerModelRegistry.ts
  - features/ai/aiRuntimePolicy.ts
  - features/ai/providers/*
  - apps/web/scripts/ai-provider-smoke.ts

No files were changed.
EOF

exit 2
