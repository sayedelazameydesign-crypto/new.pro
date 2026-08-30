// ===== تصدير المحادثة — Markdown + طباعة/PDF =====
// كل التصدير محلي 100% (بلا خادم، بلا شبكة، بلا أسرار):
//  - Markdown: تُبنى من messages + title فقط (لا Settings، لا مفاتيح) وتُنزَّل كـ Blob.
//  - PDF: طباعة المتصفح (window.print + @media print) — أعلى جودة عربية/RTL بلا dependency.
// القاعدة: أي حقل إضافي في كائن المحادثة (apiKey إلخ) يتجاهله التصدير — لا يمسح شيئًا.

import type { ChatMessage } from "./types";

/** تسمية الدور بالعربية */
export const ROLE_LABELS: Record<string, string> = {
  user: "المستخدم",
  assistant: "المساعد",
  system: "النظام",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** تنظيف عنوان محادثة ليكون اسم ملف آمنًا (أحرف نظام الملفات المحظورة تُستبدل بـ -) */
export function sanitizeFileName(title: string): string {
  const clean = String(title)
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || "محادثة").slice(0, 60);
}

/** اسم ملف التصدير — deterministic */
export function exportFileName(title: string): string {
  return `nawah-${sanitizeFileName(title)}.md`;
}

/** بناء Markdown كامل للمحادثة — من الرسائل فقط (ترتيبها كما هو) */
export function conversationToMarkdown(conv: {
  title?: string | null;
  messages: ChatMessage[];
}): string {
  const title = (conv.title ?? "").replace(/\n/g, " ").trim() || "محادثة";
  const lines: string[] = [`# ${title}`, ""];
  if (!conv.messages.length) {
    lines.push("_لا توجد رسائل بعد._", "");
    return lines.join("\n");
  }
  for (const m of conv.messages) {
    // يُحفظ المحتوى كما هو حرفيًا (Markdown/كود يبقى كما أُنشئ)
    lines.push(`**${roleLabel(m.role)}**`, "", m.content, "", "---", "");
  }
  while (lines[lines.length - 1] === "") lines.pop(); // إزالة الفواصل الزائدة
  return lines.join("\n") + "\n";
}

/** تنزيل ملف Markdown (متصفح فقط) — يعيد false بلا DOM */
export function downloadMarkdown(
  conv: { title?: string | null; messages: ChatMessage[] },
  filename?: string
): boolean {
  if (typeof document === "undefined") return false;
  const md = conversationToMarkdown(conv);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? exportFileName(conv.title ?? "");
  document.body.appendChild(a);
  a.click();
  // إزالة متأخرة: تسمح للمتصفح بتسجيل اسم الملف (download attribute) قبل فضّ الرابط
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
  return true;
}

/** فتح حوار طباعة المتصفح (حفظ كـ PDF) — يعيد false بلا نافذة (خادم/اختبار) */
export function printConversation(): boolean {
  if (typeof window === "undefined") return false;
  window.print();
  return true;
}
