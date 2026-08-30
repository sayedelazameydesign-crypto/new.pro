// ===== اختبارات مشاركة المحادثة ?c=id (Item 3) — S-1..S-12 =====
// بلا شبكة، بلا DOM حقيقي — منطق نقي + سلوك الحافظة بدون واجهة.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShareUrl, parseShareId, isValidShareId, resolveShareId, copyShareLink } from "../lib/share";

const VALID = "0f8fad5b-d9cb-469f-a165-70867728950e"; // UUID v4
const AVAILABLE = [VALID, "another-id-12345678"];

// ── S-1: رابط صالح ← يفتح المحادثة ──
test("S-1 معرف صالح: resolve → ok ويعيد نفس id", () => {
  const r = resolveShareId(`?c=${VALID}`, AVAILABLE);
  assert.deepEqual(r, { status: "ok", id: VALID });
});

// ── S-2: بدون c (missing) → السلوك الحالي ──
test("S-2 لا c في الرابط: resolve → none (بلا أي تغيير)", () => {
  assert.deepEqual(resolveShareId(null, AVAILABLE), { status: "none" });
  assert.deepEqual(resolveShareId("", AVAILABLE), { status: "none" });
  assert.deepEqual(resolveShareId("?lang=ar", AVAILABLE), { status: "none" });
  assert.deepEqual(resolveShareId("?", AVAILABLE), { status: "none" });
});

// ── S-3: malformed c → لا crash ولا استخدام ──
test("S-3 معرف مشوّه: لا يُستخدم أبدًا (null وأنواع مشوهة)", () => {
  for (const bad of [
    "?c=",
    "?c=%",                       // ترميز ناقص
    "?c=ab",                      // أقصر من الحد الأدنى
    "?c=" + "x".repeat(200),      // أطول من الحد الأقصى
    "?c=<script>alert(1)</script>",
    "?c=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
    "?c=abc def",                 // مسافة
    "?c=abc'drop",                // اقتباس
    "?c=abc%00def",               // NUL
  ]) {
    assert.equal(parseShareId(bad), null, `يُرفض: ${bad.slice(0, 40)}`);
  }
  // isValidShareId تفحص المعرف نفسه (لا السلسلة الكاملة)
  for (const badId of ["", "ab", "a".repeat(200), "<script>x</script>", "a b", "a'b", "a\u0000b"]) {
    assert.equal(isValidShareId(badId), false, `يُرفض المعرف: ${badId.slice(0, 20)}`);
  }
  assert.equal(resolveShareId("?c=broken-id-xyz", AVAILABLE).status, "unknown"); // معرف صحيح الشكل لكن غير موجود
});

// ── S-4: unknown id → not-found (لا عشوائية) ──
test("S-4 معرف غير موجود: unknown (لا يفتح أي محادثة أخرى)", () => {
  const r = resolveShareId("?c=does-not-exist-9999", AVAILABLE);
  assert.deepEqual(r, { status: "unknown", id: "does-not-exist-9999" });
});

// ── S-5: URL-encoded id ──
test("S-5 معرف مشفر URL: يُفك ويُطابق", () => {
  const enc = encodeURIComponent(VALID);
  assert.equal(parseShareId(`?c=${enc}`), VALID);
  assert.equal(parseShareId(`?x=1&c=${enc}&y=2`), VALID);
});

// ── S-6: بناء الرابط — id فقط، لا محتوى ولا أسرار ──
test("S-6 الرابط لا يحمل محتوى رسائل ولا مفاتيح ولا إعدادات", () => {
  const link = buildShareUrl(VALID, "https://example.com/");
  assert.equal(link, `https://example.com/?c=${VALID}`);
  // استحالة تسرب: لا نمرر إلا id — لا canonic؛ اختبار صريح:
  assert.ok(!link.includes("apiKey") && !link.includes("sk-") && !link.includes("byok"));
  const msgId = "id-12345678";
  assert.equal(parseShareId(buildShareUrl(msgId).split("?")[1]), msgId);
});

// ── S-7: بناء رابط يعتمد على قاعدة صريحة (لا نافذة) ──
test("S-7 buildShareUrl: بلا window يؤدي لمسار نسبي آمن", () => {
  // في بيئة node (بلا window) يعيد "/?c=..." — صالح للاختبار
  const link = buildShareUrl(VALID);
  assert.ok(link.startsWith("/?c="));
  assert.equal(parseShareId(link.slice(1)), VALID);
});

// ── S-8: copyCopyShareLink بدون clipboard → failed بلا throw ──
test("S-8 نسخ بلا متصفح: يعيد failed (لا throws)", async () => {
  assert.equal(await copyShareLink(VALID), "failed");
});

// ── S-9: الرابط المُنسوخ (مهما كانت الوسيلة) يحمل id فقط، بلا زوائد ──
test("S-9 الرابط الذي ستُنسخه: يبدأ بالقاعدة ويحمل id وحده", () => {
  const url = buildShareUrl(VALID, "https://x.dev/");
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, "https://x.dev/");
  assert.equal(u.searchParams.get("c"), VALID);
  assert.equal([...u.searchParams.keys()].length, 1, "معامل واحد فقط");
});

// ── S-10: ما لا يجب أن يصبح عنوانًا: لا محادثة تُستبدل ──
test("S-10 لا استبدال: conversation substitution غير ممكن عبر id واحد", () => {
  for (const id of ["", "all", "first", "0", "admin"]) {
    const r = resolveShareId(`?c=${id}`, AVAILABLE);
    assert.notEqual(r.status, "ok", `'${id}' لا يفتح شيئًا`);
  }
});

// ── S-11: ترميز آمن في بناء الرابط ──
test("S-11 البناء يرمّز أي محرف غريب لو سُمح به يومًا (encodeURIComponent)", () => {
  const link = buildShareUrl("ab%cd", "https://x.dev/");
  assert.ok(!link.includes("%cd"), "يُرمّز % بـ %25");
});

// ── S-12: حد الطول لا يُسمح بالتجاوز ──
test("S-12 طول مفرط: الرفض قبل أي استخدام", () => {
  assert.equal(isValidShareId("a".repeat(81)), false);
  assert.equal(isValidShareId("a".repeat(80)), true);
});
