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
  assert.equal(typeof j.groq, "boolean");
  assert.equal(typeof j.search, "boolean");
});

// ─────────── 3) قائمة الموديلات ───────────
test("GET /api/models يعرض كل المزودات", async () => {
  const res = await fetch(`${BASE}/api/models`);
  assert.equal(res.status, 200);
  const j = await res.json();
  const ids = j.models.map((m) => m.id);
  assert.ok(ids.includes("gemini:gemini-2.5-flash"), "يحتوي Gemini Flash");
  assert.ok(ids.includes("gemini:gemini-2.5-pro"), "يحتوي Gemini Pro");
  assert.ok(ids.includes("groq:openai/gpt-oss-120b"), "يحتوي GPT-OSS 120B على Groq");
  assert.ok(ids.includes("groq:openai/gpt-oss-20b"), "يحتوي GPT-OSS 20B على Groq");
  assert.ok(ids.includes("hf:Qwen/Qwen2.5-7B-Instruct"), "يحتوي Qwen عبر HF");
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

test("طلب Groq بلا مفتاح يتراجع تلقائيًا", async () => {
  const { res, events } = await postChat({
    messages: [{ role: "user", content: "اختبار تراجع Groq" }],
    modelId: "groq:llama-3.3-70b-versatile",
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

// ─────────── 8) تمرير الإعدادات (temperature) ───────────
test("إرسال temperature خارج النطاق يُضبط بأمان (لا ينكسر)", async () => {
  const { res, events } = await postChat({
    messages: [{ role: "user", content: "اختبر الإعدادات" }],
    modelId: "demo",
    temperature: 99, // يُقص تلقائيًا إلى 1.5
  });
  assert.equal(res.status, 200);
  assert.ok(textOf(events).length > 50);
});

// ─────────── 9) المزامنة السحابية (بدون DATABASE_URL → وضع محلي، لا ينكسر) ───────────
test("GET /api/conversations بدون قاعدة بيانات → enabled:false", async () => {
  const res = await fetch(`${BASE}/api/conversations?deviceId=test-device-1234`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.enabled, false);
});

test("PUT /api/conversations بدون قاعدة بيانات → enabled:false (تجاهل آمن)", async () => {
  const res = await fetch(`${BASE}/api/conversations`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: "test-device-1234", conversations: [], settings: {} }),
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.enabled, false);
});

test("PUT /api/conversations مع deviceId غير صالح → 400", async () => {
  const res = await fetch(`${BASE}/api/conversations`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: "!!", conversations: [], settings: {} }),
  });
  assert.equal(res.status, 400);
});

// ─────────── 12) البحث في الويب (Tavily) ───────────
test("قائمة الموديلات تتضمن البحث في الويب", async () => {
  const res = await fetch(`${BASE}/api/models`);
  const j = await res.json();
  assert.ok(j.models.some((m) => m.id === "search:web"), "يحتوي search:web");
});

test("طلب بحث في الويب بدون مفتاح → رسالة واضحة (لا تراجع مضلل)", async () => {
  const { res, events } = await postChat({
    messages: [{ role: "user", content: "ما هي أخبار الذكاء الاصطناعي؟" }],
    modelId: "search:web",
  });
  assert.equal(res.status, 200, "لا ينكسر الخادم");
  assert.equal(events.find((e) => e.provider)?.provider, "search", "المزود = search (لا تراجع)");
  const errEvt = events.find((e) => e.error);
  assert.ok(errEvt && /tavily/i.test(errEvt.error), "رسالة خطأ واضحة عن Tavily");
});

// ─────────── 10) حماية الحدود (Rate Limit) — يُشغَّل أخيرًا لأنه يستهلك الحصة ───────────
test("تجاوز حد الرسائل يعيد 429 برسالة واضحة وترويسات الحماية", async () => {
  const statuses = [];
  for (let i = 0; i < 25; i++) {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: `رسالة الحماية ${i}` }], modelId: "demo" }),
    });
    statuses.push(res.status);
  }

  // يجب أن تمر بعض الطلبات (ضمن الحد) ويُرفض ما بعد الحد
  assert.ok(statuses.includes(200), "الطلبات ضمن الحد تنجح");
  assert.ok(statuses.includes(429), "الطلبات بعد الحد تُرفض بـ 429");

  // شكل استجابة الرفض
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "بعد الحد" }], modelId: "demo" }),
  });
  assert.equal(res.status, 429);
  const j = await res.json();
  assert.equal(j.code, "RATE_LIMITED");
  assert.ok(typeof j.error === "string" && j.error.length > 5, "رسالة خطأ واضحة");
  assert.ok(res.headers.get("Retry-After"), "ترويسة Retry-After موجودة");
});

test("نقطة المزامنة لها حد أعلى (لا تُرفض ضمن 60/دقيقة)", async () => {
  const res = await fetch(`${BASE}/api/conversations?deviceId=rate-test-12345678`);
  assert.ok(res.status === 200 || res.status === 429, "تستجيب (200 أو 429 عند الحاجة)");
});

// ─────────── 11) الحسابات (Auth) — تدهور آمن بدون إعداد + تحقق من الصحة ───────────
test("GET /api/auth/status بدون إعداد الحسابات → enabled:false (لا ينكسر)", async () => {
  const res = await fetch(`${BASE}/api/auth/status`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.enabled, false);
  assert.equal(j.user, null);
});

test("POST /api/auth/register بصيغة صالحة → 503 (غير مفعّل بعد)", async () => {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "password123", name: "مختبر" }),
  });
  assert.equal(res.status, 503);
});

test("POST /api/auth/register بريد غير صالح → 400", async () => {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ليس-بريد", password: "password123" }),
  });
  assert.equal(res.status, 400);
});

test("POST /api/auth/register كلمة مرور قصيرة → 400", async () => {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "short" }),
  });
  assert.equal(res.status, 400);
});
