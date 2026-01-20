#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
echo ">>> Applying all eDebatte patches to $ROOT"
bash "$(dirname "$0")/vog_phase1_patch.sh" "$ROOT"
bash "$(dirname "$0")/vog_phase2_api.sh"  "$ROOT"
bash "$(dirname "$0")/vog_phase3_ui.sh"   "$ROOT"
echo ">>> All patches applied."
echo "Next:"
echo "  pnpm --filter @vog/web install"
echo "  pnpm --filter @vog/web run typecheck"
echo "  pnpm --filter @vog/web run dev"
