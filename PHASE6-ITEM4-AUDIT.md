# Phase 6 / Item 4 — Audit (قبل التعديل)

> سُجِّل قبل أي تعديل — وفق أمر التنفيذ (قسم 1). Baseline: Item 2 = 53384b3 · Item 3 = a63011f · 148/148 · CI PASS · LIVE.

## 1) هل Playwright موجود أصلًا؟
- **نعم**: `@playwright/test ^1.62.1` في devDependencies (أُضيف في خطة Core Stack).
- `"test:e2e": "playwright test"` موجود في scripts.
- **لا يوجد** `playwright.config.ts` ولا `tests/e2e/` بعد — هذا البند ينشئهما (tooling فقط، ليس runtime).

## 2) هل browser binaries موجودة؟
- محليًا: نعم (ثُبّت chromium_headless_shell-1234 + libs النظام). على CI: يجب `npx playwright install --with-deps chromium` — يُضاف كخطوة صغيرة (أقل تعديل).

## 3) كيف يُرسل الرد؟
- `page.tsx` `sendMessage()`: POST `/api/chat` (SSE) → يُلحق رسائل المستخدم/المساعد في `conversations`؛ `streaming` true أثناء البث (زر إيقاف Square + مؤشر نقاط `animate-bounce`/type-cursor).
- **Enter** بدون Shift يرسل (سطر ~909: `if (e.key === "Enter" && !e.shiftKey)`).
- **بلا مفتاح / بدون شبكة خارجية**: الخادم يتراجع تلقائيًا لوضع **demo** (محلي، نص ثابت بالعربية) — هذا هو **deterministic AI boundary الحالي أصلًا** — لا يلزم أي mock جديد.

## 4) كيف يُحذف؟
- `deleteChat(id)` في page.tsx: يفلتر `conversations`، وإن كان المحذوف هو النشط → `setActiveId(null)` (fallback = شاشة Welcome).
- Sidebar: زر Trash2 لكل محادثة (يظهر عند hover فقط) مع `confirm(t("deleteConfirm"))` (حوار متصفح أصلي — لا حوار مخصص للكيس: **إلغاء الحذف = إغلاق الحوار**).
- الحذف لا يمس localStorage فورًا — **الحفظ التلقائي** (`store.saveAll` بعد 1200ms) — لذلك قبل أي refresh يجب انتظار autosave.

## 5) ما الإعدادات القابلة للتغيير؟
- `Settings { modelId, system, temperature, theme, lang }` في `DEFAULTS_SETTINGS` (lib/storage.ts).
- Saveها في `saveSettings` → `store.saveSettings(settings)` (localStorage `nawah:settings`) — **persistence حقيقية موجودة**.
- أثر UI فعلي: `document.documentElement.setAttribute("data-theme", ...)` + `lang`.
- أثر runtime: system/temperature/modelId تُرسل مع `/api/chat`.

## 6) الحد الأدنى لاختبار E2E
- بدون أي أسرار/مفاتيح (demo محلي)؛ بدون بيانات حقيقية؛ كل اختبار يبدأ بـ localStorage فارغ + context جديد.

## 7) تنفيذ بلا LLM خارجي
- **لا حاجة لمحاكاة**: وضع demo = رد ثابت محلي؛ الشبكة بائعة من المزودين لا تُلمس (resolveProvider → demo عند غياب المفاتيح).

## Assets
| Asset | الموقع | الحالة |
|---|---|---|
| playwright.config.ts | جذر المشروع | **يُولَّد** (webServer port 3100 — لا تصادم مع 3000 للـunit tests) |
| tests/e2e/core-flows.spec.ts | tests/e2e/ | **يُولَّد** (15 حالة مصفوفة) |
| CI ci.yml | .github/workflows/ | **تعديل أدنى**: خطوة e2e بعد الاختبارات (install chromium + playwright test) |
| i18n | lib/i18n.ts | ليس مطلوبًا تعديله — selectors عبر getByRole/name/text عربية موجودة |
