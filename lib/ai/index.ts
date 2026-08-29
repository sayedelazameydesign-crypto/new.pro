// ===== منسّق الذكاء: يختار المزود المناسب تلقائيًا =====
// أي مزود جديد = أضف ملفًا في providers/ + سطر case هنا فقط.

import type { ProviderKind } from "../models";
import { geminiStream } from "./providers/gemini";
import { huggingfaceStream } from "./providers/huggingface";
import { groqStream } from "./providers/groq";
import { demoStream } from "./providers/demo";

export const hasGemini = () => !!process.env.GEMINI_API_KEY;
export const hasHuggingFace = () => !!process.env.HF_TOKEN;
export const hasGroq = () => !!process.env.GROQ_API_KEY;

const FALLBACKS = {
  groq: { model: "llama-3.3-70b-versatile", env: "GROQ_API_KEY" },
  gemini: { model: "gemini-2.5-flash", env: "GEMINI_API_KEY" },
  huggingface: { model: "mistralai/Mistral-7B-Instruct-v0.3", env: "HF_TOKEN" },
} as const;

/** قرار المزود مع تراجع تلقائي ذكي (Fallback) — لا يفشل الطلب أبدًا إن وُجد أي مفتاح */
export function resolveProvider(modelId: string): {
  provider: ProviderKind;
  model: string;
  apiKey: string;
} {
  const { provider, model } = splitModelIdSafe(modelId);

  // 1) المزود المطلوب نفسه إن وُجد مفتاحه
  const direct = pick(model, provider);
  if (direct) return direct;

  // 2) تراجع تلقائي حسب الأولوية العامة: Groq → Gemini → HF
  for (const p of ["groq", "gemini", "huggingface"] as const) {
    const alt = pick(FALLBACKS[p].model, p);
    if (alt) return alt;
  }

  // 3) لا يوجد أي مفتاح → وضع العرض التجريبي (لا يفشل أبدًا)
  return { provider: "demo", model: "demo", apiKey: "" };
}

function pick(model: string, p: ProviderKind): { provider: ProviderKind; model: string; apiKey: string } | null {
  const key = FALLBACKS[p as keyof typeof FALLBACKS]?.env;
  if (!key) return null;
  const apiKey = process.env[key];
  return apiKey ? { provider: p, model, apiKey } : null;
}

export async function* streamReply(opts: {
  provider: ProviderKind;
  model: string;
  messages: { role: string; content: string }[];
  apiKey: string;
  maxTokens: number;
  temperature?: number;
}): AsyncGenerator<string> {
  switch (opts.provider) {
    case "groq":
      yield* groqStream({
        model: opts.model,
        messages: opts.messages,
        apiKey: opts.apiKey,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      });
      break;
    case "gemini":
      yield* geminiStream({
        model: opts.model,
        messages: opts.messages,
        apiKey: opts.apiKey,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      });
      break;
    case "huggingface":
      yield* huggingfaceStream({
        model: opts.model,
        messages: opts.messages,
        token: opts.apiKey,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      });
      break;
    case "demo":
    default:
      yield* demoStream();
      break;
  }
}

function splitModelIdSafe(id: string): { provider: ProviderKind; model: string } {
  const idx = id.indexOf(":");
  if (idx === -1) return { provider: "demo", model: id };
  const provider = id.slice(0, idx);
  if (provider !== "gemini" && provider !== "huggingface" && provider !== "groq" && provider !== "demo") {
    return { provider: "demo", model: id };
  }
  return { provider, model: id.slice(idx + 1) };
}
