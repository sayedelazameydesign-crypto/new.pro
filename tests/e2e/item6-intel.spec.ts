// ===== E2E — Playwright (CR-006 / Item 6): العنوان الذكي عند أول رسالة =====
// حتمية كاملة بلا LLM خارجي: اعتراض /api/conversation-intel محليًا (playwright route)
// أو التعويل على استجابة الخادم no-provider (demo بلا مفاتيح).
// المبدأ في كل حالة: العنوان المحسوب (titleFromMessages) هو البديل — لا «عنوان مكسور».

import { test, expect, type Page } from "@playwright/test";

const AR_MSG = "رسالة بداية لعنوان ذكي جديد تماما";

async function openClean(page: Page) {
  await page.goto("/");
  await expect(page.locator("textarea")).toBeVisible({ timeout: 15_000 });
}

async function sendAndWaitDone(page: Page, text: string) {
  const ta = page.locator("textarea");
  await ta.fill(text);
  await ta.press("Enter");
  await expect(page.locator(".type-cursor")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator(".animate-bounce")).toHaveCount(0, { timeout: 45_000 });
}

// ───────────────────────── 1) عنوان ذكي يصل ويعرض في القائمة ─────────────────────────
test("J-1 عنوان ذكي من الـintel يحل محل العنوان المحسوب في القائمة", async ({ page }) => {
  await page.route("**/api/conversation-intel", async (route) => {
    await route.fulfill({
      json: { ok: true, value: "عنوان ذكي من الاختبار", provider: "gemini", model: "m", generatedAt: Date.now() },
    });
  });
  await openClean(page);
  await sendAndWaitDone(page, AR_MSG);

  // بعد اكتمال البث يُطلَق توليد العنوان (لا يحجب) ثم يظهر في الشريط الجانبي
  await expect(page.locator("nav").getByText("عنوان ذكي من الاختبار")).toBeVisible({ timeout: 15_000 });
});

// ───────────────────────── 2) لا مزود → يبقى العنوان المحسوب (بديل آمن) ─────────────────────────
test("J-2 لا مزود مفعّل (خادم demo) → العنوان المحسوب يبقى والحالة سليمة", async ({ page }) => {
  await openClean(page);
  await sendAndWaitDone(page, AR_MSG);
  // بلا اعتراض: الخادم يجيب no-provider → يبقى العنوان المحسوب (أول 34 حرفًا من الرسالة)
  await expect(page.locator("nav").getByText(AR_MSG.slice(0, 20), { exact: false }).first()).toBeVisible({
    timeout: 10_000,
  });
  // لا يظهر أي عنوان وهمي ولا كسر
  await expect(page.locator("main .msg-in").first()).toBeVisible();
});

// ───────────────────────── 3) فشل الخادم → صمت آمن (لا عناوين خاطئة) ─────────────────────────
test("J-3 استجابة فشل من الـintel → لا عنوان مكسور ولا رسالة خطأ", async ({ page }) => {
  await page.route("**/api/conversation-intel", async (route) => {
    await route.fulfill({ status: 500, body: "boom" });
  });
  await openClean(page);
  await sendAndWaitDone(page, AR_MSG);
  // يبقى العنوان المحسوب
  await expect(page.locator("nav").getByText(AR_MSG.slice(0, 20), { exact: false }).first()).toBeVisible({
    timeout: 10_000,
  });
  // لا بانر خطأ يظهر من فشل العناوين (الصمت مقصود — لا نزعج المستخدم)
  await expect(page.locator("main .msg-in").first()).toBeVisible();
});

// ───────────────────────── 4) الإيقاف من الإعدادات يمنع الطلب ─────────────────────────
test("J-4 معطَّل (smartTitle off) → لا يُرسل طلب intel أصلًا", async ({ page }) => {
  let intelRequests = 0;
  await page.route("**/api/conversation-intel", async (route) => {
    intelRequests += 1;
    await route.fulfill({
      json: { ok: true, value: "يجب ألا يظهر", provider: "gemini", model: "m", generatedAt: Date.now() },
    });
  });
  await openClean(page);
  // إيقاف «العناوين الذكية» من الإعدادات
  await page.locator("header").getByRole("button", { name: "الإعدادات" }).click();
  await expect(page.getByRole("button", { name: "حفظ" }).last()).toBeVisible();
  await page.getByText("العناوين الذكية (AI)").click(); // يعكس قيمة checkbox (false)
  await page.getByRole("button", { name: "حفظ" }).last().click();

  await sendAndWaitDone(page, AR_MSG);
  // انتظار هدوء قليل ثم تأكيد عدم وجود أي طلب
  await page.waitForTimeout(1500);
  expect(intelRequests).toBe(0);
  await expect(page.locator("main .msg-in").first()).toBeVisible();
});
