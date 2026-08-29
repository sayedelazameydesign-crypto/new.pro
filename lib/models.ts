// ===== سجل الموديلات (مشترك بين الواجهة والخلفية) =====
// إضافة موديل جديد = سطر واحد هنا فقط — بدون لمس أي كود آخر.

export type ProviderKind = "gemini" | "huggingface" | "groq" | "demo";

export interface ModelDef {
  id: string; // "provider:model-name"
  name: string;
  provider: ProviderKind;
  description: string;
  free: boolean;
}

export const MODELS: ModelDef[] = [
  // — Groq (مفتاح مجاني من console.groq.com — الأسرع في الرد) —
  {
    id: "groq:openai/gpt-oss-120b",
    name: "GPT-OSS 120B (Groq)",
    provider: "groq",
    description: "الأقوى على البنية المجانية — ردود فورية",
    free: true,
  },
  {
    id: "groq:openai/gpt-oss-20b",
    name: "GPT-OSS 20B (Groq)",
    provider: "groq",
    description: "خفيف وسريع جدًا — حصة يومية أعلى",
    free: true,
  },

  // — Google Gemini (مفتاح مجاني من AI Studio) —
  {
    id: "gemini:gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    description: "سريع ومجاني — الاختيار الافتراضي",
    free: true,
  },
  {
    id: "gemini:gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    description: "الأقوى في التفكير والتحليل",
    free: true,
  },
  {
    id: "gemini:gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    description: "نسخة مستقرة جدًا للاستخدام اليومي",
    free: true,
  },

  // — Hugging Face (توكن مجاني — يتطلب تفعيل Inference Providers في الحساب) —
  {
    id: "hf:Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen 2.5 7B",
    provider: "huggingface",
    description: "قوي في الكود واللغات (انظر ملاحظة HF بالأسفل)",
    free: true,
  },
  {
    id: "hf:microsoft/Phi-3.5-mini-instruct",
    name: "Phi-3.5 Mini",
    provider: "huggingface",
    description: "خفيف وممتاز للمهام اليومية",
    free: true,
  },

  // — وضع العرض التجريبي (بدون أي مفتاح) —
  {
    id: "demo",
    name: "وضع العرض التجريبي",
    provider: "demo",
    description: "يعمل فورًا بدون مفاتيح — لتجربة الواجهة",
    free: true,
  },
];

export function splitModelId(id: string): { provider: ProviderKind; model: string } {
  const idx = id.indexOf(":");
  if (idx === -1) return { provider: "demo", model: id };
  return { provider: id.slice(0, idx) as ProviderKind, model: id.slice(idx + 1) };
}

export function getModel(id: string): ModelDef {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
