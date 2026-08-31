import { test } from "node:test";
import assert from "node:assert/strict";
import { createBreaker } from "../lib/ai/breaker";
import {
  buildPollinationsUrl,
  issuePollinationsImage,
  notePollinationsFailure,
  POLLINATIONS_ORIGIN,
} from "../lib/ai/providers/pollinations";
import { imageRequestSchema, parseImageBody } from "../lib/validation";

test("P-1 الرابط يرمّز الوصف ويضيف الأبعاد والبذرة وnologo", () => {
  const url = buildPollinationsUrl({ prompt: "قطة فضائية", width: 512, height: 256, seed: 42 });
  assert.ok(url.startsWith(POLLINATIONS_ORIGIN));
  assert.ok(url.includes(encodeURIComponent("قطة فضائية")));
  assert.ok(url.includes("width=512"));
  assert.ok(url.includes("height=256"));
  assert.ok(url.includes("seed=42"));
  assert.ok(url.includes("nologo=true"));
});

test("P-2 الافتراضي 1024×1024 وبذرة رقمية", () => {
  const url = buildPollinationsUrl({ prompt: "sun" });
  assert.match(url, /width=1024/);
  assert.match(url, /height=1024/);
  assert.match(url, /seed=\d+/);
});

test("P-3 Zod: وصف 3–500 وأبعاد القائمة البيضاء", () => {
  assert.equal(imageRequestSchema.safeParse({ prompt: "ab" }).success, false);
  assert.equal(imageRequestSchema.safeParse({ prompt: "abc" }).success, true);
  assert.equal(imageRequestSchema.safeParse({ prompt: "x".repeat(501) }).success, false);
  assert.equal(imageRequestSchema.safeParse({ prompt: "abc", width: 1024, height: 256 }).success, true);
  assert.equal(imageRequestSchema.safeParse({ prompt: "abc", width: 100 }).success, false);
  assert.equal(parseImageBody({ prompt: "   " }).ok, false);
  const ok = parseImageBody({ prompt: "  غروب  ", width: 512 });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.data.prompt, "غروب");
});

test("P-4 القاطع المفتوح يمنع إصدار رابط", () => {
  const b = createBreaker({ now: () => 1 });
  notePollinationsFailure(429, b);
  const r = issuePollinationsImage({ prompt: "moon", seed: 1 }, b);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "CIRCUIT_OPEN");
});

test("P-5 401 لا يمنع الإصدار — 429 يمنع", () => {
  const b = createBreaker({ now: () => 1 });
  notePollinationsFailure(401, b);
  const a = issuePollinationsImage({ prompt: "ok-prompt", seed: 7 }, b);
  assert.equal(a.ok, true);
  if (a.ok) {
    assert.ok(a.url.includes("seed=7"));
    assert.equal(a.source, "pollinations");
  }
  notePollinationsFailure(429, b);
  assert.equal(issuePollinationsImage({ prompt: "ok-prompt" }, b).ok, false);
});
