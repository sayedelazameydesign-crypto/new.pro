import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BREAKER_OPEN_MS,
  createBreaker,
  extractHttpStatus,
  failureKindFromError,
  providerBreaker,
} from "../lib/ai/breaker";
import { resolveProvider } from "../lib/ai";

test("B-1 فشل 429 يعزل المزود", () => {
  const b = createBreaker({ now: () => 1_000 });
  assert.equal(b.isAvailable("groq"), true);
  b.recordFailure("groq", { status: 429 }, 1_000);
  assert.equal(b.isAvailable("groq", 1_000), false);
  const snap = b.snapshot("groq", 1_000) as { state: string; failures: number };
  assert.equal(snap.state, "open");
  assert.equal(snap.failures, 1);
});

test("B-2 مرور 10 دقائق → استكشاف half-open", () => {
  let t = 0;
  const b = createBreaker({ now: () => t, openMs: BREAKER_OPEN_MS });
  b.recordFailure("gemini", { status: 503 });
  assert.equal(b.isAvailable("gemini"), false);
  t = BREAKER_OPEN_MS;
  assert.equal(b.isAvailable("gemini"), true);
  const snap = b.snapshot("gemini") as { state: string };
  assert.equal(snap.state, "half-open");
  // استكشاف ثانٍ في نفس النافذة يُرفض
  assert.equal(b.isAvailable("gemini"), false);
});

test("B-3 نجاح الاستكشاف يعيد closed", () => {
  let t = 0;
  const b = createBreaker({ now: () => t, openMs: BREAKER_OPEN_MS });
  b.recordFailure("hf", { status: 429 });
  t = BREAKER_OPEN_MS;
  assert.equal(b.isAvailable("hf"), true);
  b.recordSuccess("hf");
  assert.equal((b.snapshot("hf") as { state: string }).state, "closed");
  assert.equal(b.isAvailable("hf"), true);
});

test("B-4 فشل الاستكشاف يعيد الفتح", () => {
  let t = 0;
  const b = createBreaker({ now: () => t, openMs: BREAKER_OPEN_MS });
  b.recordFailure("groq", { network: true });
  t = BREAKER_OPEN_MS;
  assert.equal(b.isAvailable("groq"), true);
  b.recordFailure("groq", { status: 429 }, t);
  assert.equal(b.isAvailable("groq", t), false);
  assert.equal((b.snapshot("groq", t) as { state: string }).state, "open");
});

test("B-5 401/403/400/404 لا تعزل", () => {
  const b = createBreaker({ now: () => 5 });
  for (const status of [400, 401, 403, 404]) {
    b.recordFailure("github", { status }, 5);
    assert.equal(b.isAvailable("github", 5), true, String(status));
  }
});

test("B-6 extractHttpStatus و failureKindFromError", () => {
  assert.equal(extractHttpStatus(new Error("Groq (429): quota")), 429);
  assert.equal(extractHttpStatus(new Error("GitHub Models (401): bad")), 401);
  assert.equal(failureKindFromError(new Error("Gemini (403): key")), "config");
  assert.equal(failureKindFromError(new Error("HF (502): oops")), "transient");
  assert.equal(failureKindFromError(new TypeError("fetch failed")), "transient");
});

test("B-7 resolveProvider يتخطى دائرة مفتوحة إلى التالي", () => {
  providerBreaker.reset();
  const prevG = process.env.GROQ_API_KEY;
  const prevM = process.env.GEMINI_API_KEY;
  const prevH = process.env.GITHUB_MODELS_TOKEN;
  process.env.GROQ_API_KEY = "gsk_test";
  process.env.GEMINI_API_KEY = "gem_test";
  delete process.env.GITHUB_MODELS_TOKEN;
  try {
    providerBreaker.recordFailure("groq", { status: 429 });
    const r = resolveProvider("groq:openai/gpt-oss-120b");
    assert.equal(r.provider, "gemini");
    assert.equal(r.model, "gemini-2.5-flash");
  } finally {
    providerBreaker.reset();
    if (prevG === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = prevG;
    if (prevM === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevM;
    if (prevH === undefined) delete process.env.GITHUB_MODELS_TOKEN;
    else process.env.GITHUB_MODELS_TOKEN = prevH;
  }
});

test("B-8 بلا GITHUB_MODELS_TOKEN يُتخطى صامتًا", () => {
  providerBreaker.reset();
  const prev = process.env.GITHUB_MODELS_TOKEN;
  delete process.env.GITHUB_MODELS_TOKEN;
  try {
    const r = resolveProvider("github:openai/gpt-4o-mini");
    assert.notEqual(r.provider, "github");
  } finally {
    if (prev === undefined) delete process.env.GITHUB_MODELS_TOKEN;
    else process.env.GITHUB_MODELS_TOKEN = prev;
    providerBreaker.reset();
  }
});
