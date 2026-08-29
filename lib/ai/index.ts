// ===== منسّق الذكاء: يختار المزود المناسب تلقائيًا =====
// أي مزود جديد = أضف ملفًا في providers/ + سطر case هنا فقط.

import type { ProviderKind } from "../models";
import { geminiStream } from "./providers/gemini";
import { huggingfaceStream } from "./providers/huggingface";
import { groqStream } from "./providers/groq";
import { webSearchStream } from "./providers/search";
import { demoStream } from "./providers/demo";

export const hasGemini = () => !!process.env.GEMINI_API_KEY;
export const hasHuggingFace = () => !!process.env.HF_TOKEN;
export const hasGroq = () => !!process.env.GROQ_API_KEY;
export const hasTavily = () => !!process.env.TAVILY_API_KEY;

const FALLBACKS = {
  groq: { model: "openai/gpt-oss-120b", env: "GROQ_API_KEY" },
  gemini: { model: "gemini-2.5-flash", env: "GEMINI_API_KEY" },
  huggingface: { model: "Qwen/Qwen2.5-7B-Instruct", env: "HF_TOKEN" },
} as const;

/** قرار المزود مع تراجع تلقائي ذكي (Fallback) — لا يفشل الطلب أبدًا إن وُجد أي مفتاح
 * overrideKey: مفتاح مُرسل من المتصفح (لوحة المفاتيح) — يتقدّم على البيئة في الجلسة */
export function resolveProvider(modelId: string, overrideKey?: string): {
  provider: ProviderKind;
  model: string;
  apiKey: string;
} {
  const { provider, model } = splitModelIdSafe(modelId);

  // وضع العرض: لا يتراجع أبدًا — يُستخدم عمدًا من المستخدم
  if (provider === "demo") return { provider: "demo", model: "demo", apiKey: "" };

  // البحث في الويب: قدرة مستقلة — بدون مفتاح يُظهر خطأً واضحًا (لا تراجع مضلل)
  if (provider === "search") {
    return {
      provider: "search",
      model: "web",
      apiKey: overrideKey || process.env.TAVILY_API_KEY || "",
    };
  }

  // 1) المزود المطلوب نفسه: مفتاح المستخدم المحلي أولًا، ثم بيئة الخادم
  const direct = overrideKey
    ? { provider, model, apiKey: overrideKey.slice(0, 300) }
    : pick(model, provider);
  if (direct) return direct;

  // 2) تراجع تلقائي حسب الأولوية العامة: Groq → Gemini → HF
  for (const p of ["groq", "gemini", "huggingface"] as const) {
    const alt = pick(FALLBACKS[p].model, p);
    if (alt) return alt;
  }

  // 3) لا يوجد أي مفتاح → وضع العرض التجريبي (لا يفشل أبدًا)
  return { provider: "demo", model: "demo", apiKey: "" };
}

function pick(
  model: string,
  p: ProviderKind
): { provider: ProviderKind; model: string; apiKey: string } | null {
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
  const last = opts.messages[opts.messages.length - 1]?.content ?? "";
  switch (opts.provider) {
    case "search":
      yield* webSearchStream({ query: last, apiKey: opts.apiKey });
      break;
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
  let provider = id.slice(0, idx);
  // مرادفات النطاقات: "hf" يُطابق مزود Hugging Face
  if (provider === "hf") provider = "huggingface";
  if (
    provider !== "gemini" &&
    provider !== "huggingface" &&
    provider !== "groq" &&
    provider !== "search" &&
    provider !== "demo"
  ) {
    return { provider: "demo", model: id };
  }
  return { provider: provider as ProviderKind, model: id.slice(idx + 1) };
}
