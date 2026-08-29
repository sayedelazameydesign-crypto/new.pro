// ===== اختبارات النواة الآلية (node:test — بدون أي اعتماديات) =====
// التشغيل:  npm test        (يتوقع أن يكون الخادم شغالًا)
// أو:       BASE_URL=http://localhost:3001 npm test

import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";

/** يقرأ تدفق SSE كاملًا ويعيد الأحداث */
async function postChat(body) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const events = [];
  for (const block of text.split("\n\n")) {
    for (const line of block.split("\n")) {
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (payload) {
          try {
            events.push(JSON.parse(payload));
          } catch {
            /* ignore */
          }
        }
      }
    }
  }
  return { res, events, text };
}

const textOf = (events) =>
  events.filter((e) => typeof e.chunk === "string").map((e) => e.chunk).join("");

// ─────────── 1) الصفحة الرئيسية ───────────
test("GET / يعرض واجهة عربية RTL", async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<html/);
  assert.match(html, /lang="ar"/);
  assert.match(html, /dir="rtl"/);
});

test("GET /icon.svg متاح", async () => {
  const res = await fetch(`${BASE}/icon.svg`);
  assert.equal(res.status, 200);
});

// ─────────── 2) حالة المفاتيح ───────────
test("GET /api/status يرد بحالة المزودات (بدون كشف القيم)", async () => {
  const res = await fetch(`${BASE}/api/status`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(typeof j.gemini, "boolean");
  assert.equal(typeof j.huggingface, "boolean");
});

// ─────────── 3) قائمة الموديلات ───────────
test("GET /api/models يعرض كل المزودات", async () => {
  const res = await fetch(`${BASE}/api/models`);
  assert.equal(res.status, 200);
  const j = await res.json();
  const ids = j.models.map((m) => m.id);
  assert.ok(ids.includes("gemini:gemini-2.5-flash"), "يحتوي Gemini Flash");
  assert.ok(ids.includes("gemini:gemini-2.5-pro"), "يحتوي Gemini Pro");
  assert.ok(ids.includes("hf:mistralai/Mistral-7B-Instruct-v0.3"), "يحتوي Mistral");
  assert.ok(ids.includes("demo"), "يحتوي وضع العرض");
  assert.ok(j.models.length >= 7, "عدد الموديلات كافٍ");
});

// ─────────── 4) محادثة وضع العرض (بث كامل) ───────────
test("POST /api/chat (demo) يبث ردا كاملا ثم done", async () => {
  const { res, events } = await postChat({
    messages: [{ role: "user", content: "مرحبا، اشرح لي ما هذه المنصة؟" }],
    modelId: "demo",
    system: "",
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/event-stream/);

  const providerEvt = events.find((e) => e.provider);
  assert.equal(providerEvt?.provider, "demo", "المزود = demo");

  const chunks = events.filter((e) => typeof e.chunk === "string");
  assert.ok(chunks.length > 10, `عدد المقاطع كافٍ (${chunks.length})`);

  const full = textOf(events);
  assert.ok(full.length > 100, `طول الرد كافٍ (${full.length})`);
  assert.match(full, /نواة|نواه|Nawah|cache/i);

  const last = events[events.length - 1];
  assert.equal(last?.done, true, "ينتهي بحدث done");
});

// ─────────── 5) التراجع التلقائي بدون مفاتيح ───────────
test("طلب Gemini بلا مفتاح يتراجع تلقائيًا لوضع العرض", async () => {
  const { res, events } = await postChat({
    messages: [{ role: "user", content: "اختبار التراجع التلقائي" }],
    modelId: "gemini:gemini-2.5-flash",
  });
  assert.equal(res.status, 200, "لا يفشل أبدًا");
  assert.equal(events.find((e) => e.provider)?.provider, "demo");
});

test("طلب Hugging Face بلا توكن يتراجع تلقائيًا", async () => {
  const { res, events } = await postChat({
    messages: [{ role: "user", content: "اختبار تراجع HF" }],
    modelId: "hf:meta-llama/Llama-3.2-3B-Instruct",
  });
  assert.equal(res.status, 200);
  assert.equal(events.find((e) => e.provider)?.provider, "demo");
});

// ─────────── 6) التحقق من صحة المدخلات ───────────
test("رسائل فارغة → 400", async () => {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [], modelId: "demo" }),
  });
  assert.equal(res.status, 400);
});

test("آخر رسالة ليست مستخدمًا → 400", async () => {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "assistant", content: "أنا مساعد" }] }),
  });
  assert.equal(res.status, 400);
});

// ─────────── 7) سياقات طويلة تُقص (12 رسالة) ───────────
test("إرسال سياق طويل يعمل دون انهيار (قص تلقائي)", async () => {
  const messages = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 === 1 ? "user" : "assistant", // آخر رسالة (i=29) مستخدم
    content: `رسالة ${i}`,
  }));
  const { res, events } = await postChat({ messages, modelId: "demo" });
  assert.equal(res.status, 200);
  assert.ok(textOf(events).includes("نواة") || textOf(events).length > 50);
});
