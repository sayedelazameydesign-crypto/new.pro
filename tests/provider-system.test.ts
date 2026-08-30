// ===== إثبات مسار system → المزودات (المرحلة 5.4 — Provider Propagation) =====
// بلا شبكة: fetch مزيف يلتقط جسم كل طلب ويعيد SSE وهميًا.
// يثبت أن: page.tsx → /api/chat → streamReply → gemini/groq/huggingface
// يمرر نظام التذكّر فعليًا (لا يضيع على الباب الأخير).

import { test } from "node:test";
import assert from "node:assert/strict";
import { geminiStream } from "../lib/ai/providers/gemini";
import { groqStream } from "../lib/ai/providers/groq";
import { huggingfaceStream } from "../lib/ai/providers/huggingface";

function sseResponse(chunks: unknown[]): Response {
  const lines = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("");
  return new Response(new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode(lines));
      c.close();
    },
  }), { status: 200, headers: { "content-type": "text/event-stream" } });
}

/** يلتقط آخر جسم طلب مُرسل */
function mockFetch(capture: (url: string, init: RequestInit) => void) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    capture(String(url), init ?? {});
    return sseResponse([{ candidates: [{ content: { parts: [{ text: "رد" }] } }] }]);
  }) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

const SYSTEM = "أنت مساعد نواة. ملخص المحادثة السابقة: تحدثنا عن الرياضيات.";

test("PS-1 Gemini: system يصل في systemInstruction", async () => {
  const restore = mockFetch((url, init) => {
    assert.ok(url.includes("generativelanguage.googleapis.com"), url);
    const body = JSON.parse(String(init.body));
    assert.ok(body.systemInstruction, "systemInstruction موجود");
    assert.equal(body.systemInstruction.parts[0].text, SYSTEM);
    // الرسائل نفسها لا تحمل دور system (تُحقن كتعليمات نظام)
    assert.ok(body.contents.every((m: { role: string }) => m.role !== "system"));
  });
  try {
    const chunks: string[] = [];
    for await (const c of geminiStream({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "سؤال" }],
      system: SYSTEM,
      apiKey: "k",
      maxTokens: 100,
    })) chunks.push(c);
    assert.equal(chunks.join(""), "رد");
  } finally {
    restore();
  }
});

test("PS-2 Gemini: بلا system → لا systemInstruction (لا كسر) ", async () => {
  const restore = mockFetch((_url, init) => {
    const body = JSON.parse(String(init.body));
    assert.equal(body.systemInstruction, undefined);
  });
  try {
    for await (const c of geminiStream({ model: "gemini-2.5-flash", messages: [], apiKey: "k", maxTokens: 10 })) { void c; break; }
  } finally {
    restore();
  }
});

test("PS-3 Groq: system يُحقن كأول رسالة في مصفوفة OpenAI", async () => {
  const restore = mockFetch((url, init) => {
    assert.ok(url.includes("api.groq.com"), url);
    const body = JSON.parse(String(init.body));
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.messages[0].content, SYSTEM);
    assert.equal(body.messages.length, 2, "رسالتان: system + question");
  });
  try {
    for await (const c of groqStream({
      model: "llama-3.3-70b",
      messages: [{ role: "user", content: "سؤال" }],
      system: SYSTEM,
      apiKey: "k",
      maxTokens: 50,
    })) { void c; break; }
  } finally {
    restore();
  }
});

test("PS-4 HuggingFace: system يُحقن كأول رسالة في router payload", async () => {
  const restore = mockFetch((url, init) => {
    assert.ok(url.includes("router.huggingface.co") || url.includes("api-inference.huggingface.co"), url);
    const body = JSON.parse(String(init.body));
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.messages[0].content, SYSTEM);
  });
  try {
    for await (const c of huggingfaceStream({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [{ role: "user", content: "سؤال" }],
      system: SYSTEM,
      token: "k",
      maxTokens: 50,
    })) { void c; break; }
  } finally {
    restore();
  }
});

test("PS-5 Groq/HF: بلا system → رسائل كما هي (لا كسر للمسار القديم)", async () => {
  const restore = mockFetch((_url, init) => {
    const body = JSON.parse(String(init.body));
    assert.equal(body.messages[0].role, "user");
  });
  try {
    for await (const c of groqStream({ model: "m", messages: [{ role: "user", content: "x" }], apiKey: "k", maxTokens: 5 })) { void c; break; }
    for await (const c of huggingfaceStream({ model: "m", messages: [{ role: "user", content: "x" }], token: "k", maxTokens: 5 })) { void c; break; }
  } finally {
    restore();
  }
});
