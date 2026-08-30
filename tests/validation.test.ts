// ===== اختبارات التحقق (zod) — المرحلة D1 =====
// valid / invalid / malformed — بلا شبكة، بلا DOM.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chatRequestSchema,
  settingsSchema,
  imageRequestSchema,
  parseOrNull,
  parseChatBody,
} from "../lib/validation";

test("V-1 صالح: جسم /api/chat قياسي يُقبل كاملًا", () => {
  const r = chatRequestSchema.safeParse({
    messages: [{ role: "user", content: "مرحبا" }],
    temperature: 0.7,
    modelId: "gemini:gemini-2.5-flash",
    apiKey: "key",
    system: "أنت مساعد",
  });
  assert.equal(r.success, true);
});

test("V-2 غير صالح: role خارج المسموح يُرفض", () => {
  const r = chatRequestSchema.safeParse({
    messages: [{ role: "hacker", content: "x" }],
  });
  assert.equal(r.success, false);
});

test("V-3 غير صالح: temperature خارج النطاق يُرفض", () => {
  assert.equal(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "x" }], temperature: 9 }).success, false);
  assert.equal(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "x" }], temperature: -1 }).success, false);
  assert.equal(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "x" }], temperature: NaN }).success, false);
});

test("V-4 تالف: messages ليست مصفوفة / content ليس نصًا يُرفض", () => {
  assert.equal(chatRequestSchema.safeParse({ messages: "نص" }).success, false);
  assert.equal(
    chatRequestSchema.safeParse({ messages: [{ role: "user", content: 42 }] }).success,
    false
  );
  assert.equal(chatRequestSchema.safeParse({ messages: [null] }).success, false);
});

test("V-5 أدوات مساعدة: parseOrNull يعيد null بدل رمي خطأ", () => {
  const good = parseOrNull(settingsSchema, {
    modelId: "m", system: "", temperature: 0.5, theme: "dark", lang: "ar",
  });
  assert.ok(good);
  assert.equal(parseOrNull(settingsSchema, { theme: "blue" }), null);
  assert.equal(parseOrNull(imageRequestSchema, { prompt: "" }), null);
  assert.equal(parseOrNull(imageRequestSchema, undefined), null);
});

test("V-6 حدود الحجم: رسالة تتجاوز 60 ألف حرف تُرفض", () => {
  const r = chatRequestSchema.safeParse({
    messages: [{ role: "user", content: "x".repeat(60_001) }],
  });
  assert.equal(r.success, false);
});

// ===== V-7..V-10: التسوية المتساهلة parseChatBody (مسار الإنتاج) =====

test("V-7 تسامح: 30 رسالة تمر كلها (لا رفض — القص في المسار)", () => {
  const msgs = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 === 1 ? "user" : "assistant",
    content: "رسالة " + i,
  }));
  const b = parseChatBody({ messages: msgs });
  assert.equal(b.messages.length, 30);
  assert.equal(b.messages[29].role, "user");
});

test("V-8 تسامح: temperature=99 يمر كما هو (التثبيت في المسار، لا رفض 400)", () => {
  const b = parseChatBody({ messages: [{ role: "user", content: "x" }], temperature: 99 });
  assert.equal(b.temperature, 99);
});

test("V-9 تسامح: رسائل غير صالحة تُفلتر فرديًا (لا تُسقط الكل)", () => {
  // مطابقة الفلتر القديم حرفيًا: أي role صادق + content نص يمر (حتى role غير معروف)،
  // ويُفلتر فقط: بلا دور، null، نص حر، content غير نصي
  const b = parseChatBody({
    messages: [
      { role: "user", content: "صالحة" },
      { role: "hacker", content: "x" },
      { content: "بلا دور" },
      null,
      "نص",
      { role: "assistant", content: 5 },
    ],
  });
  assert.deepEqual(b.messages, [
    { role: "user", content: "صالحة" },
    { role: "hacker", content: "x" },
  ]);
});

test("V-10 تسامح: جسم غير كائن/فارغ → messages:[] بلا رفض", () => {
  assert.deepEqual(parseChatBody(null).messages, []);
  assert.deepEqual(parseChatBody("نص").messages, []);
  assert.deepEqual(parseChatBody({}).messages, []);
  assert.deepEqual(parseChatBody({ messages: "ليست مصفوفة" }).messages, []);
  // الحقول النصية شاذة → undefined (لا تعطل منطق المسار)
  const b = parseChatBody({ messages: [], modelId: 55, system: [], apiKey: {} });
  assert.equal(b.modelId, undefined);
  assert.equal(b.system, undefined);
  assert.equal(b.apiKey, undefined);
  // files تُمرَّر كما هي (مسؤولية mergeAttachments)
  const withFiles = parseChatBody({ messages: [], files: [{ name: "a.txt", data: "x" }] });
  const arr = Array.isArray(withFiles.files) ? (withFiles.files as { name?: string }[]) : [];
  assert.equal(arr[0]?.name, "a.txt");
});
