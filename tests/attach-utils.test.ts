// ===== CR-005: تصنيف المرفقات (اختيار + سحب) — node:test =====
// نفس قواعد المسار القائم: allowlist (مطابقة accept وlib/file-extract.ts) · ≤1MB · ≤3 ملفات.
// نقطة الأمان المُختبَرة: drop لا يتجاوز القائمة البيضاء (عكس accept في المتصفح).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyAttach,
  extOf,
  isAllowedExt,
  MAX_ATTACH_BYTES,
  MAX_ATTACH_FILES,
} from "../lib/attach-utils";

const file = (name: string, size = 100) => ({ name, size });
const reasons = (r: { reason?: string }[]) => r.map((x) => x.reason);

test("A-1: الامتدادات المسموحة كلها مقبولة (مطابقة accept)", () => {
  for (const name of ["a.txt", "b.md", "c.markdown", "d.csv", "e.json", "f.pdf", "g.docx"]) {
    assert.ok(isAllowedExt(name), name);
  }
  const { accepted, rejected } = classifyAttach([
    file("a.txt"),
    file("b.pdf"),
    file("c.docx"),
  ]);
  assert.equal(accepted.length, 3);
  assert.equal(rejected.length, 0);
});

test("A-2: امتداد خبيث يُرفض قبل أي قراءة (unsupported)", () => {
  const { accepted, rejected } = classifyAttach([file("evil.exe"), file("page.html")]);
  assert.equal(accepted.length, 0);
  assert.equal(rejected.length, 2);
  assert.deepEqual(reasons(rejected), ["unsupported", "unsupported"]);
});

test("A-3: الحالة حساسة لحالة الأحرف — .EXE/.HTML تُرفض", () => {
  assert.equal(isAllowedExt("script.EXE"), false);
  assert.equal(isAllowedExt("doc.PDF"), true); // الأحرف الكبيرة في الامتداد المسموح مقبولة
});

test("A-4: بلا امتداد يُرفض (مجلد قد يُسحب ككيان بلا امتداد)", () => {
  assert.equal(isAllowedExt("README"), false);
  assert.equal(extOf(".gitignore"), ""); // ملف مخفي بلا اسم امتداد
});

test("A-5: حد الحجم — أكبر من 1MB يُرفض والحد بالضبط مقبول", () => {
  const { accepted, rejected } = classifyAttach([
    file("big.pdf", MAX_ATTACH_BYTES + 1),
    file("ok.pdf", MAX_ATTACH_BYTES),
  ]);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].name, "ok.pdf");
  assert.equal(rejected.length, 1);
  assert.deepEqual(reasons(rejected), ["tooBig"]);
});

test("A-6: حد العدد — 4 ملفات → 3 مقبولة والرابع maxFiles", () => {
  const { accepted, rejected } = classifyAttach([
    file("1.txt"),
    file("2.txt"),
    file("3.txt"),
    file("4.txt"),
  ]);
  assert.equal(accepted.length, MAX_ATTACH_FILES);
  assert.equal(rejected.length, 1);
  assert.deepEqual(reasons(rejected), ["maxFiles"]);
});

test("A-7: دفعة مختلطة — الخبيث يُرفض دون قتل المقبول (لا DoS على الدفعة)", () => {
  const { accepted, rejected } = classifyAttach([
    file("good.txt"),
    file("bad.exe", 10),
    file("huge.pdf", MAX_ATTACH_BYTES + 5),
  ]);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].name, "good.txt");
  assert.equal(rejected.length, 2);
  assert.deepEqual(reasons(rejected), ["unsupported", "tooBig"]);
});

test("A-8: ملفات File حقيقية (Node ≥20) متوافقة مع AttachItem", () => {
  const real = new File(["نص تجريبي"], "ملاحظات.txt", { type: "text/plain" });
  const { accepted } = classifyAttach([real]);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].name, "ملاحظات.txt");
  assert.equal(accepted[0].size, Buffer.byteLength("نص تجريبي"));
});

test("A-9: سجل فارغ أو بلا ملفات → لا مقبول ولا مرفوض (لا أخطاء كاذبة)", () => {
  const { accepted, rejected } = classifyAttach([]);
  assert.equal(accepted.length, 0);
  assert.equal(rejected.length, 0);
});
