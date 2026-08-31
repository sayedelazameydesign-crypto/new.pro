// ===== إعداد ESLint (flat config) — Next 16 + TypeScript =====
// يُشغَّل يدويًا وفي CI (npm run lint). بلا FlatCompat (غير متوافق مع eslint-config-next 16).

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ["node_modules/**", ".next/**", "public/sw.js", "playwright-report/**", "test-results/**"],
  },
  {
    files: ["next-env.d.ts"],
    rules: { "@typescript-eslint/triple-slash-reference": "off" },
  },
  {
    // مؤجّل حتى تفكيك page.tsx: القاعدة جديدة في eslint-config-next 16 وليست انحدارًا سلوكيًا
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
];

export default config;
