// ===== CR-006 (Item 6): Conversation Intelligence — node:test =====
// قاعدة: بلا LLM خارجي، بلا أسرار. الخادم التجريبي بلا مفاتيح → كل مسار شبكة
// ينتهي حتميًا بـ no-provider (يُثبت «لا استدعاء عند غياب المفاتيح»).
// الأجزاء النقية (تنظيف/تعقيم/خصوصية/schema/حدود) تُختبر بلا خادم.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intelRequestSchema,
  cleanSource,
  sanitizeTitle,
  firstUserMessageContent,
  intelSystem,
  INTEL_MAX_SOURCE,
} from "../lib/intel";
import { checkRateLimit } from "../lib/rate-limit";

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function postIntel(body: unknown) {
  const res = await fetch(`${BASE}/api/conversation-intel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { res, json };
}

// ───────────────────── 1) طلب صالح → no-provider (حتمي: بلا مفاتيح ─────────────────────
test("I-1 طلب صالح مع عدم وجود مفاتيح → no-provider بلا استدعاء", async () => {
  const { res, json } = await postIntel({
    kind: "title",
    modelId: "gemini:gemini-2.5-flash",
    source: "اكتب لي خطة تعلم بايثون",
    lang: "ar",
  });
  assert.equal(res.status, 200);
  assert.equal(json?.ok, false);
  assert.equal((json as { code?: string })?.code, "no-provider"); // مزود demo/search مستبعد — لا عنوان وهمي
});

// ───────────────────── 2) مصدر فارغ/غير صالح → 400 ─────────────────────
test("I-2 مصدر فارغ → 400 invalid", async () => {
  const { res, json } = await postIntel({ kind: "title", source: "   ", lang: "ar" });
  assert.equal(res.status, 400);
  assert.equal((json as { code?: string })?.code, "invalid");
});

// ───────────────────── 3) kind غير معتمد → 400 ─────────────────────
test("I-3 kind غير مسموح (completion غير معتمد بعد) → 400 invalid", async () => {
  const { res } = await postIntel({ kind: "completion", source: "نص", lang: "ar" });
  assert.equal(res.status, 400);
});

// ───────────────────── 4) قاعدة الخصوصية A — أول رسالة مستخدم فقط ─────────────────────
test("I-4 أول رسالة مستخدم فقط (بلا رد المساعد، بلا رسائل لاحقة)", () => {
  const msgs = [
    { role: "assistant", content: "أهلاً" },
    { role: "user", content: "أول رسالة حقيقية" },
    { role: "user", content: "رسالة ثانية" },
    { role: "assistant", content: "رد" },
  ];
  assert.equal(firstUserMessageContent(msgs), "أول رسالة حقيقية");
  assert.equal(firstUserMessageContent([{ role: "assistant", content: "بدون مستخدم" }]), "");
  assert.equal(firstUserMessageContent([]), "");
});

// ───────────────────── 5) تنظيف المصدر ─────────────────────
test("I-5 cleanSource يزيل ماركداون/روابط ويطوي ويقص", () => {
  const c = cleanSource("**خطة** [رابط](https://x.com) `كود`\n\nسطر جديد");
  assert.equal(c, "خطة رابط كود سطر جديد");
  // قص السقف
  const long = cleanSource("أ".repeat(INTEL_MAX_SOURCE + 500));
  assert.ok(long.length <= INTEL_MAX_SOURCE);
  assert.equal(cleanSource("```js\ncode block\n```"), "");
  assert.equal(cleanSource("   "), "");
});

// ───────────────────── 6) تعقيم العنوان من المزود ─────────────────────
test("I-6 sanitizeTitle: تنظيف/قص/رفض فارغ", () => {
  assert.equal(sanitizeTitle("  **خطة تعلم بايثون**  "), "خطة تعلم بايثون");
  assert.equal(sanitizeTitle("«عنوان مقتبس»"), "عنوان مقتبس");
  assert.equal(sanitizeTitle("# عنوان\nبسطر جديد"), "عنوان بسطر جديد");
  assert.equal(sanitizeTitle("```\nكود\n```"), null); // كتلة كود فقط → لا عنوان (null صحيح عقديًا)
  assert.equal(sanitizeTitle("***"), null);
  assert.equal(sanitizeTitle("   "), null);
  const long = "ع".repeat(200);
  const t = sanitizeTitle(long);
  assert.ok(t && t.length <= 80 + 1, `يُقص إلى 80 + نقطة: ${t?.length}`); // 80 + "…"
  assert.ok(t?.endsWith("…"));
});

// ───────────────────── 7) Schema (Zod v4) ─────────────────────
test("I-7 schema: يقبل/يرفض/افتراضي lang + modelId اختياري", () => {
  const ok = intelRequestSchema.safeParse({ kind: "title", source: "نص" });
  assert.ok(ok.success);
  assert.equal(ok.success && ok.data.lang, "ar"); // default
  assert.ok(intelRequestSchema.safeParse({ kind: "title", source: "نص", modelId: "groq:x", lang: "en" }).success);
  assert.ok(!intelRequestSchema.safeParse({ kind: "title", source: "" }).success);
  assert.ok(!intelRequestSchema.safeParse({ kind: "bogus", source: "نص" }).success);
});

// ───────────────────── 8) تعليمات توليد العنوان (لغة) ─────────────────────
test("I-8 intelSystem يطابق اللغة (ar/en)", () => {
  assert.match(intelSystem("ar"), /عنوانًا عربيًا/);
  assert.match(intelSystem("en"), /short English title/);
});

// ───────────────────── 9) حدود intel (bucket مستقل) ─────────────────────
test("I-9 bucket intel: حد مخصص 2 → الثالثة محظورة (منطق مكدس الذاكرة)", async () => {
  const ip = "10.99.0.1";
  assert.equal((await checkRateLimit("intel-unit", ip, 2)).ok, true);
  assert.equal((await checkRateLimit("intel-unit", ip, 2)).ok, true);
  const third = await checkRateLimit("intel-unit", ip, 2);
  assert.equal(third.ok, false);
  assert.ok(third.remaining === 0);
});

// ───────────────────── 10) جسم غير JSON / مفاتيح باسماء حساسة لا تتسرب ─────────────────────
test("I-10 جسم غير صالح (خام) → 400 بدل 500", async () => {
  const { res } = await postIntel("ليس JSON");
  assert.equal(res.status, 400);
});
