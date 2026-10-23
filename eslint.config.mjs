import { readFileSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Design-system adherence (design/_adherence.oxlintrc.json, the contract shipped with the export): no raw hex or px
 * values, only the fonts the system provides, and only the props each component declares. The export's rules are loaded
 * as they are and run as errors on the code that is composed from the design system. The admin keeps shadcn primitives
 * (their <Button> is a different component with different props), so these syntax rules do not apply there.
 */
const adherence = JSON.parse(readFileSync(new URL("./design/_adherence.oxlintrc.json", import.meta.url), "utf8")).rules;
const asError = (rule) => ["error", ...rule.slice(1)];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/(site)/**/*.{ts,tsx}", "app/dev/**/*.{ts,tsx}", "components/site/**/*.{ts,tsx}", "components/dev/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": asError(adherence["no-restricted-syntax"]) },
  },
  {
    // The export says "import from index.js, not component internals"; ours is the barrel `@/components/ds`.
    files: ["**/*.{ts,tsx}"],
    ignores: ["components/ds/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/ds/*", "**/components/ds/*", "./ds/*", "../ds/*"],
              message: "Import design-system components from '@/components/ds' (the barrel), not from component internals.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Downloaded test fixtures and generated screenshots (git-ignored).
    ".cache/**",
    // Read-only design-system export (reference source, not our code).
    "design/**",
  ]),
]);

export default eslintConfig;
