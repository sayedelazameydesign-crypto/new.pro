// ===== اختبارات تصدير المحادثة (Item 2) — E-1..E-12 =====
// بلا شبكة، بلا DOM — المنطق النقي + فحص CSS الطباعة من globals.css.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  roleLabel,
  sanitizeFileName,
  exportFileName,
  conversationToMarkdown,
  downloadMarkdown,
  printConversation,
} from "../lib/export";
import type { ChatMessage } from "../lib/types";

const msg = (role: "user" | "assistant", content: string, id = `${role}-${content.length}-${Math.random()}`): ChatMessage => ({
  id,
  role,
  content,
  createdAt: 1_700_000_000_000,
});

// ── E-1: محادثة فارغة ──
test("E-1 محادثة فارغة: عنوان افتراضي + رسالة واضحة بلا انهيار", () => {
  const md = conversationToMarkdown({ title: "", messages: [] });
  assert.ok(md.startsWith("# محادثة"), "العنوان الافتراضي");
  assert.match(md, /لا توجد رسائل/);
  const md2 = conversationToMarkdown({ messages: [] });
  assert.equal(md2, md);
});

// ── E-2: عربية + UTF-8 ──
test("E-2 عربية: النص يُحفظ حرفيًا بترميز UTF-8", () => {
  const md = conversationToMarkdown({ title: "سؤال عن النواة", messages: [msg("user", "مرحبًا بالعالم يا نواة 🌟")] });
  assert.ok(md.includes("مرحبًا بالعالم يا نواة 🌟"), "المحتوى العربي كاملًا");
  assert.ok(md.includes("**المستخدم**"), "تسمية الدور عربية");
  assert.ok(md.includes("# سؤال عن النواة"));
});

// ── E-3: ماركداون داخل الرسالة يُحفظ كما هو ──
test("E-3 ماركداون: صيغة التنسيق تبقى حرفيًا (لا تُهدم)", () => {
  const md = conversationToMarkdown({ messages: [msg("assistant", "انظر **غليظ** و *مائل* و `كود`")] });
  assert.ok(md.includes("**غليظ**"));
  assert.ok(md.includes("*مائل*"));
  assert.ok(md.includes("`كود`"));
});

// ── E-4: code block ──
test("E-4 كتلة كود: تبقى كما هي بلا تعريب/تدمير", () => {
  const code = '```ts\nconst x: number = 1;\nconsole.log(x)\n```';
  const md = conversationToMarkdown({ messages: [msg("assistant", code)] });
  assert.ok(md.includes(code), "الكتلة كاملة حرفيًا");
});

// ── E-5: ترتيب الرسائل متعدد الأدوار ──
test("E-5 ترتيب: أدوار متعددة تُحفظ بالترتيب الأصلي", () => {
  const messages = [msg("user", "أول"), msg("assistant", "ثاني"), msg("user", "ثالث")];
  const md = conversationToMarkdown({ messages });
  const i1 = md.indexOf("أول"), i2 = md.indexOf("ثاني"), i3 = md.indexOf("ثالث");
  assert.ok(i1 < i2 && i2 < i3, "الترتيب محفوظ");
  assert.equal(md.split("---").length - 1, 3, "فواصل لكل رسالة");
});

// ── E-6: محادثة طويلة ──
test("E-6 محادثة طويلة (500 رسالة): تُصدَّر كاملة، لا قص ولا انهيار", () => {
  const messages = Array.from({ length: 500 }, (_, i) =>
    msg(i % 2 ? "assistant" : "user", `رسالة رقم ${i} — ${"نص طويل ".repeat(20)}`)
  );
  const md = conversationToMarkdown({ messages });
  assert.ok(md.includes("رسالة رقم 0") && md.includes("رسالة رقم 499"), "الأولى والأخيرة موجودتان");
  assert.ok(md.length > 90_000, `حجم كافٍ (${md.length})`);
});

// ── E-7: أحرف خاصة في العنوان والمحتوى ──
test("E-7 أحرف خاصة: العنوان يُعقَّم للاسم، المحتوى يبقى حرفيًا", () => {
  const file = exportFileName('ماذا/عن: الجديد? *و* "أكثر"');
  assert.ok(!/[\\/:*?"<>|]/.test(file), "لا أحرف محظورة في الاسم");
  assert.ok(file.startsWith("nawah-") && file.endsWith(".md"));
  const md = conversationToMarkdown({ title: "سؤال <script>?", messages: [msg("user", "<b>حرفي</b> و & أمبير")] });
  assert.ok(md.includes("<b>حرفي</b>") && md.includes("& أمبير"), "لا تهريب/تغيير للمحتوى");
  assert.ok(md.includes("سؤال <script>?"), "العنوان يُحفظ في الترويسة كما هو (مع مسح أسطر جديدة)");
});

// ── E-8: لا أسرار (BYOK/مفاتيح لا تُصدَّر) ──
test("E-8 أمان: حقول خارجية (apiKey/headers) تُتجاهل تمامًا", () => {
  const md = conversationToMarkdown({
    title: "م",
    // أي حقول إضافية يمررها مستدعٍ — التصدير يقرأ title+messages فقط
    messages: [msg("user", "سؤال")],
    apiKey: "sk-SECRET-BYOK-1234567890",
    headers: { authorization: "Bearer TOPSECRET" },
  } as never);
  assert.ok(!md.includes("SECRET"), "لا apiKey");
  assert.ok(!md.includes("TOPSECRET"), "لا authorization");
  assert.ok(!md.includes("Bearer"), "لا ترويسات");
});

// ── E-9: اسم الملف — حالات الحافة ──
test("E-9 اسم الملف: فارغ/عربي/رموز → deterministic وآمن", () => {
  assert.equal(exportFileName(""), "nawah-محادثة.md");
  assert.equal(exportFileName("   "), "nawah-محادثة.md");
  const a = exportFileName("نواة AI"), b = exportFileName("نواة AI");
  assert.equal(a, b, "deterministic");
  assert.ok(!/[\\/:*?"<>|]/.test(sanitizeFileName('a\\b/c:d*e?f"g<h>i|j')));
});

// ── E-10: إجراءات المتصفح (إنشاء export action) — تتعامل بلا DOM ──
test("E-10 طباعة/تنزيل: تُرجع false بلا نافذة (خادم/اختبار) ولا ترمي", () => {
  assert.equal(printConversation(), false);
  assert.equal(downloadMarkdown({ messages: [] }), false);
});

// ── E-11: CSS الطباعة (مسار PDF) موجود في globals.css ──
test("E-11 CSS طباعة: @media print + .print-area + .no-print معرّفة", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  assert.match(css, /@media print/);
  assert.match(css, /\.print-area/);
  assert.match(css, /\.no-print/);
});

// ── E-12: تسميات الأدوار ──
test("E-12 roleLabel: الأدوار المعروفة عربية + مجهول يعود كما هو", () => {
  assert.equal(roleLabel("user"), "المستخدم");
  assert.equal(roleLabel("assistant"), "المساعد");
  assert.equal(roleLabel("system"), "النظام");
  assert.equal(roleLabel("عمو"), "عمو");
});
