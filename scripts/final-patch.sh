#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APP="$ROOT/apps/web"
SRC="$APP/src"

echo "Repo: $ROOT"
echo "App : $APP"

if sed --version >/dev/null 2>&1; then SED_I=(-i); else SED_I=(-i ''); fi

# 0) tsconfig: sichergehen, dass @/* nach src/* zeigt (und keine Admin-Excludes aktiv sind)
node - <<'NODE'
const fs = require('fs');
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p,'utf8'));
j.compilerOptions = j.compilerOptions || {};
j.compilerOptions.baseUrl = j.compilerOptions.baseUrl || ".";
j.compilerOptions.paths = j.compilerOptions.paths || {};
j.compilerOptions.paths["@/*"] = ["src/*"];
j.compilerOptions.paths["@config/*"] = ["src/config/*"];
// unsere bisherigen Mappings belassen:
j.compilerOptions.paths["@db/web"] = ["src/shims/db-web.ts"];
j.compilerOptions.paths["@core/db/db/triMongo"] = ["src/shims/core/db/db/triMongo.ts"];
j.compilerOptions.paths["@core/db/triMongo"] = ["src/shims/core/db/db/triMongo.ts"];
j.compilerOptions.paths["@db/core"] = ["src/shims/db-core.ts"];
j.compilerOptions.paths["@ui"] = ["src/shims/ui.tsx"];
// etwaige Excludes für Admin/Dashboard entfernen (keine Stummschaltung)
j.exclude = (j.exclude||[]).filter(x => x !== "src/app/admin/**" && x !== "../../features/dashboard/**");
fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log("tsconfig.json patched");
NODE "$APP/tsconfig.json"

# 1) AdminConfig voll definieren (so wie Admin-Settings es erwartet)
mkdir -p "$SRC/config"
cat > "$SRC/config/admin-config.ts" <<'TS'
export type AdminConfig = {
  limits: {
    newsfeedMaxPerRun: number;
    factcheckMaxPerItemTokens: number;
    enableAutoPost: boolean;
  };
  region: { defaultRegionKey: string };
  pricing: {
    membershipMonthlyEUR: number;
    postImmediateEUR: number;
    swipeToPostThresholds: number[];
  };
  features: string[];
  roles: string[];
};

export const adminConfig: AdminConfig = {
  limits: {
    newsfeedMaxPerRun: 50,
    factcheckMaxPerItemTokens: 2048,
    enableAutoPost: false,
  },
  region: { defaultRegionKey: "de-national" },
  pricing: {
    membershipMonthlyEUR: 9,
    postImmediateEUR: 1,
    swipeToPostThresholds: [3, 5, 8],
  },
  features: [],
  roles: ["admin"],
};

export default adminConfig;
TS

# 2) Admin-Settings: Typ aus Wert ableiten (verhindert künftige Drifts)
ADMIN_PAGE="$SRC/app/admin/settings/page.tsx"
if [ -f "$ADMIN_PAGE" ]; then
  # a) type-Import raus, nur Value importieren
  sed "${SED_I[@]}" 's#import { *adminConfig, *type *AdminConfig *} from "\(.*\)";#import { adminConfig } from "\1";#' "$ADMIN_PAGE" || true
  # b) Type alias direkt nach dem adminConfig-Import einfügen (falls noch nicht vorhanden)
  if ! grep -q "type AdminConfig = typeof adminConfig" "$ADMIN_PAGE"; then
    awk 'BEGIN{done=0} {print; if(!done && $0 ~ /import[^{]*{[[:space:]]*adminConfig[[:space:]]*}/){print "type AdminConfig = typeof adminConfig;"; done=1}}' "$ADMIN_PAGE" > "$ADMIN_PAGE.__tmp__" && mv "$ADMIN_PAGE.__tmp__" "$ADMIN_PAGE"
    echo "Patched AdminSettings to: type AdminConfig = typeof adminConfig"
  fi
fi

# 3) DashboardLayout-Prop fix: SidebarNav braucht items-Prop (kein ts-ignore)
DASH_FILE="$ROOT/features/dashboard/components/DashboardLayout.tsx"
if [ -f "$DASH_FILE" ]; then
  sed "${SED_I[@]}" 's#<SidebarNav\\s*/>#<SidebarNav items={[]} />#' "$DASH_FILE" || true
fi

echo "Final patch applied."
