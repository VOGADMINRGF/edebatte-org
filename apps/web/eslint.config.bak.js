// apps/web/eslint.config.js
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // A) Ignore-Liste
  {
    ignores: [
      "**/*.d.ts",
      "src/_disabled/**",
      "src/db/**",
      "src/shims/**",
      "src/types/generated/**",
      ".next/**",
      "node_modules/**"
    ],
  },

  // 1) JS-Empfehlungen
  js.configs.recommended,

  // 2) TypeScript + Hooks (global für TS/TSX)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: {
        // Browser/DOM
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        localStorage: "readonly",
        alert: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        File: "readonly",
        FormData: "readonly",
        ReadableStream: "readonly",
        TextEncoder: "readonly",
        AbortController: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Node/Edge
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        module: "readonly",
        exports: "readonly",
        require: "readonly",
        __dirname: "readonly",
        // React (falls global referenziert)
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // Syntax-Guards (AST)
      "no-restricted-syntax": [
        "error",
        // Cookies/Headers: eigene Helper verwenden
        {
          selector: "CallExpression[callee.name='cookies'] MemberExpression[property.name='get']",
          message: "Nutze getCookie().",
        },
        {
          selector: "CallExpression[callee.name='headers'] MemberExpression[property.name='get']",
          message: "Nutze getHeader().",
        },
        // ❌ connectDB() darf nicht mehr aufgerufen werden
        {
          selector: "CallExpression[callee.name='connectDB']",
          message: "connectDB ist veraltet. Nutze getDb()/getCol() aus @core/db/triMongo.",
        },
        // ❌ triMongo(...) darf nie als Callable benutzt werden
        {
          selector: "CallExpression[callee.name='triMongo']",
          message: "triMongo ist kein Callable. Nutze getDb()/getCol() aus @core/db/triMongo.",
        },
      ],

      // Import-Guards
      "no-restricted-imports": [
        "error",
        {
          paths: [
            // ✔ Prisma nur über unsere Wrapper
            {
              name: "@prisma/client",
              message: "Bitte @db-web oder @db-core verwenden – nicht direkt @prisma/client.",
            },
            // ✔ connectDB komplett sperren
            {
              name: "@/lib/connectDB",
              message: 'Deprecated. Nutze "@core/db/triMongo" (getDb/getCol).',
            },
            {
              name: "@lib/connectDB",
              message: 'Deprecated. Nutze "@core/db/triMongo" (getDb/getCol).',
            },
            // ✔ ObjectId nur noch aus @core/db/triMongo
            {
              name: "mongodb",
              importNames: ["ObjectId"],
              message: 'Bitte "ObjectId" NUR aus "@core/db/triMongo" importieren.',
            },
          ],
        },
      ],

      // TS-spezifische Rauschunterdrückung (E200: 0 Warnings im CI):
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "report-unused-disable-directives": "off",

      // Hooks-Grundregel bleibt hart
      "react-hooks/rules-of-hooks": "error",
      // Console erlauben (wir loggen viel serverseitig/telemetry)
      "no-console": "off",
    },
  },

  // 3) Server-/API-Routen (Node-Kontext)
  {
    files: [
      "src/app/**/route.ts",
      "src/app/api/**",
      "src/**/*.server.{ts,tsx}",
    ],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        AbortController: "readonly",
        ReadableStream: "readonly",
        TextEncoder: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    // „Tighten“ Phase 1: in Server-Dateien keine undefined-Symbole
    rules: {
      "no-undef": "error",
    },
  },

  // 4) Client-/Page-/Component-Dateien (Browser-Kontext)
  {
    files: [
      "src/**/*.client.{ts,tsx}",
      "src/components/**/*",
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
    ],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        localStorage: "readonly",
        alert: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        File: "readonly",
        FormData: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        React: "readonly",
      },
    },
    // „Tighten“ Phase 3: etwas strenger bei Client
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "report-unused-disable-directives": "warn",
    },
  },

  // 5) Projektweite Ergänzung
  {
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // 6) „Tighten“ Phase 2: sauberere Server-Routen (nur Warnung für Unused Vars)
  {
    files: [
      "src/app/**/route.ts",
      "src/app/api/**",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "no-unused-vars": "off"
    }
  },
];
