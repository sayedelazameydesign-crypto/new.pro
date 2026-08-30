// ===== التذكّر — المرحلة 5.4 (ROADMAP): ملخص ذكي تلقائي للمحادثات الطويلة =====
// تلخيص استخلاصي (extractive) محلي 100%: بلا استدعاء مزود، بلا تكلفة، بلا شبكة —
// يحافظ على السياق عند تجاوز المحادثة للعتبة ويُخزَّن في المحادثة (يُزامن عبر Neon تلقائيًا).
// الجودة: يلتقط أسئلة المستخدم وخلاصة الردود في فقرة عربية مدمجة ومقروءة.

import type { ChatMessage } from "./types";

/** عدد الرسائل بعدها يبدأ التذكّر */
export const SUMMARY_TRIGGER_MESSAGES = 24;
/** عدد الرسائل الأخيرة التي لا تُلخَّص (تبقى كاملة في السياق) */
export const SUMMARY_KEEP_RECENT = 12;
/** الحد الأقصى لطول الملخص (حرفًا) */
export const SUMMARY_MAX_CHARS = 3500;

/** هل تستحق المحادثة تلخيصًا الآن؟ */
export function shouldSummarize(messages: ChatMessage[]): boolean {
  // نلخّص فقط إذا كان هناك فعلًا رسائل قديمة تستحق الضغط (بعد آخر KEEP_RECENT)
  return messages.length > SUMMARY_TRIGGER_MESSAGES;
}

/** إزالة ترميز Markdown لتلخيص نظيف (نسخة مبسطة — للنطق والقراءة) */
function plain(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/[|_]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** اختصار نص إلى حد أقصى مع نقطة نهاية أنيقة */
function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 0 ? lastSpace : max).trim() + "…";
}

/** استخراج «أهم جملة» من رد المساعد: أول جملة كاملة ذات محتوى فعلي */
function keySentence(reply: string): string {
  const p = plain(reply);
  const sentences = p.split(/(?<=[.!?؟])\s+/).filter((s) => s.trim().length > 2);
  for (const s of sentences) {
    if (s.length >= 8) return clip(s, 180);
  }
  return clip(p, 180);
}

/**
 * بناء ملخص استخلاصي للمحادثة: يغطي الرسائل الأقدم من آخر SUMMARY_KEEP_RECENT.
 * الصيغة: فقرة عربية بمحطات «سؤال الجواب» تُقرأ كخلفية سياقية بسلاسة.
 */
export function summarize(messages: ChatMessage[]): string {
  const older = messages.slice(0, Math.max(0, messages.length - SUMMARY_KEEP_RECENT));
  if (!older.length) return "";

  const parts: string[] = [];
  let lastQuestion = "";

  for (const m of older) {
    if (m.role === "user") {
      lastQuestion = clip(plain(m.content), 160);
    } else if (m.role === "assistant") {
      const q = lastQuestion;
      const a = keySentence(m.content);
      if (q && a) {
        parts.push(q.length < 40 ? `سأل عن ${q} فأجَبنا: ${a}` : `سأل: «${q}» فأجَبنا: ${a}`);
        lastQuestion = "";
      } else if (a) {
        parts.push(`تحدثنا أيضًا عن: ${a}`);
      }
    }
  }
  // سؤال متبقٍ بلا رد مكتمل في النافذة القديمة
  if (lastQuestion) parts.push(`ورُصد سؤال مفتوح: «${lastQuestion}»`);

  if (!parts.length) {
    // لا أزواج سؤال/جواب واضحة — نلخص الجمل الواردة فقط
    const tails: string[] = [];
    for (const m of older.slice(-4)) {
      const c = plain(m.content);
      if (c) tails.push(clip(c, 110));
    }
    if (!tails.length) return "";
    return `تذكّر: ${tails.join(" · ")}`;
  }

  const body = parts.slice(0, 12).join(". ");
  return clip(body, SUMMARY_MAX_CHARS);
}

/**
 * تركيب تعليمات النظام النهائية: نظام المستخدم + (ملخص التذكّر إن وُجد).
 * سقف إجمالي يضمن عدم تضخّم الحمولة (النظام نفسه مقصوص).
 */
export function composeSystem(base: string, summary: string): string {
  const b = (base || "").trim().slice(0, 4000);
  const s = (summary || "").trim().slice(0, SUMMARY_MAX_CHARS);
  if (b && s) return `${b}\n\n—— ملخص المحادثة السابقة (لتذكّر السياق) ——\n${s}`;
  if (s) return `أنت مساعد «نواة AI».\n\n—— ملخص المحادثة السابقة (لتذكّر السياق) ——\n${s}`;
  return b;
}
