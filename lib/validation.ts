// ===== التحقق من البيانات (zod) — المرحلة D1 (Core Validation) =====
// بنية تمهيدية فوق المسار الحالي بلا هدم: schemas تُستخدم حيث رُبطت صراحةً،
// وتبقى مطابقة لسلوك التحقق اليدوي القائم (نفس الرسائل/الأكواد).

import { z } from "zod";

// ===== رسالة محادثة =====
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(60_000),
});

// ===== مرفق ملف (المرحلة 5): الاسم + base64 =====
export const chatFileSchema = z.object({
  name: z.string().min(1).max(300),
  data: z.string().max(4_400_000),
});

// ===== جسم طلب /api/chat (المنطقة المعيارية للتحقق) =====
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).max(20),
  files: z.array(chatFileSchema).max(8).optional(),
  temperature: z.number().finite().min(0).max(1.5).optional(),
  modelId: z.string().max(120).optional(),
  apiKey: z.string().max(300).optional(),
  system: z.string().max(30_000).optional(),
});

// ===== إعدادات المحادثة (Settings) =====
export const settingsSchema = z.object({
  modelId: z.string().max(120),
  system: z.string().max(10_000),
  temperature: z.number().finite().min(0).max(1.5),
  theme: z.enum(["dark", "light"]),
  lang: z.enum(["ar", "en"]),
});

// ===== طلب توليد صورة (POST /api/image) =====
export const imageRequestSchema = z.object({
  prompt: z.string().min(1).max(800),
  modelId: z.string().max(120).optional(),
  apiKey: z.string().max(300).optional(),
});

// ===== أدوات مساعدة: parse آمن مع رسالة عربية موحّدة =====
export function parseOrNull<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const r = schema.safeParse(data);
  return r.success ? r.data : null;
}

// ===== تسوية جسم /api/chat (lenient) — تحافظ على السلوك القديم حرفيًا =====
// zod هنا «يصحح ولا يرفض»: أي حقل شاذ يتحول لبديل آمن، ولا يُرفض الطلب بسبب بنيته —
// نفس نتيجة الفحوصات اليدوية القديمة (فلترة الرسائل غير الصالحة + القيم الافتراضية).
// الملاحظات المعتمدة:
//   1) الرسائل غير الصالحة تُفلتر (لا تُسقط كل المصفوفة) — نفس سلوك .filter القديم.
//   2) temperature خارج النطاق يمر كما هو — التثبيت (clamp) يبقى في المسار، لا رفض 400.
//   3) files تُمرَّر كما هي (unknown) — التحقق منها مسؤولية mergeAttachments (ترمي 400 واضحة).

const chatMessageLoose = z.object({
  role: z.string().min(1),
  content: z.string(),
});

/** المنتِج القياسي: مصفوفة رسائل تتسامح مع العناصر غير الصالحة (تُفلتر) */
const messagesLoose = z
  .array(z.unknown())
  .optional()
  .catch([]) // messages ليست مصفوفة → []
  .transform((arr) =>
    (arr ?? [])
      .map((m) => chatMessageLoose.safeParse(m))
      .filter((r): r is { success: true; data: { role: string; content: string } } => r.success)
      .map((r) => r.data)
  );

const chatBodyLoose = z.object({
  messages: messagesLoose,
  temperature: z.number().finite().optional().catch(undefined), // غير رقمي/لانهاي → undefined
  modelId: z.string().optional().catch(undefined),
  apiKey: z.string().optional().catch(undefined),
  system: z.string().optional().catch(undefined),
  files: z.unknown().optional().catch(undefined), // تُترك لـ mergeAttachments
});

/** الناتج الطبيعي (normalized) لجسم طلب المحادثة */
export interface NormalizedChatBody {
  messages: { role: string; content: string }[];
  temperature?: number;
  modelId?: string;
  apiKey?: string;
  system?: string;
  files: unknown;
}

/** تسوية جسم /api/chat عبر zod — لا ترفض أبدًا؛ تحافظ على السلوك القديم بالضبط */
export function parseChatBody(raw: unknown): NormalizedChatBody {
  const r = chatBodyLoose.safeParse(raw);
  if (!r.success) return { messages: [], files: undefined };
  const d = r.data;
  return {
    messages: d.messages,
    temperature: d.temperature,
    modelId: d.modelId,
    apiKey: d.apiKey,
    system: d.system,
    files: d.files,
  };
}
