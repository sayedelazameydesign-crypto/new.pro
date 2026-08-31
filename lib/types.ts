// ===== أنواع البيانات الأساسية للنواة (مشتركة بين الواجهة والخلفية) =====

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  model?: string; // الموديل الذي أنتج الرسالة
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  summary?: string; // تذكّر (المرحلة 5.4): ملخص المحادثة الطويلة — يُزامن تلقائيًا
}

export interface Settings {
  modelId: string; // مثل "gemini:gemini-2.5-flash"
  system: string; // تعليمات النظام (System Prompt)
  temperature: number; // 0 .. 1.5
  theme: "dark" | "light";
  lang: "ar" | "en";
  /** CR-006: عنوان ذكي من أول رسالة (افتراضي ON — قابل للإيقاف في الإعدادات). خياري للتوافق الرجعي مع مزامنة أقدم. */
  smartTitle?: boolean;
}

export interface ProviderStatus {
  gemini: boolean;
  huggingface: boolean;
  groq: boolean;
  github: boolean;
  search: boolean;
}

export interface ApiError {
  code: "NOT_CONFIGURED" | "PROVIDER_ERROR" | "BAD_REQUEST" | "NETWORK";
  message: string;
}
