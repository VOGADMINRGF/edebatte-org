#!/usr/bin/env bash
set -euo pipefail
# VPM25 fixer & migration orchestrator
# Usage:
#   bash scripts/fix_vpm25.sh --repo-root . \
#     --repair-zip /path/to/Reparatur.zip \
#     --incoming-zip /path/to/Incoming.zip \
#     --brand "e‑Debatte" --old-brand "eDebatte" \
#     --apply-colors --separate-landing --newsfeed-limit 50 --region "DE:BE:11000000"
#
# Notes:
# - Zero-byte file repair uses files from --repair-zip to overwrite empty counterparts in --incoming-zip or repo.
# - Brand rename excludes the literal token 'eDebatte'.
# - Colors: applies turquoise→blue gradient + keeps optional purple accent on buttons.
# - Optional landing extraction into ./_landing_extract.

REPO="."
REPAIR_ZIP=""
INCOMING_ZIP=""
NEW_BRAND="e‑Debatte"
OLD_BRAND="eDebatte"
APPLY_COLORS=0
SEPARATE_LANDING=0
NEWSFEED_LIMIT=0
REGION_KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-root) REPO="$2"; shift 2 ;;
    --repair-zip) REPAIR_ZIP="$2"; shift 2 ;;
    --incoming-zip) INCOMING_ZIP="$2"; shift 2 ;;
    --brand) NEW_BRAND="$2"; shift 2 ;;
    --old-brand) OLD_BRAND="$2"; shift 2 ;;
    --apply-colors) APPLY_COLORS=1; shift 1 ;;
    --separate-landing) SEPARATE_LANDING=1; shift 1 ;;
    --newsfeed-limit) NEWSFEED_LIMIT="$2"; shift 2 ;;
    --region) REGION_KEY="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" ; exit 1 ;;
  esac
done

echo "[fix_vpm25] repo: $REPO"
pushd "$REPO" >/dev/null

# 1) (Optional) extract incoming zip to ./_incoming if provided
if [[ -n "${INCOMING_ZIP}" ]]; then
  rm -rf _incoming && mkdir -p _incoming
  echo "[fix_vpm25] extracting incoming zip: ${INCOMING_ZIP}"
  unzip -qq -o "${INCOMING_ZIP}" -d _incoming
fi

# 2) If REPAIR_ZIP set, prepare lookup for replacement
if [[ -n "${REPAIR_ZIP}" ]]; then
  rm -rf _repair && mkdir -p _repair
  echo "[fix_vpm25] extracting repair zip: ${REPAIR_ZIP}"
  unzip -qq -o "${REPAIR_ZIP}" -d _repair
  node scripts/helpers/replace_zero_kb.js "${REPAIR_ZIP}" "${INCOMING_ZIP:-}" "."
else
  echo "[fix_vpm25] skip zero-byte replacement (no --repair-zip)"
fi

# 3) Brand rename (excluding 'eDebatte' tokens)
node scripts/helpers/bulk_rename_brand.js "${OLD_BRAND}" "${NEW_BRAND}" .

# 4) Apply color tokens (Tailwind/CSS)
if [[ "${APPLY_COLORS}" == "1" ]]; then
  node scripts/helpers/apply_colors.js
fi

# 5) Optional landing extraction
if [[ "${SEPARATE_LANDING}" == "1" ]]; then
  bash scripts/helpers/extract_landing.sh
fi

# 6) Typescript + ESLint sanity (non-fatal)
echo "[fix_vpm25] running static checks (non-fatal)"
set +e
pnpm -w exec tsc --noEmit -p apps/web/tsconfig.json || true
pnpm -w dlx eslint --max-warnings 0 --config apps/web/eslint.config.js "apps/web/src/**/*.{ts,tsx}" || true
set -e

# 7) Newsfeed pipeline dry-run (optional limits)
if [[ "${NEWSFEED_LIMIT}" != "0" ]]; then
  echo "[fix_vpm25] newsfeed dry-run limit=${NEWSFEED_LIMIT} region=${REGION_KEY}"
  node scripts/helpers/newsfeed_cron.js --limit "${NEWSFEED_LIMIT}" ${REGION_KEY:+--region "${REGION_KEY}"} --dry
fi

popd >/dev/null
echo "[fix_vpm25] DONE"
