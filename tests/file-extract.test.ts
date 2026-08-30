// ===== اختبارات قراءة الملفات (المرحلة 5) — وحدات مباشرة على lib/file-extract =====
// مولدات عينات حقيقية: PDF عبر pdfkit، DOCX عبر jszip — ثم فك base64 واستخراج.
// لا يلمس الخادم — يثبت عقد الاستخراج والحدود مباشرة.

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFileText, mergeAttachments } from "../lib/file-extract";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

// ── عينات حقيقية ──
async function makePdfB64(): Promise<string> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((r) => doc.on("end", () => r()));
  doc.fontSize(12).text("Hello Nawah PDF attachment!", 50, 50);
  doc.end();
  await done;
  return Buffer.concat(chunks).toString("base64");
}

async function makeDocxB64(): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.folder("word")!.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:r><w:t>Hello Nawah DOCX attachment!</w:t></w:r></w:p></w:body>
</w:document>`
  );
  return (await zip.generateAsync({ type: "nodebuffer" })).toString("base64");
}

// ── 1) TXT ──
test("EXT-1 استخراج TXT نصي", async () => {
  const t = await extractFileText("note.txt", b64("مرحبا نواة — ملف نصي"));
  assert.ok(t.includes("مرحبا نواة"));
});

// ── 2) MD ──
test("EXT-2 استخراج MD", async () => {
  const t = await extractFileText("doc.md", b64("# عنوان\nنص وصف"));
  assert.ok(t.includes("# عنوان") && t.includes("نص وصف"));
});

// ── 3) CSV ──
test("EXT-3 استخراج CSV", async () => {
  const t = await extractFileText("data.csv", b64("اسم,عمر\nسارة,30"));
  assert.ok(t.includes("سارة"));
});

// ── 4) JSON صالح → مُجمّل; غير صالح → رفض ──
test("EXT-4 JSON صالح يتحول نصًا + JSON غير صالح يُرفض", async () => {
  const ok = await extractFileText("conf.json", b64('{"a":1,"b":[2,3]}'));
  assert.ok(ok.includes('"a"')); // JSON.stringify(..., null, 2) يحفظ المفاتيح
  await assert.rejects(() => extractFileText("bad.json", b64("{not-json")), /JSON غير صالح/);
});

// ── 5) PDF حقيقي (pdfkit) ──
test("EXT-5 استخراج PDF حقيقي", async () => {
  const t = await extractFileText("sample.pdf", await makePdfB64());
  assert.ok(t.includes("Hello Nawah PDF"), `استخرج: ${t.slice(0, 60)}`);
});

// ── 6) DOCX حقيقي (jszip) ──
test("EXT-6 استخراج DOCX حقيقي", async () => {
  const t = await extractFileText("sample.docx", await makeDocxB64());
  assert.ok(t.includes("Hello Nawah DOCX"), `استخرج: ${t.slice(0, 60)}`);
});

// ── 7) صيغة غير مدعومة → رفض واضح ──
test("EXT-7 صيغة غير مدعومة تُرفض", async () => {
  await assert.rejects(() => extractFileText("evil.exe", b64("MZ")), /غير مدعومة/);
  await assert.rejects(() => extractFileText("old.doc", b64("x")), /غير مدعومة/);
});

// ── 8) حجم أكبر من 1MB → رفض ──
test("EXT-8 ملف أكبر من 1MB يُرفض", async () => {
  const big = Buffer.alloc(1_100_000, 65).toString("base64");
  await assert.rejects(() => extractFileText("big.txt", big), /1 ميجابايت/);
});

// ── 9) الدمج: النص المستخرج يُلحق برسالة المستخدم الأخيرة ──
test("EXT-9 الدمج يلحق المرفق برسالة المستخدم", async () => {
  const target = { content: "لخص لي هذا الملف" };
  await mergeAttachments([{ name: "a.txt", data: b64("نص داخل الملف") }], target);
  assert.ok(target.content.startsWith("لخص لي هذا الملف"));
  assert.ok(target.content.includes("محتوى الملفات المرفقة"));
  assert.ok(target.content.includes("نص داخل الملف"));
});

// ── 10) صيغ متعددة غير صالحة تُرفض قبل أي معالجة ──
test("EXT-10 مرفق تالف يُرفض", async () => {
  const target = { content: "x" };
  await assert.rejects(() => mergeAttachments([{ name: "" }], target), /تالف/);
});
