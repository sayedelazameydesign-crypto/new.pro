// ===== اختبارات التذكّر (المرحلة 5.4) — وحدة مباشرة على lib/summary =====
// تلخيص استخلاصي محلي بلا شبكة ولا مزود — قابل للاختبار بالكامل في node.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarize,
  shouldSummarize,
  composeSystem,
  SUMMARY_TRIGGER_MESSAGES,
  SUMMARY_MAX_CHARS,
  SUMMARY_KEEP_RECENT,
} from "../lib/summary";
import type { ChatMessage } from "../lib/types";

const msg = (role: "user" | "assistant", content: string, i = 0): ChatMessage => ({
  id: `m${i}`,
  role,
  content,
  createdAt: i,
});

// محادثة نموذجية: 30 رسالة (تتجاوز عتبة 24)
function longConv(): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = 0; i < 15; i++) {
    out.push(msg("user", `السؤال رقم ${i + 1} عن موضوع الرياضيات؟`, i * 2));
    out.push(msg("assistant", `إجابة السؤال ${i + 1}: **الرياضيات** هي علم الأعداد والكميات، وتُستخدم في كل شيء حولنا من الحساب البسيط إلى النماذج المعقدة.`, i * 2 + 1));
  }
  return out;
}

// ── 1) عتبة التذكّر ──
test("R-1 shouldSummarize يحترم العتبة", () => {
  assert.equal(shouldSummarize([]), false);
  assert.equal(shouldSummarize(longConv().slice(0, SUMMARY_TRIGGER_MESSAGES)), false);
  assert.equal(shouldSummarize(longConv()), true);
});

// ── 2) الملخص يلتقط أسئلة المستخدم وردود المساعد ──
test("R-2 summarize يبني ملخصًا بأسئلة وأجوبة", () => {
  const s = summarize(longConv());
  assert.ok(s.length > 0, "ملخص غير فارغ");
  assert.ok(s.includes("السؤال رقم 1"), "يحتوي أول سؤال");
  assert.ok(s.includes("الرياضيات"), "يحتوى محتوى الردود");
  assert.ok(!s.includes("**"), "بلا ترميز Markdown");
});

// ── 3) الرسائل الحديثة لا تدخل الملخص (تبقى في السياق كاملة) ──
test("R-3 الملخص يغطي القديم فقط (آخر KEEP_RECENT تبقى حية)", () => {
  const conv = longConv(); // 30 رسالة
  const s = summarize(conv);
  // النافذة القديمة = 18 رسالة (9 أزواج: أسئلة 1..9) → آخر KEEP_RECENT (12) رسائل تبقى حية
  const olderQ = 9; // آخر سؤال داخل النافذة القديمة
  assert.ok(s.includes(`السؤال رقم 1`), "أول سؤال قديم مُلخّص");
  assert.ok(s.includes(`السؤال رقم ${olderQ}`), `سؤال ${olderQ} (حدود النافذة القديمة) مُلخّص`);
  // أدق فحص: لا يظهر أي سؤال من النافذة الحية (أرقام 10..15)
  for (const q of [10, 11, 12, 13, 14, 15]) {
    assert.ok(!s.includes(`السؤال رقم ${q}`), `السؤال ${q} (حي) ليس في الملخص`);
  }
  assert.equal(SUMMARY_KEEP_RECENT, 12, "ثابت النافذة الحية كما هو موثق");
});

// ── 4) الملخص لا يتضخم فوق الحد ──
test("R-4 طول الملخص ضمن الحد", () => {
  const conv: ChatMessage[] = [];
  for (let i = 0; i < 40; i++) {
    conv.push(msg("user", "هل يمكنك أن تشرح لي بالتفصيل هذا الموضوع المعقد مرة أخرى؟", i * 2));
    conv.push(msg("assistant", "طبعًا، هذا الموضوع يتكون من عدة جوانب أساسية: " + "نقطة شرح مفصلة جدًا تتكرر. ".repeat(60), i * 2 + 1));
  }
  const s = summarize(conv);
  assert.ok(s.length <= SUMMARY_MAX_CHARS, `طول الملخص ${s.length} ≤ ${SUMMARY_MAX_CHARS}`);
});

// ── 5) composeSystem: نظام المستخدم + الملخص ──
test("R-5 composeSystem يدمج النظام والملخص (أو يعيد النظام وحده)", () => {
  const full = composeSystem("أنت مساعد برمجي.", "تحدثنا عن الرياضيات.");
  assert.ok(full.includes("أنت مساعد برمجي."));
  assert.ok(full.includes("تحدثنا عن الرياضيات"));
  assert.ok(full.includes("ملخص المحادثة السابقة")); // تسمية السياق

  // بدون نظام مستخدم → ملخص وحيد بصيغة افتراضية
  const onlySummary = composeSystem("", "تحدثنا عن الرياضيات.");
  assert.ok(onlySummary.includes("تحدثنا عن الرياضيات"));
  assert.ok(onlySummary.includes("ملخص المحادثة السابقة"));
  // بدون ملخص → النظام الأصلي كما هو بلا إضافة
  assert.equal(composeSystem("أنا نظام فقط.", ""), "أنا نظام فقط.");
  assert.equal(composeSystem("", ""), "");
});

// ── 6) ملخص قصير: محتوى فعلي فقط، بلا أزواج ──
test("R-6 summarize يرفض الإخراج الفارغ/الزخرفي", () => {
  const conv: ChatMessage[] = [];
  for (let i = 0; i < 13; i++) {
    conv.push(msg("user", `س${i}؟`, i * 2));
    conv.push(msg("assistant", "", i * 2 + 1)); // ردود فارغة
  }
  // ردود فارغة → لا أزواج → قد يعيد ملخص جمل فقط
  const s = summarize(conv);
  assert.equal(typeof s, "string");
  assert.ok(s.length <= SUMMARY_MAX_CHARS);
});

// ── 7) composeSystem لا يضاعف الملخص إن تكرر الإرسال ──
test("R-7 composeSystem يستقر عبر الإرسالات المتكررة", () => {
  const s1 = composeSystem("نظام", "ملخص أ");
  const s2 = composeSystem("نظام", "ملخص أ");
  assert.equal(s1, s2);
});

// ── 8) المحادثات القصيرة لا تُلخّص إطلاقًا ──
test("R-8 Conversation قصيرة → بلا ملخص (shouldSummarize false)", () => {
  const short: ChatMessage[] = [
    msg("user", "أهلًا", 0),
    msg("assistant", "أهلًا وسهلًا! كيف أساعدك؟", 1),
    msg("user", "ما هي نواة؟", 2),
  ];
  assert.equal(shouldSummarize(short), false);
  assert.equal(summarize(short), ""); // لا رسائل «قديمة» أصلاً
});
