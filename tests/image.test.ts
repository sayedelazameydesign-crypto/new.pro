// ===== اختبارات توليد الصور (المرحلة 5.2) — وحدة مباشرة على lib/image =====
// مزيف fetch يحاكي مسارَي HF (router / classic) — بلا أي شبكة حقيقية.

import { test } from "node:test";
import assert from "node:assert/strict";
import { generateImage, imageKey, IMAGE_PROMPT_MAX } from "../lib/image";

// PNG 1×1 صالح (حقيقة بايتات)
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
);

const okImg = () =>
  new Response(new Uint8Array(PNG_1x1), {
    status: 200,
    headers: { "content-type": "image/png" },
  });
const errJson = (status: number, msg = "boom") =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });

const KEY = "hf_test_key_123456789";

// ── 1) router نجح → بايتات صورة ──
test("IMG-1 router ينجح → يعيد بايتات PNG", async () => {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(url);
    return okImg();
  }) as typeof fetch;
  const { bytes } = await generateImage("قطة فضائية", KEY, fetcher);
  assert.ok(bytes.length > 0);
  assert.equal(bytes[0], 0x89); // توقيع PNG
  assert.equal(calls.length, 1);
});

// ── 2) router 503 → classic ينجح (تراجع) ──
test("IMG-2 router مشغول → classic ينجح (تراجع تلقائي)", async () => {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(url);
    return calls.length === 1 ? errJson(503, "loading") : okImg();
  }) as typeof fetch;
  const { bytes } = await generateImage("شمس", KEY, fetcher);
  assert.equal(calls.length, 2);
  assert.equal(bytes[0], 0x89);
});

// ── 3) router+classic 401 → رسالة مفتاح غير صالح ──
test("IMG-3 المفتاح غير صالح → رسالة واضحة", async () => {
  const fetcher = (async () => errJson(401, "Invalid token")) as typeof fetch;
  await assert.rejects(() => generateImage("قمر", KEY, fetcher), /مفتاح Hugging Face غير صالح/);
});

// ── 4) router 500 + classic 403 → رسالة تفعيل Inference Providers ──
test("IMG-4 صلاحية التفعيل → رسالة «فعّل Inference Providers»", async () => {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(url);
    return calls.length === 1 ? errJson(500, "server") : errJson(403, "forbidden");
  }) as typeof fetch;
  await assert.rejects(() => generateImage("نجمة", KEY, fetcher), /فعّل/);
});

// ── 5) prompt فارغ → رفض ──
test("IMG-5 وصف فارغ يُرفض", async () => {
  await assert.rejects(() => generateImage("   ", KEY, fetch), /اكتب وصف الصورة/);
});

// ── 6) prompt أطول من الحد → رفض ──
test("IMG-6 وصف طويل يُرفض", async () => {
  await assert.rejects(() => generateImage("أ".repeat(IMAGE_PROMPT_MAX + 1), KEY, fetch), /طويل/);
});

// ── 7) بلا مفتاح → HF_KEY_MISSING (يُترجم في المسار إلى 503) ──
test("IMG-7 بلا مفتاح → HF_KEY_MISSING", async () => {
  await assert.rejects(() => generateImage("بحر", "", fetch), /HF_KEY_MISSING/);
});

// ── 8) استجابة 200 ليست صورة → رفض ──
test("IMG-8 استجابة غير صورة → رفض", async () => {
  const fetcher = (async () =>
    new Response(JSON.stringify({ error: "hmm" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  await assert.rejects(() => generateImage("غابة", KEY, fetcher), /استجابة غير متوقعة/);
});

// ── 9) imageKey: BYOK يتقدم على البيئة ──
test("IMG-9 imageKey يفضّل مفتاح المتصفح", async () => {
  const prev = process.env.HF_TOKEN;
  process.env.HF_TOKEN = "env-hf-token";
  try {
    assert.equal(imageKey("   "), "env-hf-token"); // فراغ → البيئة
    assert.equal(imageKey("byok-key-1234567890"), "byok-key-1234567890"); // BYOK يتقدم
  } finally {
    if (prev === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = prev;
  }
});
