// ===== إعداد ESLint (flat config) — المرحلة D1 =====
// Next 15 + TypeScript. يُشغَّل يدويًا وفي CI (npm run lint).

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "public/sw.js", "playwright-report/**", "test-results/**"],
  },
  {
    // next-env.d.ts مولّد تلقائيًا من Next ويستخدم triple-slash قياسيًا
    files: ["next-env.d.ts"],
    rules: { "@typescript-eslint/triple-slash-reference": "off" },
  },
];

export default config;
