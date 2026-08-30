// ===== E2E — Playwright (Item 4): إرسال / حذف / إعدادات =====
// كل اختبار مستقل (سياق متصفح معزول تلقائيًا + localStorage نظيف).
// بلا LLM خارجي، بلا أسرار: الخادم يتراجع لوضع demo المحلي (deterministic).
// RATE_LIMIT_DISABLED=1 في webServer (بيئة الاختبار فقط — موثق في rate-limit.ts).

import { test, expect, type Page } from "@playwright/test";

const AR_MSG = "رسالة عربية تجريبية مرحبا بكم في الاختبار";
const AR_MSG2 = "رسالة ثانية للتأكد من ترتيب الإرسال";

/** فتح الصفحة في حالة نظيفة (يُمسح أي أثر من تشغيل سابق) */
async function openClean(page: Page) {
  await page.goto("/");
  await expect(page.locator("textarea")).toBeVisible({ timeout: 15_000 });
}

/** إرسال رسالة via Enter والعودة بعد اكتمال البث */
async function sendAndWait(page: Page, text: string) {
  const ta = page.locator("textarea");
  await ta.fill(text);
  await ta.press("Enter");
  // ظهور رسالة المستخدم فورًا
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  // اكتمال البث: مؤشر البث يختفي + رسالتان على الأقل في المنطقة
  await expect
    .poll(async () => page.locator("main .msg-in").count(), { timeout: 45_000 })
    .toBeGreaterThanOrEqual(2);
  await expect(page.locator(".type-cursor")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator(".animate-bounce")).toHaveCount(0, { timeout: 45_000 });
  await ta.waitFor({ state: "visible" });
}

// ───────────────────────── 1) تحميل التطبيق ─────────────────────────
test("E2E-1 التطبيق يحمّل ويعرض الواجهة الرئيسية", async ({ page }) => {
  await openClean(page);
  await expect(page.getByText("نواة AI").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "محادثة جديدة" })).toBeVisible();
});

// ───────────────────────── 2) إرسال رسالة عربية ─────────────────────────
test("E2E-2 إرسال رسالة عربية → تظهر + رد مساعد يصل", async ({ page }) => {
  await openClean(page);
  await sendAndWait(page, AR_MSG);
  // رسالة المساعد (رد demo المحلي) في منطقة العرض
  const main = page.locator("main");
  await expect(main.locator(".md").first()).not.toBeEmpty({ timeout: 15_000 });
  const mdCount = await main.locator(".md").count();
  expect(mdCount).toBeGreaterThanOrEqual(1);
});

// ───────────────────────── 3) زر الإرسال ─────────────────────────
test("E2E-3 زر الإرسال يرسل الرسالة (بدل Enter)", async ({ page }) => {
  await openClean(page);
  const ta = page.locator("textarea");
  await ta.fill(AR_MSG);
  const sendBtn = page.getByRole("button", { name: "إرسال" });
  await expect(sendBtn).toBeEnabled();
  await sendBtn.click();
  await expect(page.getByText(AR_MSG, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  // اكتمال
  await expect(page.locator(".type-cursor")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator(".animate-bounce")).toHaveCount(0, { timeout: 45_000 });
});

// ───────────────────────── 4) الإرسال بمفتاح Enter ─────────────────────────
test("E2E-4 Enter بدون Shift يرسل (و Shift+Enter لا يرسل)", async ({ page }) => {
  await openClean(page);
  const ta = page.locator("textarea");
  // Shift+Enter يُدخل سطرًا جديدًا ولا يرسل (لا عناصر رسائل بعد)
  await ta.fill(AR_MSG);
  await ta.press("Shift+Enter");
  await page.waitForTimeout(700);
  await expect(page.locator("main .msg-in")).toHaveCount(0);
  // Enter يرسل
  await ta.press("Control+End");
  await ta.press("Enter");
  await expect(page.getByText(AR_MSG, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
});

// ───────────────────────── 5) رسالة فارغة ─────────────────────────
test("E2E-5 رسالة فارغة: زر الإرسال معطّل + Enter لا يرسل", async ({ page }) => {
  await openClean(page);
  const ta = page.locator("textarea");
  await expect(page.getByRole("button", { name: "إرسال" })).toBeDisabled();
  await ta.press("Enter");
  await ta.press("Enter");
  await page.waitForTimeout(800);
  // لا رسائل أُنشئت ولا محادثة في القائمة
  await expect(page.locator("main .msg-in")).toHaveCount(0);
  const convs = await page.evaluate(() => localStorage.getItem("nawah:convs"));
  expect(convs === null || jQuerySafeParse(convs).length === 0).toBe(true);
});

function jQuerySafeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

// ───────────────────────── 6) حالة التحميل/الاكتمال ─────────────────────────
test("E2E-6 يظهر مؤشر بث ثم اكتمال، ومنع الإرسال المكرر أثناء البث", async ({ page }) => {
  await openClean(page);
  const ta = page.locator("textarea");
  await ta.fill(AR_MSG);
  await ta.press("Enter");
  // أثناء البث: زر إيقاف ظاهر + زر إرسال معطّل/مخفي (لا إرسال مكرر)
  await expect(page.getByText(AR_MSG, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  const stopBtn = page.getByRole("button", { name: "إيقاف" });
  const busy = await stopBtn.count();
  if (busy > 0) {
    await expect(stopBtn).toBeVisible();
    await expect(page.getByRole("button", { name: "إرسال" })).toHaveCount(0, { timeout: 5_000 });
  }
  // الاكتمال: الاختفاء + رسالتان
  await expect(page.locator(".type-cursor")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator(".animate-bounce")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator("main .msg-in")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "إيقاف" })).toHaveCount(0);
});

// ───────────────────────── 7) إنشاء محادثة ─────────────────────────
test("E2E-7 إنشاء محادثة (أول إرسال) + زر «محادثة جديدة» يصفّر النشطة بلا حذف", async ({ page }) => {
  await openClean(page);
  // المحادثة تُنشأ عند أول إرسال وتظهر في القائمة الجانبية
  await sendAndWait(page, "رسالة إنشاء محادثة");
  await expect(page.locator("nav div.group")).toHaveCount(1, { timeout: 10_000 });
  // زر «محادثة جديدة»: يعود إلى الشاشة الترحيبية (النشطة = null) ولا يحذف المحادثة
  await page.getByRole("button", { name: "محادثة جديدة" }).click();
  await expect(page.getByText("أهلاً بك في نواة", { exact: false }).first()).toBeVisible();
  await expect(page.locator("nav div.group")).toHaveCount(1);
  // الحفظ التلقائي يعكس المحادثة نفسها في المخزن
  await expect
    .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("nawah:convs") ?? "[]").length), { timeout: 10_000 })
    .toBe(1);
});

// ───────────────────────── 8) حذف المحادثة النشطة ─────────────────────────
test("E2E-8 حذف المحادثة النشطة → العودة للترحيب + الثبات بعد refresh", async ({ page }) => {
  await openClean(page);
  await sendAndWait(page, AR_MSG);
  // المحادثة الآن نشطة ومعروضة — المعالج يُسجَّل قبل النقر
  const nav = page.locator("nav div.group").first();
  await nav.hover();
  page.once("dialog", (d) => d.accept());
  await nav.locator('button[title="حذف"]').click();
  await expect(page.locator("nav div.group")).toHaveCount(0, { timeout: 10_000 });
  // العودة لشاشة الترحيب (active = null)
  await expect(page.getByText("أهلاً بك في نواة", { exact: false }).first()).toBeVisible();
  // انتظار الحفظ التلقائي ثم refresh → المحذوفة لا تعود
  await page.waitForTimeout(1_500);
  await page.reload();
  await expect(page.locator("textarea")).toBeVisible();
  await expect(page.locator("nav div.group")).toHaveCount(0);
});

// ───────────────────────── 9) حذف محادثة غير نشطة ─────────────────────────
test("E2E-9 حذف محادثة غير نشطة لا يمس النشطة", async ({ page }) => {
  await openClean(page);
  await sendAndWait(page, AR_MSG); // محادثة A
  await page.getByRole("button", { name: "محادثة جديدة" }).click();
  await sendAndWait(page, AR_MSG2); // محادثة B (نشطة)
  expect(await page.locator("nav div.group").count()).toBe(2);
  // حذف A (الأولى في القائمة = غير النشطة)
  const itemA = page.locator("nav div.group", { hasText: "رسالة عربية تجريبية" }).first();
  await itemA.hover();
  page.once("dialog", (d) => d.accept());
  await itemA.locator('button[title="حذف"]').click();
  await expect(page.locator("nav div.group")).toHaveCount(1, { timeout: 10_000 });
  // B لا تزال معروضة في منطقة العرض
  await expect(page.getByText(AR_MSG2, { exact: false }).first()).toBeVisible();
});

// ───────────────────────── 10) إلغاء الحذف ─────────────────────────
test("E2E-10 إلغاء الحذف (dismiss) يُبقي المحادثة", async ({ page }) => {
  await openClean(page);
  await sendAndWait(page, AR_MSG);
  expect(await page.locator("nav div.group").count()).toBe(1);
  const item = page.locator("nav div.group").first();
  await item.hover();
  page.once("dialog", (d) => d.dismiss());
  await item.locator('button[title="حذف"]').click();
  await page.waitForTimeout(600);
  await expect(page.locator("nav div.group")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.getByText(AR_MSG, { exact: false }).first()).toBeVisible();
});

// ───────────────────────── 11) فتح الإعدادات ─────────────────────────
test("E2E-11 فتح نافذة الإعدادات", async ({ page }) => {
  await openClean(page);
  await page.locator("header").getByRole("button", { name: "الإعدادات" }).click();
  await expect(page.getByText("الإبداعية (Temperature)", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "حفظ" }).last()).toBeVisible();
});

// ───────────────────────── 12) تغيير إعداد (الثيم) ─────────────────────────
test("E2E-12 تغيير الثيم إلى فاتح → أثر فعلي على الواجهة", async ({ page }) => {
  await openClean(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 15_000 });
  await page.locator("header").getByRole("button", { name: "الإعدادات" }).click();
  await page.getByRole("button", { name: "فاتح" }).click();
  await page.getByRole("button", { name: "حفظ" }).last().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 10_000 });
});

// ───────────────────────── 13) استمرارية الإعدادات (إعادة فتح) ─────────────────────────
test("E2E-13 إعادة فتح الإعدادات تحافظ على القيمة المحفوظة", async ({ page }) => {
  await openClean(page);
  await page.locator("header").getByRole("button", { name: "الإعدادات" }).click();
  await expect(page.getByRole("button", { name: "فاتح" })).toBeVisible();
  // تحديد موجه البداية: داكن افتراضيًا
  await page.getByRole("button", { name: "فاتح" }).click();
  await page.getByRole("button", { name: "حفظ" }).last().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 10_000 });
  // بعد الحفظ تُغلق النافذة تلقائيًا (سلوك المنتج) — نعيد فتحها ونتحقق من القيمة
  await expect(page.getByText("الإبداعية (Temperature)", { exact: false })).toHaveCount(0, { timeout: 5_000 });
  await page.locator("header").getByRole("button", { name: "الإعدادات" }).click();
  // الزر «فاتح» محدد (يحمل class bg-indigo-500)
  const lightBtn = page.getByRole("button", { name: "فاتح" });
  await expect(lightBtn).toHaveClass(/bg-indigo-500/);
});

// ───────────────────────── 14) الاستمرارية بعد refresh ─────────────────────────
test("E2E-14 الثيم الفاتح يبقى بعد إعادة تحميل الصفحة", async ({ page }) => {
  await openClean(page);
  await page.locator("header").getByRole("button", { name: "الإعدادات" }).click();
  await page.getByRole("button", { name: "فاتح" }).click();
  await page.getByRole("button", { name: "حفظ" }).last().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 10_000 });
  await page.waitForTimeout(1_500); // autosave
  await page.reload();
  await expect(page.locator("textarea")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 15_000 });
});

// ───────────────────────── 15) عزل السياقات ─────────────────────────
test("E2E-15 سياق متصفح جديد لا يرى بيانات سياق آخر", async ({ page, browser }) => {
  await openClean(page);
  await sendAndWait(page, "رسالة معزولة لا يجب أن تنتقل");
  expect(await page.locator("nav div.group").count()).toBe(1);
  // سياق جديد تمامًا (متصفح جديد) — بيانات فارغة
  const ctx2 = await browser.newContext({ locale: "ar" });
  const page2 = await ctx2.newPage();
  await page2.goto("/");
  await expect(page2.locator("textarea")).toBeVisible({ timeout: 15_000 });
  expect(await page2.locator("nav div.group").count()).toBe(0);
  const raw2 = await page2.evaluate(() => localStorage.getItem("nawah:convs"));
  expect(raw2 === null || JSON.parse(raw2).length === 0).toBe(true);
  await ctx2.close();
});
