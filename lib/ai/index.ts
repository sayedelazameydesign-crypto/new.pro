// ===== منسّق الذكاء: يختار المزود المناسب تلقائيًا =====
// أي مزود جديد = أضف ملفًا في providers/ + سطر case هنا فقط.

import type { ProviderKind } from "../models";
import { geminiStream } from "./providers/gemini";
import { huggingfaceStream } from "./providers/huggingface";
import { demoStream } from "./providers/demo";

export const hasGemini = () => !!process.env.GEMINI_API_KEY;
export const hasHuggingFace = () => !!process.env.HF_TOKEN;

/** قرار المزود مع تراجع تلقائي ذكي (Fallback) — لا يفشل الطلب أبدًا إن وُجد أي مفتاح */
export function resolveProvider(modelId: string): {
  provider: ProviderKind;
  model: string;
  apiKey: string;
} {
  const { provider, model } = splitModelIdSafe(modelId);

  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return { provider, model, apiKey: process.env.GEMINI_API_KEY };
  }
  if (provider === "huggingface" && process.env.HF_TOKEN) {
    return { provider, model, apiKey: process.env.HF_TOKEN };
  }
  // تراجع تلقائي: gemini بلا مفتاح → hf إن وُجد توكنه
  if (provider === "gemini" && process.env.HF_TOKEN) {
    return {
      provider: "huggingface",
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      apiKey: process.env.HF_TOKEN,
    };
  }
  // تراجع تلقائي: hf بلا توكن → gemini إن وُجد مفتاحه
  if (provider === "huggingface" && process.env.GEMINI_API_KEY) {
    return { provider: "gemini", model: "gemini-2.5-flash", apiKey: process.env.GEMINI_API_KEY };
  }
  // لا يوجد أي مفتاح → وضع العرض التجريبي
  return { provider: "demo", model: "demo", apiKey: "" };
}

function splitModelIdSafe(id: string): { provider: ProviderKind; model: string } {
  const idx = id.indexOf(":");
  if (idx === -1) return { provider: "demo", model: id };
  const provider = id.slice(0, idx);
  if (provider !== "gemini" && provider !== "huggingface" && provider !== "demo") {
    return { provider: "demo", model: id };
  }
  return { provider, model: id.slice(idx + 1) };
}

export async function* streamReply(opts: {
  provider: ProviderKind;
  model: string;
  messages: { role: string; content: string }[];
  apiKey: string;
  maxTokens: number;
}): AsyncGenerator<string> {
  switch (opts.provider) {
    case "gemini":
      yield* geminiStream({
        model: opts.model,
        messages: opts.messages,
        apiKey: opts.apiKey,
        maxTokens: opts.maxTokens,
      });
      break;
    case "huggingface":
      yield* huggingfaceStream({
        model: opts.model,
        messages: opts.messages,
        token: opts.apiKey,
        maxTokens: opts.maxTokens,
      });
      break;
    case "demo":
    default:
      yield* demoStream();
      break;
  }
}
