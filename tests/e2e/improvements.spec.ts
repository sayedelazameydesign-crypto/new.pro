// ===== E2E — Playwright (CR-005 / Item 5): اختصار Ctrl/⌘+Enter · سحب الملفات · ملء الشاشة =====
// نفس ضوابط Item 4: سياق معزول لكل اختبار، بلا LLM خارجي (demo المحلي)، بلا أسرار/بيانات حقيقية.
// selectors عبر getByRole/getByText — composer وصل إليه عبر aria-label وصولي (مضاف بصدق للوصولية).
// ملاحظة: زر ملء الشاشة يظهر بعد mount (fsSupported تُحسب في useEffect — SSR بلا document).

import { test, expect, type Page } from "@playwright/test";

const AR_MSG = "رسالة اختبار الاختصار";

/** فتح الصفحة في حالة نظيفة */
async function openClean(page: Page) {
  await page.goto("/");
  await expect(page.locator("textarea")).toBeVisible({ timeout: 15_000 });
}

/** انتظار اكتمال البث (نفس نمط core-flows) */
async function waitStreamDone(page: Page) {
  await expect(page.locator(".type-cursor")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator(".animate-bounce")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator("textarea")).toBeVisible();
}

// ───────────────────────── 1) اختصار الإرسال المعتمد ─────────────────────────
test("I-1 Ctrl+Enter يرسل الرسالة (وShift+Ctrl+Enter لا يرسل)", async ({ page }) => {
  await openClean(page);
  const ta = page.locator("textarea");

  // Shift+Ctrl+Enter → سطر جديد، لا إرسال (لا عناصر رسائل بعد)
  await ta.fill(AR_MSG);
  await ta.press("Control+Shift+Enter");
  await expect(page.locator("main .msg-in")).toHaveCount(0);

  // Ctrl+Enter → إرسال
  await ta.press("Control+Enter");
  await expect(page.getByText(AR_MSG, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  await waitStreamDone(page);
  await expect(page.locator("main .msg-in").first()).toBeVisible();
});

// ───────────────────────── 2) سحب ملف صالح ─────────────────────────
test("I-2 سحب ملف txt إلى صندوق الإدخال → شريحة تظهر وتُرسل مع الرسالة", async ({ page }) => {
  await openClean(page);
  const composer = page.getByRole("group", { name: "صندوق الإدخال — يمكن سحب الملفات إليه" });

  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(["محتوى تجريبي من الملف"], "مذكرة.txt", { type: "text/plain" }));
    return d;
  });
  await composer.dispatchEvent("drop", { dataTransfer: dt });

  // شريحة المرفق ظاهرة
  await expect(page.getByText("مذكرة.txt")).toBeVisible();
  // إرسال مع المرفق (الزر مفعّل بلا نص)
  const ta = page.locator("textarea");
  await ta.press("Control+Enter");
  await waitStreamDone(page);
  await expect(page.locator("main .msg-in").first()).toBeVisible();
});

// ───────────────────────── 3) سحب ملف ممنوع ─────────────────────────
test("I-3 سحب امتداد ممنوع → رسالة خطأ واضحة وبلا شريحة", async ({ page }) => {
  await openClean(page);
  const composer = page.getByRole("group", { name: "صندوق الإدخال — يمكن سحب الملفات إليه" });

  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(["x"], "evil.exe"));
    return d;
  });
  await composer.dispatchEvent("drop", { dataTransfer: dt });

  await expect(page.getByText(/صيغة الملف غير مدعومة/)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("evil.exe")).toHaveCount(0);
  // لا يُنشأ أي ملف/رسالة — زر الإرسال يبقى معطلًا
  await expect(page.getByRole("button", { name: "إرسال" })).toBeDisabled();
});

// ───────────────────────── 4) ملء الشاشة (زر UI فقط) ─────────────────────────
test("I-4 زر ملء الشاشة يفتح ويغلق ويتزامن مع الخروج", async ({ page }) => {
  await openClean(page);
  const btn = page.getByRole("button", { name: "ملء الشاشة" });
  await expect(btn).toBeVisible();

  await btn.click();
  // إثبات: fullscreenElement الحقيقي أو خطاف data-fs الاحتياطي (قيد headless موثق)
  await expect
    .poll(
      async () => {
        return page.evaluate(() => document.fullscreenElement !== null || document.documentElement.hasAttribute("data-fs"));
      },
      { timeout: 10_000 }
    )
    .toBe(true);
  // الزر يتبدل إلى «الخروج من ملء الشاشة»
  await expect(page.getByRole("button", { name: "الخروج من ملء الشاشة" })).toBeVisible();

  await page.getByRole("button", { name: "الخروج من ملء الشاشة" }).click();
  await expect
    .poll(
      async () => {
        return page.evaluate(() => document.fullscreenElement === null && !document.documentElement.hasAttribute("data-fs"));
      },
      { timeout: 10_000 }
    )
    .toBe(true);
  // يعود زر الدخول
  await expect(page.getByRole("button", { name: "ملء الشاشة" })).toBeVisible();
});
