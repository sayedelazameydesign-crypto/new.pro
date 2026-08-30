// ===== إعداد اختبارات E2E (Playwright) — Item 4 =====
// - DEV ONLY tooling: لا يُستخدم في الإنتاج إطلاقًا (لا يُستورد من أي كود تطبيق).
// - webServer على منفذ 3100 (منفصل عن 3000 الذي تستخدمه اختبارات الوحدة).
// - RATE_LIMIT_DISABLED=1: متغير موجود أصلًا في lib/rate-limit.ts موثق
//   «للاختبارات المحلية فقط» — يُفعَّل في بيئة الاختبار هنا (NOT في production).
// - الحالة الحتمية للمزود: بدون مفاتيح يتراجع الخادم لوضع demo المحلي —
//   لا LLM خارجي، لا حصص، لا شبكة مزودين.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // خادم واحد + استقرار الاختبارات المتسلسلة
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure", // artifacts محلية فقط عند الفشل — لا رفع خارجي
    screenshot: "only-on-failure",
    locale: "ar",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      RATE_LIMIT_DISABLED: "1", // بيئة اختبار فقط (موثق في rate-limit.ts)
    },
  },
});
