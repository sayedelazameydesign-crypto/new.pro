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

// ===== تسوية جسم /api/chat — تصحّح ولا ترفض البنية =====
// لا 400 بسبب الشكل: الحقول الشاذة تُسقط/تُثبَّت، والطلب يبقى قابلاً للمعالجة.
// المرحلة 0 (تشديد): الأدوار المسموحة فقط + سقف رسائل/نص + تثبيت temperature.
//   1) الدور خارج user|assistant|system يُفلتر فرديًا (لا تُسقط المصفوفة).
//   2) temperature خارج [0, 1.5] يُثبَّت هنا (لا يمرّ 99 للمسار).
//   3) files تُمرَّر كما هي (unknown) — التحقق منها مسؤولية mergeAttachments.

const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);
const MAX_PARSE_MESSAGES = 20;
const MAX_PARSE_CONTENT = 60_000;
const TEMP_MIN = 0;
const TEMP_MAX = 1.5;

const chatMessageLoose = z.object({
  role: z.string().min(1),
  content: z.string(),
});

/** مصفوفة رسائل: فلترة العناصر الشاذة + الأدوار + سقف الطول والعدد (آخر 20) */
const messagesLoose = z
  .array(z.unknown())
  .optional()
  .catch([])
  .transform((arr) =>
    (arr ?? [])
      .map((m) => chatMessageLoose.safeParse(m))
      .filter((r): r is { success: true; data: { role: string; content: string } } => r.success)
      .map((r) => r.data)
      .filter((m) => ALLOWED_ROLES.has(m.role))
      .map((m) => ({
        role: m.role,
        content: m.content.length > MAX_PARSE_CONTENT ? m.content.slice(0, MAX_PARSE_CONTENT) : m.content,
      }))
      .slice(-MAX_PARSE_MESSAGES)
  );

const chatBodyLoose = z.object({
  messages: messagesLoose,
  temperature: z.number().finite().optional().catch(undefined),
  modelId: z.string().max(120).optional().catch(undefined),
  apiKey: z.string().max(300).optional().catch(undefined),
  system: z.string().max(30_000).optional().catch(undefined),
  files: z.unknown().optional().catch(undefined),
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

function clampTemperature(n: number | undefined): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.min(TEMP_MAX, Math.max(TEMP_MIN, n));
}

/** تسوية جسم /api/chat عبر zod — لا ترفض البنية؛ تثبّت القيم الشاذة */
export function parseChatBody(raw: unknown): NormalizedChatBody {
  const r = chatBodyLoose.safeParse(raw);
  if (!r.success) return { messages: [], files: undefined };
  const d = r.data;
  return {
    messages: d.messages,
    temperature: clampTemperature(d.temperature),
    modelId: d.modelId,
    apiKey: d.apiKey,
    system: d.system,
    files: d.files,
  };
}
