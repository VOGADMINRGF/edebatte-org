// apps/web/eslint.config.js
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  { // Ignore
    ignores: [
      "**/*.d.ts",
      "src/_disabled/**",
      "src/db/**",
      "src/shims/**",
      "src/types/generated/**",
      ".next/**",
      "node_modules/**",
    ],
  },

  js.configs.recommended,

  { // TS + Hooks – Basis
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: {
        // Browser/DOM
        window: "readonly", document: "readonly", navigator: "readonly",
        location: "readonly", localStorage: "readonly", alert: "readonly",
        console: "readonly", URL: "readonly", URLSearchParams: "readonly",
        Blob: "readonly", File: "readonly", FormData: "readonly",
        ReadableStream: "readonly", TextEncoder: "readonly",
        AbortController: "readonly", AbortSignal: "readonly",
        Headers: "readonly", Request: "readonly", Response: "readonly", fetch: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly",
        setInterval: "readonly", clearInterval: "readonly",

        // Node/Edge
        process: "readonly", Buffer: "readonly", global: "readonly",
        module: "readonly", exports: "readonly", require: "readonly",
        __dirname: "readonly",

        // Sonstiges
        React: "readonly",
        RequestInfo: "readonly",
        RequestInit: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='cookies'] MemberExpression[property.name='get']",
          message: "Nutze getCookie().",
        },
        {
          selector:
            "CallExpression[callee.name='headers'] MemberExpression[property.name='get']",
          message: "Nutze getHeader().",
        },
      ],
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "@prisma/client", message: "Bitte @db-web oder @db-core verwenden." }] },
      ],
      // Clean Build Defaults
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "error",
      "no-console": "off",
      "no-undef": "off", // straffen wir gezielt unten
    },
  },

  { // Strikt nur dort, wo es jetzt wichtig ist
    files: [
      "src/app/api/contributions/**",
      "src/app/pipeline/**",
      "src/features/**",
    ],
    rules: { "no-undef": "error" },
  },

  { // Client Dateien: sanfte Zusatzregeln
    files: ["src/components/**/*", "src/app/**/page.tsx", "src/app/**/layout.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  { rules: { "no-empty": ["error", { allowEmptyCatch: true }] } },
];
