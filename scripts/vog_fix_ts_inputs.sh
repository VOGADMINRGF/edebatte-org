#!/usr/bin/env bash
set -euo pipefail
WEB="apps/web"

echo "▶ Schreibe $WEB/tsconfig.json (bereinigt)"
cat > "$WEB/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022","DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@config/*": ["src/config/*"],
      "@db/web": ["src/shims/db-web.ts"],
      "@db/core": ["src/shims/db-core.ts"],
      "@core/db/triMongo": ["src/shims/core/db/db/triMongo.ts"],
      "@features/*": ["src/shims/features/*"],
      "@packages/*": ["src/shims/packages/*"]
    },
    "plugins": [{ "name": "next" }],
    "incremental": true,
    "allowJs": true,
    "esModuleInterop": true,
    "isolatedModules": true
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist",
    "build",
    "src/_disabled/**",
    "src/__features_local_DISABLED__/**",
    "../../features/**",
    "../../packages/**",
    "**/*.test.*",
    "**/__tests__/**"
  ]
}
EOF

# next-env.d.ts sicherstellen (Next legt die Datei sonst selbst an)
if [ ! -f "$WEB/next-env.d.ts" ]; then
  echo '/// <reference types="next" />' > "$WEB/next-env.d.ts"
  echo '/// <reference types="next/types/global" />' >> "$WEB/next-env.d.ts"
  echo '/// <reference types="next/image-types/global" />' >> "$WEB/next-env.d.ts"
fi

echo "✅ tsconfig repariert."
echo "Jetzt:"
echo "  pnpm --filter @vog/web run typecheck"
echo "  pnpm --filter @vog/web run dev"
