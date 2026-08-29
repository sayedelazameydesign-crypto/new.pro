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
    id: "groq:llama-3.3-70b-versatile",
    name: "Llama 3.3 70B (Groq)",
    provider: "groq",
    description: "الأقوى على البنية المجانية — ردود فورية",
    free: true,
  },
  {
    id: "groq:llama-3.1-8b-instant",
    name: "Llama 3.1 8B (Groq)",
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

  // — Hugging Face (توكن مجاني) —
  {
    id: "hf:mistralai/Mistral-7B-Instruct-v0.3",
    name: "Mistral 7B Instruct",
    provider: "huggingface",
    description: "خفيف وسريع عبر خوادم HF المجانية",
    free: true,
  },
  {
    id: "hf:meta-llama/Llama-3.2-3B-Instruct",
    name: "Llama 3.2 3B",
    provider: "huggingface",
    description: "ممتاز للمهام السريعة اليومية",
    free: true,
  },
  {
    id: "hf:Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen 2.5 7B",
    provider: "huggingface",
    description: "قوي جدًا في الكود واللغات",
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
