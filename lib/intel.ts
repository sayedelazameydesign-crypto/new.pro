// ===== CR-006 (Item 6): Conversation Intelligence — منطق نقي مشترك (عميل/خادم) =====
// يُستخدم في:
//   · app/api/conversation-intel/route.ts  (الخادم: تحقق + توليد)
//   · app/page.tsx                          (العميل: تنظيف المصدر + الطلب)
// القواعد (العقد المعتمد أ–و):
//   · privacy rule A: يُرسل نص أول رسالة مستخدم فقط (منظَّف) — لا محادثة كاملة.
//   · بلا مزود → لا استدعاء إطلاقًا (no-provider → العميل يبقي titleFromMessages).
//   · مصدر أي نص خارج مسار الرد (title) — وليس له علاقة بتذكّر 5.4 (محلي أصلاً).
// بلا أي استيراد من lib/ai (الخادمي) — هذا الملف متوافق مع حزمة المتصفح.

import { z } from "zod";

export const INTEL_MAX_SOURCE = 2_000; // سقف المصدر المرسل (عقد §5.2)
export const INTEL_MAX_TITLE = 80; // سقف العنوان المُولَّد (عقد §5.3)
export const INTEL_MAX_TOKENS = 60; // عقد §5.4: 40–80 → 60 (عنوان قصير)
export const INTEL_TEMPERATURE = 0.3; // عقد §5.4: ≤0.3 (استقرار)

// ===== Schema الطلب (zod v4 — نفس نمط lib/validation.ts) =====
// ملاحظة تنفيذية موثقة: الخادم stateless (لا يملك settings) — لذلك يُرسَل modelId
// من العميل مثل /api/chat بالضبط؛ resolution يتم عبر resolveProvider (نفس التراجع الحقيقي).
export const intelRequestSchema = z.object({
  kind: z.enum(["title"]),
  modelId: z.string().max(120).optional(),
  source: z.string().min(1).max(INTEL_MAX_SOURCE),
  lang: z.enum(["ar", "en"]).default("ar"),
  apiKey: z.string().max(300).optional(), // BYOK — نفس سياسة /api/chat (عقد د)
});

export type IntelRequest = z.infer<typeof intelRequestSchema>;

export interface IntelOk {
  ok: true;
  value: string;
  provider: string;
  model: string;
  generatedAt: number;
}

export interface IntelErr {
  ok: false;
  code: "invalid" | "no-provider" | "provider-error" | "rate-limited" | "timeout";
  error: string;
}

export type IntelResult = IntelOk | IntelErr;

// ===== قاعدة الخصوصية A: أول رسالة مستخدم فقط =====
export function firstUserMessageContent(messages: { role: string; content: string }[]): string {
  const first = messages.find((m) => m.role === "user");
  return first?.content ?? "";
}

/** تنظيف نص المصدر قبل الإرسال: يزيل روابط/أكواد الماركداون، يطوي مسافات، يقص إلى سقف العقد. */
export function cleanSource(raw: string): string {
  let s = raw;
  s = s.replace(/```[\s\S]*?```/g, " "); // كتل كود كاملة → مسافة
  s = s.replace(/`([^`]*)`/g, "$1"); // كود سطري → نصه
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1"); // صور ماركداون → نص بديل
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // روابط → نصها
  s = s.replace(/^[#>*\-–—•\s]+/g, " "); // رؤوس/قوائم
  s = s.replace(/[*_~]+/g, ""); // تمييز
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, INTEL_MAX_SOURCE);
}

/** تنظيف عنوان المزود: يزيل علامات الماركداون/أسطر التحكم، يطوي، يقص، null إن أصبح فارغًا. */
export function sanitizeTitle(raw: string): string | null {
  let s = raw ?? "";
  s = s.replace(/\u200e|\u200f|\u202a|\u202b|\u202c/g, ""); // أعلام RTL/LTR
  s = s.replace(/[\u0000-\u001f\u007f]/g, " "); // تحكم
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`/g, "");
  s = s.replace(/^[#>*\-–—•\s]+/g, " ");
  s = s.replace(/[*_~>]+/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^["'«»“”‘’]+|["'«»“”‘’]+$/g, "").trim(); // اقتباسات طرفية
  if (!s) return null;
  return s.length > INTEL_MAX_TITLE ? s.slice(0, INTEL_MAX_TITLE).trimEnd() + "…" : s;
}

/** تعليمات النظام لتوليد العنوان (لغة مطابقة لـ settings.lang). */
export function intelSystem(lang: "ar" | "en"): string {
  return lang === "ar"
    ? "أنت مُعنون محادثات محترف. أعطِ عنوانًا عربيًا قصيرًا (40–60 حرفًا) يلخّص جوهر رسالة المستخدم. أعد العنوان فقط — بلا علامات ترقيم زائدة، بلا اقتباسات، بلا أسطر إضافية."
    : "You are a professional conversation titler. Give a short English title (40-60 chars) that captures the essence of the user's message. Reply with the title only — no extra punctuation, no quotes, no extra lines.";
}

/** طلب العميل إلى /api/conversation-intel (بمهلة 15 ثانية — لا يتعطل البث أبدًا). */
export async function clientRequestIntel(params: {
  modelId: string;
  source: string;
  lang: "ar" | "en";
  apiKey?: string;
}): Promise<IntelResult> {
  const body = { kind: "title", modelId: params.modelId, source: params.source, lang: params.lang, apiKey: params.apiKey };
  const res = await fetch("/api/conversation-intel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as IntelResult | null;
  if (data && typeof data.ok === "boolean") return data;
  return { ok: false, code: "provider-error", error: "استجابة غير صالحة من خادم العناوين" };
}
